import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database }

export const historialRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/historial - Obtener historial diario
historialRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const user_id = c.req.query('user_id')
  const mes = c.req.query('mes') // YYYY-MM
  const limit = parseInt(c.req.query('limit') || '30')

  let query = `
    SELECT h.*, u.nombre, u.apellido
    FROM historial_diario h
    JOIN users u ON h.user_id = u.id
    WHERE 1=1
  `
  const params: any[] = []

  // Trabajadores solo ven su propio historial
  if (!isAdmin) {
    query += ' AND h.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    query += ' AND h.user_id = ?'
    params.push(parseInt(user_id))
  }

  if (mes) {
    query += " AND strftime('%Y-%m', h.fecha) = ?"
    params.push(mes)
  }

  query += ` ORDER BY h.fecha DESC LIMIT ?`
  params.push(limit)

  const result = await c.env.DB.prepare(query).bind(...params).all()

  const historial = (result.results || []).map((h: any) => ({
    ...h,
    snapshot_data: h.snapshot_data ? JSON.parse(h.snapshot_data) : null
  }))

  return c.json({ historial, total: historial.length })
})

// GET /api/historial/mensual - Resumen mensual para reportes
historialRoutes.get('/mensual', auth, async (c) => {
  const session = c.get('session')
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const anio = c.req.query('anio') || new Date().getFullYear().toString()
  const user_id = c.req.query('user_id')

  let query = `
    SELECT 
      strftime('%Y-%m', fecha) as mes,
      h.user_id,
      u.nombre, u.apellido,
      SUM(total_ingresos) as total_ingresos,
      SUM(total_egresos) as total_egresos,
      SUM(ganancia_neta) as ganancia_neta,
      AVG(diferencia_caja) as promedio_diferencia,
      COUNT(*) as dias_trabajados,
      SUM(num_movimientos) as total_movimientos,
      SUM(num_pendientes_cobrados) as pendientes_cobrados
    FROM historial_diario h
    JOIN users u ON h.user_id = u.id
    WHERE strftime('%Y', fecha) = ?
  `
  const params: any[] = [anio]

  if (!isAdmin) {
    query += ' AND h.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    query += ' AND h.user_id = ?'
    params.push(parseInt(user_id))
  }

  query += ' GROUP BY mes, h.user_id ORDER BY mes DESC, ganancia_neta DESC'

  const result = await c.env.DB.prepare(query).bind(...params).all()

  return c.json({ resumen_mensual: result.results || [], anio })
})

// GET /api/historial/fecha/:fecha - Snapshot de un día específico
historialRoutes.get('/fecha/:fecha', auth, async (c) => {
  const session = c.get('session')
  const fecha = c.req.param('fecha') // YYYY-MM-DD
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  let query = `
    SELECT h.*, u.nombre, u.apellido
    FROM historial_diario h
    JOIN users u ON h.user_id = u.id
    WHERE h.fecha = ?
  `
  const params: any[] = [fecha]

  if (!isAdmin) {
    query += ' AND h.user_id = ?'
    params.push(session.userId)
  }

  const result = await c.env.DB.prepare(query).bind(...params).all()

  const snapshots = (result.results || []).map((h: any) => ({
    ...h,
    snapshot_data: h.snapshot_data ? JSON.parse(h.snapshot_data) : null
  }))

  return c.json({ snapshots, fecha })
})

// POST /api/historial/snapshot - Guardar snapshot del día (se llama al aprobar cuadre)
historialRoutes.post('/snapshot', auth, async (c) => {
  const session = c.get('session')
  const { caja_id, fecha_override } = await c.req.json()

  const fecha = fecha_override || new Date().toISOString().split('T')[0]

  // Obtener datos de la caja
  let cajaQuery = caja_id
    ? 'SELECT * FROM cajas WHERE id = ?'
    : "SELECT * FROM cajas WHERE user_id = ? AND date(fecha) = ? ORDER BY created_at DESC LIMIT 1"

  const caja: any = caja_id
    ? await c.env.DB.prepare(cajaQuery).bind(parseInt(caja_id)).first()
    : await c.env.DB.prepare(cajaQuery).bind(session.userId, fecha).first()

  if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)

  // Verificar permisos (solo el dueño de la caja o admin puede guardar snapshot)
  if (caja.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  // Obtener movimientos del día
  const movimientos = await c.env.DB.prepare(`
    SELECT tipo, SUM(monto) as total, COUNT(*) as cantidad
    FROM movimientos WHERE caja_id = ? GROUP BY tipo
  `).bind(caja.id).all()

  // Obtener saldos sistemas
  const saldosSistemas = await c.env.DB.prepare(
    'SELECT * FROM saldos_sistemas WHERE caja_id = ?'
  ).bind(caja.id).all()

  // Obtener conteo efectivo
  const conteoEfectivo = await c.env.DB.prepare(
    'SELECT * FROM conteo_efectivo WHERE caja_id = ?'
  ).bind(caja.id).all()

  // Obtener pendientes cobrados hoy
  const pendientesCobrados = await c.env.DB.prepare(`
    SELECT COUNT(*) as total FROM abonos_pendientes
    WHERE caja_id = ? AND date(created_at) = ?
  `).bind(caja.id, fecha).first<{ total: number }>()

  const movsMap: Record<string, { total: number; cantidad: number }> = {}
  for (const m of (movimientos.results || []) as any[]) {
    movsMap[m.tipo] = { total: m.total, cantidad: m.cantidad }
  }

  const totalIngresos = movsMap['ingreso']?.total || 0
  const totalEgresos = movsMap['egreso']?.total || 0
  const gananciaNeta = totalIngresos - totalEgresos
  const numMovimientos = (movsMap['ingreso']?.cantidad || 0) + (movsMap['egreso']?.cantidad || 0)

  const snapshotData = {
    caja,
    movimientos: movimientos.results,
    saldos_sistemas: saldosSistemas.results,
    conteo_efectivo: conteoEfectivo.results,
    timestamp: new Date().toISOString()
  }

  // Verificar si ya existe snapshot para este día/usuario
  const existing = await c.env.DB.prepare(
    'SELECT id FROM historial_diario WHERE user_id = ? AND fecha = ?'
  ).bind(caja.user_id, fecha).first<{ id: number }>()

  if (existing) {
    // Actualizar snapshot existente
    await c.env.DB.prepare(`
      UPDATE historial_diario SET
        caja_id = ?,
        saldo_inicial = ?,
        total_ingresos = ?,
        total_egresos = ?,
        ganancia_neta = ?,
        diferencia_caja = ?,
        num_movimientos = ?,
        num_pendientes_cobrados = ?,
        snapshot_data = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      caja.id,
      caja.saldo_inicial || 0,
      totalIngresos,
      totalEgresos,
      gananciaNeta,
      caja.diferencia || 0,
      numMovimientos,
      pendientesCobrados?.total || 0,
      JSON.stringify(snapshotData),
      existing.id
    ).run()

    return c.json({ success: true, updated: true, fecha, historial_id: existing.id })
  } else {
    // Crear nuevo snapshot
    const result = await c.env.DB.prepare(`
      INSERT INTO historial_diario (
        user_id, caja_id, fecha,
        saldo_inicial, total_ingresos, total_egresos, ganancia_neta,
        diferencia_caja, num_movimientos, num_pendientes_cobrados,
        snapshot_data, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      caja.user_id,
      caja.id,
      fecha,
      caja.saldo_inicial || 0,
      totalIngresos,
      totalEgresos,
      gananciaNeta,
      caja.diferencia || 0,
      numMovimientos,
      pendientesCobrados?.total || 0,
      JSON.stringify(snapshotData)
    ).run()

    return c.json({ success: true, created: true, fecha, historial_id: result.meta.last_row_id })
  }
})
