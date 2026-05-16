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

// GET /api/notas - Listar notas/comprobantes (solo admin/superadmin)
notasRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos: solo admin y superadmin pueden ver el blog de notas' }, 403)
  }

  const caja_id = c.req.query('caja_id')
  const user_id = c.req.query('user_id')
  const tipo = c.req.query('tipo')
  const fecha = c.req.query('fecha') // YYYY-MM-DD

  let query = `
    SELECT n.*, u.nombre, u.apellido, u.cedula,
           c.fecha as caja_fecha
    FROM notas_caja n
    JOIN users u ON n.user_id = u.id
    LEFT JOIN cajas c ON n.caja_id = c.id
    WHERE 1=1
  `
  const params: any[] = []

  if (caja_id) {
    query += ' AND n.caja_id = ?'
    params.push(parseInt(caja_id))
  }
  if (user_id) {
    query += ' AND n.user_id = ?'
    params.push(parseInt(user_id))
  }
  if (tipo) {
    query += ' AND n.tipo = ?'
    params.push(tipo)
  }
  if (fecha) {
    query += " AND date(n.created_at) = ?"
    params.push(fecha)
  }

  query += ' ORDER BY n.created_at DESC LIMIT 200'

  const result = params.length > 0
    ? await c.env.DB.prepare(query).bind(...params).all()
    : await c.env.DB.prepare(query).all()

  const notas = (result.results || []).map((n: any) => ({
    ...n,
    metadata: n.metadata ? JSON.parse(n.metadata) : null
  }))

  return c.json({ notas, total: notas.length })
})

// GET /api/notas/:id - Ver nota específica (solo admin/superadmin)
notasRoutes.get('/:id', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  const nota = await c.env.DB.prepare(`
    SELECT n.*, u.nombre, u.apellido, u.cedula,
           c.fecha as caja_fecha
    FROM notas_caja n
    JOIN users u ON n.user_id = u.id
    LEFT JOIN cajas c ON n.caja_id = c.id
    WHERE n.id = ?
  `).bind(id).first<any>()

  if (!nota) return c.json({ error: 'Nota no encontrada' }, 404)

  return c.json({
    nota: {
      ...nota,
      metadata: nota.metadata ? JSON.parse(nota.metadata) : null
    }
  })
})

// POST /api/notas - Registrar nota/comprobante/impresión
// (cualquier usuario puede registrar, pero solo admin/superadmin pueden ver)
notasRoutes.post('/', auth, async (c) => {
  const session = c.get('session')

  const body = await c.req.json()
  const { tipo, titulo, contenido, caja_id, metadata, solo_admin } = body

  if (!tipo || !titulo) {
    return c.json({ error: 'tipo y titulo son requeridos' }, 400)
  }

  const tiposValidos = ['nota', 'comprobante', 'impresion', 'recibo', 'reporte']
  if (!tiposValidos.includes(tipo)) {
    return c.json({ error: `Tipo inválido. Use: ${tiposValidos.join(', ')}` }, 400)
  }

  // Verificar que la caja pertenece al usuario (o es admin)
  let cajaIdFinal = caja_id ? parseInt(caja_id) : null
  if (cajaIdFinal && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    const caja = await c.env.DB.prepare(
      'SELECT id FROM cajas WHERE id = ? AND user_id = ?'
    ).bind(cajaIdFinal, session.userId).first()
    if (!caja) {
      cajaIdFinal = null // Si no pertenece al usuario, no asociar
    }
  }

  const metadataStr = metadata ? JSON.stringify(metadata) : null
  const soloAdmin = solo_admin !== undefined ? (solo_admin ? 1 : 0) : 1 // Por defecto solo admin

  const result = await c.env.DB.prepare(`
    INSERT INTO notas_caja (user_id, caja_id, tipo, titulo, contenido, metadata, solo_admin, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    session.userId,
    cajaIdFinal,
    tipo,
    titulo.trim(),
    contenido || '',
    metadataStr,
    soloAdmin
  ).run()

  return c.json({
    success: true,
    nota: {
      id: result.meta.last_row_id,
      tipo, titulo, contenido, caja_id: cajaIdFinal,
      user_id: session.userId,
      solo_admin: soloAdmin
    }
  }, 201)
})

// POST /api/notas/captura-impresion - Registrar captura automática al imprimir (Ctrl+P)
notasRoutes.post('/captura-impresion', auth, async (c) => {
  const session = c.get('session')

  const { contenido_html, titulo, caja_id, pagina_actual } = await c.req.json()

  const titulo_final = titulo || `Impresión - ${pagina_actual || 'Página'} - ${new Date().toLocaleString('es-EC')}`

  // Obtener caja activa del usuario si no se especifica
  let cajaIdFinal = caja_id ? parseInt(caja_id) : null
  if (!cajaIdFinal) {
    const cajaHoy = await c.env.DB.prepare(`
      SELECT id FROM cajas WHERE user_id = ? AND date(fecha) = date('now') AND estado != 'cerrada'
      ORDER BY created_at DESC LIMIT 1
    `).bind(session.userId).first<{ id: number }>()
    if (cajaHoy) cajaIdFinal = cajaHoy.id
  }

  const metadata = JSON.stringify({
    pagina: pagina_actual,
    timestamp: new Date().toISOString(),
    user_agent: 'web',
    captura_automatica: true
  })

  await c.env.DB.prepare(`
    INSERT INTO notas_caja (user_id, caja_id, tipo, titulo, contenido, metadata, solo_admin, created_at)
    VALUES (?, ?, 'impresion', ?, ?, ?, 1, datetime('now'))
  `).bind(
    session.userId,
    cajaIdFinal,
    titulo_final,
    contenido_html || '',
    metadata
  ).run()

  return c.json({ success: true, mensaje: 'Impresión registrada' })
})

// DELETE /api/notas/:id - Eliminar nota (solo superadmin/admin)
notasRoutes.delete('/:id', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM notas_caja WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: 'Nota eliminada' })
})

// GET /api/notas/stats - Estadísticas del blog de notas (solo admin+)
notasRoutes.get('/stats/resumen', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const hoy = new Date().toISOString().split('T')[0]

  const [totalHoy, totalMes, porTipo] = await Promise.all([
    c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM notas_caja WHERE date(created_at) = ?"
    ).bind(hoy).first<{ total: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM notas_caja WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')"
    ).first<{ total: number }>(),
    c.env.DB.prepare(
      "SELECT tipo, COUNT(*) as total FROM notas_caja GROUP BY tipo ORDER BY total DESC"
    ).all()
  ])

  return c.json({
    total_hoy: totalHoy?.total || 0,
    total_mes: totalMes?.total || 0,
    por_tipo: porTipo.results || []
  })
})
