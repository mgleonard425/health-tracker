import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '@/db'
import type { CoachMessage } from '@/db'
import { buildCoachingContext } from '@/lib/coaching-context'
import { streamCoachResponse } from '@/lib/coach-api'

const MAX_CONTEXT_MESSAGES = 20

export function useCoachChat() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load most recent conversation on mount
  useEffect(() => {
    async function loadRecent() {
      const convos = await db.coachConversations.orderBy('updatedAt').reverse().limit(1).toArray()
      if (convos.length > 0) {
        const convo = convos[0]
        setConversationId(convo.id!)
        const msgs = await db.coachMessages.where('conversationId').equals(convo.id!).sortBy('createdAt')
        setMessages(msgs)
      }
    }
    loadRecent()
  }, [])

  const startNewConversation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    setConversationId(null)
    setMessages([])
    setStreamingText('')
    setIsStreaming(false)
    setError(null)
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return
    setError(null)

    const now = new Date().toISOString()
    let currentConvoId = conversationId

    // Create conversation if first message
    if (!currentConvoId) {
      const title = text.slice(0, 50).trim()
      const id = await db.coachConversations.add({
        title,
        createdAt: now,
        updatedAt: now,
      })
      currentConvoId = id as number
      setConversationId(currentConvoId)
    }

    // Save user message
    const userMsg: CoachMessage = {
      conversationId: currentConvoId,
      role: 'user',
      content: text.trim(),
      createdAt: now,
    }
    const userMsgId = await db.coachMessages.add(userMsg)
    userMsg.id = userMsgId as number
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    // Build context and prepare API messages
    setIsStreaming(true)
    setStreamingText('')

    let dataContext = ''
    try {
      dataContext = await buildCoachingContext()
    } catch {
      // Non-fatal — agent can still respond without data context
    }

    // Take last N messages for API context
    const apiMessages = updatedMessages
      .slice(-MAX_CONTEXT_MESSAGES)
      .map(m => ({ role: m.role, content: m.content }))

    const abort = new AbortController()
    abortRef.current = abort

    let fullResponse = ''

    await streamCoachResponse(
      apiMessages,
      dataContext,
      // onToken
      (tokenText) => {
        fullResponse += tokenText
        setStreamingText(fullResponse)
      },
      // onDone
      async (fullText) => {
        fullResponse = fullText
        const assistantMsg: CoachMessage = {
          conversationId: currentConvoId!,
          role: 'assistant',
          content: fullText,
          createdAt: new Date().toISOString(),
        }
        const assistantId = await db.coachMessages.add(assistantMsg)
        assistantMsg.id = assistantId as number

        await db.coachConversations.update(currentConvoId!, {
          updatedAt: new Date().toISOString(),
        })

        setMessages(prev => [...prev, assistantMsg])
        setStreamingText('')
        setIsStreaming(false)
        abortRef.current = null
      },
      // onError
      async (errorMsg) => {
        // Save partial response if we got any
        if (fullResponse) {
          const partialMsg: CoachMessage = {
            conversationId: currentConvoId!,
            role: 'assistant',
            content: fullResponse,
            createdAt: new Date().toISOString(),
          }
          const partialId = await db.coachMessages.add(partialMsg)
          partialMsg.id = partialId as number
          setMessages(prev => [...prev, partialMsg])
        }

        setStreamingText('')
        setIsStreaming(false)
        setError(errorMsg)
        abortRef.current = null
      },
      abort.signal,
    )

    // Handle abort (user pressed stop)
    if (abort.signal.aborted && fullResponse) {
      const partialMsg: CoachMessage = {
        conversationId: currentConvoId!,
        role: 'assistant',
        content: fullResponse,
        createdAt: new Date().toISOString(),
      }
      const partialId = await db.coachMessages.add(partialMsg)
      partialMsg.id = partialId as number
      setMessages(prev => [...prev, partialMsg])
      setStreamingText('')
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [conversationId, messages, isStreaming])

  return {
    messages,
    conversationId,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    startNewConversation,
    stopStreaming,
  }
}
