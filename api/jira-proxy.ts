import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import type { StoredSession } from './credentials'
import { decrypt } from './encrypt'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RR-Session')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const sessionId = req.headers['x-rr-session'] as string | undefined
  if (!sessionId) return res.status(401).json({ error: 'Missing session' })

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  const session = await redis.get<StoredSession>(`rr:session:${sessionId}`)
  if (!session?.jiraDomain || !session?.jiraEmail || !session?.jiraToken) {
    return res.status(401).json({ error: 'Jira not configured for this session' })
  }

  let jiraDomain: string, jiraEmail: string, jiraToken: string
  try {
    jiraDomain = decrypt(session.jiraDomain)
    jiraEmail = decrypt(session.jiraEmail)
    jiraToken = decrypt(session.jiraToken)
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt credentials' })
  }

  // Path is passed as a query param: /api/jira-proxy?path=issue/search&maxResults=100
  const jiraPath = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path ?? '')

  const params = new URLSearchParams()
  Object.entries(req.query).forEach(([key, value]) => {
    if (key !== 'path' && value != null) params.set(key, String(value))
  })
  const qs = params.toString()
  const url = `https://${jiraDomain}/rest/api/3/${jiraPath}${qs ? `?${qs}` : ''}`

  const credentials = Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: hasBody ? JSON.stringify(req.body) : undefined,
  })

  const text = await upstream.text()
  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return res.status(upstream.status).json({
      error: `Jira returned non-JSON response (HTTP ${upstream.status})`,
      detail: text.slice(0, 200),
    })
  }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return res.status(upstream.status).json({
      error: `Jira returned invalid JSON (HTTP ${upstream.status})`,
      detail: text.slice(0, 200),
    })
  }
  return res.status(upstream.status).json(data)
}
