import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Send, Square, Plus, Settings, Sparkles, Database, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCoachChat } from '@/hooks/useCoachChat'
import { PlanCard, extractPlanFromMessage } from '@/components/coach/PlanCard'
import { MemoryCard, extractSaveMemoryBlocks } from '@/components/coach/MemoryCard'
import { cn } from '@/lib/utils'
import { db } from '@/db'
import { SEED_KNOWLEDGE } from '@/data/seed-knowledge'

const SUGGESTED_PROMPTS = [
  "What's my workout today?",
  "How's my recovery looking?",
  "My left hip feels tight",
  "Create a workout plan for today",
]

function renderMarkdown(text: string) {
  const parts: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = []
  const codeRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', content: match[2], lang: match[1] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts.map((part, i) => {
    if (part.type === 'code') {
      return (
        <pre key={i} className="bg-secondary rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
          {part.content}
        </pre>
      )
    }

    return (
      <span key={i}>
        {part.content.split('\n').map((line, li) => {
          let processed = line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          processed = processed.replace(/`([^`]+)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-xs">$1</code>')

          const bulletMatch = line.match(/^[-*] (.+)/)
          if (bulletMatch) {
            return (
              <span key={li} className="block pl-3 relative">
                <span className="absolute left-0">{'  '}&bull;</span>
                <span dangerouslySetInnerHTML={{ __html: processed.replace(/^[-*] /, '') }} />
              </span>
            )
          }

          if (line.match(/^#{2,3} /)) {
            return (
              <span key={li} className="block font-semibold mt-2 mb-1">
                {line.replace(/^#{2,3} /, '')}
              </span>
            )
          }

          return (
            <span key={li}>
              {li > 0 && <br />}
              <span dangerouslySetInnerHTML={{ __html: processed }} />
            </span>
          )
        })}
      </span>
    )
  })
}

/** Renders a message, extracting plan cards and save-memory cards */
function AssistantMessage({ content }: { content: string }) {
  const plan = extractPlanFromMessage(content)
  const { cleanText, saves } = extractSaveMemoryBlocks(content)

  return (
    <div className="space-y-0.5">
      {renderMarkdown(cleanText)}
      {plan && <PlanCard plan={plan} />}
      {saves.map((save, i) => (
        <MemoryCard key={i} data={save} />
      ))}
    </div>
  )
}

export function CoachPage() {
  const navigate = useNavigate()
  const {
    messages,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    startNewConversation,
    stopStreaming,
  } = useCoachChat()

  const [input, setInput] = useState('')
  const [importing, setImporting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const entryCount = useLiveQuery(() => db.knowledgeEntries.count(), [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  function handleSend() {
    if (!input.trim() || isStreaming) return
    sendMessage(input)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggestion(prompt: string) {
    sendMessage(prompt)
  }

  async function handleImportSeed() {
    setImporting(true)
    try {
      const now = new Date().toISOString()
      for (const entry of SEED_KNOWLEDGE) {
        await db.knowledgeEntries.add({
          ...entry,
          createdAt: now,
          updatedAt: now,
        })
      }
    } finally {
      setImporting(false)
    }
  }

  const hasMessages = messages.length > 0 || isStreaming
  const showSetup = !hasMessages && entryCount === 0

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] safe-area-pt">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-lg font-bold">Coach</h1>
        <div className="flex items-center gap-1">
          {/* Memory indicator */}
          {entryCount !== undefined && entryCount > 0 && (
            <button
              onClick={() => navigate('/memory')}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              {entryCount} entries
            </button>
          )}
          <button
            onClick={startNewConversation}
            className="p-2 text-muted-foreground hover:text-foreground"
            title="New conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Setup prompt when knowledge base is empty */}
        {showSetup && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="space-y-3 max-w-sm">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto" />
              <h2 className="text-lg font-semibold">Set Up Your Coach</h2>
              <p className="text-sm text-muted-foreground">
                Your knowledge base is empty. Import your coaching profile to get started.
              </p>
              <div className="text-left text-xs text-muted-foreground space-y-1 bg-secondary/50 rounded-lg p-3">
                <p>This creates entries for your:</p>
                <ul className="space-y-0.5 ml-3">
                  <li>&bull; Athlete profile & schedule</li>
                  <li>&bull; Clinical history (IT band, asymmetry, etc.)</li>
                  <li>&bull; Training plan (38-week marathon)</li>
                  <li>&bull; Exercise cues & mobility routines</li>
                  <li>&bull; Nutrition & red-flag protocols</li>
                </ul>
                <p className="mt-2">You can edit or delete any entry after import.</p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => { /* skip: just show prompts */ }}>
                  Skip
                </Button>
                <Button size="sm" onClick={handleImportSeed} disabled={importing}>
                  <Download className="w-4 h-4 mr-1" />
                  {importing ? 'Importing...' : 'Import'}
                </Button>
              </div>
            </div>

            <div className="w-full max-w-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">or start chatting</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestion(prompt)}
                    className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Normal empty state (has knowledge, no messages) */}
        {!hasMessages && !showSetup && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div>
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Ask your coach anything about training, recovery, or today's workout.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestion(prompt)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id || msg.createdAt}
            className={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-secondary rounded-bl-md'
              )}
            >
              {msg.role === 'assistant' ? (
                <AssistantMessage content={msg.content} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-sm">
              <div className="space-y-0.5">
                {renderMarkdown(streamingText)}
              </div>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>.</span>
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-red-950 border border-red-800 px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message your coach..."
            className="flex-1 min-h-10 max-h-32 resize-none"
            disabled={isStreaming}
            rows={1}
          />
          {isStreaming ? (
            <Button
              size="icon"
              variant="outline"
              onClick={stopStreaming}
              className="shrink-0 h-10 w-10"
              title="Stop"
            >
              <Square className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 h-10 w-10"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
