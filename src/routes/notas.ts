import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database }

export const notasRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/notas — Admin/superadmin ven todas; trabajador ve las suyas
notasRoutes.get('/', auth, async (c) => {
  try {
    const session = c.get('session')
    const isAdmin = ['superadmin', 'admin'].includes(session.role)

    const caja_id = c.req.query('caja_id')
    const user_id = c.req.query('user_id')
    const tipo    = c.req.query('tipo')
    const fecha   = c.req.query('fecha')

    let query = `
      SELECT n.id, n.user_id, n.caja_id, n.tipo, n.titulo, n.contenido,
             n.metadata, n.solo_admin, n.created_at,
             u.nombre, u.apellido, u.cedula,
             c.fecha as caja_fecha
      FROM notas_caja n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN cajas c ON n.caja_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    // Trabajadores solo ven sus propias notas
    if (!isAdmin) {
      query += ' AND n.user_id = ?'
      params.push(session.userId)
    } else if (user_id) {
      query += ' AND n.user_id = ?'
      params.push(parseInt(user_id))
    }

    if (caja_id) { query += ' AND n.caja_id = ?'; params.push(parseInt(caja_id)) }
    if (tipo)    { query += ' AND n.tipo = ?';    params.push(tipo) }
    if (fecha)   { query += ' AND date(n.created_at) = ?'; params.push(fecha) }

    query += ' ORDER BY n.created_at DESC LIMIT 200'

    const result = params.length > 0
      ? await c.env.DB.prepare(query).bind(...params).all()
      : await c.env.DB.prepare(query).all()

    const notas = (result.results || []).map((n: any) => ({
      ...n,
      metadata: n.metadata ? (() => { try { return JSON.parse(n.metadata) } catch { return null } })() : null
    }))

    return c.json({ notas, total: notas.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/notas/stats/resumen — solo admin+
notasRoutes.get('/stats/resumen', auth, async (c) => {
  try {
    const session = c.get('session')
    const isAdmin = ['superadmin', 'admin'].includes(session.role)
    const hoy = new Date().toISOString().split('T')[0]

    const baseFilter = isAdmin ? '' : `AND user_id = ${session.userId}`

    const [totalHoy, totalMes, porTipo, alertas] = await Promise.all([
      c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM notas_caja WHERE date(created_at) = ? ${baseFilter}`
      ).bind(hoy).first<{ total: number }>(),
      c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM notas_caja WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') ${baseFilter}`
      ).first<{ total: number }>(),
      c.env.DB.prepare(
        `SELECT tipo, COUNT(*) as total FROM notas_caja ${isAdmin ? '' : `WHERE user_id = ${session.userId}`} GROUP BY tipo ORDER BY total DESC`
      ).all(),
      // Alertas de comprobantes con posible manipulación
      isAdmin
        ? c.env.DB.prepare(
            `SELECT COUNT(*) as total FROM notas_caja WHERE tipo='comprobante' AND json_extract(metadata,'$.alerta_manipulacion')=1`
          ).first<{ total: number }>()
        : Promise.resolve({ total: 0 })
    ])

    return c.json({
      total_hoy: totalHoy?.total || 0,
      total_mes: totalMes?.total || 0,
      por_tipo: porTipo.results || [],
      alertas_manipulacion: (alertas as any)?.total || 0
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/notas/:id
notasRoutes.get('/:id', auth, async (c) => {
  try {
    const session = c.get('session')
    const isAdmin = ['superadmin', 'admin'].includes(session.role)
    const id = parseInt(c.req.param('id'))

    const nota = await c.env.DB.prepare(`
      SELECT n.*, u.nombre, u.apellido, u.cedula, c.fecha as caja_fecha
      FROM notas_caja n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN cajas c ON n.caja_id = c.id
      WHERE n.id = ?
    `).bind(id).first<any>()

    if (!nota) return c.json({ error: 'Nota no encontrada' }, 404)
    if (!isAdmin && nota.user_id !== session.userId) return c.json({ error: 'Sin permisos' }, 403)

    return c.json({
      nota: {
        ...nota,
        metadata: nota.metadata ? (() => { try { return JSON.parse(nota.metadata) } catch { return null } })() : null
      }
    })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/notas — Cualquier usuario autenticado puede crear
notasRoutes.post('/', auth, async (c) => {
  try {
    const session = c.get('session')
    const body = await c.req.json()

    const {
      tipo = 'comprobante',
      titulo,
      contenido,
      caja_id,
      metadata,
      // Campos de detección de manipulación
      contenido_original,
      valores_originales,
      valores_editados
    } = body

    if (!titulo || !contenido) {
      return c.json({ error: 'titulo y contenido son requeridos' }, 400)
    }

    const tiposValidos = ['nota', 'comprobante', 'impresion', 'recibo', 'reporte']
    if (!tiposValidos.includes(tipo)) {
      return c.json({ error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` }, 400)
    }

    // Detectar manipulación de valores monetarios
    let alertaManipulacion = false
    const valoresAlterados: any[] = []

    if (contenido_original && contenido) {
      // Extraer todos los valores monetarios del original vs editado
      const regexMonto = /\$?\s*(\d+(?:[.,]\d{1,2})?)/g
      const extraerMontos = (txt: string) => {
        const matches: number[] = []
        let m
        while ((m = regexMonto.exec(txt)) !== null) {
          const val = parseFloat(m[1].replace(',', '.'))
          if (!isNaN(val) && val > 0) matches.push(val)
        }
        regexMonto.lastIndex = 0
        return matches
      }

      const montosOriginales = extraerMontos(contenido_original)
      const montosEditados   = extraerMontos(contenido)

      // Si hay montos diferentes → posible manipulación
      if (montosOriginales.length > 0 && montosEditados.length > 0) {
        const setOrig = new Set(montosOriginales.map(v => v.toFixed(2)))
        const setEdit = new Set(montosEditados.map(v => v.toFixed(2)))
        const nuevosMontos = [...setEdit].filter(v => !setOrig.has(v))
        if (nuevosMontos.length > 0) {
          alertaManipulacion = true
          valoresAlterados.push({
            montos_originales: montosOriginales,
            montos_editados: montosEditados,
            montos_nuevos: nuevosMontos
          })
        }
      }
    }

    // Si se pasan valores_originales vs valores_editados explícitamente
    if (valores_originales && valores_editados) {
      const orig = parseFloat(valores_originales)
      const edit = parseFloat(valores_editados)
      if (!isNaN(orig) && !isNaN(edit) && Math.abs(edit - orig) > 0.01) {
        alertaManipulacion = true
        valoresAlterados.push({ original: orig, editado: edit, diferencia: edit - orig })
      }
    }

    // Caja: verificar pertenencia si es trabajador
    let cajaIdFinal = caja_id ? parseInt(caja_id) : null
    if (cajaIdFinal && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
      const caja = await c.env.DB.prepare(
        'SELECT id FROM cajas WHERE id = ? AND user_id = ?'
      ).bind(cajaIdFinal, session.userId).first()
      if (!caja) cajaIdFinal = null
    }

    // Si no tiene caja especificada, buscar la caja abierta del día
    if (!cajaIdFinal) {
      const cajaHoy = await c.env.DB.prepare(
        "SELECT id FROM cajas WHERE user_id = ? AND date(fecha) = date('now') ORDER BY created_at DESC LIMIT 1"
      ).bind(session.userId).first<{ id: number }>()
      if (cajaHoy) cajaIdFinal = cajaHoy.id
    }

    const metaFinal = JSON.stringify({
      ...(metadata || {}),
      alerta_manipulacion: alertaManipulacion,
      valores_alterados: valoresAlterados,
      contenido_original: contenido_original || null,
      timestamp: new Date().toISOString(),
      user_agent: 'web'
    })

    const soloAdmin = 0 // trabajador puede ver sus propias notas

    const result = await c.env.DB.prepare(`
      INSERT INTO notas_caja (user_id, caja_id, tipo, titulo, contenido, metadata, solo_admin, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      session.userId,
      cajaIdFinal,
      tipo,
      titulo.trim(),
      contenido,
      metaFinal,
      soloAdmin
    ).run()

    // Si hay alerta de manipulación, registrar en audit_logs
    if (alertaManipulacion) {
      await c.env.DB.prepare(`
        INSERT INTO audit_logs (user_id, accion, tabla, registro_id, datos_nuevos)
        VALUES (?, 'ALERTA_MANIPULACION_COMPROBANTE', 'notas_caja', ?, ?)
      `).bind(
        session.userId,
        result.meta.last_row_id,
        JSON.stringify({
          titulo,
          valores_alterados: valoresAlterados,
          nota_id: result.meta.last_row_id
        })
      ).run()
    }

    return c.json({
      success: true,
      alerta_manipulacion: alertaManipulacion,
      valores_alterados: valoresAlterados,
      nota: {
        id: result.meta.last_row_id,
        tipo, titulo,
        contenido_guardado: contenido,
        caja_id: cajaIdFinal,
        user_id: session.userId
      }
    }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/notas/captura-impresion — captura automática Ctrl+P
notasRoutes.post('/captura-impresion', auth, async (c) => {
  try {
    const session = c.get('session')
    const { contenido_html, titulo, caja_id, pagina_actual } = await c.req.json()

    const titulo_final = titulo || `Impresión — ${pagina_actual || 'Página'} — ${new Date().toLocaleString('es-EC')}`

    let cajaIdFinal = caja_id ? parseInt(caja_id) : null
    if (!cajaIdFinal) {
      const cajaHoy = await c.env.DB.prepare(
        "SELECT id FROM cajas WHERE user_id = ? AND date(fecha) = date('now') ORDER BY created_at DESC LIMIT 1"
      ).bind(session.userId).first<{ id: number }>()
      if (cajaHoy) cajaIdFinal = cajaHoy.id
    }

    const metadata = JSON.stringify({
      pagina: pagina_actual,
      timestamp: new Date().toISOString(),
      captura_automatica: true
    })

    await c.env.DB.prepare(`
      INSERT INTO notas_caja (user_id, caja_id, tipo, titulo, contenido, metadata, solo_admin, created_at)
      VALUES (?, ?, 'impresion', ?, ?, ?, 0, datetime('now'))
    `).bind(session.userId, cajaIdFinal, titulo_final, contenido_html || '', metadata).run()

    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// DELETE /api/notas/:id — solo admin+
notasRoutes.delete('/:id', auth, async (c) => {
  try {
    const session = c.get('session')
    if (!['superadmin', 'admin'].includes(session.role)) {
      return c.json({ error: 'Sin permisos' }, 403)
    }
    const id = parseInt(c.req.param('id'))
    await c.env.DB.prepare('DELETE FROM notas_caja WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})
