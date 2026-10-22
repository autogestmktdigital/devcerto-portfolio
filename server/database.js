import pg from 'pg'
import { initialClients, initialInfras, initialSystems } from './demo-data.js'
import { schemaSql } from './schema.js'

const { Pool } = pg

async function seedDevelopmentData(pool) {
  const result = await pool.query('SELECT COUNT(*)::int AS count FROM systems')
  if (result.rows[0].count > 0) return
  for (const system of initialSystems) {
    await pool.query('INSERT INTO systems (name, description, status) VALUES ($1, $2, $3)', [system.name, system.description, system.status])
  }
  for (const infra of initialInfras) {
    await pool.query('INSERT INTO infrastructure (system_id, platform, usage, due_day, payer, value) VALUES ($1, $2, $3, $4, $5, $6)', [infra.systemId, infra.platform, infra.usage, infra.dueDay, infra.payer, infra.value])
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
    return pool
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL não configurada')
  const { newDb } = await import('pg-mem')
  const memory = newDb({ autoCreateForeignKeyIndices: true })
  const { Pool: MemoryPool } = memory.adapters.createPg()
  const pool = new MemoryPool()
  await pool.query(schemaSql)
  await seedDevelopmentData(pool)
  return pool
}
