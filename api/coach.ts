import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { COACHING_SYSTEM_PROMPT } from './coaching-prompt'

export const config = {
  maxDuration: 60,
}

function getToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = getToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Coach not configured. ANTHROPIC_API_KEY is not set.' })
  }

  const { messages, dataContext } = req.body || {}
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty messages array' })
  }

  const systemPrompt = dataContext
    ? COACHING_SYSTEM_PROMPT + '\n\n---\n\n## CURRENT DATA\n\n' + dataContext
    : COACHING_SYSTEM_PROMPT

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`)
    })

    stream.on('end', () => {
      res.write(`event: done\ndata: ${JSON.stringify({ fullText })}\n\n`)
      res.end()
    })

    stream.on('error', (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: message })
    }
  }
}
