import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { authRoutes } from './routes/auth'
import { cajasRoutes } from './routes/cajas'
import { movimientosRoutes } from './routes/movimientos'
import { pendientesRoutes } from './routes/pendientes'
import { usersRoutes } from './routes/users'
import { excelRoutes } from './routes/excel'
import { dashboardRoutes } from './routes/dashboard'
import { reportsRoutes } from './routes/reports'
import { configRoutes } from './routes/config'
import { notasRoutes } from './routes/notas'
import { historialRoutes } from './routes/historial'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
  GEMINI_API_KEY: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Static files
app.use('/static/*', serveStatic({ root: './public' }))
app.use('/favicon.ico', serveStatic({ path: './public/favicon.ico' }))

// API Routes
app.route('/api/auth', authRoutes)
app.route('/api/cajas', cajasRoutes)
app.route('/api/movimientos', movimientosRoutes)
app.route('/api/pendientes', pendientesRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/excel', excelRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/reports', reportsRoutes)
app.route('/api/config', configRoutes)
app.route('/api/notas', notasRoutes)
app.route('/api/historial', historialRoutes)

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// SPA - serve frontend for all other routes
app.get('*', (c) => {
  return c.html(getHtml())
})

function getHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pagos Rapidos - Sistema de Gestión</title>
  <meta name="description" content="Sistema de Gestión de Caja y Pendientes - Agencia Alban Borja">
  <link rel="icon" type="image/png" href="/static/logo.png">
  <link rel="apple-touch-icon" href="/static/logo.png">
  <meta name="theme-color" content="#1a3a8c">
  <!-- PWA Manifest -->
  <link rel="manifest" href="/static/manifest.json">
  <!-- Tailwind -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Icons -->
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <!-- XLSX -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <!-- Custom CSS -->
  <link href="/static/app.css" rel="stylesheet">
</head>
<body class="bg-gray-50 min-h-screen">
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`
}

export default app