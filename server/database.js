import pg from 'pg'
import { initialClients, initialInfras, initialSystems } from './demo-data.js'
import { constraintSql, migrationSql, schemaSql } from './schema.js'

const { Pool } = pg

export async function migrateInfraLinks(pool) {
  const columns = await pool.query("SELECT column_name AS name FROM information_schema.columns WHERE table_name = 'infrastructure'")
  if (!columns.rows.some((column) => column.name === 'system_id')) return
  await pool.query(`
    INSERT INTO system_infra (system_id, infra_id)
    SELECT i.system_id, i.id FROM infrastructure i
    LEFT JOIN system_infra si ON si.system_id = i.system_id AND si.infra_id = i.id
    WHERE i.system_id IS NOT NULL AND si.infra_id IS NULL`)
  await pool.query('ALTER TABLE infrastructure DROP COLUMN system_id')
}

async function seedDevelopmentData(pool) {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM systems')
  if (result.rows[0].count > 0) return
  for (const infra of initialInfras) {
    await pool.query('INSERT INTO infrastructure (platform, usage, due_day, payer, value, billing_type, paid_date) VALUES ($1, $2, $3, $4, $5, $6, $7)', [infra.platform, infra.usage, infra.dueDay ?? null, infra.payer, infra.value, infra.billingType ?? 'Mensal', infra.paidDate ?? null])
  }
  for (const system of initialSystems) {
    const inserted = await pool.query('INSERT INTO systems (name, description, status) VALUES ($1, $2, $3) RETURNING id', [system.name, system.description, system.status])
    for (const infraId of system.infraIds ?? []) {
      await pool.query('INSERT INTO system_infra (system_id, infra_id) VALUES ($1, $2)', [inserted.rows[0].id, infraId])
    }
  }
  for (const client of initialClients) {
    const result = await pool.query('INSERT INTO clients (name, since) VALUES ($1, $2) RETURNING id', [client.name, client.since])
    for (const systemId of client.systemIds) {
      await pool.query('INSERT INTO client_systems (client_id, system_id) VALUES ($1, $2)', [result.rows[0].id, systemId])
    }
  }
}

export async function createDatabase() {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    await pool.query(schemaSql)
    await pool.query(migrationSql)
    await migrateInfraLinks(pool)
    await pool.query(constraintSql)
    return pool
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL não configurada')
  const { newDb } = await import('pg-mem')
  const memory = newDb({ autoCreateForeignKeyIndices: true })
  const { Pool: MemoryPool } = memory.adapters.createPg()
  const pool = new MemoryPool()
  await pool.query(schemaSql)
  await pool.query(migrationSql)
  await migrateInfraLinks(pool)
  await seedDevelopmentData(pool)
  return pool
}
