export const schemaSql = `
CREATE TABLE IF NOT EXISTS systems (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Lançado', 'Em dev', 'Desativado', 'Prancheta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS infrastructure (
  id SERIAL PRIMARY KEY,
  system_id INTEGER REFERENCES systems(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  usage TEXT NOT NULL,
  billing_type TEXT NOT NULL DEFAULT 'Mensal' CHECK (billing_type IN ('Mensal', 'Grátis', 'Esporádico')),
  due_day INTEGER CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
  payer TEXT NOT NULL DEFAULT '',
  value NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  paid_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  since INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS client_systems (
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  system_id INTEGER NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, system_id)
);
CREATE TABLE IF NOT EXISTS credentials (
  id SERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  login TEXT NOT NULL,
  password_ciphertext TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);
`

export const migrationSql = `
ALTER TABLE infrastructure ALTER COLUMN system_id DROP NOT NULL;
ALTER TABLE systems DROP CONSTRAINT IF EXISTS systems_status_check;
ALTER TABLE systems ADD CONSTRAINT systems_status_check CHECK (status IN ('Lançado', 'Em dev', 'Desativado', 'Prancheta'));
ALTER TABLE infrastructure ADD COLUMN IF NOT EXISTS billing_type TEXT NOT NULL DEFAULT 'Mensal';
ALTER TABLE infrastructure ALTER COLUMN due_day DROP NOT NULL;
ALTER TABLE infrastructure ADD COLUMN IF NOT EXISTS paid_date TEXT;
`

export const constraintSql = `
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'infrastructure_billing_type_check') THEN
    ALTER TABLE infrastructure ADD CONSTRAINT infrastructure_billing_type_check CHECK (billing_type IN ('Mensal', 'Grátis', 'Esporádico'));
  END IF;
END $$;
`
