-- =====================================================
-- PAGOS RAPIDOS - Sistema de Gestión de Caja
-- Migración 001: Esquema completo
-- =====================================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cedula TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trabajador', -- superadmin, admin, supervisor, trabajador
  activo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de cajas diarias
CREATE TABLE IF NOT EXISTS cajas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  saldo_inicial REAL NOT NULL DEFAULT 0,
  saldo_final REAL,
  estado TEXT NOT NULL DEFAULT 'abierta', -- abierta, cuadrada, aprobada, rechazada
  notas TEXT,
  aprobado_por INTEGER,
  aprobado_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (aprobado_por) REFERENCES users(id),
  UNIQUE(user_id, fecha)
);

-- Tabla de movimientos de caja
CREATE TABLE IF NOT EXISTS movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  tipo TEXT NOT NULL, -- ingreso, egreso
  categoria TEXT NOT NULL, -- efectivo, gold_pagos, dex, western_union, otro
  descripcion TEXT NOT NULL,
  monto REAL NOT NULL,
  referencia TEXT,
  hora TIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de desglose de billetes/monedas (conteo físico)
CREATE TABLE IF NOT EXISTS conteo_efectivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  denominacion REAL NOT NULL, -- 0.01, 0.05, 0.10, 0.25, 0.50, 1, 2, 5, 10, 20, 50, 100
  cantidad INTEGER NOT NULL DEFAULT 0,
  subtotal REAL GENERATED ALWAYS AS (denominacion * cantidad) VIRTUAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- Tabla de saldos por sistema/cuenta
CREATE TABLE IF NOT EXISTS saldos_sistemas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caja_id INTEGER NOT NULL,
  sistema TEXT NOT NULL, -- gold_pagos, caja, dex, western_union, otro
  saldo REAL NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- Tabla de pendientes (cuentas por pagar/cobrar)
CREATE TABLE IF NOT EXISTS pendientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL, -- quien registró
  tipo TEXT NOT NULL DEFAULT 'por_pagar', -- por_pagar, por_cobrar
  nombre_deudor TEXT NOT NULL,
  cedula_deudor TEXT,
  descripcion TEXT,
  monto_original REAL NOT NULL,
  monto_pendiente REAL NOT NULL,
  fecha_vencimiento DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente', -- pendiente, pagado_parcial, pagado_total, cancelado
  prioridad TEXT DEFAULT 'normal', -- alta, normal, baja
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de abonos a pendientes
CREATE TABLE IF NOT EXISTS abonos_pendientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pendiente_id INTEGER NOT NULL,
  caja_id INTEGER,
  user_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  notas TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pendiente_id) REFERENCES pendientes(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de uploads de Excel
CREATE TABLE IF NOT EXISTS excel_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  caja_id INTEGER,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  sistema TEXT, -- gold_pagos, dex, western_union, etc
  analisis_resultado TEXT, -- JSON con el resultado del análisis de IA
  estado TEXT DEFAULT 'pendiente', -- pendiente, procesado, error
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  accion TEXT NOT NULL,
  tabla TEXT,
  registro_id INTEGER,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  ip TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cajas_user_fecha ON cajas(user_id, fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_caja ON movimientos(caja_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(created_at);
CREATE INDEX IF NOT EXISTS idx_pendientes_estado ON pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_pendientes_user ON pendientes(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- Insertar configuración base
INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('nombre_empresa', 'Pagos Rapidos - Agencia Alban Borja', 'Nombre de la empresa'),
  ('moneda', 'USD', 'Moneda del sistema'),
  ('zona_horaria', 'America/Guayaquil', 'Zona horaria'),
  ('max_diferencia_cuadre', '0.50', 'Máxima diferencia permitida en cuadre de caja');
