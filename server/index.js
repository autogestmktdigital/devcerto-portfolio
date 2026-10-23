import 'dotenv/config'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { createDatabase } from './database.js'

const app = express()
const isProduction = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT) || 8080
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'https://portifolio.devcerto.com'
const adminPassword = process.env.ADMIN_PASSWORD || (!isProduction ? 'local-dev-password-change-me' : '')
const cookieName = 'portfolio_session'
const sessionLifetimeMs = 8 * 60 * 60 * 1000
const credentialKeyText = process.env.CREDENTIALS_ENCRYPTION_KEY

if (!adminPassword || adminPassword.length < 8) throw new Error('ADMIN_PASSWORD deve ter ao menos 8 caracteres')
if (isProduction && (!credentialKeyText || Buffer.from(credentialKeyText, 'base64').length !== 32)) {
  throw new Error('CREDENTIALS_ENCRYPTION_KEY deve ser uma chave base64 de 32 bytes')
}

const credentialKey = credentialKeyText
  ? Buffer.from(credentialKeyText, 'base64')
  : crypto.scryptSync('local-only-portfolio-key', 'devcerto-local-only', 32)
const allowedOrigins = new Set([frontendOrigin])
if (!isProduction) {
  allowedOrigins.add('http://localhost:5173')
  allowedOrigins.add('http://127.0.0.1:5173')
  allowedOrigins.add('http://localhost:4173')
}

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(new Error('Origem não permitida'))
  },
  credentials: true,
}))
app.use(express.json({ limit: '50kb' }))

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false })
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false })

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function encryptPassword(password) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', credentialKey, iv)
  const encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${encrypted.toString('base64')}`
}

function decryptPassword(value) {
  const [ivText, tagText, encryptedText] = value.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', credentialKey, Buffer.from(ivText, 'base64'))
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8')
}

function secureCompare(first, second) {
  const firstHash = crypto.createHash('sha256').update(first).digest()
  const secondHash = crypto.createHash('sha256').update(second).digest()
  return crypto.timingSafeEqual(firstHash, secondHash) && first.length === second.length
}

function setSessionCookie(response, token) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: sessionLifetimeMs,
  })
}

function clearSessionCookie(response) {
  response.clearCookie(cookieName, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' })
}

function getCookie(request, name) {
  const cookies = request.headers.cookie ?? ''
  for (const cookie of cookies.split(';')) {
    const separator = cookie.indexOf('=')
    if (separator < 0) continue
    if (cookie.slice(0, separator).trim() === name) return decodeURIComponent(cookie.slice(separator + 1).trim())
  }
  return ''
}

let pool

app.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1')
    response.json({ status: 'ok' })
  } catch {
    response.status(503).json({ status: 'unavailable' })
  }
})

app.use('/api', apiLimiter)

app.get('/api/session', async (request, response) => {
  const token = getCookie(request, cookieName)
  if (!token) return response.json({ authenticated: false })
  const result = await pool.query('SELECT 1 FROM admin_sessions WHERE token_hash = $1 AND expires_at > NOW()', [hashToken(token)])
  return response.json({ authenticated: result.rowCount === 1 })
})

app.post('/api/login', loginLimiter, async (request, response) => {
  const supplied = typeof request.body?.password === 'string' ? request.body.password : ''
  if (!secureCompare(supplied, adminPassword)) return response.status(401).json({ error: 'Senha inválida' })
  const token = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + sessionLifetimeMs)
  await pool.query('INSERT INTO admin_sessions (token_hash, expires_at) VALUES ($1, $2)', [hashToken(token), expiresAt])
  setSessionCookie(response, token)
  return response.json({ authenticated: true })
})

app.post('/api/logout', async (request, response) => {
  const token = getCookie(request, cookieName)
  if (token) await pool.query('DELETE FROM admin_sessions WHERE token_hash = $1', [hashToken(token)])
  clearSessionCookie(response)
  return response.status(204).end()
})

app.use('/api', async (request, response, next) => {
  const token = getCookie(request, cookieName)
  if (!token) return response.status(401).json({ error: 'Sessão encerrada. Entre novamente.' })
  try {
    const result = await pool.query('SELECT 1 FROM admin_sessions WHERE token_hash = $1 AND expires_at > NOW()', [hashToken(token)])
    if (result.rowCount !== 1) {
      clearSessionCookie(response)
      return response.status(401).json({ error: 'Sessão encerrada. Entre novamente.' })
    }
    return next()
  } catch (error) {
    return next(error)
  }
})

app.get('/api/data', async (_request, response) => {
  const [systemsResult, infrasResult, clientsResult, clientSystemsResult, credentialsResult] = await Promise.all([
    pool.query('SELECT id, name, description, status FROM systems ORDER BY id'),
    pool.query('SELECT id, system_id AS "systemId", platform, usage, due_day AS "dueDay", payer, value::float AS value FROM infrastructure ORDER BY id'),
    pool.query('SELECT id, name, since FROM clients ORDER BY id'),
    pool.query('SELECT client_id AS "clientId", system_id AS "systemId" FROM client_systems ORDER BY client_id, system_id'),
    pool.query('SELECT id, platform, login, password_ciphertext FROM credentials ORDER BY id'),
  ])
  const clientIds = new Map()
  for (const link of clientSystemsResult.rows) {
    const current = clientIds.get(link.clientId) ?? []
    current.push(link.systemId)
    clientIds.set(link.clientId, current)
  }
  const clients = clientsResult.rows.map((client) => ({ ...client, systemIds: clientIds.get(client.id) ?? [] }))
  const credentials = credentialsResult.rows.map(({ password_ciphertext, ...credential }) => ({ ...credential, password: decryptPassword(password_ciphertext) }))
  return response.json({ systems: systemsResult.rows, infras: infrasResult.rows, clients, credentials })
})

app.post('/api/systems', async (request, response) => {
  const { name, description, status } = request.body ?? {}
  if (!validText(name) || !validText(description) || !['Lançado', 'Em dev', 'Desativado'].includes(status)) return response.status(400).json({ error: 'Dados do sistema inválidos' })
  const result = await pool.query('INSERT INTO systems (name, description, status) VALUES ($1, $2, $3) RETURNING id, name, description, status', [name, description, status])
  return response.status(201).json(result.rows[0])
})

app.put('/api/systems/:id', async (request, response) => {
  const { name, description, status } = request.body ?? {}
  if (!validText(name) || !validText(description) || !['Lançado', 'Em dev', 'Desativado'].includes(status)) return response.status(400).json({ error: 'Dados do sistema inválidos' })
  const result = await pool.query('UPDATE systems SET name = $1, description = $2, status = $3 WHERE id = $4 RETURNING id, name, description, status', [name, description, status, positiveId(request.params.id)])
  return result.rowCount ? response.json(result.rows[0]) : response.status(404).json({ error: 'Sistema não encontrado' })
})

app.delete('/api/systems/:id', async (request, response) => {
  const result = await pool.query('DELETE FROM systems WHERE id = $1', [positiveId(request.params.id)])
  return result.rowCount ? response.status(204).end() : response.status(404).json({ error: 'Sistema não encontrado' })
})

app.post('/api/infras', async (request, response) => {
  const parsed = parseInfra(request.body)
  if (!parsed) return response.status(400).json({ error: 'Dados da infraestrutura inválidos' })
  const result = await pool.query('INSERT INTO infrastructure (system_id, platform, usage, due_day, payer, value) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, system_id AS "systemId", platform, usage, due_day AS "dueDay", payer, value::float AS value', parsed)
  return response.status(201).json(result.rows[0])
})

app.put('/api/infras/:id', async (request, response) => {
  const parsed = parseInfra(request.body)
  if (!parsed) return response.status(400).json({ error: 'Dados da infraestrutura inválidos' })
  const result = await pool.query('UPDATE infrastructure SET system_id = $1, platform = $2, usage = $3, due_day = $4, payer = $5, value = $6 WHERE id = $7 RETURNING id, system_id AS "systemId", platform, usage, due_day AS "dueDay", payer, value::float AS value', [...parsed, positiveId(request.params.id)])
  return result.rowCount ? response.json(result.rows[0]) : response.status(404).json({ error: 'Infraestrutura não encontrada' })
})

app.delete('/api/infras/:id', async (request, response) => {
  const result = await pool.query('DELETE FROM infrastructure WHERE id = $1', [positiveId(request.params.id)])
  return result.rowCount ? response.status(204).end() : response.status(404).json({ error: 'Infraestrutura não encontrada' })
})

app.post('/api/clients', async (request, response) => {
  const { name, since, systemIds } = request.body ?? {}
  if (!validText(name) || !validYear(since) || !validSystemIds(systemIds)) return response.status(400).json({ error: 'Dados do cliente inválidos' })
  const client = await withTransaction(async (clientPool) => {
    const result = await clientPool.query('INSERT INTO clients (name, since) VALUES ($1, $2) RETURNING id, name, since', [name, since])
    for (const systemId of systemIds) await clientPool.query('INSERT INTO client_systems (client_id, system_id) VALUES ($1, $2)', [result.rows[0].id, systemId])
    return { ...result.rows[0], systemIds }
  })
  return response.status(201).json(client)
})

app.put('/api/clients/:id', async (request, response) => {
  const id = positiveId(request.params.id)
  const { name, since, systemIds } = request.body ?? {}
  if (!validText(name) || !validYear(since) || !validSystemIds(systemIds)) return response.status(400).json({ error: 'Dados do cliente inválidos' })
  const client = await withTransaction(async (clientPool) => {
    const result = await clientPool.query('UPDATE clients SET name = $1, since = $2 WHERE id = $3 RETURNING id, name, since', [name, since, id])
    if (!result.rowCount) return null
    await clientPool.query('DELETE FROM client_systems WHERE client_id = $1', [id])
    for (const systemId of systemIds) await clientPool.query('INSERT INTO client_systems (client_id, system_id) VALUES ($1, $2)', [id, systemId])
    return { ...result.rows[0], systemIds }
  })
  return client ? response.json(client) : response.status(404).json({ error: 'Cliente não encontrado' })
})

app.delete('/api/clients/:id', async (request, response) => {
  const result = await pool.query('DELETE FROM clients WHERE id = $1', [positiveId(request.params.id)])
  return result.rowCount ? response.status(204).end() : response.status(404).json({ error: 'Cliente não encontrado' })
})

app.post('/api/credentials', async (request, response) => {
  const { platform, login, password } = request.body ?? {}
  if (!validText(platform) || !validText(login) || typeof password !== 'string' || password.length > 4096) return response.status(400).json({ error: 'Dados de acesso inválidos' })
  const result = await pool.query('INSERT INTO credentials (platform, login, password_ciphertext) VALUES ($1, $2, $3) RETURNING id, platform, login', [platform, login, encryptPassword(password)])
  return response.status(201).json({ ...result.rows[0], password })
})

app.put('/api/credentials/:id', async (request, response) => {
  const id = positiveId(request.params.id)
  const { platform, login, password } = request.body ?? {}
  if (!validText(platform) || !validText(login) || typeof password !== 'string' || password.length > 4096) return response.status(400).json({ error: 'Dados de acesso inválidos' })
  const result = await pool.query('UPDATE credentials SET platform = $1, login = $2, password_ciphertext = $3 WHERE id = $4 RETURNING id, platform, login', [platform, login, encryptPassword(password), id])
  return result.rowCount ? response.json({ ...result.rows[0], password }) : response.status(404).json({ error: 'Acesso não encontrado' })
})

app.delete('/api/credentials/:id', async (request, response) => {
  const result = await pool.query('DELETE FROM credentials WHERE id = $1', [positiveId(request.params.id)])
  return result.rowCount ? response.status(204).end() : response.status(404).json({ error: 'Acesso não encontrado' })
})

function validText(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 500
}

function positiveId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : -1
}

function validYear(value) {
  return Number.isInteger(value) && value >= 1900 && value <= 2100
}

function validSystemIds(ids) {
  return Array.isArray(ids) && ids.length <= 100 && ids.every((id) => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length
}

function parseInfra(body) {
  const { systemId, platform, usage, dueDay, payer, value } = body ?? {}
  if (!Number.isSafeInteger(systemId) || systemId < 1 || !validText(platform) || !validText(usage)) return null
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31 || typeof payer !== 'string' || payer.length > 500) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1_000_000_000) return null
  return [systemId, platform, usage, dueDay, payer, value]
}

async function withTransaction(operation) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const value = await operation(client)
    await client.query('COMMIT')
    return value
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

app.use((error, _request, response, _next) => {
  if (error?.type === 'entity.parse.failed') return response.status(400).json({ error: 'JSON inválido' })
  if (error?.code === '23503') return response.status(400).json({ error: 'Sistema relacionado não encontrado' })
  if (error?.code === '23505') return response.status(409).json({ error: 'Registro duplicado' })
  console.error('Erro interno da API', error?.message ?? 'erro desconhecido')
  return response.status(500).json({ error: 'Erro interno do servidor' })
})

const currentFile = fileURLToPath(import.meta.url)
const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === currentFile

if (isEntrypoint) {
  pool = await createDatabase()
  await pool.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()')
  setInterval(() => pool.query('DELETE FROM admin_sessions WHERE expires_at <= NOW()').catch(() => {}), 60 * 60 * 1000).unref()
  app.listen(port, '0.0.0.0', () => console.info(`API pronta na porta ${port}`))
}

function setPool(value) {
  pool = value
}

export { app, createDatabase, setPool }
