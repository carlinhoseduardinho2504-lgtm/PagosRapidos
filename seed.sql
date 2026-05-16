-- Seed: Usuario SuperAdmin - Carlos Alcivar
-- Cédula: 1314221597 | Contraseña: Theking& (hash bcrypt simulado con SHA256+salt)
-- NOTA: El hash real se genera en la primera ejecución del sistema
INSERT OR IGNORE INTO users (cedula, nombre, apellido, email, password_hash, role, activo) VALUES
  ('1314221597', 'Carlos', 'Alcivar', 'admin@pagosrapidos.ec', '$hash$1314221597$Theking&$superadmin', 'superadmin', 1);
