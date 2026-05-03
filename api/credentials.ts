import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'
import { encrypt } from './encrypt'

const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface StoredSession {
  integration: 'linear' | 'jira'
  linearKey?: string
  jiraDomain?: string
  jiraEmail?: string
  jiraToken?: string
}

function deriveSessionId(parts: string[]): string {
  return createHash('sha256').update(parts.join('::')).digest('hex')
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

    // Derive a deterministic session ID from credentials — same user always maps to the same key
    const sessionId = integration === 'linear'
      ? deriveSessionId(['linear', linearKey])
      : deriveSessionId(['jira', jiraDomain, jiraEmail, jiraToken])

    const redisKey = `rr:session:${sessionId}`

    // If session already exists, just refresh TTL and return — no re-encryption needed
    const existing = await redis.get(redisKey)
    if (existing) {
      await redis.expire(redisKey, TTL_SECONDS)
      return res.status(200).json({ sessionId })
    }

    const session: StoredSession = {
      integration,
      linearKey: linearKey ? encrypt(linearKey) : undefined,
      jiraDomain: jiraDomain ? encrypt(jiraDomain) : undefined,
      jiraEmail: jiraEmail ? encrypt(jiraEmail) : undefined,
      jiraToken: jiraToken ? encrypt(jiraToken) : undefined,
    }
    await redis.set(redisKey, session, { ex: TTL_SECONDS })

    return res.status(201).json({ sessionId })
  }

  if (req.method === 'DELETE') {
    const sessionId = req.headers['x-rr-session'] as string
    if (sessionId) await redis.del(`rr:session:${sessionId}`)
    return res.status(204).end()
  }

  return res.status(405).end()
}
