/**
 * Local dev API server — runs on port 3000 alongside Vite.
 * Mirrors the two Vercel serverless functions so the full credential + Jira proxy
 * flow works without needing `vercel dev` or a live Vercel deployment.
 *
 * Reads env vars from .env.local automatically.
 */

// Local dev only — sandbox CA bundle doesn't include Upstash/Jira issuers
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import http from 'http'
import { readFileSync, existsSync } from 'fs'
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { Redis } from '@upstash/redis'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envPath = new URL('.env.local', import.meta.url).pathname
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const raw = trimmed.slice(eqIdx + 1).trim()
    // Strip surrounding quotes if present
    const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw
    if (!process.env[key]) process.env[key] = value
  }
  console.log('[dev-server] Loaded .env.local')
}

// ─── Encryption helpers ───────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm'

function getKey() {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY ?? ''
  if (!hex || hex.length !== 64) throw new Error('CREDENTIALS_ENCRYPTION_KEY must be a 64-char hex string')
  return Buffer.from(hex, 'hex')
}

function encrypt(plaintext) {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(stored) {
  const key = getKey()
  const [ivHex, tagHex, dataHex] = stored.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid encrypted value format')
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8')
}

function deriveSessionId(parts) {
  return createHash('sha256').update(parts.join('::')).digest('hex')
}

const TTL_SECONDS = 60 * 60 * 24 * 30

function getRedis() {
  return new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
}

// ─── Request helpers ──────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}) } catch { resolve({}) }
    })
    req.on('error', reject)
  })
}

function send(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-RR-Session',
  })
  res.end(payload)
}

// ─── Route: /api/credentials ──────────────────────────────────────────────────
async function handleCredentials(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {})

  const redis = getRedis()

  if (req.method === 'POST') {
    const body = await readBody(req)
    const { integration, linearKey, jiraDomain, jiraEmail, jiraToken } = body

    if (!integration || !['linear', 'jira'].includes(integration))
      return send(res, 400, { error: 'integration must be "linear" or "jira"' })
    if (integration === 'linear' && !linearKey)
      return send(res, 400, { error: 'linearKey required' })
    if (integration === 'jira' && (!jiraDomain || !jiraEmail || !jiraToken))
      return send(res, 400, { error: 'jiraDomain, jiraEmail and jiraToken required' })

    const sessionId = integration === 'linear'
      ? deriveSessionId(['linear', linearKey])
      : deriveSessionId(['jira', jiraDomain, jiraEmail, jiraToken])

    const redisKey = `rr:session:${sessionId}`
    const existing = await redis.get(redisKey)
    if (existing) {
      await redis.expire(redisKey, TTL_SECONDS)
      return send(res, 200, { sessionId })
    }

    try {
      const session = {
        integration,
        linearKey: linearKey ? encrypt(linearKey) : undefined,
        jiraDomain: jiraDomain ? encrypt(jiraDomain) : undefined,
        jiraEmail: jiraEmail ? encrypt(jiraEmail) : undefined,
        jiraToken: jiraToken ? encrypt(jiraToken) : undefined,
      }
      await redis.set(redisKey, session, { ex: TTL_SECONDS })
      return send(res, 201, { sessionId })
    } catch (err) {
      console.error('[credentials] encrypt/store error:', err)
      return send(res, 500, { error: 'Failed to store credentials', detail: err.message })
    }
  }

  if (req.method === 'DELETE') {
    const sessionId = req.headers['x-rr-session']
    if (sessionId) await redis.del(`rr:session:${sessionId}`)
    res.writeHead(204)
    return res.end()
  }

  send(res, 405, { error: 'Method not allowed' })
}

// ─── Route: /api/jira-proxy ───────────────────────────────────────────────────
async function handleJiraProxy(req, res) {
  if (req.method === 'OPTIONS') return send(res, 200, {})

  const sessionId = req.headers['x-rr-session']
  if (!sessionId) return send(res, 401, { error: 'Missing session' })

  const redis = getRedis()
  const session = await redis.get(`rr:session:${sessionId}`)
  if (!session?.jiraDomain || !session?.jiraEmail || !session?.jiraToken)
    return send(res, 401, { error: 'Jira not configured for this session' })

  let jiraDomain, jiraEmail, jiraToken
  try {
    jiraDomain = decrypt(session.jiraDomain)
    jiraEmail = decrypt(session.jiraEmail)
    jiraToken = decrypt(session.jiraToken)
  } catch (err) {
    return send(res, 500, { error: 'Failed to decrypt credentials', detail: err.message })
  }

  // Parse path + query from the incoming URL
  const url = new URL(req.url, 'http://localhost')
  const jiraPath = url.searchParams.get('path') ?? ''
  url.searchParams.delete('path')
  const qs = url.searchParams.toString()
  const jiraUrl = `https://${jiraDomain}/rest/api/3/${jiraPath}${qs ? `?${qs}` : ''}`

  const credentials = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const body = hasBody ? await readBody(req) : undefined

  try {
    const upstream = await fetch(jiraUrl, {
      method: req.method,
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await upstream.text()
    const ct = upstream.headers.get('content-type') ?? ''
    if (!ct.includes('application/json')) {
      return send(res, upstream.status, {
        error: `Jira returned non-JSON response (HTTP ${upstream.status})`,
        detail: text.slice(0, 200),
      })
    }
    let data
    try { data = JSON.parse(text) } catch {
      return send(res, upstream.status, { error: 'Jira returned invalid JSON', detail: text.slice(0, 200) })
    }
    return send(res, upstream.status, data)
  } catch (err) {
    console.error('[jira-proxy] upstream error:', err)
    return send(res, 502, { error: 'Failed to reach Jira', detail: err.message })
  }
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  console.log(`[dev-server] ${req.method} ${pathname}`)

  try {
    if (pathname === '/api/credentials') return await handleCredentials(req, res)
    if (pathname === '/api/jira-proxy') return await handleJiraProxy(req, res)
    send(res, 404, { error: `No handler for ${pathname}` })
  } catch (err) {
    console.error('[dev-server] unhandled error:', err)
    send(res, 500, { error: 'Internal server error', detail: err.message })
  }
})

server.listen(3000, () => {
  console.log('[dev-server] API server running on http://localhost:3000')
})
