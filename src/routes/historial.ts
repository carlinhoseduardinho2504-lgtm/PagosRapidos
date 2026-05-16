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
  try {
    const session = c.get('session')
    const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

    const user_id = c.req.query('user_id')
    const mes = c.req.query('mes') // YYYY-MM
    const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)

    let query = `
      SELECT h.id, h.user_id, h.fecha, h.saldo_inicial, h.total_ingresos,
             h.total_egresos, h.ganancia_neta, h.saldo_final,
             h.num_movimientos, h.num_pendientes_nuevos, h.estado_caja,
             h.snapshot_data, h.created_at,
             u.nombre, u.apellido
      FROM historial_diario h
      JOIN users u ON h.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

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

    const result = params.length > 0
      ? await c.env.DB.prepare(query).bind(...params).all()
      : await c.env.DB.prepare(query).all()

    const historial = (result.results || []).map((h: any) => ({
      ...h,
      snapshot_data: h.snapshot_data ? (() => { try { return JSON.parse(h.snapshot_data) } catch { return null } })() : null
    }))

    return c.json({ historial, total: historial.length })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/historial/mensual - Resumen mensual para reportes
historialRoutes.get('/mensual', auth, async (c) => {
  try {
    const session = c.get('session')
    const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

    const anio = c.req.query('anio') || new Date().getFullYear().toString()
    const user_id = c.req.query('user_id')

    // Solo columnas que realmente existen en historial_diario
    let query = `
      SELECT
        strftime('%Y-%m', h.fecha) as mes,
        h.user_id,
        u.nombre, u.apellido,
        SUM(h.total_ingresos) as total_ingresos,
        SUM(h.total_egresos) as total_egresos,
        SUM(h.ganancia_neta) as ganancia_neta,
        SUM(h.saldo_final) as total_saldo_final,
        COUNT(*) as dias_trabajados,
        SUM(h.num_movimientos) as total_movimientos,
        SUM(h.num_pendientes_nuevos) as pendientes_nuevos
      FROM historial_diario h
      JOIN users u ON h.user_id = u.id
      WHERE strftime('%Y', h.fecha) = ?
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
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// GET /api/historial/fecha/:fecha - Snapshot de un día específico
historialRoutes.get('/fecha/:fecha', auth, async (c) => {
  try {
    const session = c.get('session')
    const fecha = c.req.param('fecha') // YYYY-MM-DD
    const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

    let query = `
      SELECT h.id, h.user_id, h.fecha, h.saldo_inicial, h.total_ingresos,
             h.total_egresos, h.ganancia_neta, h.saldo_final,
             h.num_movimientos, h.num_pendientes_nuevos, h.estado_caja,
             h.snapshot_data, h.created_at,
             u.nombre, u.apellido
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
      snapshot_data: h.snapshot_data ? (() => { try { return JSON.parse(h.snapshot_data) } catch { return null } })() : null
    }))

    return c.json({ snapshots, fecha })
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

// POST /api/historial/snapshot - Guardar snapshot del día (se llama al aprobar cuadre)
historialRoutes.post('/snapshot', auth, async (c) => {
  try {
    const session = c.get('session')
    const body = await c.req.json().catch(() => ({}))
    const { caja_id, fecha_override } = body as any

    const fecha = fecha_override || new Date().toISOString().split('T')[0]

    // Obtener datos de la caja
    let caja: any
    if (caja_id) {
      caja = await c.env.DB.prepare('SELECT * FROM cajas WHERE id = ?').bind(parseInt(caja_id)).first()
    } else {
      caja = await c.env.DB.prepare(
        "SELECT * FROM cajas WHERE user_id = ? AND date(fecha) = ? ORDER BY created_at DESC LIMIT 1"
      ).bind(session.userId, fecha).first()
    }

    if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)

    if (caja.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
      return c.json({ error: 'Sin permisos' }, 403)
    }

    // Movimientos del día
    const movimientos = await c.env.DB.prepare(`
      SELECT tipo, SUM(monto) as total, COUNT(*) as cantidad
      FROM movimientos WHERE caja_id = ? GROUP BY tipo
    `).bind(caja.id).all()

    const movsMap: Record<string, { total: number; cantidad: number }> = {}
    for (const m of (movimientos.results || []) as any[]) {
      movsMap[m.tipo] = { total: m.total, cantidad: m.cantidad }
    }

    const totalIngresos = movsMap['ingreso']?.total || 0
    const totalEgresos = movsMap['egreso']?.total || 0
    const gananciaNeta = totalIngresos - totalEgresos
    const saldoFinal = caja.saldo_final || (caja.saldo_inicial + totalIngresos - totalEgresos)
    const numMovimientos = (movsMap['ingreso']?.cantidad || 0) + (movsMap['egreso']?.cantidad || 0)

    // Pendientes nuevos del día
    const pendientesNuevos = await c.env.DB.prepare(`
      SELECT COUNT(*) as total FROM pendientes
      WHERE user_id = ? AND date(created_at) = ?
    `).bind(caja.user_id, fecha).first<{ total: number }>()

    const snapshotData = {
      caja_id: caja.id,
      caja_fecha: caja.fecha,
      saldo_inicial: caja.saldo_inicial,
      saldo_final: saldoFinal,
      movimientos: movimientos.results,
      timestamp: new Date().toISOString()
    }

    // Verificar si ya existe snapshot
    const existing = await c.env.DB.prepare(
      'SELECT id FROM historial_diario WHERE user_id = ? AND fecha = ?'
    ).bind(caja.user_id, fecha).first<{ id: number }>()

    if (existing) {
      await c.env.DB.prepare(`
        UPDATE historial_diario SET
          saldo_inicial = ?,
          total_ingresos = ?,
          total_egresos = ?,
          ganancia_neta = ?,
          saldo_final = ?,
          num_movimientos = ?,
          num_pendientes_nuevos = ?,
          estado_caja = 'aprobada',
          snapshot_data = ?
        WHERE id = ?
      `).bind(
        caja.saldo_inicial || 0,
        totalIngresos,
        totalEgresos,
        gananciaNeta,
        saldoFinal,
        numMovimientos,
        pendientesNuevos?.total || 0,
        JSON.stringify(snapshotData),
        existing.id
      ).run()
      return c.json({ success: true, updated: true, fecha, historial_id: existing.id })
    } else {
      const result = await c.env.DB.prepare(`
        INSERT INTO historial_diario (
          user_id, fecha, saldo_inicial, total_ingresos, total_egresos,
          ganancia_neta, saldo_final, num_movimientos, num_pendientes_nuevos,
          estado_caja, snapshot_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprobada', ?, datetime('now'))
      `).bind(
        caja.user_id,
        fecha,
        caja.saldo_inicial || 0,
        totalIngresos,
        totalEgresos,
        gananciaNeta,
        saldoFinal,
        numMovimientos,
        pendientesNuevos?.total || 0,
        JSON.stringify(snapshotData)
      ).run()
      return c.json({ success: true, created: true, fecha, historial_id: result.meta.last_row_id })
    }
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})
