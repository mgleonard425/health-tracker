import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Stepper } from './Stepper'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import type { RunType } from '@/db'

interface RunFormProps {
  workoutId: number
  onFinish: () => void
}

const runTypes: { value: RunType; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'long', label: 'Long Run' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'strides', label: 'Strides' },
  { value: 'marathon-pace', label: 'Marathon Pace' },
  { value: 'fartlek', label: 'Fartlek' },
]

export function RunForm({ workoutId, onFinish }: RunFormProps) {
  const [distance, setDistance] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [runType, setRunType] = useState<RunType>('easy')
  const [route, setRoute] = useState('')
  const [feel, setFeel] = useState(3)
  const [notes, setNotes] = useState('')

  const existing = useLiveQuery(() => db.runDetails.where('workoutId').equals(workoutId).first(), [workoutId])

  useEffect(() => {
    if (existing) {
      setDistance(existing.distanceMiles)
      setDuration(existing.durationMinutes)
      setRunType(existing.runType)
      setRoute(existing.route || '')
      setFeel(existing.feelScale)
    }
  }, [existing])

  const pace = distance > 0 && duration > 0
    ? duration / distance
    : 0

  const formatPace = (minutesPerMile: number) => {
    const mins = Math.floor(minutesPerMile)
    const secs = Math.round((minutesPerMile - mins) * 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  async function handleSave() {
    const data = {
      workoutId,
      distanceMiles: distance,
      durationMinutes: duration,
      pacePerMile: pace > 0 ? Math.round(pace * 60) : undefined,
      runType,
      route: route || undefined,
      feelScale: feel,
    }

    if (existing?.id) {
      await db.runDetails.update(existing.id, data)
    } else {
      await db.runDetails.add(data)
    }
    onFinish()
  }

  return (
    <div className="space-y-4">
      {/* Run Type */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Type</Label>
          <div className="flex flex-wrap gap-2">
            {runTypes.map(rt => (
              <button
                key={rt.value}
                type="button"
                onClick={() => setRunType(rt.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  runType === rt.value
                    ? 'bg-orange-600 text-white'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {rt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distance & Duration */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-around">
            <Stepper
              value={distance}
              onChange={setDistance}
              step={0.5}
              min={0}
              unit="mi"
              label="Distance"
            />
            <Stepper
              value={duration}
              onChange={setDuration}
              step={1}
              min={0}
              unit="min"
              label="Duration"
            />
          </div>
          {pace > 0 && (
            <div className="text-center mt-3 text-sm text-muted-foreground">
              Pace: <span className="font-bold text-foreground">{formatPace(pace)}</span> /mi
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feel */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">How did it feel?</Label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setFeel(n)}
                className={cn(
                  'w-12 h-12 rounded-full text-lg font-bold transition-colors touch-manipulation',
                  feel === n
                    ? 'bg-orange-600 text-white'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
            <span>Terrible</span>
            <span>Amazing</span>
          </div>
        </CardContent>
      </Card>

      {/* Route & Notes */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <Label className="text-sm text-muted-foreground">Route (optional)</Label>
            <Input
              value={route}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoute(e.target.value)}
              placeholder="e.g., Golden Gate Park loop"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="IT band felt tight at mile 3..."
              rows={2}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSave}>
        Save Run
      </Button>
    </div>
  )
}
