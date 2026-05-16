import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket }

export const movimientosRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/movimientos - Listar movimientos
movimientosRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  const { caja_id, tipo, categoria, limit = '50', offset = '0' } = c.req.query()

  let query = `
    SELECT m.*, u.nombre, u.apellido, c.fecha as fecha_caja
    FROM movimientos m
    JOIN users u ON m.user_id = u.id
    JOIN cajas c ON m.caja_id = c.id
    WHERE 1=1
  `
  const params: any[] = []

  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    query += ' AND m.user_id = ?'
    params.push(session.userId)
  }

  if (caja_id) { query += ' AND m.caja_id = ?'; params.push(parseInt(caja_id)) }
  if (tipo) { query += ' AND m.tipo = ?'; params.push(tipo) }
  if (categoria) { query += ' AND m.categoria = ?'; params.push(categoria) }

  query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(limit), parseInt(offset))

  const result = await c.env.DB.prepare(query).bind(...params).all()
  return c.json({ movimientos: result.results })
})

// POST /api/movimientos - Registrar movimiento
movimientosRoutes.post('/', auth, async (c) => {
  const session = c.get('session')
  const { caja_id, tipo, categoria, descripcion, monto, referencia, hora } = await c.req.json()

  if (!caja_id || !tipo || !descripcion || !monto) {
    return c.json({ error: 'caja_id, tipo, descripcion y monto son requeridos' }, 400)
  }

  if (!['ingreso', 'egreso'].includes(tipo)) {
    return c.json({ error: 'tipo debe ser ingreso o egreso' }, 400)
  }

  const montoNum = parseFloat(monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    return c.json({ error: 'El monto debe ser un número mayor a 0' }, 400)
  }

  // Verificar que la caja existe y está abierta
  const caja = await c.env.DB.prepare('SELECT * FROM cajas WHERE id = ?')
    .bind(parseInt(caja_id)).first<{ id: number; user_id: number; estado: string }>()

  if (!caja) return c.json({ error: 'Caja no encontrada' }, 404)
  if (caja.estado !== 'abierta') {
    return c.json({ error: 'La caja no está abierta' }, 400)
  }

  // Verificar permisos
  if (caja.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos para registrar en esta caja' }, 403)
  }

  const horaActual = hora || new Date().toTimeString().split(' ')[0]

  const result = await c.env.DB.prepare(`
    INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia, hora)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    parseInt(caja_id), session.userId, tipo,
    categoria || 'efectivo', descripcion.trim(),
    montoNum, referencia || '', horaActual
  ).run()

  return c.json({
    success: true,
    movimiento_id: result.meta.last_row_id,
    tipo, categoria: categoria || 'efectivo',
    descripcion, monto: montoNum
  }, 201)
})

// DELETE /api/movimientos/:id - Eliminar movimiento (admin/superadmin)
movimientosRoutes.delete('/:id', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM movimientos WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// GET /api/movimientos/stats - Estadísticas
movimientosRoutes.get('/stats', auth, async (c) => {
  const session = c.get('session')
  const { fecha_inicio, fecha_fin, user_id } = c.req.query()

  let userFilter = ''
  const params: any[] = []

  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    userFilter = 'AND m.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    userFilter = 'AND m.user_id = ?'
    params.push(parseInt(user_id))
  }

  const fi = fecha_inicio || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const ff = fecha_fin || new Date().toISOString().split('T')[0]
  params.push(fi, ff)

  const stats = await c.env.DB.prepare(`
    SELECT 
      SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) as total_ingresos,
      SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) as total_egresos,
      COUNT(*) as total_movimientos,
      COUNT(DISTINCT m.caja_id) as total_cajas,
      m.categoria,
      SUM(m.monto) as total_por_categoria
    FROM movimientos m
    JOIN cajas c ON m.caja_id = c.id
    WHERE c.fecha BETWEEN ? AND ? ${userFilter}
    GROUP BY m.categoria
  `).bind(...params).all()

  return c.json({ stats: stats.results, periodo: { desde: fi, hasta: ff } })
})
