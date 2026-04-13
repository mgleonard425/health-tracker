import { useState } from 'react'
import { BookmarkPlus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { db, KNOWLEDGE_CATEGORIES } from '@/db'

const categoryLabels = new Map(KNOWLEDGE_CATEGORIES.map(c => [c.id, c.label]))

interface SaveMemoryData {
  category: string
  title: string
  content: string
}

/**
 * Extracts :::save-memory blocks from a message.
 * Returns the remaining text (blocks removed) and the parsed save data.
 */
export function extractSaveMemoryBlocks(text: string): {
  cleanText: string
  saves: SaveMemoryData[]
} {
  const saves: SaveMemoryData[] = []
  const cleanText = text.replace(/:::save-memory\n([\s\S]*?)\n:::/g, (_match, json: string) => {
    try {
      const parsed = JSON.parse(json.trim())
      if (parsed.category && parsed.title && parsed.content) {
        saves.push(parsed)
      }
    } catch {
      // Skip malformed blocks
    }
    return ''
  })
  return { cleanText: cleanText.trim(), saves }
}

export function MemoryCard({ data }: { data: SaveMemoryData }) {
  const [status, setStatus] = useState<'pending' | 'saved' | 'discarded'>('pending')

  async function handleSave() {
    const now = new Date().toISOString()
    await db.knowledgeEntries.add({
      category: data.category,
      title: data.title,
      content: data.content,
      createdAt: now,
      updatedAt: now,
    })
    setStatus('saved')
  }

  function handleDiscard() {
    setStatus('discarded')
  }

  const catLabel = categoryLabels.get(data.category) || data.category

  if (status === 'saved') {
    return (
      <div className="border border-emerald-800 bg-emerald-950/50 rounded-lg px-3 py-2 my-2 flex items-center gap-2 text-sm text-emerald-400">
        <Check className="w-4 h-4 shrink-0" />
        Saved to {catLabel}
      </div>
    )
  }

  if (status === 'discarded') {
    return (
      <div className="border border-border bg-secondary/50 rounded-lg px-3 py-2 my-2 text-sm text-muted-foreground">
        Discarded
      </div>
    )
  }

  return (
    <div className="border border-border bg-secondary/30 rounded-lg p-3 my-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <BookmarkPlus className="w-3.5 h-3.5" />
        Save to Memory?
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        {catLabel} &rsaquo; {data.title}
      </div>
      <p className="text-sm mb-3 whitespace-pre-wrap">{data.content}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleDiscard}>
          <X className="w-3.5 h-3.5 mr-1" />
          Discard
        </Button>
        <Button size="sm" onClick={handleSave}>
          <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>
  )
}
