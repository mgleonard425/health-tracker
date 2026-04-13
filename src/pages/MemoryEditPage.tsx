import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { db, KNOWLEDGE_CATEGORIES } from '@/db'

export function MemoryEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id

  const [category, setCategory] = useState('other')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (id) {
      db.knowledgeEntries.get(Number(id)).then(entry => {
        if (entry) {
          setCategory(entry.category)
          setTitle(entry.title)
          setContent(entry.content)
          setUpdatedAt(entry.updatedAt)
        }
      })
    }
  }, [id])

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    const now = new Date().toISOString()

    if (isNew) {
      await db.knowledgeEntries.add({
        category,
        title: title.trim(),
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await db.knowledgeEntries.update(Number(id), {
        category,
        title: title.trim(),
        content: content.trim(),
        updatedAt: now,
      })
    }
    navigate('/memory')
  }

  async function handleDelete() {
    if (id) {
      await db.knowledgeEntries.delete(Number(id))
      navigate('/memory')
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{isNew ? 'New Entry' : 'Edit Entry'}</h1>
        </div>
        {!isNew && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-500 hover:text-red-400"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-red-950 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-300 mb-3">Delete "{title}"? This can't be undone.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      )}

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {KNOWLEDGE_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g., IT Band History"
        />
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        <Label>Content</Label>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Knowledge entry content..."
          className="min-h-[200px]"
        />
      </div>

      {/* Timestamp */}
      {updatedAt && (
        <p className="text-xs text-muted-foreground">
          Updated {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {/* Save */}
      <Button
        className="w-full"
        onClick={handleSave}
        disabled={!title.trim() || !content.trim()}
      >
        {isNew ? 'Create Entry' : 'Save Changes'}
      </Button>
    </div>
  )
}
