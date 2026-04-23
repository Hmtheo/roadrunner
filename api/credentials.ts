import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { randomUUID } from 'crypto'

const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface StoredSession {
  integration: 'linear' | 'jira'
  linearKey?: string
  jiraDomain?: string
  jiraEmail?: string
  jiraToken?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RR-Session')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })

  if (req.method === 'POST') {
    const { integration, linearKey, jiraDomain, jiraEmail, jiraToken } = req.body ?? {}

    if (!integration || (integration !== 'linear' && integration !== 'jira')) {
      return res.status(400).json({ error: 'integration must be "linear" or "jira"' })
    }
    if (integration === 'linear' && !linearKey) {
      return res.status(400).json({ error: 'linearKey required' })
    }
    if (integration === 'jira' && (!jiraDomain || !jiraEmail || !jiraToken)) {
      return res.status(400).json({ error: 'jiraDomain, jiraEmail and jiraToken required' })
    }

    const sessionId = randomUUID()
    const session: StoredSession = { integration, linearKey, jiraDomain, jiraEmail, jiraToken }
    await redis.set(`rr:session:${sessionId}`, session, { ex: TTL_SECONDS })

    return res.status(201).json({ sessionId })
  }

  if (req.method === 'DELETE') {
    const sessionId = req.headers['x-rr-session'] as string
    if (sessionId) await redis.del(`rr:session:${sessionId}`)
    return res.status(204).end()
  }

  return res.status(405).end()
}
