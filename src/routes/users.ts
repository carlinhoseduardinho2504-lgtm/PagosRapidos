import { Hono } from 'hono'
import { getSession, hashPassword } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket }

export const usersRoutes = new Hono<{ Bindings: Bindings }>()

// Middleware de auth
const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/users - Listar usuarios (admin/supervisor/superadmin)
usersRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const users = await c.env.DB.prepare(`
    SELECT id, cedula, nombre, apellido, email, role, activo, created_at
    FROM users ORDER BY nombre ASC
  `).all()

  return c.json({ users: users.results })
})

// GET /api/users/:id
usersRoutes.get('/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))

  // Solo puede ver su propio perfil a menos que sea admin+
  if (session.userId !== id && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const user = await c.env.DB.prepare(
    'SELECT id, cedula, nombre, apellido, email, role, activo, created_at FROM users WHERE id = ?'
  ).bind(id).first()

  if (!user) return c.json({ error: 'Usuario no encontrado' }, 404)
  return c.json({ user })
})

// POST /api/users - Crear usuario (SOLO superadmin)
usersRoutes.post('/', auth, async (c) => {
  const session = c.get('session')
  if (session.role !== 'superadmin') {
    return c.json({ error: 'Solo el superadmin puede crear usuarios' }, 403)
  }

  const { cedula, nombre, apellido, email, password, role } = await c.req.json()

  if (!cedula || !nombre || !apellido || !password) {
    return c.json({ error: 'Cédula, nombre, apellido y contraseña son requeridos' }, 400)
  }

  // Superadmin puede crear admin, supervisor o trabajador (nunca otro superadmin)
  const allowedRoles = ['admin', 'supervisor', 'trabajador']

  if (role && !allowedRoles.includes(role)) {
    return c.json({ error: `No puedes crear usuarios con rol: ${role}` }, 403)
  }

  // Verificar que la cédula no exista
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE cedula = ?').bind(cedula).first()
  if (existing) return c.json({ error: 'Ya existe un usuario con esa cédula' }, 409)

  const passwordHash = await hashPassword(password, cedula)
  const finalRole = role || 'trabajador'

  const result = await c.env.DB.prepare(`
    INSERT INTO users (cedula, nombre, apellido, email, password_hash, role, activo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).bind(cedula, nombre.trim(), apellido.trim(), email || '', passwordHash, finalRole).run()

  // Audit
  await c.env.DB.prepare(
    'INSERT INTO audit_logs (user_id, accion, tabla, registro_id, datos_nuevos) VALUES (?, ?, ?, ?, ?)'
  ).bind(session.userId, 'CREATE_USER', 'users', result.meta.last_row_id, JSON.stringify({ cedula, nombre, role: finalRole })).run()

  return c.json({
    success: true,
    user: {
      id: result.meta.last_row_id,
      cedula, nombre, apellido, email, role: finalRole
    }
  }, 201)
})

// PUT /api/users/:id - Actualizar usuario
usersRoutes.put('/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))

  if (session.userId !== id && !['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const { nombre, apellido, email, role, activo, password } = await c.req.json()

  // No puede cambiar el rol del superadmin a menos que sea superadmin
  if (role && session.role !== 'superadmin') {
    const targetUser = await c.env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(id).first<{ role: string }>()
    if (targetUser?.role === 'superadmin') {
      return c.json({ error: 'No puedes modificar el rol del superadmin' }, 403)
    }
  }

  const updates: string[] = []
  const values: any[] = []

  if (nombre) { updates.push('nombre = ?'); values.push(nombre) }
  if (apellido) { updates.push('apellido = ?'); values.push(apellido) }
  if (email !== undefined) { updates.push('email = ?'); values.push(email) }
  if (role && ['superadmin', 'admin'].includes(session.role)) {
    updates.push('role = ?'); values.push(role)
  }
  if (activo !== undefined && ['superadmin', 'admin'].includes(session.role)) {
    updates.push('activo = ?'); values.push(activo ? 1 : 0)
  }
  if (password) {
    const targetUser = await c.env.DB.prepare('SELECT cedula FROM users WHERE id = ?').bind(id).first<{ cedula: string }>()
    if (targetUser) {
      const hash = await hashPassword(password, targetUser.cedula)
      updates.push('password_hash = ?'); values.push(hash)
    }
  }

  if (updates.length === 0) return c.json({ error: 'No hay datos para actualizar' }, 400)

  updates.push("updated_at = datetime('now')")
  values.push(id)

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run()

  return c.json({ success: true, message: 'Usuario actualizado' })
})

// DELETE /api/users/:id (solo superadmin, desactiva)
usersRoutes.delete('/:id', auth, async (c) => {
  const session = c.get('session')
  if (session.role !== 'superadmin') return c.json({ error: 'Solo el superadmin puede eliminar usuarios' }, 403)

  const id = parseInt(c.req.param('id'))
  if (session.userId === id) return c.json({ error: 'No puedes eliminarte a ti mismo' }, 400)

  await c.env.DB.prepare("UPDATE users SET activo = 0, updated_at = datetime('now') WHERE id = ?").bind(id).run()
  return c.json({ success: true, message: 'Usuario desactivado' })
})
