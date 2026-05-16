// ============================================================
// PAGOS RAPIDOS - Sistema de Gestión de Caja y Pendientes
// Agencia Alban Borja
// ============================================================

const API = '/api'
let currentUser = null
let currentPage = 'dashboard'
let token = localStorage.getItem('pr_token')

// ============================================================
// API HELPER
// ============================================================
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers })
    const data = await res.json()
    
    if (res.status === 401) {
      logout()
      return null
    }
    
    if (!res.ok) {
      throw new Error(data.error || 'Error desconocido')
    }
    
    return data
  } catch (err) {
    throw err
  }
}

async function apiForm(path, formData) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: formData
  })
  
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error')
  return data
}

// ============================================================
// TOAST
// ============================================================
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer()
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }
  
  const t = document.createElement('div')
  t.className = `toast ${type}`
  t.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${msg}</span>
    <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
  `
  container.appendChild(t)
  setTimeout(() => t.remove(), 4000)
}

function createToastContainer() {
  const c = document.createElement('div')
  c.id = 'toast-container'
  document.body.appendChild(c)
  return c
}

// ============================================================
// LOADING
// ============================================================
function showLoading(msg = 'Cargando...') {
  const el = document.getElementById('loading-overlay')
  if (el) { el.style.display = 'flex'; el.querySelector('p').textContent = msg }
}
function hideLoading() {
  const el = document.getElementById('loading-overlay')
  if (el) el.style.display = 'none'
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function fmt$(n) {
  const num = parseFloat(n) || 0
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDatetime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtRole(r) {
  const m = { superadmin: '👑 SuperAdmin', admin: '🔑 Admin', supervisor: '👁 Supervisor', trabajador: '💼 Trabajador' }
  return m[r] || r
}

function fmtEstadoCaja(e) {
  const m = { abierta: ['badge-success', 'Abierta'], cuadrada: ['badge-warning', 'Cuadrada'], aprobada: ['badge-info', 'Aprobada'], rechazada: ['badge-danger', 'Rechazada'] }
  const [cls, txt] = m[e] || ['badge-gray', e]
  return `<span class="badge ${cls}">${txt}</span>`
}

function fmtEstadoPend(e) {
  const m = { pendiente: ['badge-warning', 'Pendiente'], pagado_parcial: ['badge-info', 'Parcial'], pagado_total: ['badge-success', 'Pagado'], cancelado: ['badge-danger', 'Cancelado'] }
  const [cls, txt] = m[e] || ['badge-gray', e]
  return `<span class="badge ${cls}">${txt}</span>`
}

function today() { return new Date().toISOString().split('T')[0] }

function isAdmin() { return ['superadmin', 'admin', 'supervisor'].includes(currentUser?.role) }
function isSuperAdmin() { return currentUser?.role === 'superadmin' }
function canManageUsers() { return ['superadmin', 'admin'].includes(currentUser?.role) }

// ============================================================
// AUTH
// ============================================================
async function login(cedula, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ cedula, password })
  })
  
  if (!data) return
  
  token = data.token
  currentUser = data.user
  localStorage.setItem('pr_token', token)
  localStorage.setItem('pr_user', JSON.stringify(currentUser))
  
  renderApp()
  toast(`¡Bienvenido, ${currentUser.nombre}!`, 'success')
}

function logout() {
  if (token) api('/auth/logout', { method: 'POST' }).catch(() => {})
  token = null
  currentUser = null
  localStorage.removeItem('pr_token')
  localStorage.removeItem('pr_user')
  renderLogin()
}

async function checkAuth() {
  token = localStorage.getItem('pr_token')
  if (!token) { renderLogin(); return }
  
  const savedUser = localStorage.getItem('pr_user')
  if (savedUser) currentUser = JSON.parse(savedUser)
  
  try {
    const data = await api('/auth/me')
    if (data) {
      currentUser = data
      localStorage.setItem('pr_user', JSON.stringify(data))
      renderApp()
    } else {
      renderLogin()
    }
  } catch {
    renderLogin()
  }
}

// ============================================================
// RENDER LOGIN
// ============================================================
function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div id="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <img src="/static/logo.png" alt="Pagos Rapidos" onerror="this.style.display='none'">
          <div class="login-title">Pagos Rápidos</div>
          <div class="login-subtitle">Agencia Alban Borja</div>
        </div>
        
        <div id="login-error" class="alert alert-error" style="display:none"></div>
        
        <div class="form-group">
          <label class="form-label">Cédula / Usuario</label>
          <div class="input-icon-wrapper">
            <i class="fas fa-id-card icon"></i>
            <input type="text" class="form-input" id="login-cedula" 
              placeholder="Ingresa tu cédula" autocomplete="username"
              onkeydown="if(event.key==='Enter')document.getElementById('login-pass').focus()">
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <div class="input-icon-wrapper">
            <i class="fas fa-lock icon"></i>
            <input type="password" class="form-input" id="login-pass" 
              placeholder="Tu contraseña" autocomplete="current-password"
              onkeydown="if(event.key==='Enter')doLogin()">
          </div>
        </div>
        
        <button class="btn btn-primary btn-full btn-lg" onclick="doLogin()" id="login-btn">
          <i class="fas fa-sign-in-alt"></i> Ingresar al Sistema
        </button>
        
        <p style="text-align:center;margin-top:16px;font-size:0.8rem;color:#94a3b8">
          🔒 Acceso seguro &nbsp;•&nbsp; Sistema v1.0
        </p>
      </div>
    </div>
    <div id="toast-container"></div>
  `
  document.getElementById('login-cedula').focus()
}

async function doLogin() {
  const cedula = document.getElementById('login-cedula').value.trim()
  const password = document.getElementById('login-pass').value
  const errEl = document.getElementById('login-error')
  const btn = document.getElementById('login-btn')
  
  if (!cedula || !password) {
    errEl.textContent = 'Por favor ingresa tu cédula y contraseña'
    errEl.style.display = 'flex'
    return
  }
  
  btn.disabled = true
  btn.innerHTML = '<span class="spinner"></span> Ingresando...'
  errEl.style.display = 'none'
  
  try {
    await login(cedula, password)
  } catch (err) {
    errEl.textContent = err.message || 'Error al iniciar sesión'
    errEl.style.display = 'flex'
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Ingresar al Sistema'
  }
}

// ============================================================
// RENDER APP (Layout Principal)
// ============================================================
function renderApp() {
  document.getElementById('app').innerHTML = `
    <div id="loading-overlay" class="loading-overlay" style="display:none">
      <div class="loading-box">
        <div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div>
        <p>Cargando...</p>
      </div>
    </div>
    <div id="toast-container"></div>
    
    <!-- Sidebar -->
    <nav id="sidebar">
      <div class="sidebar-logo">
        <img src="/static/logo.png" alt="Logo" onerror="this.style.display='none'">
        <div class="sidebar-logo-text">Sistema de Gestión</div>
      </div>
      
      <div class="sidebar-user">
        <div class="sidebar-user-name">
          <i class="fas fa-user-circle" style="opacity:0.7"></i>
          ${currentUser?.nombre} ${currentUser?.apellido || ''}
        </div>
        <div class="sidebar-user-role">${fmtRole(currentUser?.role)}</div>
      </div>
      
      <div class="sidebar-nav">
        <div class="nav-section-title">Principal</div>
        <div class="nav-item ${currentPage==='dashboard'?'active':''}" onclick="navigate('dashboard')">
          <i class="fas fa-tachometer-alt icon"></i> Dashboard
        </div>
        <div class="nav-item ${currentPage==='cajas'?'active':''}" onclick="navigate('cajas')">
          <i class="fas fa-cash-register icon"></i> Mis Cajas
        </div>
        <div class="nav-item ${currentPage==='movimientos'?'active':''}" onclick="navigate('movimientos')">
          <i class="fas fa-exchange-alt icon"></i> Movimientos
        </div>
        <div class="nav-item ${currentPage==='pendientes'?'active':''}" onclick="navigate('pendientes')">
          <i class="fas fa-file-invoice-dollar icon"></i> CXP / Pendientes
        </div>
        
        <!-- Notas: disponible para TODOS los usuarios -->
        <div class="nav-item ${currentPage==='notas'?'active':''}" onclick="navigate('notas')">
          <i class="fas fa-receipt icon"></i> Notas y Comprobantes
        </div>

        ${isAdmin() ? `
        <div class="nav-section-title">Administración</div>
        <div class="nav-item ${currentPage==='cajas-admin'?'active':''}" onclick="navigate('cajas-admin')">
          <i class="fas fa-tasks icon"></i> Gestión de Cajas
        </div>
        <div class="nav-item ${currentPage==='reportes'?'active':''}" onclick="navigate('reportes')">
          <i class="fas fa-chart-bar icon"></i> Reportes
        </div>
        <div class="nav-item ${currentPage==='historial'?'active':''}" onclick="navigate('historial')">
          <i class="fas fa-calendar-alt icon"></i> Historial Diario
        </div>
        ` : ''}
        
        ${canManageUsers() ? `
        <div class="nav-item ${currentPage==='usuarios'?'active':''}" onclick="navigate('usuarios')">
          <i class="fas fa-users icon"></i> Usuarios
        </div>
        ` : ''}
        
        <div class="nav-section-title">Herramientas</div>
        <div class="nav-item ${currentPage==='excel'?'active':''}" onclick="navigate('excel')">
          <i class="fas fa-file-excel icon"></i> Análisis Excel <span class="nav-badge">IA</span>
        </div>
        
        ${isSuperAdmin() ? `
        <div class="nav-item ${currentPage==='auditoria'?'active':''}" onclick="navigate('auditoria')">
          <i class="fas fa-shield-alt icon"></i> Auditoría
        </div>
        <div class="nav-item ${currentPage==='configuracion'?'active':''}" onclick="navigate('configuracion')">
          <i class="fas fa-cog icon"></i> Configuración
        </div>
        ` : ''}
      </div>
      
      <div class="sidebar-footer">
        <div class="nav-item" onclick="showChangePassword()">
          <i class="fas fa-key icon"></i> Cambiar Contraseña
        </div>
        <div class="nav-item" onclick="logout()">
          <i class="fas fa-sign-out-alt icon"></i> Cerrar Sesión
        </div>
      </div>
    </nav>
    
    <!-- Main Content -->
    <div id="main">
      <header id="topbar">
        <div style="display:flex;align-items:center;gap:16px">
          <button class="btn btn-ghost btn-sm" id="menu-toggle" onclick="toggleSidebar()" style="display:none">
            <i class="fas fa-bars"></i>
          </button>
          <div>
            <div class="topbar-title" id="page-title">Dashboard</div>
          </div>
        </div>
        <div class="topbar-right">
          <div class="topbar-date">
            <i class="fas fa-calendar-alt" style="color:var(--accent)"></i>
            ${new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--accent));
            display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:0.9rem;cursor:pointer"
            title="${currentUser?.nombre} ${currentUser?.apellido}">
            ${(currentUser?.nombre || 'U')[0].toUpperCase()}
          </div>
        </div>
      </header>
      
      <div id="page-content"></div>
    </div>
  `
  
  navigate('dashboard')
  
  // Check responsive
  if (window.innerWidth <= 768) {
    document.getElementById('menu-toggle').style.display = 'flex'
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open')
}

function navigate(page) {
  currentPage = page
  
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'))
  
  const titles = {
    dashboard: 'Dashboard',
    cajas: 'Mis Cajas',
    movimientos: 'Movimientos',
    pendientes: 'CXP / Pendientes',
    'cajas-admin': 'Gestión de Cajas',
    reportes: 'Reportes',
    usuarios: 'Gestión de Usuarios',
    excel: 'Análisis con IA',
    auditoria: 'Auditoría del Sistema',
    configuracion: 'Configuración del Sistema',
    notas: 'Blog de Notas y Comprobantes',
    historial: 'Historial Diario'
  }
  
  const titleEl = document.getElementById('page-title')
  if (titleEl) titleEl.textContent = titles[page] || page
  
  const pages = {
    dashboard: renderDashboard,
    cajas: renderCajas,
    movimientos: renderMovimientos,
    pendientes: renderPendientes,
    'cajas-admin': renderCajasAdmin,
    reportes: renderReportes,
    usuarios: renderUsuarios,
    excel: renderExcel,
    auditoria: renderAuditoria,
    configuracion: renderConfiguracion,
    notas: renderNotas,
    historial: renderHistorial
  }
  
  if (pages[page]) pages[page]()
  else document.getElementById('page-content').innerHTML = '<div class="empty-state"><i class="fas fa-tools"></i><h3>Sección en desarrollo</h3></div>'
  
  // Scroll to top
  window.scrollTo(0, 0)
  
  // Close mobile sidebar
  document.getElementById('sidebar')?.classList.remove('open')
}

// ============================================================
// DASHBOARD
// ============================================================
function renderMiCajaHoy(caj) {
  if (isAdmin()) return ''
  if (!caj) {
    return '<div class="card" style="border:2px dashed #e2e8f0;text-align:center;padding:32px">' +
      '<i class="fas fa-cash-register" style="font-size:2.5rem;color:#94a3b8;margin-bottom:12px"></i>' +
      '<h3 style="color:#64748b">No tienes caja abierta hoy</h3>' +
      '<p style="color:#94a3b8;margin:8px 0 16px">Abre tu caja para comenzar a registrar movimientos</p>' +
      '<button class="btn btn-primary" onclick="navigate(\'cajas\');setTimeout(openCaja,200)">' +
      '<i class="fas fa-plus"></i> Abrir Caja</button></div>'
  }
  var saldoActual = (caj.saldo_inicial||0) + (caj.ingresos||0) - (caj.egresos||0)
  var diferencia  = saldoActual - (caj.saldo_inicial||0)
  var alertaSaldo = diferencia > 5
  var color = alertaSaldo ? '#10b981' : 'var(--primary)'
  var alertaBadge = alertaSaldo
    ? '<span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:20px;font-size:0.82rem;font-weight:700">' +
      '<i class="fas fa-arrow-up"></i> Saldo +' + fmt$(diferencia) + ' vs inicio</span>'
    : ''
  var alertaBox = alertaSaldo
    ? '<div style="margin-top:12px;padding:10px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;' +
      'font-size:0.85rem;color:#166534;display:flex;align-items:center;gap:8px">' +
      '<i class="fas fa-info-circle"></i>' +
      '<div><strong>Saldo supera +$5 al inicial.</strong> Verifica que todos los movimientos estén registrados.</div></div>'
    : ''
  return '<div class="card" style="border-left:4px solid ' + color + '">' +
    '<div class="card-header">' +
      '<div class="card-title"><i class="fas fa-cash-register"></i> Mi Caja de Hoy</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        alertaBadge + fmtEstadoCaja(caj.estado) +
        '<button class="btn btn-sm btn-primary" onclick="navigate(\'cajas\')">' +
        '<i class="fas fa-eye"></i> Ver Detalle</button>' +
      '</div>' +
    '</div>' +
    '<div class="grid-3">' +
      '<div style="text-align:center;padding:16px;background:#f8fafc;border-radius:12px">' +
        '<div style="font-size:0.8rem;color:#64748b">Saldo Inicial</div>' +
        '<div class="money" style="font-size:1.4rem;font-weight:800;color:var(--primary)">' + fmt$(caj.saldo_inicial) + '</div>' +
      '</div>' +
      '<div style="text-align:center;padding:16px;background:#d1fae5;border-radius:12px">' +
        '<div style="font-size:0.8rem;color:#065f46">Ingresos</div>' +
        '<div class="money" style="font-size:1.4rem;font-weight:800;color:#10b981">+' + fmt$(caj.ingresos||0) + '</div>' +
      '</div>' +
      '<div style="text-align:center;padding:16px;background:#fee2e2;border-radius:12px">' +
        '<div style="font-size:0.8rem;color:#991b1b">Egresos</div>' +
        '<div class="money" style="font-size:1.4rem;font-weight:800;color:#ef4444">-' + fmt$(caj.egresos||0) + '</div>' +
      '</div>' +
    '</div>' + alertaBox + '</div>'
}

async function renderDashboard() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading-box" style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div><p style="margin-top:16px;color:#64748b">Cargando dashboard...</p></div>'
  
  try {
    const data = await api('/dashboard')
    
    const ingresos = parseFloat(data.movimientos_hoy?.ingresos || 0)
    const egresos = parseFloat(data.movimientos_hoy?.egresos || 0)
    const ganancia = ingresos - egresos
    
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:24px">
        
        ${data.alertas_pendientes?.length > 0 ? `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>⚠️ ${data.alertas_pendientes.length} pendiente(s) vencen próximamente!</strong>
          ${data.alertas_pendientes.slice(0,2).map(p => `
            <span style="font-size:0.85rem">&nbsp;•&nbsp; ${p.nombre_deudor}: ${fmt$(p.monto_pendiente)} (vence ${fmtDate(p.fecha_vencimiento)})</span>
          `).join('')}
        </div>
        ` : ''}
        
        <!-- Stats Cards -->
        <div class="grid-4">
          <div class="stat-card">
            <div class="stat-icon" style="background:#dbeafe;color:var(--primary)">
              <i class="fas fa-arrow-up"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value text-ingreso money">${fmt$(ingresos)}</div>
              <div class="stat-label">Ingresos Hoy</div>
              <div class="stat-change" style="color:#64748b">${data.movimientos_hoy?.total || 0} movimientos</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon" style="background:#fee2e2;color:#ef4444">
              <i class="fas fa-arrow-down"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value text-egreso money">${fmt$(egresos)}</div>
              <div class="stat-label">Egresos Hoy</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5;color:#10b981">
              <i class="fas fa-dollar-sign"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value money" style="color:${ganancia>=0?'#10b981':'#ef4444'}">${fmt$(ganancia)}</div>
              <div class="stat-label">Ganancia Neta Hoy</div>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#f59e0b">
              <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value" style="color:#f59e0b">${data.pendientes?.activos || 0}</div>
              <div class="stat-label">Pendientes Activos</div>
              <div class="stat-change" style="color:#ef4444">${data.pendientes?.vencidos || 0} vencidos</div>
            </div>
          </div>
        </div>
        
        ${isAdmin() ? `
        <div class="grid-4">
          <div class="stat-card">
            <div class="stat-icon" style="background:#ede9fe;color:#7c3aed">
              <i class="fas fa-cash-register"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${data.cajas_hoy?.total || 0}</div>
              <div class="stat-label">Cajas Hoy</div>
              <div class="stat-change" style="color:#10b981">${data.cajas_hoy?.abiertas || 0} abiertas</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#dcfce7;color:#16a34a">
              <i class="fas fa-check-circle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value">${data.cajas_hoy?.aprobadas || 0}</div>
              <div class="stat-label">Cajas Aprobadas</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fee2e2;color:#dc2626">
              <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value money" style="color:#dc2626">${fmt$(data.pendientes?.total_por_pagar || 0)}</div>
              <div class="stat-label">Total Por Pagar</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#dbeafe;color:#2563eb">
              <i class="fas fa-hand-holding-usd"></i>
            </div>
            <div class="stat-content">
              <div class="stat-value money" style="color:#2563eb">${fmt$(data.pendientes?.total_por_cobrar || 0)}</div>
              <div class="stat-label">Total Por Cobrar</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="grid-2">
          <!-- Gráfico de movimientos -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i class="fas fa-chart-line"></i> Movimientos Últimos 7 Días</div>
            </div>
            <canvas id="chart-main" height="200"></canvas>
          </div>
          
          <!-- Alertas de pendientes -->
          <div class="card">
            <div class="card-header">
              <div class="card-title"><i class="fas fa-bell"></i> Pendientes Próximos</div>
              <button class="btn btn-sm btn-outline" onclick="navigate('pendientes')">Ver todos</button>
            </div>
            ${data.alertas_pendientes?.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:10px">
              ${data.alertas_pendientes.slice(0,5).map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 14px;background:#f8fafc;border-radius:10px;border-left:4px solid ${p.tipo==='por_pagar'?'#ef4444':'#3b82f6'}">
                <div>
                  <div style="font-weight:600;font-size:0.9rem">${p.nombre_deudor}</div>
                  <div style="font-size:0.75rem;color:#64748b">
                    ${p.tipo === 'por_pagar' ? '💸 Por Pagar' : '💰 Por Cobrar'} 
                    ${p.registrado_por ? `• ${p.registrado_por}` : ''}
                    ${p.fecha_vencimiento ? `• Vence: ${fmtDate(p.fecha_vencimiento)}` : ''}
                  </div>
                </div>
                <div class="money" style="font-weight:800;color:${p.tipo==='por_pagar'?'#ef4444':'#10b981'}">${fmt$(p.monto_pendiente)}</div>
              </div>
              `).join('')}
            </div>
            ` : '<div class="empty-state" style="padding:20px"><i class="fas fa-check-circle" style="color:#10b981"></i><p>Sin pendientes próximos a vencer</p></div>'}
          </div>
        </div>
        
        ${renderMiCajaHoy(data.mi_caja_hoy)}
        
        ${isAdmin() && data.top_trabajadores?.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-users"></i> Rendimiento de Trabajadores (30 días)</div>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr>
                <th>Trabajador</th>
                <th>Cajas</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Ganancia</th>
                <th></th>
              </tr></thead>
              <tbody>
                ${data.top_trabajadores.map(t => {
                  const ganancia = (t.total_ingresos||0) - (t.total_egresos||0)
                  const alerta = ganancia > 5
                  return `
                <tr ${alerta ? 'style="background:#f0fdf4"' : ''}>
                  <td><strong>${t.nombre} ${t.apellido}</strong><br><small style="color:#94a3b8">${t.cedula}</small></td>
                  <td>${t.num_cajas}</td>
                  <td class="money text-ingreso">+${fmt$(t.total_ingresos)}</td>
                  <td class="money text-egreso">-${fmt$(t.total_egresos)}</td>
                  <td class="money" style="font-weight:800;color:${ganancia>=0?'#10b981':'#ef4444'}">${fmt$(ganancia)}</td>
                  <td>${alerta ? '<span title="Ganancia supera $5 vs egresos" style="color:#10b981;font-weight:700;font-size:0.8rem"><i class="fas fa-arrow-up"></i></span>' : ''}</td>
                </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}
      </div>
    `
    
    // Render chart
    if (data.chart_data?.length > 0) {
      const ctx = document.getElementById('chart-main')
      if (ctx) {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.chart_data.map(d => fmtDate(d.fecha)),
            datasets: [
              { label: 'Ingresos', data: data.chart_data.map(d => d.ingresos || 0), backgroundColor: '#10b981', borderRadius: 6 },
              { label: 'Egresos', data: data.chart_data.map(d => d.egresos || 0), backgroundColor: '#ef4444', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
            }
          }
        })
      }
    }
    
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-circle"></i> Error cargando dashboard: ${err.message}</div>`
  }
}

// ============================================================
// CAJAS
// ============================================================
async function renderCajas() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading-box" style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const [cajasData, cajaHoy] = await Promise.all([
      api('/cajas?limit=30'),
      api('/cajas/hoy')
    ])
    
    const cajas = cajasData?.cajas || []
    const caja = cajaHoy?.caja
    
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:24px">
        <!-- Caja de hoy -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i class="fas fa-calendar-day"></i> Caja de Hoy - ${new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            ${!caja ? `<button class="btn btn-primary" onclick="openCaja()"><i class="fas fa-plus"></i> Abrir Caja</button>` : ''}
          </div>
          
          ${caja ? `
          <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">
            ${fmtEstadoCaja(caja.estado)}
            <div style="display:flex;gap:20px;flex:1;flex-wrap:wrap">
              <div>
                <div style="font-size:0.75rem;color:#64748b">Saldo Inicial</div>
                <div class="money" style="font-weight:800;font-size:1.1rem">${fmt$(caja.saldo_inicial)}</div>
              </div>
              <div>
                <div style="font-size:0.75rem;color:#64748b">Ingresos</div>
                <div class="money text-ingreso" style="font-weight:800;font-size:1.1rem">+${fmt$(caja.total_ingresos || 0)}</div>
              </div>
              <div>
                <div style="font-size:0.75rem;color:#64748b">Egresos</div>
                <div class="money text-egreso" style="font-weight:800;font-size:1.1rem">-${fmt$(caja.total_egresos || 0)}</div>
              </div>
              <div>
                <div style="font-size:0.75rem;color:#64748b">Saldo Esperado</div>
                <div class="money" style="font-weight:800;font-size:1.1rem;color:var(--primary)">${fmt$((caja.saldo_inicial || 0) + (caja.total_ingresos || 0) - (caja.total_egresos || 0))}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${caja.estado === 'abierta' ? `
              <button class="btn btn-accent" onclick="addMovimiento(${caja.id})">
                <i class="fas fa-plus"></i> Movimiento
              </button>
              <button class="btn btn-primary" onclick="openCuadre(${caja.id})">
                <i class="fas fa-check-circle"></i> Cuadrar Caja
              </button>
              ` : ''}
              <button class="btn btn-outline btn-sm" onclick="viewCaja(${caja.id})">
                <i class="fas fa-eye"></i> Ver Detalle
              </button>
            </div>
          </div>
          ` : `
          <div class="empty-state" style="padding:32px">
            <i class="fas fa-cash-register"></i>
            <h3>No tienes caja abierta hoy</h3>
            <p>Abre tu caja para comenzar a registrar ingresos y egresos</p>
          </div>
          `}
        </div>
        
        <!-- Historial -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-history"></i> Historial de Cajas</div>
          </div>
          
          ${cajas.length > 0 ? `
          <div class="table-wrapper">
            <table>
              <thead><tr>
                <th>Fecha</th>
                ${isAdmin() ? '<th>Trabajador</th>' : ''}
                <th>Saldo Inicial</th>
                <th>Ingresos</th>
                <th>Egresos</th>
                <th>Ganancia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr></thead>
              <tbody>
                ${cajas.map(c => `
                <tr>
                  <td><strong>${fmtDate(c.fecha)}</strong></td>
                  ${isAdmin() ? `<td>${c.nombre} ${c.apellido}</td>` : ''}
                  <td class="money">${fmt$(c.saldo_inicial)}</td>
                  <td class="money text-ingreso">+${fmt$(c.total_ingresos || 0)}</td>
                  <td class="money text-egreso">-${fmt$(c.total_egresos || 0)}</td>
                  <td class="money" style="font-weight:800;color:${((c.total_ingresos||0)-(c.total_egresos||0))>=0?'#10b981':'#ef4444'}">
                    ${fmt$((c.total_ingresos || 0) - (c.total_egresos || 0))}
                  </td>
                  <td>${fmtEstadoCaja(c.estado)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" onclick="viewCaja(${c.id})">
                      <i class="fas fa-eye"></i>
                    </button>
                    ${c.estado === 'cuadrada' && isAdmin() ? `
                    <button class="btn btn-success btn-sm" onclick="aprobarCaja(${c.id}, true)" title="Aprobar">
                      <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="aprobarCaja(${c.id}, false)" title="Rechazar">
                      <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                  </td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin cajas registradas</h3></div>'}
        </div>
      </div>
    `
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function openCaja() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-cash-register"></i> Abrir Caja del Día</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info"><i class="fas fa-info-circle"></i> Fecha: <strong>${new Date().toLocaleDateString('es-EC')}</strong></div>
      <div class="form-group">
        <label class="form-label">Saldo Inicial (efectivo en caja)</label>
        <input type="number" class="form-input" id="saldo-inicial" placeholder="0.00" step="0.01" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Notas (opcional)</label>
        <textarea class="form-textarea" id="caja-notas" placeholder="Observaciones iniciales..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitAbrirCaja()">
        <i class="fas fa-door-open"></i> Abrir Caja
      </button>
    </div>
  `)
}

async function submitAbrirCaja() {
  const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value) || 0
  const notas = document.getElementById('caja-notas').value
  
  try {
    showLoading('Abriendo caja...')
    await api('/cajas', { method: 'POST', body: JSON.stringify({ saldo_inicial: saldoInicial, notas }) })
    closeModal()
    hideLoading()
    toast('Caja abierta exitosamente', 'success')
    renderCajas()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

async function viewCaja(id) {
  showLoading('Cargando detalle...')
  try {
    const data = await api(`/cajas/${id}`)
    hideLoading()
    
    const c = data.caja
    const movs = data.movimientos || []
    const conteo = data.conteo_efectivo || []
    const saldos = data.saldos_sistemas || []
    
    const totalIngresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
    const totalEgresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
    const saldoEsperado = (c.saldo_inicial || 0) + totalIngresos - totalEgresos
    const diferencia = (c.saldo_final || saldoEsperado) - saldoEsperado
    
    showModal(`
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-cash-register"></i> Detalle de Caja - ${fmtDate(c.fecha)}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          ${fmtEstadoCaja(c.estado)}
          <span style="color:#64748b;font-size:0.9rem">Trabajador: <strong>${c.nombre} ${c.apellido}</strong></span>
        </div>
        
        <div class="grid-3" style="margin-bottom:20px">
          ${[
            ['Saldo Inicial', fmt$(c.saldo_inicial), '#dbeafe', '#1e40af'],
            ['Total Ingresos', '+' + fmt$(totalIngresos), '#d1fae5', '#10b981'],
            ['Total Egresos', '-' + fmt$(totalEgresos), '#fee2e2', '#ef4444'],
            ['Saldo Esperado', fmt$(saldoEsperado), '#ede9fe', '#7c3aed'],
            c.saldo_final != null ? ['Saldo Real', fmt$(c.saldo_final), '#fef3c7', '#d97706'] : null,
            c.saldo_final != null ? ['Diferencia', fmt$(diferencia), Math.abs(diferencia) <= 0.5 ? '#d1fae5' : '#fee2e2', Math.abs(diferencia) <= 0.5 ? '#10b981' : '#ef4444'] : null
          ].filter(Boolean).map(([label, val, bg, color]) => `
          <div style="background:${bg};padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:0.75rem;color:${color};font-weight:600">${label}</div>
            <div class="money" style="font-weight:800;color:${color};font-size:1.1rem">${val}</div>
          </div>
          `).join('')}
        </div>
        
        ${saldos.length > 0 ? `
        <h4 style="font-weight:700;color:var(--primary);margin-bottom:10px">
          <i class="fas fa-university"></i> Saldos por Sistema
        </h4>
        <div class="grid-3" style="margin-bottom:20px">
          ${saldos.map(s => `
          <div style="background:#f8fafc;padding:10px;border-radius:8px;text-align:center;border:1px solid #e2e8f0">
            <div style="font-size:0.75rem;color:#64748b">${s.sistema.toUpperCase()}</div>
            <div class="money" style="font-weight:700;color:var(--primary)">${fmt$(s.saldo)}</div>
          </div>
          `).join('')}
        </div>
        ` : ''}
        
        <h4 style="font-weight:700;color:var(--primary);margin-bottom:10px">
          <i class="fas fa-exchange-alt"></i> Movimientos (${movs.length})
        </h4>
        <div class="table-wrapper" style="max-height:300px;overflow-y:auto">
          <table>
            <thead><tr><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th><th>Hora</th></tr></thead>
            <tbody>
              ${movs.length > 0 ? movs.map(m => `
              <tr>
                <td><span class="badge ${m.tipo==='ingreso'?'badge-success':'badge-danger'}">${m.tipo}</span></td>
                <td><span style="font-size:0.8rem;background:#f1f5f9;padding:2px 8px;border-radius:6px">${m.categoria}</span></td>
                <td>${m.descripcion}</td>
                <td class="money ${m.tipo==='ingreso'?'text-ingreso':'text-egreso'}" style="font-weight:700">
                  ${m.tipo==='ingreso'?'+':'-'}${fmt$(m.monto)}
                </td>
                <td style="color:#94a3b8;font-size:0.8rem">${m.hora || '-'}</td>
              </tr>
              `).join('') : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Sin movimientos</td></tr>'}
            </tbody>
          </table>
        </div>
        
        ${c.estado === 'abierta' ? `
        <div style="margin-top:16px;display:flex;gap:10px">
          <button class="btn btn-accent" onclick="closeModal();addMovimiento(${c.id})">
            <i class="fas fa-plus"></i> Agregar Movimiento
          </button>
          <button class="btn btn-primary" onclick="closeModal();openCuadre(${c.id})">
            <i class="fas fa-check"></i> Cuadrar Caja
          </button>
        </div>
        ` : ''}
      </div>
    `, 'lg')
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

function addMovimiento(cajaId) {
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-exchange-alt"></i> Registrar Movimiento</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="tabs">
        <button class="tab-btn active" id="tab-ingreso" onclick="setMovTipo('ingreso')">
          <i class="fas fa-arrow-up"></i> Ingreso
        </button>
        <button class="tab-btn" id="tab-egreso" onclick="setMovTipo('egreso')">
          <i class="fas fa-arrow-down"></i> Egreso
        </button>
      </div>
      <input type="hidden" id="mov-tipo" value="ingreso">
      <input type="hidden" id="mov-caja-id" value="${cajaId}">
      
      <div class="form-group">
        <label class="form-label">Descripción *</label>
        <input type="text" class="form-input" id="mov-desc" placeholder="Ej: Cobro servicio Western Union">
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Monto (USD) *</label>
          <input type="number" class="form-input" id="mov-monto" placeholder="0.00" step="0.01" min="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-select" id="mov-cat">
            <option value="efectivo">💵 Efectivo</option>
            <option value="gold_pagos">🥇 Gold Pagos</option>
            <option value="dex">💳 DEX</option>
            <option value="western_union">🌐 Western Union</option>
            <option value="transferencia">🏦 Transferencia</option>
            <option value="pendiente">📋 Pendiente</option>
            <option value="otro">📌 Otro</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Referencia (opcional)</label>
        <input type="text" class="form-input" id="mov-ref" placeholder="Número de referencia, código...">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitMovimiento()">
        <i class="fas fa-save"></i> Guardar
      </button>
    </div>
  `)
}

function setMovTipo(tipo) {
  document.getElementById('mov-tipo').value = tipo
  document.getElementById('tab-ingreso').classList.toggle('active', tipo === 'ingreso')
  document.getElementById('tab-egreso').classList.toggle('active', tipo === 'egreso')
}

async function submitMovimiento() {
  const cajaId = parseInt(document.getElementById('mov-caja-id').value)
  const tipo = document.getElementById('mov-tipo').value
  const descripcion = document.getElementById('mov-desc').value.trim()
  const monto = parseFloat(document.getElementById('mov-monto').value)
  const categoria = document.getElementById('mov-cat').value
  const referencia = document.getElementById('mov-ref').value.trim()
  
  if (!descripcion) { toast('La descripción es requerida', 'warning'); return }
  if (!monto || monto <= 0) { toast('El monto debe ser mayor a 0', 'warning'); return }
  
  try {
    showLoading('Registrando...')
    await api('/movimientos', {
      method: 'POST',
      body: JSON.stringify({ caja_id: cajaId, tipo, descripcion, monto, categoria, referencia })
    })
    closeModal()
    hideLoading()
    toast('Movimiento registrado', 'success')
    renderCajas()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

function openCuadre(cajaId) {
  const denoms = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100]
  const sistemas = ['gold_pagos', 'caja', 'dex', 'western_union']
  
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-check-circle"></i> Cuadre de Caja</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="cuadre-caja-id" value="${cajaId}">
      
      <h4 style="font-weight:700;color:var(--primary);margin-bottom:12px">
        <i class="fas fa-coins"></i> Conteo de Efectivo
      </h4>
      <div class="denom-grid" id="conteo-efectivo">
        ${denoms.map(d => `
        <div class="denom-item">
          <div class="denom-label">$${d < 1 ? d.toFixed(2) : d}</div>
          <input type="number" class="denom-input" id="denom-${d.toString().replace('.','_')}" 
            min="0" value="0" onchange="calcTotalEfectivo()">
          <div class="denom-subtotal" id="sub-${d.toString().replace('.','_')}">$0.00</div>
        </div>
        `).join('')}
      </div>
      
      <div class="divider"></div>
      
      <h4 style="font-weight:700;color:var(--primary);margin-bottom:12px">
        <i class="fas fa-university"></i> Saldos por Sistema/Cuenta
      </h4>
      <div class="grid-2">
        ${sistemas.map(s => `
        <div class="form-group">
          <label class="form-label">${s.replace('_', ' ').toUpperCase()}</label>
          <input type="number" class="form-input" id="saldo-${s}" placeholder="0.00" step="0.01" min="0" value="0">
        </div>
        `).join('')}
      </div>
      
      <div class="divider"></div>
      
      <div class="form-group">
        <label class="form-label">
          Saldo Final Total en Caja (suma automática del efectivo)
        </label>
        <input type="number" class="form-input" id="saldo-final" placeholder="0.00" step="0.01" style="font-size:1.2rem;font-weight:700">
        <div id="total-efectivo-label" style="font-size:0.8rem;color:#64748b;margin-top:4px"></div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Observaciones</label>
        <textarea class="form-textarea" id="cuadre-notas" placeholder="Notas del cuadre..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitCuadre()">
        <i class="fas fa-check-circle"></i> Realizar Cuadre
      </button>
    </div>
  `, 'lg')
}

function calcTotalEfectivo() {
  const denoms = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100]
  let total = 0
  
  denoms.forEach(d => {
    const key = d.toString().replace('.','_')
    const qty = parseInt(document.getElementById(`denom-${key}`)?.value) || 0
    const sub = d * qty
    total += sub
    const subEl = document.getElementById(`sub-${key}`)
    if (subEl) subEl.textContent = fmt$(sub)
  })
  
  document.getElementById('saldo-final').value = total.toFixed(2)
  document.getElementById('total-efectivo-label').textContent = `Total efectivo calculado: ${fmt$(total)}`
}

async function submitCuadre() {
  const cajaId = parseInt(document.getElementById('cuadre-caja-id').value)
  const saldoFinal = parseFloat(document.getElementById('saldo-final').value) || 0
  const notas = document.getElementById('cuadre-notas').value
  const denoms = [0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100]
  
  const conteoEfectivo = denoms.map(d => {
    const qty = parseInt(document.getElementById(`denom-${d.toString().replace('.','_')}`)?.value) || 0
    return { denominacion: d, cantidad: qty }
  }).filter(d => d.cantidad > 0)
  
  const sistemas = ['gold_pagos', 'caja', 'dex', 'western_union']
  const saldosSistemas = sistemas.map(s => ({
    sistema: s,
    saldo: parseFloat(document.getElementById(`saldo-${s}`)?.value) || 0
  }))
  
  try {
    showLoading('Procesando cuadre...')
    const res = await api(`/cajas/${cajaId}/cuadrar`, {
      method: 'POST',
      body: JSON.stringify({ saldo_final: saldoFinal, conteo_efectivo: conteoEfectivo, saldos_sistemas: saldosSistemas, notas })
    })
    closeModal()
    hideLoading()
    
    const { resumen } = res
    const ok = resumen.cuadre_ok
    
    // Mostrar resultado
    showModal(`
      <div class="modal-header">
        <div class="modal-title">
          ${ok ? '<i class="fas fa-check-circle" style="color:#10b981"></i> Cuadre Exitoso' : '<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> Cuadre con Diferencia'}
        </div>
        <button class="modal-close" onclick="closeModal();renderCajas()">✕</button>
      </div>
      <div class="modal-body">
        <div class="alert ${ok ? 'alert-success' : 'alert-warning'}">
          ${ok ? '✅ El cuadre está correcto. Pendiente de aprobación.' : `⚠️ Hay una diferencia de ${fmt$(Math.abs(resumen.diferencia))}. El administrador deberá revisar.`}
        </div>
        <div class="grid-2" style="gap:12px">
          ${[
            ['Saldo Inicial', fmt$(resumen.saldo_inicial), '#dbeafe'],
            ['Total Ingresos', '+' + fmt$(resumen.total_ingresos), '#d1fae5'],
            ['Total Egresos', '-' + fmt$(resumen.total_egresos), '#fee2e2'],
            ['Saldo Esperado', fmt$(resumen.saldo_esperado), '#ede9fe'],
            ['Saldo Real', fmt$(resumen.saldo_real), '#fef3c7'],
            ['Diferencia', fmt$(resumen.diferencia), ok ? '#d1fae5' : '#fee2e2']
          ].map(([l, v, bg]) => `
          <div style="background:${bg};padding:14px;border-radius:10px">
            <div style="font-size:0.75rem;font-weight:600;color:#64748b">${l}</div>
            <div class="money" style="font-size:1.2rem;font-weight:800">${v}</div>
          </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="closeModal();renderCajas()">Aceptar</button>
      </div>
    `)
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

async function aprobarCaja(id, aprobado) {
  const accion = aprobado ? 'aprobar' : 'rechazar'
  if (!confirm(`¿Confirmas ${accion} esta caja?`)) return
  
  try {
    await api(`/cajas/${id}/aprobar`, { method: 'POST', body: JSON.stringify({ aprobado }) })
    toast(`Caja ${aprobado ? 'aprobada' : 'rechazada'} exitosamente`, 'success')
    
    // Si se aprueba, guardar snapshot en historial diario
    if (aprobado) {
      try {
        await api('/historial/snapshot', {
          method: 'POST',
          body: JSON.stringify({ caja_id: id })
        })
        toast('📅 Snapshot guardado en historial diario', 'info')
      } catch (e) {
        // No crítico si falla el snapshot
        console.warn('No se pudo guardar snapshot:', e.message)
      }
    }
    
    renderCajas()
  } catch (err) {
    toast(err.message, 'error')
  }
}

// ============================================================
// MOVIMIENTOS
// ============================================================
async function renderMovimientos() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const data = await api('/movimientos?limit=100')
    const movs = data?.movimientos || []
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-exchange-alt"></i> Movimientos</div>
          <button class="btn btn-primary btn-sm" onclick="navigate('cajas')">
            <i class="fas fa-plus"></i> Nuevo
          </button>
        </div>
        
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div class="search-bar" style="flex:1;min-width:200px">
            <i class="fas fa-search" style="color:#94a3b8"></i>
            <input type="text" placeholder="Buscar movimientos..." id="mov-search" oninput="filterMovimientos()">
          </div>
          <select class="form-select" style="width:150px" id="mov-filter-tipo" onchange="filterMovimientos()">
            <option value="">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select class="form-select" style="width:150px" id="mov-filter-cat" onchange="filterMovimientos()">
            <option value="">Todas las cat.</option>
            <option value="efectivo">Efectivo</option>
            <option value="gold_pagos">Gold Pagos</option>
            <option value="dex">DEX</option>
            <option value="western_union">Western Union</option>
            <option value="pendiente">Pendiente</option>
          </select>
        </div>
        
        <div id="movs-table">
          ${renderMovsTable(movs)}
        </div>
      </div>
    `
    
    window._movimientosData = movs
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function filterMovimientos() {
  const search = document.getElementById('mov-search')?.value.toLowerCase() || ''
  const tipo = document.getElementById('mov-filter-tipo')?.value || ''
  const cat = document.getElementById('mov-filter-cat')?.value || ''
  
  let filtered = window._movimientosData || []
  if (search) filtered = filtered.filter(m => m.descripcion?.toLowerCase().includes(search) || m.referencia?.toLowerCase().includes(search))
  if (tipo) filtered = filtered.filter(m => m.tipo === tipo)
  if (cat) filtered = filtered.filter(m => m.categoria === cat)
  
  const table = document.getElementById('movs-table')
  if (table) table.innerHTML = renderMovsTable(filtered)
}

function renderMovsTable(movs) {
  if (!movs.length) return '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin movimientos</h3></div>'
  
  const totalIngresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  
  return `
    <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap">
      <div class="badge badge-success" style="padding:8px 16px;font-size:0.85rem">
        ↑ Ingresos: ${fmt$(totalIngresos)}
      </div>
      <div class="badge badge-danger" style="padding:8px 16px;font-size:0.85rem">
        ↓ Egresos: ${fmt$(totalEgresos)}
      </div>
      <div class="badge badge-primary" style="padding:8px 16px;font-size:0.85rem">
        = Neto: ${fmt$(totalIngresos - totalEgresos)}
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>Fecha</th>
          ${isAdmin() ? '<th>Trabajador</th>' : ''}
          <th>Tipo</th>
          <th>Categoría</th>
          <th>Descripción</th>
          <th>Monto</th>
          <th>Ref.</th>
        </tr></thead>
        <tbody>
          ${movs.map(m => `
          <tr>
            <td style="white-space:nowrap">${fmtDate(m.fecha_caja)} <span style="color:#94a3b8;font-size:0.75rem">${m.hora?.substring(0,5) || ''}</span></td>
            ${isAdmin() ? `<td><small>${m.nombre} ${m.apellido}</small></td>` : ''}
            <td><span class="badge ${m.tipo==='ingreso'?'badge-success':'badge-danger'}">${m.tipo}</span></td>
            <td><span style="font-size:0.8rem;background:#f1f5f9;padding:2px 8px;border-radius:6px">${m.categoria}</span></td>
            <td>${m.descripcion}</td>
            <td class="money ${m.tipo==='ingreso'?'text-ingreso':'text-egreso'}" style="font-weight:700">
              ${m.tipo==='ingreso'?'+':'-'}${fmt$(m.monto)}
            </td>
            <td style="color:#94a3b8;font-size:0.8rem">${m.referencia || '-'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// PENDIENTES
// ============================================================
async function renderPendientes() {
  const content = document.getElementById('page-content')
  content.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const data = await api('/pendientes')
    const pendientes = data?.pendientes || []
    const totales = data?.totales || {}
    
    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px">
        <!-- Stats -->
        <div class="grid-3">
          <div class="stat-card">
            <div class="stat-icon" style="background:#fee2e2;color:#ef4444"><i class="fas fa-money-bill-wave"></i></div>
            <div class="stat-content">
              <div class="stat-value money text-egreso">${fmt$(totales.total_por_pagar || 0)}</div>
              <div class="stat-label">Total Por Pagar</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5;color:#10b981"><i class="fas fa-hand-holding-usd"></i></div>
            <div class="stat-content">
              <div class="stat-value money text-ingreso">${fmt$(totales.total_por_cobrar || 0)}</div>
              <div class="stat-label">Total Por Cobrar</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#f59e0b"><i class="fas fa-clock"></i></div>
            <div class="stat-content">
              <div class="stat-value">${totales.total_activos || 0}</div>
              <div class="stat-label">Pendientes Activos</div>
            </div>
          </div>
        </div>
        
        <!-- Lista -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-file-invoice-dollar"></i> Cuentas por Pagar/Cobrar</div>
            <button class="btn btn-primary" onclick="openNewPendiente()">
              <i class="fas fa-plus"></i> Nuevo Pendiente
            </button>
          </div>
          
          <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="search-bar" style="flex:1">
              <i class="fas fa-search" style="color:#94a3b8"></i>
              <input type="text" placeholder="Buscar por nombre, cédula, código..." id="pend-search" oninput="filterPendientes()">
            </div>
            <select class="form-select" style="width:150px" id="pend-filter-tipo" onchange="filterPendientes()">
              <option value="">Todos</option>
              <option value="por_pagar">Por Pagar</option>
              <option value="por_cobrar">Por Cobrar</option>
            </select>
            <select class="form-select" style="width:160px" id="pend-filter-estado" onchange="filterPendientes()">
              <option value="">Todos (activos)</option>
              <option value="pendiente">Solo Pendientes</option>
              <option value="pagado_parcial">Parcialmente Abonados</option>
              <option value="pagado_total">Pagados Total</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
          
          <div id="pendientes-table">
            ${renderPendientesTable(pendientes)}
          </div>
        </div>
      </div>
    `
    
    window._pendientesData = pendientes
    
    // Apply initial filter - mostrar pendientes Y parciales por defecto
    document.getElementById('pend-filter-estado').value = ''
    filterPendientes()
    
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function filterPendientes() {
  const search = document.getElementById('pend-search')?.value.toLowerCase() || ''
  const tipo = document.getElementById('pend-filter-tipo')?.value || ''
  const estado = document.getElementById('pend-filter-estado')?.value || ''
  
  let filtered = window._pendientesData || []
  if (search) filtered = filtered.filter(p => 
    p.nombre_deudor?.toLowerCase().includes(search) ||
    p.cedula_deudor?.toLowerCase().includes(search) ||
    p.codigo?.toLowerCase().includes(search)
  )
  if (tipo) filtered = filtered.filter(p => p.tipo === tipo)
  if (estado) {
    filtered = filtered.filter(p => p.estado === estado)
  } else {
    // Sin filtro: mostrar todos excepto cancelados (pendiente + parcial + total)
    filtered = filtered.filter(p => p.estado !== 'cancelado')
  }
  
  const el = document.getElementById('pendientes-table')
  if (el) el.innerHTML = renderPendientesTable(filtered)
}

function renderPendientesTable(pendientes) {
  if (!pendientes.length) return '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin pendientes</h3></div>'
  
  return `
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>Código</th>
          <th>Nombre / Cédula</th>
          <th>Tipo</th>
          <th>Monto Original</th>
          <th>Pendiente</th>
          <th>Estado</th>
          <th>Vencimiento</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${pendientes.map(p => {
            const pct = ((p.monto_original - p.monto_pendiente) / p.monto_original * 100).toFixed(0)
            const esVencido = p.fecha_vencimiento && new Date(p.fecha_vencimiento) < new Date() && ['pendiente','pagado_parcial'].includes(p.estado)
            return `
            <tr style="${esVencido ? 'background:#fff5f5' : ''}">
              <td>
                <span style="font-family:monospace;font-size:0.8rem;background:#f1f5f9;padding:2px 6px;border-radius:4px">
                  ${p.codigo}
                </span>
              </td>
              <td>
                <div style="font-weight:600">${p.nombre_deudor}</div>
                ${p.cedula_deudor ? `<div style="font-size:0.75rem;color:#94a3b8">${p.cedula_deudor}</div>` : ''}
                ${p.descripcion ? `<div style="font-size:0.75rem;color:#64748b">${p.descripcion}</div>` : ''}
              </td>
              <td>
                <span class="badge ${p.tipo==='por_pagar'?'badge-danger':'badge-success'}">
                  ${p.tipo === 'por_pagar' ? '💸 Por Pagar' : '💰 Por Cobrar'}
                </span>
              </td>
              <td class="money">${fmt$(p.monto_original)}</td>
              <td>
                <div class="money" style="font-weight:800;color:${p.tipo==='por_pagar'?'#ef4444':'#10b981'}">${fmt$(p.monto_pendiente)}</div>
                ${p.monto_pendiente < p.monto_original ? `
                <div class="progress-bar" style="margin-top:4px;width:80px">
                  <div class="progress-fill" style="width:${pct}%"></div>
                </div>
                <div style="font-size:0.7rem;color:#64748b">${pct}% pagado</div>
                ` : ''}
              </td>
              <td>${fmtEstadoPend(p.estado)}</td>
              <td style="${esVencido ? 'color:#ef4444;font-weight:700' : 'color:#64748b'}">
                ${p.fecha_vencimiento ? fmtDate(p.fecha_vencimiento) : '-'}
                ${esVencido ? ' ⚠️' : ''}
              </td>
              <td style="white-space:nowrap">
                ${['pendiente','pagado_parcial'].includes(p.estado) ? `
                <button class="btn btn-success btn-sm" onclick="openAbonar(${p.id}, '${p.nombre_deudor}', ${p.monto_pendiente}, '${p.tipo}')">
                  <i class="fas fa-dollar-sign"></i> Abonar
                </button>
                ` : ''}
                <button class="btn btn-ghost btn-sm" onclick="viewPendiente(${p.id})">
                  <i class="fas fa-eye"></i>
                </button>
                ${isAdmin() ? `
                <button class="btn btn-danger btn-sm" onclick="cancelarPendiente(${p.id})">
                  <i class="fas fa-times"></i>
                </button>
                ` : ''}
              </td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

function openNewPendiente() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-file-invoice-dollar"></i> Nuevo Pendiente</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="tabs">
        <button class="tab-btn active" id="tab-por-pagar" onclick="setPendTipo('por_pagar')">
          💸 Por Pagar
        </button>
        <button class="tab-btn" id="tab-por-cobrar" onclick="setPendTipo('por_cobrar')">
          💰 Por Cobrar
        </button>
      </div>
      <input type="hidden" id="pend-tipo" value="por_pagar">
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Nombre Completo *</label>
          <input type="text" class="form-input" id="pend-nombre" placeholder="Nombre del deudor/acreedor">
        </div>
        <div class="form-group">
          <label class="form-label">Cédula (opcional)</label>
          <input type="text" class="form-input" id="pend-cedula" placeholder="0000000000">
        </div>
      </div>
      
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Monto (USD) *</label>
          <input type="number" class="form-input" id="pend-monto" placeholder="0.00" step="0.01" min="0.01">
        </div>
        <div class="form-group">
          <label class="form-label">Fecha de Vencimiento</label>
          <input type="date" class="form-input" id="pend-venc" min="${today()}">
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Descripción / Detalle</label>
        <textarea class="form-textarea" id="pend-desc" placeholder="Descripción del pendiente..."></textarea>
      </div>
      
      <div class="form-group">
        <label class="form-label">Prioridad</label>
        <select class="form-select" id="pend-prioridad">
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
          <option value="baja">Baja</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitNuevoPendiente()">
        <i class="fas fa-save"></i> Guardar
      </button>
    </div>
  `)
}

function setPendTipo(tipo) {
  document.getElementById('pend-tipo').value = tipo
  document.getElementById('tab-por-pagar').classList.toggle('active', tipo === 'por_pagar')
  document.getElementById('tab-por-cobrar').classList.toggle('active', tipo === 'por_cobrar')
}

async function submitNuevoPendiente() {
  const tipo = document.getElementById('pend-tipo').value
  const nombre_deudor = document.getElementById('pend-nombre').value.trim()
  const cedula_deudor = document.getElementById('pend-cedula').value.trim()
  const monto = parseFloat(document.getElementById('pend-monto').value)
  const fecha_vencimiento = document.getElementById('pend-venc').value || null
  const descripcion = document.getElementById('pend-desc').value.trim()
  const prioridad = document.getElementById('pend-prioridad').value
  
  if (!nombre_deudor) { toast('El nombre es requerido', 'warning'); return }
  if (!monto || monto <= 0) { toast('El monto debe ser mayor a 0', 'warning'); return }
  
  try {
    showLoading('Guardando...')
    await api('/pendientes', {
      method: 'POST',
      body: JSON.stringify({ tipo, nombre_deudor, cedula_deudor, descripcion, monto, fecha_vencimiento, prioridad })
    })
    closeModal()
    hideLoading()
    toast('Pendiente registrado exitosamente', 'success')
    renderPendientes()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

function openAbonar(id, nombre, montoActual, tipo) {
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-dollar-sign"></i> Registrar Abono</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        <div>
          <div><strong>${nombre}</strong></div>
          <div>Monto pendiente: <strong>${fmt$(montoActual)}</strong></div>
          ${tipo === 'por_pagar' ? '<div style="font-size:0.85rem;color:#1e40af">⚠️ Este abono se registrará como EGRESO en la caja</div>' : ''}
        </div>
      </div>
      <input type="hidden" id="abono-id" value="${id}">
      
      <div class="form-group">
        <label class="form-label">Monto del Abono (USD) *</label>
        <input type="number" class="form-input" id="abono-monto" placeholder="0.00" 
          step="0.01" min="0.01" max="${montoActual}" value="${montoActual}">
        <div style="font-size:0.8rem;color:#64748b;margin-top:4px">
          Máximo: ${fmt$(montoActual)}
        </div>
      </div>
      
      <div class="form-group">
        <label class="form-label">Notas del abono</label>
        <textarea class="form-textarea" id="abono-notas" placeholder="Ej: Pago en efectivo, transferencia #XXX..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-success" onclick="submitAbono()">
        <i class="fas fa-check"></i> Registrar Abono
      </button>
    </div>
  `)
}

async function submitAbono() {
  const id = parseInt(document.getElementById('abono-id').value)
  const monto = parseFloat(document.getElementById('abono-monto').value)
  const notas = document.getElementById('abono-notas').value
  
  if (!monto || monto <= 0) { toast('El monto es requerido', 'warning'); return }
  
  try {
    showLoading('Registrando abono...')
    const res = await api(`/pendientes/${id}/abonar`, {
      method: 'POST',
      body: JSON.stringify({ monto, notas })
    })
    closeModal()
    hideLoading()
    
    // Actualizar dinámicamente en la lista sin recargar toda la página
    if (window._pendientesData) {
      const idx = window._pendientesData.findIndex(p => p.id === id)
      if (idx >= 0) {
        window._pendientesData[idx].monto_pendiente = res.monto_pendiente_nuevo
        window._pendientesData[idx].estado = res.estado
      }
    }
    
    if (res.pagado_total) {
      toast('✅ Pendiente pagado completamente', 'success')
    } else {
      toast(`✅ Abono registrado. Monto restante: ${fmt$(res.monto_pendiente_nuevo)}`, 'success')
    }
    
    // Re-aplicar filtros para reflejar cambios sin recargar todo
    filterPendientes()
    
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

async function viewPendiente(id) {
  showLoading('Cargando...')
  try {
    const data = await api(`/pendientes/${id}`)
    hideLoading()
    const p = data.pendiente
    const abonos = data.abonos || []
    
    showModal(`
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-file-invoice-dollar"></i> Detalle - ${p.codigo}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          ${fmtEstadoPend(p.estado)}
          <span class="badge ${p.tipo==='por_pagar'?'badge-danger':'badge-success'}">
            ${p.tipo === 'por_pagar' ? '💸 Por Pagar' : '💰 Por Cobrar'}
          </span>
          <span class="badge badge-gray">${p.prioridad}</span>
        </div>
        
        <div class="grid-2" style="gap:16px;margin-bottom:20px">
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">NOMBRE</div>
            <div style="font-weight:700;font-size:1.1rem">${p.nombre_deudor}</div>
          </div>
          ${p.cedula_deudor ? `
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">CÉDULA</div>
            <div style="font-weight:700">${p.cedula_deudor}</div>
          </div>
          ` : ''}
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">MONTO ORIGINAL</div>
            <div class="money" style="font-weight:800;font-size:1.2rem">${fmt$(p.monto_original)}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">PENDIENTE</div>
            <div class="money" style="font-weight:800;font-size:1.2rem;color:${p.tipo==='por_pagar'?'#ef4444':'#10b981'}">${fmt$(p.monto_pendiente)}</div>
          </div>
          ${p.fecha_vencimiento ? `
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">VENCIMIENTO</div>
            <div style="font-weight:600">${fmtDate(p.fecha_vencimiento)}</div>
          </div>
          ` : ''}
          <div>
            <div style="font-size:0.75rem;color:#64748b;font-weight:600">REGISTRADO POR</div>
            <div>${p.registrado_por_nombre} ${p.registrado_por_apellido}</div>
          </div>
        </div>
        
        ${p.descripcion ? `<div style="background:#f8fafc;padding:12px;border-radius:10px;margin-bottom:16px;color:#64748b">${p.descripcion}</div>` : ''}
        
        <div class="progress-bar" style="height:10px;margin-bottom:8px">
          <div class="progress-fill" style="width:${((p.monto_original-p.monto_pendiente)/p.monto_original*100).toFixed(0)}%"></div>
        </div>
        <div style="font-size:0.8rem;color:#64748b;margin-bottom:16px">
          ${((p.monto_original-p.monto_pendiente)/p.monto_original*100).toFixed(0)}% pagado (${fmt$(p.monto_original-p.monto_pendiente)} de ${fmt$(p.monto_original)})
        </div>
        
        <h4 style="font-weight:700;color:var(--primary);margin-bottom:10px">
          <i class="fas fa-history"></i> Historial de Abonos (${abonos.length})
        </h4>
        ${abonos.length > 0 ? `
        <div class="table-wrapper">
          <table>
            <thead><tr><th>Fecha</th><th>Monto</th><th>Registrado por</th><th>Notas</th></tr></thead>
            <tbody>
              ${abonos.map(a => `
              <tr>
                <td>${fmtDatetime(a.fecha)}</td>
                <td class="money text-ingreso" style="font-weight:700">+${fmt$(a.monto)}</td>
                <td>${a.nombre} ${a.apellido}</td>
                <td style="color:#64748b">${a.notas || '-'}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : '<div style="color:#94a3b8;text-align:center;padding:16px">Sin abonos registrados</div>'}
        
        ${['pendiente','pagado_parcial'].includes(p.estado) ? `
        <div style="margin-top:16px">
          <button class="btn btn-success" onclick="closeModal();openAbonar(${p.id},'${p.nombre_deudor.replace("'","\\'")}',${p.monto_pendiente},'${p.tipo}')">
            <i class="fas fa-dollar-sign"></i> Registrar Abono
          </button>
        </div>
        ` : ''}
      </div>
    `, 'lg')
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

async function cancelarPendiente(id) {
  if (!confirm('¿Confirmas cancelar este pendiente?')) return
  try {
    await api(`/pendientes/${id}`, { method: 'DELETE' })
    toast('Pendiente cancelado', 'success')
    renderPendientes()
  } catch (err) {
    toast(err.message, 'error')
  }
}

// ============================================================
// CAJAS ADMIN
// ============================================================
async function renderCajasAdmin() {
  if (!isAdmin()) { navigate('cajas'); return }
  
  const content = document.getElementById('page-content')
  content.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const [cajasData, usersData] = await Promise.all([
      api('/cajas?limit=50'),
      api('/users')
    ])
    
    const cajas = cajasData?.cajas || []
    const users = usersData?.users?.filter(u => u.activo) || []
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-tasks"></i> Gestión de Cajas - Todos los Trabajadores</div>
          <div style="display:flex;gap:8px">
            <select class="form-select" style="width:180px" id="admin-filter-user" onchange="filterAdminCajas()">
              <option value="">Todos los usuarios</option>
              ${users.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido}</option>`).join('')}
            </select>
            <select class="form-select" style="width:140px" id="admin-filter-estado" onchange="filterAdminCajas()">
              <option value="">Todos</option>
              <option value="abierta">Abiertas</option>
              <option value="cuadrada">Para Aprobar</option>
              <option value="aprobada">Aprobadas</option>
            </select>
          </div>
        </div>
        
        <div id="admin-cajas-table">
          ${renderAdminCajasTable(cajas)}
        </div>
      </div>
    `
    
    window._adminCajasData = cajas
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function filterAdminCajas() {
  const userId = document.getElementById('admin-filter-user')?.value || ''
  const estado = document.getElementById('admin-filter-estado')?.value || ''
  
  let filtered = window._adminCajasData || []
  if (userId) filtered = filtered.filter(c => c.user_id == userId)
  if (estado) filtered = filtered.filter(c => c.estado === estado)
  
  const el = document.getElementById('admin-cajas-table')
  if (el) el.innerHTML = renderAdminCajasTable(filtered)
}

function renderAdminCajasTable(cajas) {
  if (!cajas.length) return '<div class="empty-state"><i class="fas fa-inbox"></i><h3>Sin cajas encontradas</h3></div>'
  
  const cuadradas = cajas.filter(c => c.estado === 'cuadrada').length
  
  return `
    ${cuadradas > 0 ? `<div class="alert alert-warning"><i class="fas fa-bell"></i> <strong>${cuadradas} caja(s) esperando aprobación</strong></div>` : ''}
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>Trabajador</th>
          <th>Fecha</th>
          <th>S. Inicial</th>
          <th>Ingresos</th>
          <th>Egresos</th>
          <th>Ganancia</th>
          <th>S. Real</th>
          <th>Diferencia</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${cajas.map(c => {
            const gan = (c.total_ingresos||0) - (c.total_egresos||0)
            const esperado = (c.saldo_inicial||0) + (c.total_ingresos||0) - (c.total_egresos||0)
            const dif = c.saldo_final != null ? c.saldo_final - esperado : null
            const saldoActual = c.saldo_final != null ? c.saldo_final : esperado
            const alertaSaldo = saldoActual - (c.saldo_inicial||0) > 5
            return `
            <tr style="${alertaSaldo ? 'background:#f0fdf4' : c.estado==='cuadrada'?'background:#fffbeb':c.estado==='rechazada'?'background:#fff5f5':''}">
              <td>
                <div style="font-weight:600">${c.nombre} ${c.apellido}</div>
                <div style="font-size:0.75rem;color:#94a3b8">${c.cedula}</div>
                ${alertaSaldo ? `<div style="font-size:0.75rem;color:#10b981;font-weight:700">
                  <i class="fas fa-arrow-up"></i> Saldo +$${(saldoActual-(c.saldo_inicial||0)).toFixed(2)} vs inicio
                </div>` : ''}
              </td>
              <td>${fmtDate(c.fecha)}</td>
              <td class="money">${fmt$(c.saldo_inicial)}</td>
              <td class="money text-ingreso">+${fmt$(c.total_ingresos||0)}</td>
              <td class="money text-egreso">-${fmt$(c.total_egresos||0)}</td>
              <td class="money" style="font-weight:700;color:${gan>=0?'#10b981':'#ef4444'}">${fmt$(gan)}</td>
              <td class="money">${c.saldo_final != null ? fmt$(c.saldo_final) : '-'}</td>
              <td class="money" style="color:${dif == null ? '#94a3b8' : Math.abs(dif) <= 0.5 ? '#10b981' : '#ef4444'};font-weight:700">
                ${dif != null ? (dif >= 0 ? '+' : '') + fmt$(dif) : '-'}
              </td>
              <td>${fmtEstadoCaja(c.estado)}</td>
              <td style="white-space:nowrap">
                <button class="btn btn-ghost btn-sm" onclick="viewCaja(${c.id})" title="Ver detalle">
                  <i class="fas fa-eye"></i>
                </button>
                ${c.estado === 'cuadrada' ? `
                <button class="btn btn-success btn-sm" onclick="aprobarCaja(${c.id}, true)" title="Aprobar">
                  <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="aprobarCaja(${c.id}, false)" title="Rechazar">
                  <i class="fas fa-times"></i>
                </button>
                ` : ''}
                ${c.estado === 'aprobada' || ['superadmin','admin'].includes(currentUser?.role) ? `
                <button class="btn btn-accent btn-sm" onclick="addMovimiento(${c.id})" title="Agregar movimiento">
                  <i class="fas fa-plus"></i>
                </button>
                ` : ''}
              </td>
            </tr>
            `
          }).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// USUARIOS
// ============================================================
async function renderUsuarios() {
  if (!canManageUsers()) { navigate('dashboard'); return }
  
  const content = document.getElementById('page-content')
  content.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const data = await api('/users')
    const users = data?.users || []
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-users"></i> Gestión de Usuarios (${users.length})</div>
          <button class="btn btn-primary" onclick="openNewUser()">
            <i class="fas fa-user-plus"></i> Nuevo Usuario
          </button>
        </div>
        
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Cédula</th>
              <th>Nombre Completo</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Registrado</th>
              <th>Acciones</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `
              <tr style="${!u.activo ? 'opacity:0.6' : ''}">
                <td style="font-family:monospace;font-weight:600">${u.cedula}</td>
                <td>
                  <div style="font-weight:600">${u.nombre} ${u.apellido}</div>
                  ${u.cedula === '1314221597' ? '<span class="badge badge-primary" style="font-size:0.65rem">👑 SuperAdmin</span>' : ''}
                </td>
                <td style="color:#64748b">${u.email || '-'}</td>
                <td>${fmtRole(u.role)}</td>
                <td>
                  <span class="badge ${u.activo ? 'badge-success' : 'badge-gray'}">
                    ${u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style="color:#64748b;font-size:0.85rem">${fmtDate(u.created_at?.split('T')[0])}</td>
                <td style="white-space:nowrap">
                  <button class="btn btn-ghost btn-sm" onclick="editUser(${u.id},'${u.nombre}','${u.apellido}','${u.email||''}','${u.role}',${u.activo})">
                    <i class="fas fa-edit"></i>
                  </button>
                  ${isSuperAdmin() && u.cedula !== '1314221597' ? `
                  <button class="btn btn-danger btn-sm" onclick="toggleUser(${u.id}, ${u.activo})">
                    <i class="fas fa-${u.activo ? 'ban' : 'check'}"></i>
                  </button>
                  ` : ''}
                </td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function openNewUser() {
  const roles = currentUser?.role === 'superadmin'
    ? [['trabajador','💼 Trabajador'],['supervisor','👁 Supervisor'],['admin','🔑 Admin']]
    : [['trabajador','💼 Trabajador'],['supervisor','👁 Supervisor']]
  
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-user-plus"></i> Crear Nuevo Usuario</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Nombre *</label>
          <input type="text" class="form-input" id="nu-nombre" placeholder="Nombres">
        </div>
        <div class="form-group">
          <label class="form-label">Apellido *</label>
          <input type="text" class="form-input" id="nu-apellido" placeholder="Apellidos">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Cédula *</label>
          <input type="text" class="form-input" id="nu-cedula" placeholder="Número de cédula">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="nu-email" placeholder="correo@ejemplo.com">
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Contraseña *</label>
          <input type="password" class="form-input" id="nu-pass" placeholder="Mínimo 6 caracteres">
        </div>
        <div class="form-group">
          <label class="form-label">Rol</label>
          <select class="form-select" id="nu-role">
            ${roles.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="alert alert-info">
        <i class="fas fa-info-circle"></i>
        El usuario podrá cambiar su contraseña desde el sistema.
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitNuevoUser()">
        <i class="fas fa-user-plus"></i> Crear Usuario
      </button>
    </div>
  `)
}

async function submitNuevoUser() {
  const nombre = document.getElementById('nu-nombre').value.trim()
  const apellido = document.getElementById('nu-apellido').value.trim()
  const cedula = document.getElementById('nu-cedula').value.trim()
  const email = document.getElementById('nu-email').value.trim()
  const password = document.getElementById('nu-pass').value
  const role = document.getElementById('nu-role').value
  
  if (!nombre || !apellido || !cedula || !password) {
    toast('Nombre, apellido, cédula y contraseña son requeridos', 'warning')
    return
  }
  if (password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warning'); return }
  
  try {
    showLoading('Creando usuario...')
    await api('/users', { method: 'POST', body: JSON.stringify({ nombre, apellido, cedula, email, password, role }) })
    closeModal()
    hideLoading()
    toast(`Usuario ${nombre} ${apellido} creado exitosamente`, 'success')
    renderUsuarios()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

function editUser(id, nombre, apellido, email, role, activo) {
  const roles = currentUser?.role === 'superadmin'
    ? [['trabajador','💼 Trabajador'],['supervisor','👁 Supervisor'],['admin','🔑 Admin']]
    : [['trabajador','💼 Trabajador'],['supervisor','👁 Supervisor']]
  
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-user-edit"></i> Editar Usuario</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Nombre</label>
          <input type="text" class="form-input" id="eu-nombre" value="${nombre}">
        </div>
        <div class="form-group">
          <label class="form-label">Apellido</label>
          <input type="text" class="form-input" id="eu-apellido" value="${apellido}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input type="email" class="form-input" id="eu-email" value="${email}">
      </div>
      ${isSuperAdmin() ? `
      <div class="form-group">
        <label class="form-label">Rol</label>
        <select class="form-select" id="eu-role">
          ${roles.map(([v,l]) => `<option value="${v}" ${v===role?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      ` : ''}
      <div class="form-group">
        <label class="form-label">Nueva Contraseña (dejar vacío para no cambiar)</label>
        <input type="password" class="form-input" id="eu-pass" placeholder="Nueva contraseña...">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitEditUser(${id})">
        <i class="fas fa-save"></i> Guardar Cambios
      </button>
    </div>
  `)
}

async function submitEditUser(id) {
  const nombre = document.getElementById('eu-nombre').value.trim()
  const apellido = document.getElementById('eu-apellido').value.trim()
  const email = document.getElementById('eu-email').value.trim()
  const role = document.getElementById('eu-role')?.value
  const password = document.getElementById('eu-pass').value
  
  const body = { nombre, apellido, email }
  if (role) body.role = role
  if (password) {
    if (password.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warning'); return }
    body.password = password
  }
  
  try {
    showLoading('Actualizando...')
    await api(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    closeModal()
    hideLoading()
    toast('Usuario actualizado', 'success')
    renderUsuarios()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

async function toggleUser(id, activo) {
  const accion = activo ? 'desactivar' : 'activar'
  if (!confirm(`¿Confirmas ${accion} este usuario?`)) return
  
  try {
    await api(`/users/${id}`, { method: 'PUT', body: JSON.stringify({ activo: !activo }) })
    toast(`Usuario ${activo ? 'desactivado' : 'activado'}`, 'success')
    renderUsuarios()
  } catch (err) {
    toast(err.message, 'error')
  }
}

// ============================================================
// EXCEL / IA
// ============================================================
async function renderExcel() {
  const content = document.getElementById('page-content')
  
  let cajaId = ''
  try {
    const cajaHoy = await api('/cajas/hoy')
    if (cajaHoy?.caja) cajaId = cajaHoy.caja.id
  } catch {}
  
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:24px">
      <!-- Upload -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-robot" style="color:var(--accent)"></i> Análisis de Excel con IA
            <span class="ai-badge">Gemini AI</span>
          </div>
        </div>
        
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i>
          <div>
            <strong>¿Cómo funciona?</strong><br>
            Sube tu archivo Excel (.xlsx) de cualquier sistema (Gold Pagos, DEX, Western Union, etc.) y nuestra IA 
            analizará los movimientos, verificará el cuadre y generará un resumen detallado.
          </div>
        </div>
        
        <div class="file-drop" id="file-drop" onclick="document.getElementById('excel-file').click()"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="handleDrop(event)">
          <i class="fas fa-cloud-upload-alt upload-icon"></i>
          <p><strong>Arrastra tu Excel aquí</strong> o haz clic para seleccionar</p>
          <p style="margin-top:8px;font-size:0.8rem">Formatos soportados: .xlsx, .xls, .csv — Máximo 10MB</p>
        </div>
        <input type="file" id="excel-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFileSelect(event)">
        
        <div id="file-selected" style="display:none;margin-top:12px">
          <div class="alert alert-success">
            <i class="fas fa-file-excel"></i>
            <div>
              <strong id="file-name-display"></strong>
              <div style="font-size:0.8rem" id="file-size-display"></div>
            </div>
          </div>
        </div>
        
        <div class="grid-2" style="margin-top:16px">
          <div class="form-group">
            <label class="form-label">Sistema / Cuenta</label>
            <select class="form-select" id="excel-sistema">
              <option value="general">General</option>
              <option value="gold_pagos">Gold Pagos</option>
              <option value="dex">DEX</option>
              <option value="western_union">Western Union</option>
              <option value="caja">Caja Principal</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Vincular a caja (opcional)</label>
            <input type="number" class="form-input" id="excel-caja-id" placeholder="ID de caja" value="${cajaId}">
          </div>
        </div>
        
        <button class="btn btn-primary btn-lg" onclick="submitExcel()" id="excel-submit-btn" disabled>
          <i class="fas fa-robot"></i> Analizar con IA
        </button>
      </div>
      
      <!-- Resultado del análisis -->
      <div id="excel-resultado"></div>
      
      <!-- Historial -->
      <div class="card" id="excel-historial">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-history"></i> Análisis Recientes</div>
        </div>
        <div id="excel-historial-content">
          <div style="text-align:center;padding:20px"><div class="spinner-dark" style="width:30px;height:30px;border-width:3px;display:inline-block"></div></div>
        </div>
      </div>
    </div>
  `
  
  loadExcelHistory()
}

window._selectedFile = null

function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file) setSelectedFile(file)
}

function handleDrop(event) {
  event.preventDefault()
  document.getElementById('file-drop').classList.remove('drag-over')
  const file = event.dataTransfer.files[0]
  if (file) setSelectedFile(file)
}

function setSelectedFile(file) {
  window._selectedFile = file
  document.getElementById('file-name-display').textContent = file.name
  document.getElementById('file-size-display').textContent = `${(file.size / 1024).toFixed(1)} KB`
  document.getElementById('file-selected').style.display = 'block'
  document.getElementById('excel-submit-btn').disabled = false
}

async function submitExcel() {
  if (!window._selectedFile) { toast('Selecciona un archivo primero', 'warning'); return }
  
  const btn = document.getElementById('excel-submit-btn')
  btn.disabled = true
  btn.innerHTML = '<span class="spinner"></span> Analizando con IA...'
  
  const formData = new FormData()
  formData.append('file', window._selectedFile)
  formData.append('sistema', document.getElementById('excel-sistema').value)
  formData.append('caja_id', document.getElementById('excel-caja-id').value || '')
  
  try {
    const res = await apiForm('/excel/upload', formData)
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-robot"></i> Analizar con IA'
    
    renderAnalysis(res.analisis, res.filename, res.sistema)
    loadExcelHistory()
    toast('Análisis completado', 'success')
  } catch (err) {
    btn.disabled = false
    btn.innerHTML = '<i class="fas fa-robot"></i> Analizar con IA'
    toast(err.message, 'error')
  }
}

function renderAnalysis(analisis, filename, sistema) {
  const el = document.getElementById('excel-resultado')
  if (!analisis || analisis.error) {
    el.innerHTML = `
      <div class="alert alert-warning">
        <i class="fas fa-exclamation-triangle"></i>
        ${analisis?.error || 'No se pudo analizar el archivo'}
      </div>
    `
    return
  }
  
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title">
          <i class="fas fa-chart-bar" style="color:var(--accent)"></i> Resultado del Análisis
        </div>
        <div style="font-size:0.85rem;color:#64748b">${filename} — ${sistema}</div>
      </div>
      
      <div class="ai-analysis">
        <div class="ai-header">
          <i class="fas fa-robot" style="color:var(--accent);font-size:1.3rem"></i>
          <span style="font-weight:700">Análisis con Gemini AI</span>
          <span class="ai-badge">Completado</span>
        </div>
        
        ${analisis.resumen ? `
        <div class="grid-3" style="margin-bottom:16px">
          <div style="background:white;padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:0.75rem;font-weight:600;color:#10b981">INGRESOS</div>
            <div class="money text-ingreso" style="font-size:1.2rem;font-weight:800">${fmt$(analisis.resumen.total_ingresos)}</div>
          </div>
          <div style="background:white;padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:0.75rem;font-weight:600;color:#ef4444">EGRESOS</div>
            <div class="money text-egreso" style="font-size:1.2rem;font-weight:800">${fmt$(analisis.resumen.total_egresos)}</div>
          </div>
          <div style="background:white;padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:0.75rem;font-weight:600;color:var(--primary)">SALDO FINAL</div>
            <div class="money" style="font-size:1.2rem;font-weight:800">${fmt$(analisis.resumen.saldo_final)}</div>
          </div>
        </div>
        
        <div class="alert ${analisis.resumen.cuadre_ok ? 'alert-success' : 'alert-warning'}" style="margin-bottom:16px">
          ${analisis.resumen.cuadre_ok 
            ? '✅ El cuadre está correcto' 
            : `⚠️ Diferencia detectada: ${fmt$(Math.abs(analisis.resumen.diferencia || 0))}`}
        </div>
        ` : ''}
        
        ${analisis.verificacion_cuadre ? `
        <div style="background:white;padding:12px;border-radius:10px;margin-bottom:16px;font-size:0.9rem">
          <strong><i class="fas fa-balance-scale"></i> Verificación:</strong> ${analisis.verificacion_cuadre}
        </div>
        ` : ''}
        
        ${analisis.alertas?.length > 0 ? `
        <div style="margin-bottom:16px">
          <h5 style="font-weight:700;margin-bottom:8px;color:#ef4444"><i class="fas fa-exclamation-triangle"></i> Alertas</h5>
          ${analisis.alertas.map(a => `<div class="alert alert-warning" style="margin-bottom:8px">${a}</div>`).join('')}
        </div>
        ` : ''}
        
        ${analisis.recomendaciones?.length > 0 ? `
        <div>
          <h5 style="font-weight:700;margin-bottom:8px;color:var(--primary)"><i class="fas fa-lightbulb"></i> Recomendaciones</h5>
          ${analisis.recomendaciones.map(r => `<div style="padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;font-size:0.9rem">💡 ${r}</div>`).join('')}
        </div>
        ` : ''}
      </div>
    </div>
  `
}

async function loadExcelHistory() {
  try {
    const data = await api('/excel/uploads')
    const uploads = data?.uploads || []
    
    const el = document.getElementById('excel-historial-content')
    if (!el) return
    
    if (!uploads.length) {
      el.innerHTML = '<div class="empty-state" style="padding:24px"><i class="fas fa-folder-open"></i><h3>Sin análisis previos</h3></div>'
      return
    }
    
    el.innerHTML = `
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Archivo</th>
            <th>Sistema</th>
            ${isAdmin() ? '<th>Usuario</th>' : ''}
            <th>Estado</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr></thead>
          <tbody>
            ${uploads.map(u => `
            <tr>
              <td><i class="fas fa-file-excel" style="color:#10b981;margin-right:6px"></i>${u.filename}</td>
              <td><span class="badge badge-info">${u.sistema}</span></td>
              ${isAdmin() ? `<td>${u.nombre} ${u.apellido}</td>` : ''}
              <td><span class="badge ${u.estado==='procesado'?'badge-success':u.estado==='error'?'badge-danger':'badge-warning'}">${u.estado}</span></td>
              <td style="color:#64748b;font-size:0.85rem">${fmtDatetime(u.created_at)}</td>
              <td>
                <button class="btn btn-ghost btn-sm" onclick="viewExcelAnalysis(${u.id})">
                  <i class="fas fa-eye"></i> Ver
                </button>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `
  } catch {}
}

async function viewExcelAnalysis(id) {
  showLoading('Cargando análisis...')
  try {
    const data = await api(`/excel/uploads/${id}`)
    hideLoading()
    
    const u = data.upload
    showModal(`
      <div class="modal-header">
        <div class="modal-title"><i class="fas fa-chart-bar"></i> ${u.filename}</div>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:16px">
          <span class="badge badge-info">${u.sistema}</span>
          <span style="margin-left:8px;font-size:0.85rem;color:#64748b">${fmtDatetime(u.created_at)}</span>
          ${isAdmin() ? `<span style="margin-left:8px;font-size:0.85rem;color:#64748b">— ${u.nombre} ${u.apellido}</span>` : ''}
        </div>
        ${u.analisis_resultado ? `
        <div class="ai-analysis">
          <pre style="white-space:pre-wrap;font-size:0.85rem;font-family:inherit">
${JSON.stringify(u.analisis_resultado, null, 2)}
          </pre>
        </div>
        ` : '<div class="empty-state">Sin análisis disponible</div>'}
      </div>
    `, 'xl')
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

// ============================================================
// REPORTES
// ============================================================
async function renderReportes() {
  if (!isAdmin()) { navigate('dashboard'); return }
  
  const content = document.getElementById('page-content')
  
  const fi = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const ff = today()
  
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:24px">
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-bar"></i> Reportes del Sistema</div>
        </div>
        
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Desde</label>
            <input type="date" class="form-input" id="rep-fi" value="${fi}" style="width:160px">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-input" id="rep-ff" value="${ff}" style="width:160px">
          </div>
          <button class="btn btn-primary" onclick="loadReportes()">
            <i class="fas fa-search"></i> Generar
          </button>
        </div>
        
        <div class="tabs">
          <button class="tab-btn active" onclick="setRepTab('cajas',this)">📊 Cajas</button>
          <button class="tab-btn" onclick="setRepTab('pendientes',this)">💰 Pendientes</button>
          <button class="tab-btn" onclick="setRepTab('movimientos',this)">📈 Movimientos</button>
        </div>
        
        <div id="reporte-content"></div>
      </div>
    </div>
  `
  
  window._repTab = 'cajas'
  loadReportes()
}

function setRepTab(tab, btn) {
  window._repTab = tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  loadReportes()
}

async function loadReportes() {
  const fi = document.getElementById('rep-fi')?.value
  const ff = document.getElementById('rep-ff')?.value
  const el = document.getElementById('reporte-content')
  if (!el) return
  
  el.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner-dark" style="width:35px;height:35px;border-width:3px;display:inline-block"></div></div>'
  
  try {
    const tab = window._repTab || 'cajas'
    let data
    
    if (tab === 'cajas') {
      data = await api(`/reports/cajas?fecha_inicio=${fi}&fecha_fin=${ff}`)
      el.innerHTML = renderRepCajas(data)
    } else if (tab === 'pendientes') {
      data = await api('/reports/pendientes')
      el.innerHTML = renderRepPendientes(data)
    } else {
      data = await api(`/reports/movimientos?fecha_inicio=${fi}&fecha_fin=${ff}`)
      el.innerHTML = renderRepMovimientos(data)
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function renderRepCajas(data) {
  const cajas = data?.cajas || []
  const t = data?.totales || {}
  
  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      ${[
        ['Cajas', t.num_cajas, '#dbeafe'],
        ['Trabajadores', t.num_trabajadores, '#ede9fe'],
        ['Total Ingresos', fmt$(t.total_ingresos), '#d1fae5'],
        ['Total Egresos', fmt$(t.total_egresos), '#fee2e2'],
        ['Ganancia Neta', fmt$((t.total_ingresos||0)-(t.total_egresos||0)), '#fef3c7']
      ].map(([l,v,bg]) => `
      <div style="background:${bg};padding:14px 20px;border-radius:12px;flex:1;min-width:120px">
        <div style="font-size:0.75rem;font-weight:700;color:#64748b">${l}</div>
        <div class="money" style="font-size:1.1rem;font-weight:800">${v}</div>
      </div>
      `).join('')}
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>Trabajador</th><th>Fecha</th><th>Ingresos</th><th>Egresos</th>
          <th>Ganancia</th><th>S. Real</th><th>Diferencia</th><th>Estado</th>
        </tr></thead>
        <tbody>
          ${cajas.map(c => `
          <tr>
            <td>${c.nombre} ${c.apellido}</td>
            <td>${fmtDate(c.fecha)}</td>
            <td class="money text-ingreso">+${fmt$(c.total_ingresos||0)}</td>
            <td class="money text-egreso">-${fmt$(c.total_egresos||0)}</td>
            <td class="money" style="font-weight:700">${fmt$((c.total_ingresos||0)-(c.total_egresos||0))}</td>
            <td class="money">${c.saldo_final != null ? fmt$(c.saldo_final) : '-'}</td>
            <td class="money" style="color:${c.diferencia == null ? '#94a3b8' : Math.abs(c.diferencia) <= 0.5 ? '#10b981' : '#ef4444'}">
              ${c.diferencia != null ? fmt$(c.diferencia) : '-'}
            </td>
            <td>${fmtEstadoCaja(c.estado)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderRepPendientes(data) {
  const pends = data?.pendientes || []
  const r = data?.resumen || {}
  
  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      ${[
        ['Por Pagar', fmt$(r.por_pagar), '#fee2e2'],
        ['Por Cobrar', fmt$(r.por_cobrar), '#d1fae5'],
        ['Pendientes', r.total_pendientes, '#fef3c7'],
        ['Pagados', r.total_pagados, '#d1fae5'],
        ['Cancelados', r.total_cancelados, '#f1f5f9']
      ].map(([l,v,bg]) => `
      <div style="background:${bg};padding:14px 20px;border-radius:12px;flex:1;min-width:100px">
        <div style="font-size:0.75rem;font-weight:700;color:#64748b">${l}</div>
        <div class="money" style="font-size:1.1rem;font-weight:800">${v}</div>
      </div>
      `).join('')}
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr>
          <th>Código</th><th>Deudor</th><th>Tipo</th><th>Original</th>
          <th>Pendiente</th><th>Pagado</th><th>Estado</th>
        </tr></thead>
        <tbody>
          ${pends.map(p => `
          <tr>
            <td style="font-family:monospace;font-size:0.8rem">${p.codigo}</td>
            <td>
              <div style="font-weight:600">${p.nombre_deudor}</div>
              <div style="font-size:0.75rem;color:#64748b">${p.cedula_deudor||''}</div>
            </td>
            <td><span class="badge ${p.tipo==='por_pagar'?'badge-danger':'badge-success'}">${p.tipo==='por_pagar'?'Por Pagar':'Por Cobrar'}</span></td>
            <td class="money">${fmt$(p.monto_original)}</td>
            <td class="money" style="color:${p.tipo==='por_pagar'?'#ef4444':'#10b981'};font-weight:700">${fmt$(p.monto_pendiente)}</td>
            <td class="money text-ingreso">${fmt$(p.total_pagado||0)}</td>
            <td>${fmtEstadoPend(p.estado)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderRepMovimientos(data) {
  const movs = data?.movimientos || []
  const ingresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const egresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  
  return `
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px">
      <div style="background:#d1fae5;padding:14px 20px;border-radius:12px;flex:1">
        <div style="font-size:0.75rem;font-weight:700;color:#064e3b">INGRESOS</div>
        <div class="money text-ingreso" style="font-size:1.2rem;font-weight:800">+${fmt$(ingresos)}</div>
      </div>
      <div style="background:#fee2e2;padding:14px 20px;border-radius:12px;flex:1">
        <div style="font-size:0.75rem;font-weight:700;color:#7f1d1d">EGRESOS</div>
        <div class="money text-egreso" style="font-size:1.2rem;font-weight:800">-${fmt$(egresos)}</div>
      </div>
      <div style="background:#fef3c7;padding:14px 20px;border-radius:12px;flex:1">
        <div style="font-size:0.75rem;font-weight:700;color:#78350f">NETO</div>
        <div class="money" style="font-size:1.2rem;font-weight:800;color:${ingresos-egresos>=0?'#10b981':'#ef4444'}">${fmt$(ingresos-egresos)}</div>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr><th>Fecha</th><th>Trabajador</th><th>Tipo</th><th>Categoría</th><th>Descripción</th><th>Monto</th></tr></thead>
        <tbody>
          ${movs.map(m => `
          <tr>
            <td>${fmtDate(m.fecha_caja)}</td>
            <td>${m.nombre} ${m.apellido}</td>
            <td><span class="badge ${m.tipo==='ingreso'?'badge-success':'badge-danger'}">${m.tipo}</span></td>
            <td>${m.categoria}</td>
            <td>${m.descripcion}</td>
            <td class="money ${m.tipo==='ingreso'?'text-ingreso':'text-egreso'}" style="font-weight:700">
              ${m.tipo==='ingreso'?'+':'-'}${fmt$(m.monto)}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// AUDITORÍA
// ============================================================
async function renderAuditoria() {
  if (!isSuperAdmin() && currentUser?.role !== 'admin') { navigate('dashboard'); return }
  
  const content = document.getElementById('page-content')
  content.innerHTML = '<div style="text-align:center;padding:60px"><div class="spinner-dark" style="width:40px;height:40px;border-width:4px;display:inline-block"></div></div>'
  
  try {
    const data = await api('/reports/auditoria')
    const logs = data?.logs || []
    
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-shield-alt"></i> Log de Auditoría del Sistema</div>
          <span class="badge badge-info">${logs.length} registros</span>
        </div>
        
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Fecha</th><th>Usuario</th><th>Acción</th><th>Tabla</th><th>Datos</th>
            </tr></thead>
            <tbody>
              ${logs.length > 0 ? logs.map(l => `
              <tr>
                <td style="white-space:nowrap;font-size:0.85rem">${fmtDatetime(l.created_at)}</td>
                <td>
                  <div style="font-weight:600">${l.nombre || 'Sistema'} ${l.apellido || ''}</div>
                  <div style="font-size:0.75rem;color:#94a3b8">${l.cedula || ''}</div>
                </td>
                <td><span class="badge badge-primary">${l.accion}</span></td>
                <td><span style="font-size:0.8rem;font-family:monospace">${l.tabla || '-'}</span></td>
                <td style="font-size:0.75rem;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis">
                  ${l.datos_nuevos ? JSON.stringify(JSON.parse(l.datos_nuevos)).substring(0,100) : '-'}
                </td>
              </tr>
              `).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8">Sin registros</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================
function showChangePassword() {
  showModal(`
    <div class="modal-header">
      <div class="modal-title"><i class="fas fa-key"></i> Cambiar Contraseña</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Contraseña Actual</label>
        <input type="password" class="form-input" id="cp-actual" placeholder="Tu contraseña actual">
      </div>
      <div class="form-group">
        <label class="form-label">Nueva Contraseña</label>
        <input type="password" class="form-input" id="cp-nueva" placeholder="Mínimo 6 caracteres">
      </div>
      <div class="form-group">
        <label class="form-label">Confirmar Nueva Contraseña</label>
        <input type="password" class="form-input" id="cp-confirmar" placeholder="Repite la nueva contraseña">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="submitChangePassword()">
        <i class="fas fa-save"></i> Cambiar Contraseña
      </button>
    </div>
  `)
}

async function submitChangePassword() {
  const actual = document.getElementById('cp-actual').value
  const nueva = document.getElementById('cp-nueva').value
  const confirmar = document.getElementById('cp-confirmar').value
  
  if (!actual || !nueva) { toast('Completa todos los campos', 'warning'); return }
  if (nueva !== confirmar) { toast('Las contraseñas no coinciden', 'warning'); return }
  if (nueva.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warning'); return }
  
  try {
    showLoading('Actualizando...')
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: actual, new_password: nueva })
    })
    closeModal()
    hideLoading()
    toast('Contraseña actualizada exitosamente', 'success')
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

// ============================================================
// MODAL HELPER
// ============================================================
function showModal(content, size = '') {
  const existing = document.getElementById('modal-overlay')
  if (existing) existing.remove()
  
  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.id = 'modal-overlay'
  overlay.innerHTML = `<div class="modal ${size ? 'modal-' + size : ''}">${content}</div>`
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
  document.body.appendChild(overlay)
}

function closeModal() {
  document.getElementById('modal-overlay')?.remove()
}

// ============================================================
// PWA
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/sw.js').catch(() => {})
  })
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth()
})

// ============================================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================================
async function renderConfiguracion() {
  const content = document.getElementById('page-content')
  if (!isSuperAdmin() && !isAdmin()) {
    content.innerHTML = '<div class="alert alert-error"><i class="fas fa-lock"></i> Sin permisos para ver esta sección.</div>'
    return
  }

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <!-- API Key Gemini -->
      <div class="config-section">
        <div class="config-section-title">
          <i class="fas fa-robot" style="color:var(--accent)"></i> API Key de Gemini AI
        </div>
        <p style="color:#64748b;margin-bottom:16px;font-size:0.9rem">
          La API Key se almacena de forma segura en la base de datos y es compartida por todos los usuarios del sistema.
          Solo se muestran los últimos 6 caracteres por seguridad.
        </p>
        <div id="current-key-display" class="key-display" style="margin-bottom:16px">
          <i class="fas fa-spinner fa-spin"></i> Cargando...
        </div>
        <div class="form-group">
          <label class="form-label">Nueva API Key de Gemini</label>
          <div style="display:flex;gap:10px">
            <input type="password" class="form-input" id="new-gemini-key" placeholder="AIzaSy...">
            <button class="btn btn-ghost btn-sm" onclick="toggleKeyVisibility()">
              <i class="fas fa-eye" id="key-eye-icon"></i>
            </button>
          </div>
          <div style="font-size:0.8rem;color:#64748b;margin-top:4px">
            Obtén tu API Key en <a href="https://aistudio.google.com" target="_blank" style="color:var(--primary)">Google AI Studio</a>
          </div>
        </div>
        <button class="btn btn-primary" onclick="saveGeminiKey()">
          <i class="fas fa-save"></i> Guardar API Key
        </button>
      </div>

      <!-- Selección de Modelo -->
      <div class="config-section">
        <div class="config-section-title">
          <i class="fas fa-microchip"></i> Modelo de Gemini
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <div id="modelo-actual" class="key-display" style="flex:1">Cargando modelo actual...</div>
          <button class="btn btn-ghost btn-sm" onclick="verificarModelos()">
            <i class="fas fa-sync"></i> Verificar Modelos
          </button>
        </div>
        <div id="modelos-list">
          <div style="text-align:center;padding:20px;color:#94a3b8">
            <i class="fas fa-info-circle"></i> Haz clic en "Verificar Modelos" para ver los disponibles con tu API Key.
          </div>
        </div>
        <button class="btn btn-primary" id="save-modelo-btn" style="margin-top:12px;display:none" onclick="saveModelo()">
          <i class="fas fa-save"></i> Guardar Modelo Seleccionado
        </button>
      </div>

      <!-- Información del sistema -->
      <div class="config-section">
        <div class="config-section-title">
          <i class="fas fa-info-circle"></i> Información del Sistema
        </div>
        <div id="sys-info-content">
          <div style="text-align:center"><div class="spinner-dark" style="width:24px;height:24px;border-width:3px;display:inline-block"></div></div>
        </div>
      </div>
    </div>
  `

  loadConfigData()
}

async function loadConfigData() {
  try {
    const data = await api('/config')
    const configs = data?.configs || []

    // Mostrar API Key actual
    const keyConfig = configs.find(c => c.clave === 'gemini_api_key')
    const keyDisplay = document.getElementById('current-key-display')
    if (keyDisplay) {
      keyDisplay.innerHTML = keyConfig?.valor
        ? `<i class="fas fa-key" style="color:var(--accent)"></i> ${keyConfig.valor} <span style="color:#10b981;font-size:0.75rem;margin-left:8px">✓ Configurada</span>`
        : `<i class="fas fa-exclamation-triangle" style="color:#f59e0b"></i> No configurada`
    }

    // Mostrar modelo actual
    const modeloConfig = configs.find(c => c.clave === 'gemini_model')
    const modeloDisplay = document.getElementById('modelo-actual')
    if (modeloDisplay) {
      modeloDisplay.innerHTML = `<i class="fas fa-robot"></i> ${modeloConfig?.valor || 'gemini-2.5-flash'}`
    }
    window._currentModelo = modeloConfig?.valor || 'gemini-2.5-flash'

    // Información del sistema
    const versionConfig = configs.find(c => c.clave === 'version_sistema')
    const sysInfo = document.getElementById('sys-info-content')
    if (sysInfo) {
      sysInfo.innerHTML = `
        <div class="grid-2" style="gap:16px">
          <div>
            <div style="font-size:0.75rem;color:#94a3b8;font-weight:600">VERSIÓN</div>
            <div style="font-weight:700">${versionConfig?.valor || '1.0.0'}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#94a3b8;font-weight:600">PLATAFORMA</div>
            <div style="font-weight:700">Cloudflare Pages + D1</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#94a3b8;font-weight:600">MODELO IA ACTIVO</div>
            <div style="font-weight:700">${modeloConfig?.valor || 'gemini-2.5-flash'}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:#94a3b8;font-weight:600">USUARIO ADMIN</div>
            <div style="font-weight:700">${currentUser?.nombre} ${currentUser?.apellido}</div>
          </div>
        </div>
      `
    }
  } catch (err) {
    toast('Error cargando configuración: ' + err.message, 'error')
  }
}

function toggleKeyVisibility() {
  const input = document.getElementById('new-gemini-key')
  const icon = document.getElementById('key-eye-icon')
  if (input.type === 'password') {
    input.type = 'text'
    icon.className = 'fas fa-eye-slash'
  } else {
    input.type = 'password'
    icon.className = 'fas fa-eye'
  }
}

async function saveGeminiKey() {
  const key = document.getElementById('new-gemini-key').value.trim()
  if (!key) { toast('Ingresa la API Key', 'warning'); return }
  if (!key.startsWith('AI')) { toast('La API Key de Gemini debe comenzar con "AI"', 'warning'); return }

  try {
    showLoading('Guardando API Key...')
    await api('/config', {
      method: 'PUT',
      body: JSON.stringify({ gemini_api_key: key })
    })
    hideLoading()
    document.getElementById('new-gemini-key').value = ''
    toast('API Key guardada exitosamente', 'success')
    loadConfigData()
  } catch (err) {
    hideLoading()
    toast('Error: ' + err.message, 'error')
  }
}

window._selectedModelo = null

async function verificarModelos() {
  const list = document.getElementById('modelos-list')
  list.innerHTML = `<div style="text-align:center;padding:20px"><div class="spinner-dark" style="width:30px;height:30px;border-width:3px;display:inline-block"></div><p style="margin-top:12px;color:#64748b">Verificando modelos disponibles con tu API Key...</p></div>`

  try {
    const data = await api('/config/modelos-gemini')
    if (data.error) {
      list.innerHTML = `<div class="alert alert-error"><i class="fas fa-exclamation-triangle"></i> ${data.error}</div>`
      return
    }

    const modelos = data.modelos || []
    if (!modelos.length) {
      list.innerHTML = '<div class="alert alert-warning">No se encontraron modelos compatibles.</div>'
      return
    }

    window._selectedModelo = window._currentModelo || 'gemini-2.5-flash'

    list.innerHTML = `
      <p style="font-size:0.85rem;color:#64748b;margin-bottom:14px">Se encontraron <strong>${modelos.length}</strong> modelos compatibles. Haz clic para seleccionar:</p>
      ${modelos.map(m => `
        <div class="model-card ${m.id === window._selectedModelo ? 'selected' : ''}" 
             onclick="selectModelo('${m.id}', this)">
          <div class="model-name">
            ${m.id}
            ${m.recomendado ? '<span class="recomendado-badge">⭐ Recomendado</span>' : ''}
          </div>
          <div class="model-desc">${m.nombre}${m.descripcion ? ' — ' + m.descripcion : ''}</div>
        </div>
      `).join('')}
    `
    document.getElementById('save-modelo-btn').style.display = 'block'
    toast(`${modelos.length} modelos encontrados`, 'success')
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

function selectModelo(modelId, el) {
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'))
  el.classList.add('selected')
  window._selectedModelo = modelId
}

async function saveModelo() {
  if (!window._selectedModelo) { toast('Selecciona un modelo', 'warning'); return }

  try {
    showLoading('Guardando modelo...')
    await api('/config', {
      method: 'PUT',
      body: JSON.stringify({ gemini_model: window._selectedModelo })
    })
    hideLoading()
    toast(`Modelo cambiado a: ${window._selectedModelo}`, 'success')
    loadConfigData()
  } catch (err) {
    hideLoading()
    toast(err.message, 'error')
  }
}

// ============================================================
// NOTAS Y COMPROBANTES - Blog de Notas con Detección de Manipulación
// ============================================================

// Estado del editor de comprobantes
window._notaContenidoOriginal = '' // Texto pegado originalmente

async function renderNotas() {
  const content = document.getElementById('page-content')

  // Todos pueden acceder, pero admin ve todos - trabajador ve los suyos
  const esAdmin = isAdmin()

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">

      ${esAdmin ? '<div id="notas-stats-area"></div>' : ''}

      <!-- Panel: Nuevo Comprobante/Nota -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-paste"></i> Pegar y Registrar Comprobante</div>
          <div style="font-size:0.8rem;color:#64748b">Pega el comprobante del sistema, edítalo si hace falta, luego imprímelo. Quedará guardado el registro original.</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:200px">
              <label class="form-label">Título del comprobante *</label>
              <input type="text" class="form-input" id="nota-titulo"
                placeholder="Ej: Recibo de pago Juan Pérez - Western Union $85"
                value="Comprobante ${new Date().toLocaleString('es-EC')}">
            </div>
            <div style="min-width:160px">
              <label class="form-label">Tipo</label>
              <select class="form-select" id="nota-tipo">
                <option value="comprobante">📄 Comprobante</option>
                <option value="recibo">🧾 Recibo</option>
                <option value="nota">📝 Nota</option>
                <option value="reporte">📊 Reporte</option>
              </select>
            </div>
          </div>

          <!-- Área de pegado -->
          <div>
            <label class="form-label">
              <i class="fas fa-file-alt"></i> Contenido del comprobante *
              <span style="font-size:0.75rem;color:#94a3b8;font-weight:normal;margin-left:8px">
                — Pega aquí (Ctrl+V) el comprobante del sistema
              </span>
            </label>
            <div style="position:relative">
              <textarea class="form-textarea" id="nota-contenido" rows="10"
                placeholder="📋 Pega aquí el comprobante copiado del sistema (Ctrl+V)...

Ejemplo:
WESTERN UNION
Fecha: 15/05/2026
Remitente: Juan Pérez
Destinatario: María García
Monto: $85.00
Referencia: WU-123456
Total cobrado: $85.00"
                oninput="onNotaContenidoInput(this.value)"
                onpaste="onNotaPaste(event)"
                style="font-family:monospace;font-size:0.85rem;resize:vertical"></textarea>

              <!-- Indicador de manipulación -->
              <div id="nota-alerta-manip" style="display:none;position:absolute;top:8px;right:8px;
                background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:6px 12px;
                font-size:0.8rem;font-weight:700;color:#92400e;display:flex;align-items:center;gap:6px">
                <i class="fas fa-exclamation-triangle"></i>
                <span id="nota-alerta-txt">Valores modificados</span>
              </div>
            </div>

            <!-- Comparación de valores -->
            <div id="nota-diff-area" style="display:none;margin-top:8px;padding:12px;
              background:#fef3c7;border-left:4px solid #f59e0b;border-radius:6px;font-size:0.85rem">
              <div style="font-weight:700;color:#92400e;margin-bottom:6px">
                <i class="fas fa-exclamation-triangle"></i> ¡Valores editados detectados!
              </div>
              <div id="nota-diff-detalle" style="color:#78350f"></div>
            </div>
          </div>

          <!-- Acciones -->
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <button class="btn btn-primary" onclick="guardarNota(false)">
              <i class="fas fa-save"></i> Guardar Registro
            </button>
            <button class="btn btn-success" onclick="guardarNota(true)" id="btn-guardar-imprimir">
              <i class="fas fa-print"></i> Guardar e Imprimir
            </button>
            <button class="btn btn-ghost btn-sm" onclick="limpiarNota()">
              <i class="fas fa-times"></i> Limpiar
            </button>
            <div id="nota-saving" style="display:none;color:#64748b;font-size:0.85rem">
              <div class="spinner-dark" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle"></div>
              Guardando...
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de notas guardadas -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <i class="fas fa-history"></i>
            ${esAdmin ? 'Registro de Comprobantes (Todos los usuarios)' : 'Mis Comprobantes Guardados'}
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <select class="form-select" style="width:150px" id="notas-tipo-f" onchange="loadNotas()">
              <option value="">Todos los tipos</option>
              <option value="comprobante">Comprobantes</option>
              <option value="recibo">Recibos</option>
              <option value="nota">Notas</option>
              <option value="impresion">Impresiones</option>
            </select>
            <input type="date" class="form-input" style="width:150px" id="notas-fecha-f"
              value="${new Date().toISOString().split('T')[0]}" onchange="loadNotas()">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('notas-fecha-f').value='';loadNotas()">
              <i class="fas fa-times"></i>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="loadNotas()">
              <i class="fas fa-sync"></i>
            </button>
          </div>
        </div>
        <div id="notas-list">
          <div style="text-align:center;padding:24px">
            <div class="spinner-dark" style="width:28px;height:28px;border-width:3px;display:inline-block"></div>
          </div>
        </div>
      </div>

    </div>
  `

  if (esAdmin) loadNotasStats()
  loadNotas()
}

// -------- Detección de manipulación --------

function onNotaPaste(evt) {
  // Capturar el texto pegado ANTES de que se inserte en el textarea
  setTimeout(() => {
    const ta = document.getElementById('nota-contenido')
    if (!ta) return
    const val = ta.value
    window._notaContenidoOriginal = val
    // Limpiar estado de diff al pegar de nuevo
    mostrarDiff([], [])
  }, 10)
}

function onNotaContenidoInput(valor) {
  if (!window._notaContenidoOriginal) {
    window._notaContenidoOriginal = valor
    return
  }
  if (valor === window._notaContenidoOriginal) {
    mostrarDiff([], [])
    return
  }
  // Extraer montos del original y del actual
  const extraerMontos = (txt) => {
    const reg = /\$?\s*(\d{1,6}(?:[.,]\d{1,2})?)/g
    const montos = []
    let m
    while ((m = reg.exec(txt)) !== null) {
      const v = parseFloat(m[1].replace(',','.'))
      if (!isNaN(v) && v >= 0.01 && v < 1000000) montos.push(v)
    }
    return montos
  }
  const orig = extraerMontos(window._notaContenidoOriginal)
  const edit = extraerMontos(valor)
  // Detectar montos que aparecen en edit pero no en orig (o viceversa con diferencia significativa)
  const origSet = new Set(orig.map(v => v.toFixed(2)))
  const editSet = new Set(edit.map(v => v.toFixed(2)))
  const nuevos = [...editSet].filter(v => !origSet.has(v))
  const removidos = [...origSet].filter(v => !editSet.has(v))
  mostrarDiff(nuevos, removidos)
}

function mostrarDiff(nuevos, removidos) {
  const alertaEl = document.getElementById('nota-alerta-manip')
  const diffArea = document.getElementById('nota-diff-area')
  const diffDetalle = document.getElementById('nota-diff-detalle')

  const hayManip = nuevos.length > 0 || removidos.length > 0
  if (alertaEl) alertaEl.style.display = hayManip ? 'flex' : 'none'
  if (diffArea) diffArea.style.display = hayManip ? 'block' : 'none'
  if (!hayManip || !diffDetalle) return

  let html = ''
  if (removidos.length > 0) {
    html += `<div style="margin-bottom:4px">❌ <strong>Valores eliminados:</strong> ${removidos.map(v=>'$'+v).join(', ')}</div>`
  }
  if (nuevos.length > 0) {
    html += `<div>⚠️ <strong>Valores nuevos/modificados:</strong> ${nuevos.map(v=>'$'+v).join(', ')}</div>`
  }
  html += `<div style="margin-top:6px;font-size:0.8rem;color:#92400e">
    El comprobante original quedará guardado junto al editado. El administrador será notificado.
  </div>`
  if (diffDetalle) diffDetalle.innerHTML = html
}

// -------- Guardar nota --------

async function guardarNota(imprimir = false) {
  const titulo    = document.getElementById('nota-titulo')?.value?.trim()
  const contenido = document.getElementById('nota-contenido')?.value?.trim()
  const tipo      = document.getElementById('nota-tipo')?.value || 'comprobante'

  if (!titulo) { toast('Escribe un título', 'error'); return }
  if (!contenido) { toast('El contenido está vacío. Pega el comprobante primero.', 'error'); return }

  const saving = document.getElementById('nota-saving')
  const btnSave = document.getElementById('btn-guardar-imprimir')
  if (saving) saving.style.display = 'flex'
  if (btnSave) btnSave.disabled = true

  try {
    const payload = {
      tipo,
      titulo,
      contenido,
      contenido_original: window._notaContenidoOriginal || contenido
    }

    const resp = await api('/notas', { method: 'POST', body: JSON.stringify(payload) })

    // Mostrar alerta si el backend detectó manipulación
    if (resp.alerta_manipulacion) {
      toast('⚠️ Comprobante guardado con alerta: se detectaron valores editados. El administrador fue notificado.', 'error', 6000)
    } else {
      toast('✅ Comprobante guardado correctamente', 'success')
    }

    if (imprimir) {
      // Imprimir el comprobante en ventana limpia
      imprimirComprobante(titulo, contenido)
    }

    // Limpiar y recargar lista
    limpiarNota()
    await loadNotas()
    if (isAdmin()) await loadNotasStats()

  } catch (err) {
    toast(err.message || 'Error al guardar', 'error')
  } finally {
    if (saving) saving.style.display = 'none'
    if (btnSave) btnSave.disabled = false
  }
}

function imprimirComprobante(titulo, contenido) {
  // Crear ventana de impresión limpia (formato de ticket/recibo)
  const win = window.open('', '_blank', 'width=400,height=600')
  if (!win) { toast('El navegador bloqueó la ventana. Permite popups.', 'error'); return }

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(titulo)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      padding: 10px;
      max-width: 300px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #000;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header h2 { font-size: 14px; font-weight: bold; }
    .header small { font-size: 10px; color: #555; }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer {
      border-top: 2px dashed #000;
      margin-top: 8px;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      color: #555;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 5mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Pagos Rapidos</h2>
    <small>Agencia Alban Borja</small><br>
    <small>${new Date().toLocaleString('es-EC')}</small>
  </div>
  <pre>${escHtml(contenido)}</pre>
  <div class="footer">
    <div>${escHtml(titulo)}</div>
    <div>Registro: ${new Date().toISOString()}</div>
  </div>
  <script>
    window.onload = function() {
      window.print()
      setTimeout(() => window.close(), 1000)
    }
  <\/script>
</body>
</html>`)
  win.document.close()
}

function limpiarNota() {
  const ta = document.getElementById('nota-contenido')
  const ti = document.getElementById('nota-titulo')
  if (ta) ta.value = ''
  if (ti) ti.value = `Comprobante ${new Date().toLocaleString('es-EC')}`
  window._notaContenidoOriginal = ''
  mostrarDiff([], [])
}

// -------- Stats (solo admin) --------

async function loadNotasStats() {
  try {
    const data = await api('/notas/stats/resumen')
    const el = document.getElementById('notas-stats-area')
    if (!el) return

    const alertas = data.alertas_manipulacion || 0
    el.innerHTML = `
      <div class="grid-3">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e0e7ff;color:#4f46e5"><i class="fas fa-receipt"></i></div>
          <div class="stat-content">
            <div class="stat-value">${data.total_hoy}</div>
            <div class="stat-label">Registros Hoy</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef3c7;color:#d97706"><i class="fas fa-calendar-alt"></i></div>
          <div class="stat-content">
            <div class="stat-value">${data.total_mes}</div>
            <div class="stat-label">Este Mes</div>
          </div>
        </div>
        <div class="stat-card" ${alertas > 0 ? 'style="border:2px solid #f59e0b;background:#fffbeb"' : ''}>
          <div class="stat-icon" style="background:${alertas>0?'#fef3c7':'#d1fae5'};color:${alertas>0?'#d97706':'#059669'}">
            <i class="fas fa-${alertas>0?'exclamation-triangle':'check-circle'}"></i>
          </div>
          <div class="stat-content">
            <div class="stat-value" style="color:${alertas>0?'#d97706':'inherit'}">${alertas}</div>
            <div class="stat-label">${alertas>0?'⚠️ Alertas de Manipulación':'Sin Alertas'}</div>
          </div>
        </div>
      </div>
    `
  } catch {}
}

// -------- Lista de notas guardadas --------

async function loadNotas() {
  const tipo  = document.getElementById('notas-tipo-f')?.value || ''
  const fecha = document.getElementById('notas-fecha-f')?.value || ''

  let path = '/notas?limit=100'
  if (tipo)  path += `&tipo=${tipo}`
  if (fecha) path += `&fecha=${fecha}`

  const list = document.getElementById('notas-list')
  if (!list) return
  list.innerHTML = '<div style="text-align:center;padding:20px"><div class="spinner-dark" style="width:24px;height:24px;border-width:3px;display:inline-block"></div></div>'

  try {
    const data = await api(path)
    const notas = data?.notas || []

    if (!notas.length) {
      list.innerHTML = `<div class="empty-state">
        <i class="fas fa-receipt"></i>
        <h3>Sin comprobantes guardados</h3>
        <p>Pega un comprobante arriba y guárdalo para que aparezca aquí.</p>
      </div>`
      return
    }

    list.innerHTML = notas.map(n => {
      const meta = n.metadata || {}
      const tieneAlerta = meta.alerta_manipulacion === true
      return `
        <div class="nota-card tipo-${n.tipo}" style="${tieneAlerta ? 'border-left:4px solid #f59e0b;background:#fffbeb' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1">
              <div style="font-weight:700;color:#1e293b;font-size:1rem;margin-bottom:4px">
                ${tieneAlerta ? '<span style="color:#d97706"><i class="fas fa-exclamation-triangle"></i></span> ' : ''}
                ${escHtml(n.titulo)}
              </div>
              <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.8rem;color:#64748b;margin-bottom:8px">
                <span class="nota-tipo-badge ${n.tipo}">${notaTipoIcon(n.tipo)} ${n.tipo}</span>
                <span><i class="fas fa-user"></i> ${n.nombre} ${n.apellido}</span>
                ${n.caja_id ? `<span><i class="fas fa-cash-register"></i> Caja #${n.caja_id}</span>` : ''}
                <span><i class="fas fa-clock"></i> ${fmtDatetime(n.created_at)}</span>
              </div>
              ${tieneAlerta ? `
                <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:6px 10px;font-size:0.8rem;color:#92400e;margin-bottom:8px">
                  <i class="fas fa-exclamation-triangle"></i> <strong>Alerta:</strong> El trabajador modificó valores antes de guardar.
                  ${meta.valores_alterados && meta.valores_alterados.length > 0 ?
                    `Valores nuevos detectados: <strong>${meta.valores_alterados.map(v=>v.montos_nuevos?.join(', ')||'').join(', ')}</strong>` : ''}
                </div>
              ` : ''}
              ${n.contenido ? `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;
                  font-family:monospace;font-size:0.82rem;color:#334155;white-space:pre-wrap;
                  max-height:180px;overflow-y:auto;line-height:1.5">
${escHtml(n.contenido.substring(0, 600))}${n.contenido.length > 600 ? '\n...(truncado)' : ''}</div>
              ` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;min-width:100px">
              <button class="btn btn-ghost btn-sm" onclick="reimprimir(${n.id})"
                title="Reimprimir">
                <i class="fas fa-print"></i> Imprimir
              </button>
              ${isAdmin() ? `
                <button class="btn btn-danger btn-sm" onclick="deleteNota(${n.id})">
                  <i class="fas fa-trash"></i>
                </button>
              ` : ''}
            </div>
          </div>
          ${meta.contenido_original && meta.contenido_original !== n.contenido ? `
            <details style="margin-top:10px">
              <summary style="cursor:pointer;font-size:0.8rem;color:#64748b;font-weight:600">
                <i class="fas fa-eye"></i> Ver comprobante original (antes de editar)
              </summary>
              <div style="margin-top:8px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:10px;
                font-family:monospace;font-size:0.82rem;color:#166534;white-space:pre-wrap;max-height:150px;overflow-y:auto">
${escHtml(meta.contenido_original.substring(0, 500))}</div>
            </details>
          ` : ''}
        </div>
      `
    }).join('')
  } catch (err) {
    list.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

async function reimprimir(id) {
  try {
    const data = await api(`/notas/${id}`)
    const n = data.nota
    if (n) imprimirComprobante(n.titulo, n.contenido)
  } catch (err) {
    toast(err.message, 'error')
  }
}

function notaTipoIcon(tipo) {
  const icons = { impresion:'🖨️', comprobante:'📄', nota:'📝', recibo:'🧾', reporte:'📊' }
  return icons[tipo] || '📌'
}

async function deleteNota(id) {
  if (!confirm('¿Eliminar esta nota permanentemente?')) return
  try {
    await api(`/notas/${id}`, { method: 'DELETE' })
    toast('Nota eliminada', 'success')
    loadNotas()
    if (isAdmin()) loadNotasStats()
  } catch (err) {
    toast(err.message, 'error')
  }
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
}

// ============================================================
// HISTORIAL DIARIO
// ============================================================
async function renderHistorial() {
  const content = document.getElementById('page-content')
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary btn-sm" id="hist-tab-diario" onclick="showHistTab('diario')">
          <i class="fas fa-calendar-day"></i> Historial Diario
        </button>
        <button class="btn btn-ghost btn-sm" id="hist-tab-mensual" onclick="showHistTab('mensual')">
          <i class="fas fa-chart-line"></i> Resumen Mensual
        </button>
      </div>

      <div id="hist-filtros-diario" class="card">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <label style="font-weight:600">Mes:</label>
          <input type="month" class="form-input" style="width:180px" id="hist-mes"
            value="${mesActual}" onchange="loadHistorialDiario()">
          ${isAdmin() ? `
            <label style="font-weight:600">Usuario:</label>
            <select class="form-select" style="width:200px" id="hist-user" onchange="loadHistorialDiario()">
              <option value="">Todos</option>
            </select>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="loadHistorialDiario()">
            <i class="fas fa-sync"></i>
          </button>
        </div>
      </div>

      <div id="hist-filtros-mensual" class="card" style="display:none">
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <label style="font-weight:600">Año:</label>
          <input type="number" class="form-input" style="width:120px" id="hist-anio"
            value="${hoy.getFullYear()}" min="2020" max="2030" onchange="loadHistorialMensual()">
          ${isAdmin() ? `
            <label style="font-weight:600">Usuario:</label>
            <select class="form-select" style="width:200px" id="hist-user-mes" onchange="loadHistorialMensual()">
              <option value="">Todos</option>
            </select>` : ''}
        </div>
      </div>

      <div id="hist-content">
        <div style="text-align:center;padding:40px">
          <div class="spinner-dark" style="width:36px;height:36px;border-width:4px;display:inline-block"></div>
        </div>
      </div>
    </div>
  `

  if (isAdmin()) {
    try {
      const usersData = await api('/users')
      const users = usersData?.users || []
      ;['hist-user','hist-user-mes'].forEach(id => {
        const sel = document.getElementById(id)
        if (sel) {
          sel.innerHTML = '<option value="">Todos</option>' +
            users.map(u => `<option value="${u.id}">${u.nombre} ${u.apellido}</option>`).join('')
        }
      })
    } catch {}
  }

  loadHistorialDiario()
}

window._histTab = 'diario'

function showHistTab(tab) {
  window._histTab = tab
  const dBtn = document.getElementById('hist-tab-diario')
  const mBtn = document.getElementById('hist-tab-mensual')
  const dFil = document.getElementById('hist-filtros-diario')
  const mFil = document.getElementById('hist-filtros-mensual')

  if (tab === 'diario') {
    dBtn?.classList.replace('btn-ghost','btn-primary')
    mBtn?.classList.replace('btn-primary','btn-ghost')
    if (dFil) dFil.style.display = ''
    if (mFil) mFil.style.display = 'none'
    loadHistorialDiario()
  } else {
    mBtn?.classList.replace('btn-ghost','btn-primary')
    dBtn?.classList.replace('btn-primary','btn-ghost')
    if (mFil) mFil.style.display = ''
    if (dFil) dFil.style.display = 'none'
    loadHistorialMensual()
  }
}

async function loadHistorialDiario() {
  const content = document.getElementById('hist-content')
  if (!content) return
  content.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner-dark" style="width:30px;height:30px;border-width:3px;display:inline-block"></div></div>'

  const mes    = document.getElementById('hist-mes')?.value || ''
  const userId = document.getElementById('hist-user')?.value || ''

  let path = '/historial?limit=60'
  if (mes)    path += `&mes=${mes}`
  if (userId) path += `&user_id=${userId}`

  try {
    const data = await api(path)
    const historial = data?.historial || []

    if (!historial.length) {
      content.innerHTML = `<div class="empty-state">
        <i class="fas fa-calendar-times"></i>
        <h3>Sin historial para este período</h3>
        <p>Los registros se crean automáticamente cuando se aprueba un cuadre de caja.</p>
      </div>`
      return
    }

    content.innerHTML = historial.map(h => {
      const saldoFinal = h.saldo_final || (h.saldo_inicial + h.total_ingresos - h.total_egresos)
      const diferencia = saldoFinal - (h.saldo_inicial || 0)
      const alertaSaldo = diferencia > 5
      return `
        <div class="historial-card" ${alertaSaldo ? 'style="border-left:4px solid #10b981;background:#f0fdf4"' : ''}>
          <div class="historial-fecha">
            <i class="fas fa-calendar-day"></i>
            ${fmtDate(h.fecha)} — <strong>${h.nombre} ${h.apellido}</strong>
            ${alertaSaldo ? `<span style="margin-left:12px;background:#10b981;color:white;
              padding:2px 10px;border-radius:20px;font-size:0.78rem;font-weight:700">
              <i class="fas fa-arrow-up"></i> +${fmt$(diferencia)} vs inicio
            </span>` : ''}
          </div>
          <div class="historial-stats">
            <div class="historial-stat">
              <div class="historial-stat-val">${fmt$(h.saldo_inicial)}</div>
              <div class="historial-stat-label">Saldo Inicial</div>
            </div>
            <div class="historial-stat">
              <div class="historial-stat-val positive">${fmt$(h.total_ingresos)}</div>
              <div class="historial-stat-label">Ingresos</div>
            </div>
            <div class="historial-stat">
              <div class="historial-stat-val negative">${fmt$(h.total_egresos)}</div>
              <div class="historial-stat-label">Egresos</div>
            </div>
            <div class="historial-stat">
              <div class="historial-stat-val ${h.ganancia_neta >= 0 ? 'positive' : 'negative'}">${fmt$(h.ganancia_neta)}</div>
              <div class="historial-stat-label">Ganancia Neta</div>
            </div>
            <div class="historial-stat">
              <div class="historial-stat-val ${alertaSaldo ? 'positive' : ''}">${fmt$(saldoFinal)}</div>
              <div class="historial-stat-label">Saldo Final</div>
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:10px;font-size:0.8rem;color:#94a3b8;flex-wrap:wrap">
            <span><i class="fas fa-exchange-alt"></i> ${h.num_movimientos || 0} movimientos</span>
            <span><i class="fas fa-file-plus"></i> ${h.num_pendientes_nuevos || 0} pendientes nuevos</span>
            <span style="color:${h.estado_caja === 'aprobada' ? '#10b981' : '#f59e0b'}">
              <i class="fas fa-circle"></i> ${h.estado_caja || 'aprobada'}
            </span>
          </div>
        </div>
      `
    }).join('')
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

async function loadHistorialMensual() {
  const content = document.getElementById('hist-content')
  if (!content) return
  content.innerHTML = '<div style="text-align:center;padding:30px"><div class="spinner-dark" style="width:30px;height:30px;border-width:3px;display:inline-block"></div></div>'

  const anio   = document.getElementById('hist-anio')?.value || new Date().getFullYear()
  const userId = document.getElementById('hist-user-mes')?.value || ''

  let path = `/historial/mensual?anio=${anio}`
  if (userId) path += `&user_id=${userId}`

  try {
    const data = await api(path)
    const meses = data?.resumen_mensual || []

    if (!meses.length) {
      content.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i><h3>Sin datos para este año</h3></div>'
      return
    }

    const mesNombres = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio',
      '07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'}

    content.innerHTML = meses.map(m => {
      const mesNum = (m.mes||'').split('-')[1]||''
      return `
        <div class="mes-card">
          <div class="mes-title">
            <i class="fas fa-calendar-alt" style="color:var(--accent)"></i>
            ${mesNombres[mesNum]||m.mes} ${anio} — ${m.nombre} ${m.apellido}
            <span style="font-size:0.8rem;font-weight:normal;color:#64748b;margin-left:8px">
              (${m.dias_trabajados} días)
            </span>
          </div>
          <div class="mes-grid">
            <div class="mes-stat">
              <div class="mes-stat-val" style="color:#10b981">${fmt$(m.total_ingresos)}</div>
              <div class="mes-stat-label">Total Ingresos</div>
            </div>
            <div class="mes-stat">
              <div class="mes-stat-val" style="color:#ef4444">${fmt$(m.total_egresos)}</div>
              <div class="mes-stat-label">Total Egresos</div>
            </div>
            <div class="mes-stat">
              <div class="mes-stat-val" style="color:${m.ganancia_neta>=0?'#10b981':'#ef4444'}">${fmt$(m.ganancia_neta)}</div>
              <div class="mes-stat-label">Ganancia Neta</div>
            </div>
            <div class="mes-stat">
              <div class="mes-stat-val">${m.total_movimientos||0}</div>
              <div class="mes-stat-label">Movimientos</div>
            </div>
            <div class="mes-stat">
              <div class="mes-stat-val">${m.pendientes_nuevos||0}</div>
              <div class="mes-stat-label">Pendientes Nuevos</div>
            </div>
            <div class="mes-stat">
              <div class="mes-stat-val">${m.dias_trabajados}</div>
              <div class="mes-stat-label">Días Trabajados</div>
            </div>
          </div>
        </div>
      `
    }).join('')
  } catch (err) {
    content.innerHTML = `<div class="alert alert-error">${err.message}</div>`
  }
}

// ============================================================
// CAPTURA AUTOMÁTICA DE IMPRESIÓN (Ctrl+P)
// ============================================================
;(function setupPrintCapture() {
  const indicator = document.createElement('div')
  indicator.id = 'print-capture-indicator'
  indicator.className = 'print-capture-indicator'
  indicator.innerHTML = '<i class="fas fa-print"></i> Registrando impresión...'
  document.body.appendChild(indicator)

  async function capturarImpresion() {
    if (!token || !currentUser) return
    const ind = document.getElementById('print-capture-indicator')
    if (ind) ind.classList.add('show')
    try {
      const paginaActual = currentPage || 'pagina'
      const titulo = `Impresión — ${paginaActual} — ${new Date().toLocaleString('es-EC')}`
      const contentEl = document.getElementById('page-content')
      const contenido = contentEl ? contentEl.innerText.substring(0, 2000) : ''
      await fetch('/api/notas/captura-impresion', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}` },
        body: JSON.stringify({ titulo, contenido_html: contenido, pagina_actual: paginaActual })
      })
    } catch {}
    setTimeout(() => { const ind2 = document.getElementById('print-capture-indicator'); if(ind2) ind2.classList.remove('show') }, 3000)
  }

  window.addEventListener('beforeprint', capturarImpresion)
  window.matchMedia('print').addEventListener('change', mq => { if (mq.matches) capturarImpresion() })
})()

// ============================================================
// MEJORAS: MÚLTIPLES EXCEL POR CAJA
// ============================================================
// Sobrescribe la función renderExcel con versión mejorada
window._excelFiles = [] // Lista de archivos seleccionados

