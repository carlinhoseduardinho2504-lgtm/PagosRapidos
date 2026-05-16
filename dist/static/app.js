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
        
        ${isAdmin() ? `
        <div class="nav-section-title">Administración</div>
        <div class="nav-item ${currentPage==='cajas-admin'?'active':''}" onclick="navigate('cajas-admin')">
          <i class="fas fa-tasks icon"></i> Gestión de Cajas
        </div>
        <div class="nav-item ${currentPage==='reportes'?'active':''}" onclick="navigate('reportes')">
          <i class="fas fa-chart-bar icon"></i> Reportes
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
    auditoria: 'Auditoría del Sistema'
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
    auditoria: renderAuditoria
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
        
        ${!isAdmin() && data.mi_caja_hoy ? `
        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-cash-register"></i> Mi Caja de Hoy</div>
            <div style="display:flex;gap:8px">
              ${fmtEstadoCaja(data.mi_caja_hoy.estado)}
              <button class="btn btn-sm btn-primary" onclick="navigate('cajas')">
                <i class="fas fa-eye"></i> Ver Detalle
              </button>
            </div>
          </div>
          <div class="grid-3">
            <div style="text-align:center;padding:16px;background:#f8fafc;border-radius:12px">
              <div style="font-size:0.8rem;color:#64748b">Saldo Inicial</div>
              <div class="money" style="font-size:1.4rem;font-weight:800;color:var(--primary)">${fmt$(data.mi_caja_hoy.saldo_inicial)}</div>
            </div>
            <div style="text-align:center;padding:16px;background:#d1fae5;border-radius:12px">
              <div style="font-size:0.8rem;color:#065f46">Ingresos</div>
              <div class="money" style="font-size:1.4rem;font-weight:800;color:#10b981">+${fmt$(data.mi_caja_hoy.ingresos || 0)}</div>
            </div>
            <div style="text-align:center;padding:16px;background:#fee2e2;border-radius:12px">
              <div style="font-size:0.8rem;color:#991b1b">Egresos</div>
              <div class="money" style="font-size:1.4rem;font-weight:800;color:#ef4444">-${fmt$(data.mi_caja_hoy.egresos || 0)}</div>
            </div>
          </div>
        </div>
        ` : !isAdmin() ? `
        <div class="card" style="border:2px dashed #e2e8f0;text-align:center;padding:32px">
          <i class="fas fa-cash-register" style="font-size:2.5rem;color:#94a3b8;margin-bottom:12px"></i>
          <h3 style="color:#64748b">No tienes caja abierta hoy</h3>
          <p style="color:#94a3b8;margin:8px 0 16px">Abre tu caja para comenzar a registrar movimientos</p>
          <button class="btn btn-primary" onclick="navigate('cajas');setTimeout(openCaja,200)">
            <i class="fas fa-plus"></i> Abrir Caja
          </button>
        </div>
        ` : ''}
        
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
              </tr></thead>
              <tbody>
                ${data.top_trabajadores.map(t => `
                <tr>
                  <td><strong>${t.nombre} ${t.apellido}</strong><br><small style="color:#94a3b8">${t.cedula}</small></td>
                  <td>${t.num_cajas}</td>
                  <td class="money text-ingreso">+${fmt$(t.total_ingresos)}</td>
                  <td class="money text-egreso">-${fmt$(t.total_egresos)}</td>
                  <td class="money" style="font-weight:800;color:${(t.total_ingresos-t.total_egresos)>=0?'#10b981':'#ef4444'}">${fmt$(t.total_ingresos-t.total_egresos)}</td>
                </tr>
                `).join('')}
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
            <select class="form-select" style="width:150px" id="pend-filter-estado" onchange="filterPendientes()">
              <option value="pendiente">Pendientes</option>
              <option value="">Todos</option>
              <option value="pagado_parcial">Parciales</option>
              <option value="pagado_total">Pagados</option>
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
    
    // Apply initial filter
    document.getElementById('pend-filter-estado').value = 'pendiente'
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
  if (estado) filtered = filtered.filter(p => p.estado === estado)
  
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
    
    if (res.pagado_total) {
      toast('✅ Pendiente pagado completamente', 'success')
    } else {
      toast(`Abono registrado. Resta: ${fmt$(res.monto_pendiente_nuevo)}`, 'success')
    }
    renderPendientes()
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
            return `
            <tr style="${c.estado==='cuadrada'?'background:#fffbeb':c.estado==='rechazada'?'background:#fff5f5':''}">
              <td>
                <div style="font-weight:600">${c.nombre} ${c.apellido}</div>
                <div style="font-size:0.75rem;color:#94a3b8">${c.cedula}</div>
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
