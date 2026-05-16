// Utilidades de autenticación segura para Cloudflare Workers

// Hash de contraseña usando Web Crypto API (compatible con CF Workers)
export async function hashPassword(password: string, cedula: string): Promise<string> {
  const salt = `PAGOS_RAPIDOS_${cedula}_SALT_2024`
  const combined = `${password}:${salt}`
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(password: string, cedula: string, storedHash: string): Promise<boolean> {
  // Compatibilidad con hash legado del seed
  if (storedHash.startsWith('$hash$')) {
    const parts = storedHash.split('$')
    if (parts[2] === cedula && parts[3] === password) return true
  }
  const hash = await hashPassword(password, cedula)
  return hash === storedHash
}

// Generar token de sesión
export async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Generar código único para pendientes
export function generateCodigo(tipo: string): string {
  const prefix = tipo === 'por_pagar' ? 'PP' : 'PC'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Validar sesión desde request
export async function getSession(request: Request, db: D1Database): Promise<{
  userId: number
  cedula: string
  nombre: string
  role: string
  sessionId: string
} | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  
  const token = authHeader.substring(7)
  if (!token) return null

  try {
    const session = await db.prepare(`
      SELECT s.id, s.user_id, s.expires_at, 
             u.cedula, u.nombre, u.apellido, u.role, u.activo
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now') AND u.activo = 1
    `).bind(token).first<{
      id: string
      user_id: number
      expires_at: string
      cedula: string
      nombre: string
      apellido: string
      role: string
      activo: number
    }>()

    if (!session) return null

    return {
      userId: session.user_id,
      cedula: session.cedula,
      nombre: `${session.nombre} ${session.apellido}`,
      role: session.role,
      sessionId: session.id
    }
  } catch {
    return null
  }
}

// Middleware de autenticación
export function requireAuth(roles?: string[]) {
  return async (c: any, next: any) => {
    const session = await getSession(c.req.raw, c.env.DB)
    if (!session) {
      return c.json({ error: 'No autorizado. Por favor inicia sesión.' }, 401)
    }
    if (roles && !roles.includes(session.role)) {
      return c.json({ error: 'No tienes permisos para esta acción.' }, 403)
    }
    c.set('session', session)
    await next()
  }
}
