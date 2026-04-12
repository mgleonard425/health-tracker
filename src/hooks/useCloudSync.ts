import { useEffect, useState } from 'react'
import { db } from '@/db'
import { fetchCloudData, isSyncEnabled } from '@/lib/sync'
import type { CoachingNote } from '@/db'

/**
 * On mount (if sync enabled): fetches coaching notes from cloud and writes
 * undismissed ones to local Dexie. Provides coaching notes to consuming components.
 */
export function useCloudSync() {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSyncEnabled()) return

    let cancelled = false

    async function pull() {
      setLoading(true)
      try {
        const data = await fetchCloudData()
        if (cancelled || !data) return

        // Merge coaching notes into local DB
        if (Array.isArray(data.coachingNotes)) {
          for (const note of data.coachingNotes) {
            // Check if we already have this note (by createdAt timestamp)
            const existing = await db.coachingNotes.where('createdAt').equals(note.createdAt).first()
            if (!existing) {
              await db.coachingNotes.add({
                text: note.text,
                createdAt: note.createdAt,
                dismissed: false,
              } as CoachingNote)
            }
          }
        }
      } catch (err) {
        console.error('Cloud sync pull failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    pull()
    return () => { cancelled = true }
  }, [])

  return { loading }
}
