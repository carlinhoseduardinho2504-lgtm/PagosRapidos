import { Hono } from 'hono'
import { getSession, generateCodigo } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket }

export const pendientesRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/pendientes - Listar pendientes
pendientesRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  const { tipo, estado, user_id, search, limit = '50', offset = '0' } = c.req.query()

  let query = `
    SELECT p.*, u.nombre as registrado_por_nombre, u.apellido as registrado_por_apellido,
           (SELECT SUM(monto) FROM abonos_pendientes WHERE pendiente_id = p.id) as total_abonado
    FROM pendientes p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `
  const params: any[] = []

  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    query += ' AND p.user_id = ?'
    params.push(session.userId)
  } else if (user_id) {
    query += ' AND p.user_id = ?'
    params.push(parseInt(user_id))
  }

  if (tipo) { query += ' AND p.tipo = ?'; params.push(tipo) }
  if (estado) { query += ' AND p.estado = ?'; params.push(estado) }
  if (search) {
    query += ' AND (p.nombre_deudor LIKE ? OR p.cedula_deudor LIKE ? OR p.codigo LIKE ? OR p.descripcion LIKE ?)'
    const s = `%${search}%`
    params.push(s, s, s, s)
  }

  query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  params.push(parseInt(limit), parseInt(offset))

  const result = await c.env.DB.prepare(query).bind(...params).all()

  // Totales
  let totalQuery = `
    SELECT 
      SUM(CASE WHEN tipo='por_pagar' AND estado != 'cancelado' THEN monto_pendiente ELSE 0 END) as total_por_pagar,
      SUM(CASE WHEN tipo='por_cobrar' AND estado != 'cancelado' THEN monto_pendiente ELSE 0 END) as total_por_cobrar,
      COUNT(CASE WHEN estado = 'pendiente' OR estado = 'pagado_parcial' THEN 1 END) as total_activos
    FROM pendientes WHERE 1=1
  `
  const totalParams: any[] = []
  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    totalQuery += ' AND user_id = ?'
    totalParams.push(session.userId)
  }
  const totales = await c.env.DB.prepare(totalQuery).bind(...totalParams).first()

  return c.json({
    pendientes: result.results,
    totales,
    total: result.results.length
  })
})

// GET /api/pendientes/:id
pendientesRoutes.get('/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))

  const pendiente = await c.env.DB.prepare(`
    SELECT p.*, u.nombre as registrado_por_nombre, u.apellido as registrado_por_apellido
    FROM pendientes p JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `).bind(id).first<{ user_id: number } & Record<string, any>>()

  if (!pendiente) return c.json({ error: 'Pendiente no encontrado' }, 404)

  if (pendiente.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const abonos = await c.env.DB.prepare(`
    SELECT a.*, u.nombre, u.apellido FROM abonos_pendientes a
    JOIN users u ON a.user_id = u.id
    WHERE a.pendiente_id = ? ORDER BY a.fecha DESC
  `).bind(id).all()

  return c.json({ pendiente, abonos: abonos.results })
})

// POST /api/pendientes - Crear pendiente
pendientesRoutes.post('/', auth, async (c) => {
  const session = c.get('session')
  const { tipo, nombre_deudor, cedula_deudor, descripcion, monto, fecha_vencimiento, prioridad } = await c.req.json()

  if (!nombre_deudor || !monto) {
    return c.json({ error: 'nombre_deudor y monto son requeridos' }, 400)
  }

  const montoNum = parseFloat(monto)
  if (isNaN(montoNum) || montoNum <= 0) {
    return c.json({ error: 'El monto debe ser mayor a 0' }, 400)
  }

  const codigo = generateCodigo(tipo || 'por_pagar')
  const tipoFinal = tipo || 'por_pagar'

  const result = await c.env.DB.prepare(`
    INSERT INTO pendientes (codigo, user_id, tipo, nombre_deudor, cedula_deudor, descripcion, monto_original, monto_pendiente, fecha_vencimiento, prioridad, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
  `).bind(
    codigo, session.userId, tipoFinal,
    nombre_deudor.trim(), cedula_deudor || '',
    descripcion || '', montoNum, montoNum,
    fecha_vencimiento || null, prioridad || 'normal'
  ).run()

  // Si hay una caja abierta hoy, registrar como ingreso (el pendiente entra como ingreso)
  const today = new Date().toISOString().split('T')[0]
  const cajaAbierta = await c.env.DB.prepare(
    "SELECT id FROM cajas WHERE user_id = ? AND fecha = ? AND estado = 'abierta'"
  ).bind(session.userId, today).first<{ id: number }>()

  if (cajaAbierta && tipoFinal === 'por_cobrar') {
    // Los pendientes por cobrar entran como ingreso pendiente
    await c.env.DB.prepare(`
      INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia)
      VALUES (?, ?, 'ingreso', 'pendiente', ?, ?, ?)
    `).bind(cajaAbierta.id, session.userId, `Pendiente - ${nombre_deudor}`, montoNum, codigo).run()
  }

  return c.json({
    success: true,
    pendiente_id: result.meta.last_row_id,
    codigo,
    tipo: tipoFinal,
    monto: montoNum
  }, 201)
})

// POST /api/pendientes/:id/abonar - Registrar abono
pendientesRoutes.post('/:id/abonar', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))
  const { monto, notas, caja_id } = await c.req.json()

  if (!monto || parseFloat(monto) <= 0) {
    return c.json({ error: 'El monto del abono debe ser mayor a 0' }, 400)
  }

  const pendiente = await c.env.DB.prepare(
    "SELECT * FROM pendientes WHERE id = ? AND estado != 'cancelado'"
  ).bind(id).first<{
    id: number; user_id: number; monto_pendiente: number; monto_original: number
    nombre_deudor: string; codigo: string; tipo: string; estado: string
  }>()

  if (!pendiente) return c.json({ error: 'Pendiente no encontrado o cancelado' }, 404)

  const montoAbono = Math.min(parseFloat(monto), pendiente.monto_pendiente)
  const nuevoMontoPendiente = Math.max(0, pendiente.monto_pendiente - montoAbono)
  const nuevoEstado = nuevoMontoPendiente <= 0 ? 'pagado_total' : 'pagado_parcial'

  // Registrar abono
  const today = new Date().toISOString().split('T')[0]
  let cajaIdReal = caja_id ? parseInt(caja_id) : null

  if (!cajaIdReal) {
    const cajaHoy = await c.env.DB.prepare(
      "SELECT id FROM cajas WHERE user_id = ? AND fecha = ? AND estado = 'abierta'"
    ).bind(session.userId, today).first<{ id: number }>()
    cajaIdReal = cajaHoy?.id || null
  }

  await c.env.DB.prepare(`
    INSERT INTO abonos_pendientes (pendiente_id, caja_id, user_id, monto, notas)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, cajaIdReal, session.userId, montoAbono, notas || '').run()

  // Actualizar pendiente
  await c.env.DB.prepare(`
    UPDATE pendientes SET monto_pendiente = ?, estado = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(nuevoMontoPendiente, nuevoEstado, id).run()

  // El abono es un EGRESO de la caja (sale dinero para pagar)
  if (cajaIdReal && pendiente.tipo === 'por_pagar') {
    await c.env.DB.prepare(`
      INSERT INTO movimientos (caja_id, user_id, tipo, categoria, descripcion, monto, referencia)
      VALUES (?, ?, 'egreso', 'pendiente', ?, ?, ?)
    `).bind(cajaIdReal, session.userId, `Abono pendiente - ${pendiente.nombre_deudor}`, montoAbono, pendiente.codigo).run()
  }

  return c.json({
    success: true,
    monto_abonado: montoAbono,
    monto_pendiente_anterior: pendiente.monto_pendiente,
    monto_pendiente_nuevo: nuevoMontoPendiente,
    estado: nuevoEstado,
    pagado_total: nuevoEstado === 'pagado_total'
  })
})

// PUT /api/pendientes/:id - Actualizar
pendientesRoutes.put('/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))
  const { nombre_deudor, cedula_deudor, descripcion, fecha_vencimiento, prioridad, estado } = await c.req.json()

  const pendiente = await c.env.DB.prepare('SELECT user_id FROM pendientes WHERE id = ?')
    .bind(id).first<{ user_id: number }>()

  if (!pendiente) return c.json({ error: 'No encontrado' }, 404)
  if (pendiente.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const updates: string[] = ["updated_at = datetime('now')"]
  const values: any[] = []

  if (nombre_deudor) { updates.push('nombre_deudor = ?'); values.push(nombre_deudor) }
  if (cedula_deudor !== undefined) { updates.push('cedula_deudor = ?'); values.push(cedula_deudor) }
  if (descripcion !== undefined) { updates.push('descripcion = ?'); values.push(descripcion) }
  if (fecha_vencimiento !== undefined) { updates.push('fecha_vencimiento = ?'); values.push(fecha_vencimiento) }
  if (prioridad) { updates.push('prioridad = ?'); values.push(prioridad) }
  if (estado) { updates.push('estado = ?'); values.push(estado) }

  values.push(id)
  await c.env.DB.prepare(`UPDATE pendientes SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ success: true })
})

// DELETE /api/pendientes/:id - Cancelar
pendientesRoutes.delete('/:id', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) return c.json({ error: 'Sin permisos' }, 403)

  const id = parseInt(c.req.param('id'))
  await c.env.DB.prepare("UPDATE pendientes SET estado = 'cancelado', updated_at = datetime('now') WHERE id = ?")
    .bind(id).run()

  return c.json({ success: true })
})
