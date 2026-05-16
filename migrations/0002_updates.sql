-- =====================================================
-- PAGOS RAPIDOS - Migración 002: Nuevas funcionalidades
-- =====================================================

-- Tabla de configuración del sistema (API keys, ajustes)
-- Ya existe configuracion, solo añadimos las filas que faltan
INSERT OR IGNORE INTO configuracion (clave, valor, descripcion) VALUES
  ('gemini_api_key', '', 'API Key de Google Gemini para análisis IA'),
  ('gemini_model', 'gemini-2.5-flash', 'Modelo Gemini a usar'),
  ('version_sistema', '1.1.0', 'Versión del sistema');

-- Tabla de notas/comprobantes (blog de notas)
CREATE TABLE IF NOT EXISTS notas_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  caja_id INTEGER,
  tipo TEXT NOT NULL DEFAULT 'nota', -- nota, comprobante, impresion
  titulo TEXT,
  contenido TEXT NOT NULL,
  metadata TEXT, -- JSON con datos adicionales (lo que se imprimió, etc.)
  solo_admin INTEGER NOT NULL DEFAULT 1, -- 1 = solo admin/superadmin puede ver
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (caja_id) REFERENCES cajas(id)
);

-- Tabla de historial de cuadres diarios (snapshot por día)
CREATE TABLE IF NOT EXISTS historial_diario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fecha DATE NOT NULL,
  saldo_inicial REAL DEFAULT 0,
  total_ingresos REAL DEFAULT 0,
  total_egresos REAL DEFAULT 0,
  ganancia_neta REAL DEFAULT 0,
  saldo_final REAL DEFAULT 0,
  num_movimientos INTEGER DEFAULT 0,
  num_pendientes_nuevos INTEGER DEFAULT 0,
  estado_caja TEXT DEFAULT 'aprobada',
  snapshot_data TEXT, -- JSON completo del cuadre
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, fecha)
);

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_notas_user ON notas_caja(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_caja ON notas_caja(caja_id);
CREATE INDEX IF NOT EXISTS idx_historial_user_fecha ON historial_diario(user_id, fecha);
