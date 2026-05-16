import { Hono } from 'hono'
import { getSession } from '../utils/auth'

type Bindings = { DB: D1Database; R2: R2Bucket; GEMINI_API_KEY: string }

export const excelRoutes = new Hono<{ Bindings: Bindings }>()

const auth = async (c: any, next: any) => {
  const session = await getSession(c.req.raw, c.env.DB)
  if (!session) return c.json({ error: 'No autorizado' }, 401)
  c.set('session', session)
  await next()
}

// POST /api/excel/upload - Subir y analizar Excel
excelRoutes.post('/upload', auth, async (c) => {
  const session = c.get('session')

  try {
    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const sistema = formData.get('sistema') as string || 'general'
    const caja_id = formData.get('caja_id') as string

    if (!file) return c.json({ error: 'No se recibió archivo' }, 400)

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return c.json({ error: 'Solo se permiten archivos Excel (.xlsx, .xls) o CSV' }, 400)
    }

    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'El archivo no puede superar 10MB' }, 400)
    }

    // Subir a R2
    const r2Key = `excel/${session.userId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const fileBuffer = await file.arrayBuffer()
    await c.env.R2.put(r2Key, fileBuffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: { userId: String(session.userId), sistema }
    })

    // Registrar en BD
    const cajaIdNum = caja_id ? parseInt(caja_id) : null
    const dbResult = await c.env.DB.prepare(`
      INSERT INTO excel_uploads (user_id, caja_id, filename, r2_key, sistema, estado)
      VALUES (?, ?, ?, ?, ?, 'procesando')
    `).bind(session.userId, cajaIdNum, file.name, r2Key, sistema).run()

    const uploadId = dbResult.meta.last_row_id

    // Analizar con Gemini AI
    const analysisResult = await analyzeExcelWithGemini(
      fileBuffer, file.name, sistema, c.env.GEMINI_API_KEY
    )

    // Actualizar con resultado
    await c.env.DB.prepare(`
      UPDATE excel_uploads SET analisis_resultado = ?, estado = 'procesado'
      WHERE id = ?
    `).bind(JSON.stringify(analysisResult), uploadId).run()

    return c.json({
      success: true,
      upload_id: uploadId,
      filename: file.name,
      sistema,
      analisis: analysisResult
    }, 201)

  } catch (err: any) {
    console.error('Excel upload error:', err)
    return c.json({ error: `Error procesando archivo: ${err.message}` }, 500)
  }
})

// GET /api/excel/uploads - Listar uploads
excelRoutes.get('/uploads', auth, async (c) => {
  const session = c.get('session')
  const isAdmin = ['superadmin', 'admin', 'supervisor'].includes(session.role)

  const query = isAdmin
    ? `SELECT e.*, u.nombre, u.apellido FROM excel_uploads e JOIN users u ON e.user_id = u.id ORDER BY e.created_at DESC LIMIT 50`
    : `SELECT e.*, u.nombre, u.apellido FROM excel_uploads e JOIN users u ON e.user_id = u.id WHERE e.user_id = ? ORDER BY e.created_at DESC LIMIT 50`

  const result = isAdmin
    ? await c.env.DB.prepare(query).all()
    : await c.env.DB.prepare(query).bind(session.userId).all()

  return c.json({ uploads: result.results })
})

// GET /api/excel/uploads/:id - Ver análisis
excelRoutes.get('/uploads/:id', auth, async (c) => {
  const session = c.get('session')
  const id = parseInt(c.req.param('id'))

  const upload = await c.env.DB.prepare(`
    SELECT e.*, u.nombre, u.apellido FROM excel_uploads e
    JOIN users u ON e.user_id = u.id WHERE e.id = ?
  `).bind(id).first<{ user_id: number; analisis_resultado: string } & Record<string, any>>()

  if (!upload) return c.json({ error: 'Upload no encontrado' }, 404)
  if (upload.user_id !== session.userId && !['superadmin', 'admin', 'supervisor'].includes(session.role)) {
    return c.json({ error: 'Sin permisos' }, 403)
  }

  const analisis = upload.analisis_resultado ? JSON.parse(upload.analisis_resultado) : null
  return c.json({ upload: { ...upload, analisis_resultado: analisis } })
})

// Función para analizar Excel con Gemini
async function analyzeExcelWithGemini(
  buffer: ArrayBuffer,
  filename: string,
  sistema: string,
  apiKey: string
): Promise<any> {
  try {
    if (!apiKey) {
      return {
        error: 'API Key de Gemini no configurada',
        tipo: 'sin_analisis',
        fecha_analisis: new Date().toISOString()
      }
    }

    // Convertir buffer a base64 para enviar a Gemini
    const uint8Array = new Uint8Array(buffer)
    const base64 = btoa(String.fromCharCode(...uint8Array))

    const prompt = `Eres un experto en análisis financiero y contabilidad para una agencia de pagos rápidos en Ecuador.
    
Analiza el archivo Excel adjunto llamado "${filename}" del sistema "${sistema}".

Por favor extrae y analiza:
1. MOVIMIENTOS: Lista todos los movimientos (ingresos y egresos) con fecha, descripción, monto
2. TOTALES: Total de ingresos, total de egresos, saldo final
3. SISTEMAS/CUENTAS: Saldos por sistema (Gold Pagos, DEX, Western Union, Caja, etc.)
4. BILLETES/MONEDAS: Si hay conteo de efectivo (denominaciones y cantidades)
5. VERIFICACIÓN DEL CUADRE: ¿Los números cuadran? ¿Hay diferencias?
6. OBSERVACIONES: Movimientos inusuales, transferencias entre trabajadores, etc.
7. RECOMENDACIONES: Puntos de mejora o alertas

Responde en formato JSON con esta estructura:
{
  "resumen": {
    "total_ingresos": número,
    "total_egresos": número,
    "saldo_final": número,
    "cuadre_ok": boolean,
    "diferencia": número
  },
  "saldos_sistemas": [{"sistema": "nombre", "saldo": número}],
  "conteo_efectivo": [{"denominacion": número, "cantidad": número, "subtotal": número}],
  "movimientos": [{"descripcion": "texto", "tipo": "ingreso|egreso", "monto": número}],
  "observaciones": ["texto"],
  "alertas": ["texto"],
  "recomendaciones": ["texto"],
  "verificacion_cuadre": "texto explicativo"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  data: base64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API error:', errText)
      return { error: 'Error en Gemini API', detalle: errText, fecha_analisis: new Date().toISOString() }
    }

    const data = await response.json() as any
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      return { error: 'Gemini no devolvió contenido', fecha_analisis: new Date().toISOString() }
    }

    try {
      const parsed = JSON.parse(content)
      return { ...parsed, fecha_analisis: new Date().toISOString(), archivo: filename, sistema }
    } catch {
      return { raw_response: content, fecha_analisis: new Date().toISOString(), archivo: filename }
    }

  } catch (err: any) {
    return {
      error: `Error en análisis: ${err.message}`,
      fecha_analisis: new Date().toISOString()
    }
  }
}
