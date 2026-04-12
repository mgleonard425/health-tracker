import { useLiveQuery } from 'dexie-react-hooks'
import { MessageSquare, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function CoachingNotes() {
  const notes = useLiveQuery(
    async () => {
      const all = await db.coachingNotes.orderBy('createdAt').reverse().toArray()
      return all.filter(n => !n.dismissed)
    },
    []
  )

  if (!notes || notes.length === 0) return null

  async function handleDismiss(id: number) {
    await db.coachingNotes.update(id, { dismissed: true })
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
          Coach Notes
        </h2>
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="flex items-start gap-2 bg-secondary rounded-lg p-2.5">
              <p className="text-sm flex-1">{note.text}</p>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => note.id && handleDismiss(note.id)}
                  className="p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground">{timeAgo(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
