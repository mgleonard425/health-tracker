import { getSyncToken, generateSyncToken } from '@/lib/sync'

/**
 * Streams a coaching response from the API via SSE.
 * Calls onToken for each text chunk, onDone with the full text, onError on failure.
 */
export async function streamCoachResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  dataContext: string,
  onToken: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Ensure we have a token for auth (generate one if needed, doesn't enable sync)
  let token = getSyncToken()
  if (!token) {
    token = generateSyncToken()
  }

  let response: Response
  try {
    response = await fetch('/api/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages, dataContext }),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) return
    onError(err instanceof Error ? err.message : 'Network error')
    return
  }

  if (!response.ok) {
    try {
      const body = await response.json()
      onError(body.error || `Server error (${response.status})`)
    } catch {
      onError(`Server error (${response.status})`)
    }
    return
  }

  if (!response.body) {
    onError('No response stream')
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Parse SSE events: split on double newlines
      const parts = buffer.split('\n\n')
      // Keep the last (possibly incomplete) part in the buffer
      buffer = parts.pop() || ''

      for (const part of parts) {
        if (!part.trim()) continue

        let eventType = 'message'
        let data = ''

        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7)
          } else if (line.startsWith('data: ')) {
            data = line.slice(6)
          }
        }

        if (!data) continue

        try {
          const parsed = JSON.parse(data)

          if (eventType === 'token' && parsed.text) {
            onToken(parsed.text)
          } else if (eventType === 'done' && parsed.fullText) {
            onDone(parsed.fullText)
            return
          } else if (eventType === 'error') {
            onError(parsed.error || 'Unknown streaming error')
            return
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    onError(err instanceof Error ? err.message : 'Stream read error')
  }
}
