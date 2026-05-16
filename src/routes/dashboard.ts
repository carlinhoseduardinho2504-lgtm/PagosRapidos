import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database }

export const dashboardRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/dashboard - Dashboard principal
dashboardRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  const today = new Date().toISOString().split('T')[0]
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  // Estadísticas de hoy
  let cajasHoyQuery = `
    SELECT COUNT(*) as total, 
           SUM(CASE WHEN estado='abierta' THEN 1 ELSE 0 END) as abiertas,
           SUM(CASE WHEN estado='cuadrada' THEN 1 ELSE 0 END) as cuadradas,
           SUM(CASE WHEN estado='aprobada' THEN 1 ELSE 0 END) as aprobadas
    FROM cajas WHERE fecha = ?`
  const cajasHoy = await c.env.DB.prepare(cajasHoyQuery).bind(today).first()

  // Movimientos de hoy
  let movHoyQuery = `
    SELECT 
      SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) as egresos,
      COUNT(*) as total
    FROM movimientos m
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha = ?`
  const movHoy = isAdmin
    ? await c.env.DB.prepare(movHoyQuery).bind(today).first()
    : await c.env.DB.prepare(movHoyQuery + ' AND m.user_id = ?').bind(today, session.userId).first()

  // Pendientes activos
  const pendientesQuery = isAdmin
    ? `SELECT 
        COUNT(CASE WHEN estado IN ('pendiente','pagado_parcial') THEN 1 END) as activos,
        SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_pagar,
        SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
        COUNT(CASE WHEN fecha_vencimiento <= date('now') AND estado IN ('pendiente','pagado_parcial') THEN 1 END) as vencidos
       FROM pendientes`
    : `SELECT 
        COUNT(CASE WHEN estado IN ('pendiente','pagado_parcial') THEN 1 END) as activos,
        SUM(CASE WHEN tipo='por_pagar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_pagar,
        SUM(CASE WHEN tipo='por_cobrar' AND estado IN ('pendiente','pagado_parcial') THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
        COUNT(CASE WHEN fecha_vencimiento <= date('now') AND estado IN ('pendiente','pagado_parcial') THEN 1 END) as vencidos
       FROM pendientes WHERE user_id = ?`
  const pendientesStats = isAdmin
    ? await c.env.DB.prepare(pendientesQuery).first()
    : await c.env.DB.prepare(pendientesQuery).bind(session.userId).first()

  // Gráfico: ingresos vs egresos últimos 7 días
  const chartData = await c.env.DB.prepare(`
    SELECT c.fecha,
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as egresos
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.fecha >= date('now', '-7 days')
    ${isAdmin ? '' : 'AND c.user_id = ?'}
    GROUP BY c.fecha ORDER BY c.fecha ASC
  `).bind(...(isAdmin ? [] : [session.userId])).all()

  // Pendientes vencidos próximos 3 días
  const alertasPendientes = await c.env.DB.prepare(`
    SELECT p.codigo, p.nombre_deudor, p.monto_pendiente, p.fecha_vencimiento, p.tipo, p.prioridad,
           u.nombre as registrado_por
    FROM pendientes p JOIN users u ON p.user_id = u.id
    WHERE p.estado IN ('pendiente', 'pagado_parcial')
      AND p.fecha_vencimiento IS NOT NULL
      AND p.fecha_vencimiento <= date('now', '+3 days')
    ${isAdmin ? '' : 'AND p.user_id = ?'}
    ORDER BY p.fecha_vencimiento ASC LIMIT 10
  `).bind(...(isAdmin ? [] : [session.userId])).all()

  // Top trabajadores (solo admin)
  let topTrabajadores = null
  if (isAdmin) {
    topTrabajadores = await c.env.DB.prepare(`
      SELECT u.nombre, u.apellido, u.cedula,
             COUNT(DISTINCT c.id) as num_cajas,
             SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
             SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos
      FROM users u
      LEFT JOIN cajas c ON c.user_id = u.id AND c.fecha >= date('now', '-30 days')
      LEFT JOIN movimientos m ON m.caja_id = c.id
      WHERE u.activo = 1 AND u.role = 'trabajador'
      GROUP BY u.id ORDER BY total_ingresos DESC LIMIT 8
    `).all()
  }

  // Caja del día del usuario actual
  const miCajaHoy = !isAdmin ? await c.env.DB.prepare(`
    SELECT c.id, c.estado, c.saldo_inicial,
           SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as ingresos,
           SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as egresos
    FROM cajas c
    LEFT JOIN movimientos m ON m.caja_id = c.id
    WHERE c.user_id = ? AND c.fecha = ?
    GROUP BY c.id
  `).bind(session.userId, today).first() : null

  return c.json({
    fecha: today,
    usuario: { id: session.userId, nombre: session.nombre, role: session.role },
    cajas_hoy: cajasHoy,
    movimientos_hoy: movHoy,
    pendientes: pendientesStats,
    chart_data: chartData.results,
    alertas_pendientes: alertasPendientes.results,
    top_trabajadores: topTrabajadores?.results || null,
    mi_caja_hoy: miCajaHoy || null
  })
})
