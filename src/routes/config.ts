import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database; GEMINI_API_KEY?: string }

export const configRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// GET /api/config - Leer configuración (sin exponer API keys completas)
configRoutes.get('/', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const rows = await c.env.DB.prepare(
    "SELECT clave, valor, descripcion FROM configuracion ORDER BY clave"
  ).all<{ clave: string; valor: string; descripcion: string }>()

  // Ocultar la API key completa, solo mostrar últimos 6 chars
  const configs = (rows.results || []).map(r => {
    if (r.clave === 'gemini_api_key' && r.valor) {
      return { ...r, valor: r.valor ? '••••••••••••••••••••' + r.valor.slice(-6) : '' }
    }
    return r
  })

  return c.json({ configs })
})

// GET /api/config/gemini-key - Obtener API key real (solo para uso interno del worker)
configRoutes.get('/gemini-key', auth, async (c) => {
  // Esta ruta es para obtener la API key desde la BD (para Workers)
  const row = await c.env.DB.prepare(
    "SELECT valor FROM configuracion WHERE clave = 'gemini_api_key'"
  ).first<{ valor: string }>()

  // Fallback al env var
  const key = (row?.valor && row.valor.trim()) ? row.valor.trim() : (c.env.GEMINI_API_KEY || '')
  return c.json({ key: key ? '***tiene_key***' : '' })
})

// GET /api/config/modelos-gemini - Verificar modelos disponibles
configRoutes.get('/modelos-gemini', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const keyRow = await c.env.DB.prepare(
    "SELECT valor FROM configuracion WHERE clave = 'gemini_api_key'"
  ).first<{ valor: string }>()

  const apiKey = (keyRow?.valor?.trim()) || c.env.GEMINI_API_KEY || ''
  if (!apiKey) return c.json({ error: 'No hay API Key configurada', modelos: [] })

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    const data = await res.json() as any

    if (!res.ok) {
      return c.json({ error: 'API Key inválida: ' + (data.error?.message || 'Error desconocido'), modelos: [] })
    }

    const modelos = (data.models || [])
      .filter((m: any) => {
        const methods = m.supportedGenerationMethods || []
        return methods.includes('generateContent') && 
               (m.name.includes('flash') || m.name.includes('pro') || m.name.includes('gemini-2'))
      })
      .map((m: any) => ({
        id: m.name.replace('models/', ''),
        nombre: m.displayName,
        descripcion: m.description?.substring(0, 100) || '',
        recomendado: m.name.includes('2.5-flash') || m.name.includes('2.0-flash')
      }))

    return c.json({ modelos, total: modelos.length, api_key_valida: true })
  } catch (err: any) {
    return c.json({ error: 'Error al verificar: ' + err.message, modelos: [] })
  }
})

// PUT /api/config - Actualizar configuración
configRoutes.put('/', auth, async (c) => {
  const session = c.get('session')
  if (!['superadmin', 'admin'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const updates = await c.req.json() as Record<string, string>

  for (const [clave, valor] of Object.entries(updates)) {
    await c.env.DB.prepare(
      "INSERT INTO configuracion (clave, valor, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at"
    ).bind(clave, String(valor)).run()
  }

  // Audit
  await c.env.DB.prepare(
    'INSERT INTO audit_logs (user_id, accion, tabla, datos_nuevos) VALUES (?, ?, ?, ?)'
  ).bind(session.userId, 'UPDATE_CONFIG', 'configuracion',
    JSON.stringify(Object.keys(updates).map(k => k === 'gemini_api_key' ? { [k]: '***' } : { [k]: updates[k] }))
  ).run()

  return c.json({ success: true, updated: Object.keys(updates).length })
})
