import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import type { StoredSession } from './credentials'
import { decrypt } from './encrypt'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RR-Session')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const sessionId = req.headers['x-rr-session'] as string | undefined
  if (!sessionId) return res.status(401).json({ error: 'Missing session' })

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  const session = await redis.get<StoredSession>(`rr:session:${sessionId}`)
  if (!session?.linearKey) {
    return res.status(401).json({ error: 'Linear not configured for this session' })
  }

  let linearKey: string
  try {
    linearKey = decrypt(session.linearKey)
  } catch {
    return res.status(500).json({ error: 'Failed to decrypt credentials' })
  }

  const upstream = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': linearKey,
    },
    body: JSON.stringify(req.body),
  })

  const contentType = upstream.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return res.status(upstream.status).json({ errors: [{ message: `Linear returned unexpected response (${upstream.status})` }] })
  }
  const data = await upstream.json()
  return res.status(upstream.status).json(data)
}
