import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stepper } from './Stepper'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import type { RunType } from '@/db'

interface RunFormProps {
  workoutId: number
  onFinish: () => void
  embedded?: boolean  // true when inside a custom workout (hide save button)
}

const runTypes: { value: RunType; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'long', label: 'Long Run' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'strides', label: 'Strides' },
  { value: 'marathon-pace', label: 'Marathon Pace' },
  { value: 'fartlek', label: 'Fartlek' },
]

interface RunSegment {
  id?: number
  distance: number
  duration: number
  runType: RunType
  route: string
  feel: number
  notes: string
}

function emptySegment(): RunSegment {
  return { distance: 0, duration: 0, runType: 'easy', route: '', feel: 3, notes: '' }
}

export function RunForm({ workoutId, onFinish, embedded }: RunFormProps) {
  const [segments, setSegments] = useState<RunSegment[]>([emptySegment()])
  const [loaded, setLoaded] = useState(false)

  const existingRuns = useLiveQuery(
    () => db.runDetails.where('workoutId').equals(workoutId).toArray(),
    [workoutId]
  )

  useEffect(() => {
    if (existingRuns && existingRuns.length > 0 && !loaded) {
      setSegments(existingRuns.map(r => ({
        id: r.id,
        distance: r.distanceMiles,
        duration: r.durationMinutes,
        runType: r.runType,
        route: r.route || '',
        feel: r.feelScale,
        notes: '',
      })))
      setLoaded(true)
    } else if (existingRuns && existingRuns.length === 0 && !loaded) {
      setLoaded(true)
    }
  }, [existingRuns, loaded])

  function updateSegment(index: number, data: Partial<RunSegment>) {
    setSegments(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...data }
      return next
    })
  }

  function addSegment() {
    setSegments(prev => [...prev, emptySegment()])
  }

  function removeSegment(index: number) {
    if (segments.length <= 1) return
    setSegments(prev => prev.filter((_, i) => i !== index))
  }

  const formatPace = (minutesPerMile: number) => {
    const mins = Math.floor(minutesPerMile)
    const secs = Math.round((minutesPerMile - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const totalDistance = segments.reduce((s, seg) => s + seg.distance, 0)
  const totalDuration = segments.reduce((s, seg) => s + seg.duration, 0)

  async function handleSave() {
    // Delete existing and re-add
    await db.runDetails.where('workoutId').equals(workoutId).delete()
    for (const seg of segments) {
      const pace = seg.distance > 0 && seg.duration > 0 ? seg.duration / seg.distance : 0
      await db.runDetails.add({
        workoutId,
        distanceMiles: seg.distance,
        durationMinutes: seg.duration,
        pacePerMile: pace > 0 ? Math.round(pace * 60) : undefined,
        runType: seg.runType,
        route: seg.route || undefined,
        feelScale: seg.feel,
      })
    }
    if (!embedded) onFinish()
  }

  // Auto-save for embedded mode (custom workouts) — save is triggered by parent's handleFinish
  // For standalone, user clicks Save Run
  useEffect(() => {
    if (!embedded) return
    // Save on unmount or when parent finishes
    return () => {
      // We can't await in cleanup, but the parent's handleFinish will call db operations
    }
  }, [embedded])

  return (
    <div className="space-y-4">
      {/* Totals (when multiple segments) */}
      {segments.length > 1 && (
        <div className="text-center text-sm text-muted-foreground">
          Total: <span className="font-bold text-foreground">{totalDistance.toFixed(1)} mi</span> in{' '}
          <span className="font-bold text-foreground">{totalDuration} min</span>
          {totalDistance > 0 && totalDuration > 0 && (
            <> &middot; Avg pace: <span className="font-bold text-foreground">{formatPace(totalDuration / totalDistance)}</span> /mi</>
          )}
        </div>
      )}

      {segments.map((seg, i) => (
        <Card key={i}>
          <CardContent className="pt-4 space-y-3">
            {/* Segment header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {segments.length > 1 ? `Segment ${i + 1}` : 'Run'}
              </span>
              {segments.length > 1 && (
                <button type="button" onClick={() => removeSegment(i)} className="p-1 text-muted-foreground hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Type */}
            <div className="flex flex-wrap gap-2">
              {runTypes.map(rt => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => updateSegment(i, { runType: rt.value })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                    seg.runType === rt.value ? 'bg-orange-600 text-white' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {rt.label}
                </button>
              ))}
            </div>

            {/* Distance & Duration */}
            <div className="flex justify-around">
              <Stepper value={seg.distance} onChange={(v) => updateSegment(i, { distance: v })} step={0.1} min={0} unit="mi" label="Distance" />
              <Stepper value={seg.duration} onChange={(v) => updateSegment(i, { duration: v })} step={0.5} min={0} unit="min" label="Duration" />
            </div>
            {seg.distance > 0 && seg.duration > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                Pace: <span className="font-bold text-foreground">{formatPace(seg.duration / seg.distance)}</span> /mi
              </div>
            )}

            {/* Feel */}
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">How did it feel?</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateSegment(i, { feel: n })}
                    className={cn(
                      'w-10 h-10 rounded-full text-sm font-bold transition-colors touch-manipulation',
                      seg.feel === n ? 'bg-orange-600 text-white' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Route */}
            <div>
              <Label className="text-sm text-muted-foreground">Route (optional)</Label>
              <Input
                value={seg.route}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSegment(i, { route: e.target.value })}
                placeholder="e.g., Outer Sunset to fitLOCALfit"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add segment */}
      <button
        type="button"
        onClick={addSegment}
        className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Run Segment
      </button>

      {/* Save (standalone only) */}
      {!embedded && (
        <Button className="w-full h-12 text-base" onClick={handleSave}>
          Save Run
        </Button>
      )}

      {/* For embedded mode, expose save via a hidden mechanism — parent will call handleFinish which saves exercise sets,
           but run data needs to be saved too. We'll save on every change instead. */}
      {embedded && <RunAutoSaver segments={segments} workoutId={workoutId} />}
    </div>
  )
}

/** Saves run segments to DB whenever they change (for embedded mode in custom workouts) */
function RunAutoSaver({ segments, workoutId }: { segments: RunSegment[]; workoutId: number }) {
  useEffect(() => {
    const timeout = setTimeout(async () => {
      await db.runDetails.where('workoutId').equals(workoutId).delete()
      for (const seg of segments) {
        if (seg.distance === 0 && seg.duration === 0) continue
        const pace = seg.distance > 0 && seg.duration > 0 ? seg.duration / seg.distance : 0
        await db.runDetails.add({
          workoutId,
          distanceMiles: seg.distance,
          durationMinutes: seg.duration,
          pacePerMile: pace > 0 ? Math.round(pace * 60) : undefined,
          runType: seg.runType,
          route: seg.route || undefined,
          feelScale: seg.feel,
        })
      }
    }, 500) // debounce

    return () => clearTimeout(timeout)
  }, [segments, workoutId])

  return null
}
