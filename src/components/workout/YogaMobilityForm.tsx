import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Stepper } from './Stepper'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import type { MobilityType, MobilityLocation } from '@/db'

interface YogaMobilityFormProps {
  workoutId: number
  onFinish: () => void
}

const types: { value: MobilityType; label: string }[] = [
  { value: 'daily', label: 'Daily Mobility (15 min)' },
  { value: 'extended-monday', label: 'Extended Monday Flow' },
  { value: 'yoga-class', label: 'Yoga Class' },
]

const locations: { value: MobilityLocation; label: string }[] = [
  { value: 'home', label: 'Home' },
  { value: 'yogabeach-sf', label: 'YogaBeach SF' },
  { value: 'ocean-beach-yoga', label: 'Ocean Beach Yoga' },
  { value: 'fitlocalfit', label: 'fitLOCALfit' },
]

export function YogaMobilityForm({ workoutId, onFinish }: YogaMobilityFormProps) {
  const [duration, setDuration] = useState(15)
  const [mobilityType, setMobilityType] = useState<MobilityType>('daily')
  const [location, setLocation] = useState<MobilityLocation>('home')

  const existing = useLiveQuery(() => db.yogaMobilityDetails.where('workoutId').equals(workoutId).first(), [workoutId])

  useEffect(() => {
    if (existing) {
      setDuration(existing.durationMinutes)
      setMobilityType(existing.mobilityType)
      if (existing.location) setLocation(existing.location)
    }
  }, [existing])

  async function handleSave() {
    const data = {
      workoutId,
      durationMinutes: duration,
      mobilityType,
      location,
    }

    if (existing?.id) {
      await db.yogaMobilityDetails.update(existing.id, data)
    } else {
      await db.yogaMobilityDetails.add(data)
    }
    onFinish()
  }

  return (
    <div className="space-y-4">
      {/* Type */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Type</Label>
          <div className="space-y-2">
            {types.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setMobilityType(t.value)
                  if (t.value === 'daily') setDuration(15)
                  if (t.value === 'extended-monday') setDuration(35)
                  if (t.value === 'yoga-class') setDuration(60)
                }}
                className={cn(
                  'w-full px-4 py-3 rounded-lg text-sm font-medium text-left transition-colors touch-manipulation',
                  mobilityType === t.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card>
        <CardContent className="pt-4 flex justify-center">
          <Stepper value={duration} onChange={setDuration} step={5} min={5} unit="min" label="Duration" />
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Location</Label>
          <div className="flex flex-wrap gap-2">
            {locations.map(l => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLocation(l.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                  location === l.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSave}>
        Save Session
      </Button>
    </div>
  )
}
