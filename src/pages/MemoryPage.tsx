import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, subDays } from 'date-fns'
import { ArrowLeft, Plus, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db, KNOWLEDGE_CATEGORIES } from '@/db'

const categoryLabels = new Map(KNOWLEDGE_CATEGORIES.map(c => [c.id, c.label]))
const sevenDaysAgo = subDays(new Date(), 7).toISOString()

export function MemoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  const entries = useLiveQuery(() => db.knowledgeEntries.orderBy('updatedAt').reverse().toArray(), [])

  if (!entries) return null

  // Filter by search
  const filtered = search.trim()
    ? entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  // Group by category
  const byCategory = new Map<string, typeof filtered>()
  for (const entry of filtered) {
    const existing = byCategory.get(entry.category) || []
    existing.push(entry)
    byCategory.set(entry.category, existing)
  }

  // Sort categories by predefined order
  const categoryOrder = KNOWLEDGE_CATEGORIES.map(c => c.id)
  const sortedCategories = [...byCategory.entries()].sort(
    (a, b) => categoryOrder.indexOf(a[0]) - categoryOrder.indexOf(b[0])
  )

  function toggleCategory(cat: string) {
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Memory</h1>
          <span className="text-sm text-muted-foreground">{entries.length} entries</span>
        </div>
        <Button size="sm" onClick={() => navigate('/memory/new')}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No knowledge entries yet.</p>
          <p className="text-xs mt-1">Import your coaching profile or add entries manually.</p>
        </div>
      )}

      {/* Entries by category */}
      {sortedCategories.map(([catId, catEntries]) => {
        const label = categoryLabels.get(catId) || catId
        const isCollapsed = collapsedCategories.has(catId)
        const shouldDefaultCollapse = catEntries.length > 3 && !search.trim()

        return (
          <div key={catId}>
            <button
              onClick={() => toggleCategory(catId)}
              className="flex items-center gap-2 w-full text-left mb-2"
            >
              {(isCollapsed || (!collapsedCategories.has(catId) && shouldDefaultCollapse && !search.trim()))
                ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />
              }
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {label} ({catEntries.length})
              </span>
            </button>

            {!(isCollapsed || (!collapsedCategories.has(catId) && shouldDefaultCollapse && !search.trim())) && (
              <div className="space-y-2 ml-1">
                {catEntries.map(entry => (
                  <Card
                    key={entry.id}
                    className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => navigate(`/memory/edit/${entry.id}`)}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{entry.title}</span>
                            {entry.createdAt >= sevenDaysAgo && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">NEW</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{entry.content}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                          {format(new Date(entry.updatedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
