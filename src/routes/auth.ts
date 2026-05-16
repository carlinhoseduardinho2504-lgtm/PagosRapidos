import { Hono } from 'hono'
import { hashPassword, verifyPassword, generateSessionToken } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket }
type Variables = { session: any }

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  try {
    const { cedula, password } = await c.req.json()

    if (!cedula || !password) {
      return c.json({ error: 'Cédula y contraseña son requeridas' }, 400)
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE cedula = ? AND activo = 1'
    ).bind(cedula.trim()).first<{
      id: number; cedula: string; nombre: string; apellido: string
      email: string; password_hash: string; role: string; activo: number
    }>()

    if (!user) {
      return c.json({ error: 'Cédula o contraseña incorrecta' }, 401)
    }

    const valid = await verifyPassword(password, cedula, user.password_hash)
    if (!valid) {
      return c.json({ error: 'Cédula o contraseña incorrecta' }, 401)
    }

    // Crear sesión (24 horas)
    const token = await generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    await c.env.DB.prepare(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(token, user.id, expiresAt).run()

    // Log de auditoría
    await c.env.DB.prepare(
      'INSERT INTO audit_logs (user_id, accion, tabla, datos_nuevos) VALUES (?, ?, ?, ?)'
    ).bind(user.id, 'LOGIN', 'sessions', JSON.stringify({ ip: c.req.header('CF-Connecting-IP') || 'local' })).run()

    return c.json({
      token,
      user: {
        id: user.id,
        cedula: user.cedula,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
        nombre_completo: `${user.nombre} ${user.apellido}`
      },
      expires_at: expiresAt
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return c.json({ error: 'Error interno del servidor' }, 500)
  }
})

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
  }
  return c.json({ success: true })
})

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'No autorizado' }, 401)
  }
  const token = authHeader.substring(7)

  const session = await c.env.DB.prepare(`
    SELECT s.id, s.expires_at, u.id as user_id, u.cedula, u.nombre, u.apellido, u.email, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1
  `).bind(token).first<{
    id: string; expires_at: string; user_id: number; cedula: string
    nombre: string; apellido: string; email: string; role: string
  }>()

  if (!session) {
    return c.json({ error: 'Sesión inválida o expirada' }, 401)
  }

  return c.json({
    id: session.user_id,
    cedula: session.cedula,
    nombre: session.nombre,
    apellido: session.apellido,
    email: session.email,
    role: session.role,
    nombre_completo: `${session.nombre} ${session.apellido}`
  })
})

// POST /api/auth/change-password
authRoutes.post('/change-password', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return c.json({ error: 'No autorizado' }, 401)
  const token = authHeader.substring(7)

  const session = await c.env.DB.prepare(`
    SELECT s.user_id, u.cedula FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).bind(token).first<{ user_id: number; cedula: string }>()

  if (!session) return c.json({ error: 'Sesión inválida' }, 401)

  const { current_password, new_password } = await c.req.json()
  if (!current_password || !new_password) return c.json({ error: 'Datos incompletos' }, 400)
  if (new_password.length < 6) return c.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)

  const user = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(session.user_id).first<{ password_hash: string }>()

  if (!user) return c.json({ error: 'Usuario no encontrado' }, 404)

  const valid = await verifyPassword(current_password, session.cedula, user.password_hash)
  if (!valid) return c.json({ error: 'Contraseña actual incorrecta' }, 400)

  const newHash = await hashPassword(new_password, session.cedula)
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .bind(newHash, session.user_id).run()

  return c.json({ success: true, message: 'Contraseña actualizada correctamente' })
})
