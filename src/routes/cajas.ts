import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket }

export const cajasRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/cajas - Listar cajas
cajasRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  const { fecha, user_id, estado, limit = '20', offset = '0' } = c.req.query()

  let query = `
    SELECT c.*, u.nombre, u.apellido, u.cedula,
           ua.nombre as aprobador_nombre, ua.apellido as aprobador_apellido,
           (SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_ingresos,
           (SELECT SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_egresos,
           (SELECT COUNT(*) FROM movimientos WHERE caja_id = c.id) as num_movimientos
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ua ON c.aprobado_por = ua.id
    WHERE 1=1
  `
  const params: any[] = []

  // Trabajadores solo ven sus cajas
  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    query += ' AND c.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    query += ' AND c.user_id = ?'
    params.push(parseInt(user_id))
  }

  if (fecha) { query += ' AND c.fecha = ?'; params.push(fecha) }
  if (estado) { query += ' AND c.estado = ?'; params.push(estado) }

  query += ` ORDER BY c.fecha DESC, c.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(limit), parseInt(offset))

  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ cajas: result.results, total: result.results.length })
})

// GET /api/cajas/hoy - Caja del día actual del usuario
cajasRoutes.get('/hoy', auth, async (c) => {
  const session = c.get('session')
  const today = new Date().toISOString().split('T')[0]

  const caja = await c.env.DB.prepare(`
    SELECT c.*, u.nombre, u.apellido,
           (SELECT SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_ingresos,
           (SELECT SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) FROM movimientos WHERE caja_id = c.id) as total_egresos
    FROM cajas c JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ? AND c.fecha = ?
  `).bind(session.userId, today).first()

  return c.json({ caja: caja || null, fecha: today })
})

// POST /api/cajas - Abrir/crear caja
cajasRoutes.post('/', auth, async (c) => {
  const session = c.get('session')
  const { saldo_inicial = 0, notas, fecha, user_id } = await c.req.json()

  // Supervisores y admins pueden abrir caja para cualquier usuario
  const targetUserId = (['superadmin', 'admin', 'supervisor'].includes(session.role) && user_id)
    ? user_id : session.userId

  const today = fecha || new Date().toISOString().split('T')[0]

  // Verificar si ya existe
  const existing = await c.env.DB.prepare(
    'SELECT id, estado FROM cajas WHERE user_id = ? AND fecha = ?'
  ).bind(targetUserId, today).first<{ id: number; estado: string }>()

  if (existing) {
    return c.json({ error: 'Ya existe una caja para este usuario en esta fecha', caja_id: existing.id }, 409)
  }

  const result = await c.env.DB.prepare(`
    INSERT INTO cajas (user_id, fecha, saldo_inicial, estado, notas)
    VALUES (?, ?, ?, 'abierta', ?)
  `).bind(targetUserId, today, parseFloat(saldo_inicial) || 0, notas || '').run()

  const cajaId = result.meta.last_row_id

  await c.env.DB.prepare(
    'INSERT INTO audit_logs (user_id, accion, tabla, registro_id, datos_nuevos) VALUES (?, ?, ?, ?, ?)'
  ).bind(session.userId, 'OPEN_CAJA', 'cajas', cajaId, JSON.stringify({ fecha: today, saldo_inicial, user_id: targetUserId })).run()

  return c.json({ success: true, caja_id: cajaId, fecha: today, saldo_inicial: parseFloat(saldo_inicial) || 0 }, 201)
})

// GET /api/cajas/:id
cajasRoutes.get('/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))

  const caja = await c.env.DB.prepare(`
    SELECT c.*, u.nombre, u.apellido, u.cedula,
           ua.nombre as aprobador_nombre
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN users ua ON c.aprobado_por = ua.id
    WHERE c.id = ?
  `).bind(id).first<{ user_id: number } & Record<string, any>>()

  if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)

  if (caja.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  // Movimientos de la caja
  const movimientos = await c.env.DB.prepare(`
    SELECT m.*, u.nombre as user_nombre
    FROM movimientos m JOIN users u ON m.user_id = u.id
    WHERE m.caja_id = ? ORDER BY m.created_at ASC
  `).bind(id).all()

  // Conteo de efectivo
  const conteo = await c.env.DB.prepare(
    'SELECT * FROM conteo_efectivo WHERE caja_id = ? ORDER BY denominacion'
  ).bind(id).all()

  // Saldos por sistema
  const saldos = await c.env.DB.prepare(
    'SELECT * FROM saldos_sistemas WHERE caja_id = ?'
  ).bind(id).all()

  return c.json({
    caja,
    movimientos: movimientos.results,
    conteo_efectivo: conteo.results,
    saldos_sistemas: saldos.results
  })
})

// POST /api/cajas/:id/cuadrar - Cuadre de caja
cajasRoutes.post('/:id/cuadrar', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))
  const { saldo_final, conteo_efectivo, saldos_sistemas, notas } = await c.req.json()

  const caja = await c.env.DB.prepare('SELECT * FROM cajas WHERE id = ?')
    .bind(id).first<{ id: number; user_id: number; saldo_inicial: number; estado: string }>()

  if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)
  if (caja.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }
  if (caja.estado !== 'abierta') {
    return c.json({ error: 'La caja ya está cuadrada o aprobada' }, 400)
  }

  // Calcular totales desde movimientos
  const totales = await c.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) as egresos
    FROM movimientos WHERE caja_id = ?
  `).bind(id).first<{ ingresos: number; egresos: number }>()

  const totalIngresos = totales?.ingresos || 0
  const totalEgresos = totales?.egresos || 0
  const saldoEsperado = caja.saldo_inicial + totalIngresos - totalEgresos
  const saldoReal = parseFloat(saldo_final) || 0
  const diferencia = saldoReal - saldoEsperado

  // Guardar conteo de efectivo
  if (conteo_efectivo && Array.isArray(conteo_efectivo)) {
    await c.env.DB.prepare('DELETE FROM conteo_efectivo WHERE caja_id = ?').bind(id).run()
    for (const item of conteo_efectivo) {
      if (item.cantidad > 0) {
        await c.env.DB.prepare(
          'INSERT INTO conteo_efectivo (caja_id, denominacion, cantidad) VALUES (?, ?, ?)'
        ).bind(id, item.denominacion, item.cantidad).run()
      }
    }
  }

  // Guardar saldos por sistema
  if (saldos_sistemas && Array.isArray(saldos_sistemas)) {
    await c.env.DB.prepare('DELETE FROM saldos_sistemas WHERE caja_id = ?').bind(id).run()
    for (const saldo of saldos_sistemas) {
      if (saldo.saldo !== undefined) {
        await c.env.DB.prepare(
          'INSERT INTO saldos_sistemas (caja_id, sistema, saldo) VALUES (?, ?, ?)'
        ).bind(id, saldo.sistema, saldo.saldo).run()
      }
    }
  }

  // Actualizar caja
  await c.env.DB.prepare(`
    UPDATE cajas SET 
      saldo_final = ?, estado = 'cuadrada', notas = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(saldoReal, notas || '', id).run()

  return c.json({
    success: true,
    resumen: {
      saldo_inicial: caja.saldo_inicial,
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_esperado: Math.round(saldoEsperado * 100) / 100,
      saldo_real: saldoReal,
      diferencia: Math.round(diferencia * 100) / 100,
      cuadre_ok: Math.abs(diferencia) <= 0.50
    }
  })
})

// POST /api/cajas/:id/aprobar - Aprobar cuadre (admin/supervisor/superadmin)
cajasRoutes.post('/:id/aprobar', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos para aprobar cajas' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  const { aprobado } = await c.req.json()

  const caja = await c.env.DB.prepare('SELECT * FROM cajas WHERE id = ?').bind(id).first()
  if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)

  const nuevoEstado = aprobado ? 'aprobada' : 'rechazada'
  await c.env.DB.prepare(`
    UPDATE cajas SET estado = ?, aprobado_por = ?, aprobado_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).bind(nuevoEstado, session.userId, id).run()

  return c.json({ success: true, estado: nuevoEstado })
})
