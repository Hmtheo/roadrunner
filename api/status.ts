import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import type { StoredSession } from './credentials'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sessionId = req.headers['x-rr-session'] as string | undefined

  if (!sessionId) return res.json({ configured: false })

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
  const session = await redis.get<StoredSession>(`rr:session:${sessionId}`)
  if (!session) return res.json({ configured: false })

  return res.json({ configured: true, integration: session.integration })
}
