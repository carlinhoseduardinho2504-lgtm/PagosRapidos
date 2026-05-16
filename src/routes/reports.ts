import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database }

export const reportsRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/reports/cajas - Reporte de cajas
reportsRoutes.get('/cajas', auth, async (c) => {
  const session = c.get('session')
  const { fecha_inicio, fecha_fin, user_id } = c.req.query()
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const fi = fecha_inicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const ff = fecha_fin || new Date().toISOString().split('T')[0]

  let query = `
    SELECT c.id, c.fecha, c.estado, c.saldo_inicial, c.saldo_final, c.notas,
           u.nombre, u.apellido, u.cedula,
           SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
           SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
           (c.saldo_inicial + SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) 
            - SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END)) as saldo_esperado,
           (c.saldo_final - (c.saldo_inicial + SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) 
            - SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END))) as diferencia
    FROM cajas c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
  `
  const params: any[] = [fi, ff]

  if (!isAdmin) {
    query += ' AND c.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    query += ' AND c.user_id = ?'
    params.push(parseInt(user_id))
  }

  query += ' GROUP BY c.id ORDER BY c.fecha DESC, u.nombre ASC'

  const result = await c.env.DB.prepare(query).bind(...params).all()

  // Totales globales del período
  const totales = await c.env.DB.prepare(`
    SELECT 
      COUNT(DISTINCT c.id) as num_cajas,
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
      COUNT(DISTINCT c.user_id) as num_trabajadores
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
    ${!isAdmin ? 'AND c.user_id = ?' : ''}
  `).bind(...(isAdmin ? [fi, ff] : [fi, ff, session.userId])).first()

  return c.json({
    cajas: result.results,
    totales,
    periodo: { desde: fi, hasta: ff }
  })
})

// GET /api/reports/movimientos - Reporte detallado de movimientos
reportsRoutes.get('/movimientos', auth, async (c) => {
  const session = c.get('session')
  const { fecha_inicio, fecha_fin, tipo, categoria } = c.req.query()
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const fi = fecha_inicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const ff = fecha_fin || new Date().toISOString().split('T')[0]

  let query = `
    SELECT m.*, u.nombre, u.apellido, c.fecha as fecha_caja
    FROM movimientos m
    JOIN users u ON m.user_id = u.id
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ?
  `
  const params: any[] = [fi, ff]

  if (!isAdmin) { query += ' AND m.user_id = ?'; params.push(session.userId) }
  if (tipo) { query += ' AND m.tipo = ?'; params.push(tipo) }
  if (categoria) { query += ' AND m.categoria = ?'; params.push(categoria) }

  query += ' ORDER BY c.fecha DESC, m.created_at DESC'

  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ movimientos: result.results, periodo: { desde: fi, hasta: ff } })
})

// GET /api/reports/pendientes - Reporte de pendientes
reportsRoutes.get('/pendientes', auth, async (c) => {
  const session = c.get('session')
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const pendientes = await c.env.DB.prepare(`
    SELECT p.*, u.nombre, u.apellido,
           (p.monto_original - p.monto_pendiente) as total_pagado,
           (SELECT COUNT(*) FROM abonos_pendientes WHERE pendiente_id = p.id) as num_abonos
    FROM pendientes p JOIN users u ON p.user_id = u.id
    ${!isAdmin ? 'WHERE p.user_id = ?' : ''}
    ORDER BY p.estado ASC, p.created_at DESC
  `).bind(...(isAdmin ? [] : [session.userId])).all()

  const resumen = await c.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as por_pagar,
      SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as por_cobrar,
      COUNT(CASE WHEN estado='pendiente' THEN 1 END) as total_pendientes,
      COUNT(CASE WHEN estado='pagado_total' THEN 1 END) as total_pagados,
      COUNT(CASE WHEN estado='cancelado' THEN 1 END) as total_cancelados
    FROM pendientes
    ${!isAdmin ? 'WHERE user_id = ?' : ''}
  `).bind(...(isAdmin ? [] : [session.userId])).first()

  return c.json({ pendientes: pendientes.results, resumen })
})

// GET /api/reports/auditoria - Log de auditoría (solo superadmin)
reportsRoutes.get('/auditoria', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) return c.json({ error: 'Sin permisos' }, 403)

  const { limit = '100', offset = '0', user_id, accion } = c.req.query()

  let query = `
    SELECT al.*, u.nombre, u.apellido, u.cedula
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `
  const params: any[] = []
  if (user_id) { query += ' AND al.user_id = ?'; params.push(parseInt(user_id)) }
  if (accion) { query += ' AND al.accion = ?'; params.push(accion) }
  query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), parseInt(offset))

  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ logs: result.results })
})
