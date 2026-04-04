import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Stepper } from './Stepper'
import { db } from '@/db'

interface RowFormProps {
  workoutId: number
  onFinish: () => void
}

export function RowForm({ workoutId, onFinish }: RowFormProps) {
  const [duration, setDuration] = useState(20)
  const [distance, setDistance] = useState<number>(0)
  const [heartRate, setHeartRate] = useState<number>(0)
  const [strokeRate, setStrokeRate] = useState<number>(0)

  const existing = useLiveQuery(() => db.rowDetails.where('workoutId').equals(workoutId).first(), [workoutId])

  useEffect(() => {
    if (existing) {
      setDuration(existing.durationMinutes)
      setDistance(existing.distanceMeters || 0)
      setHeartRate(existing.avgHeartRate || 0)
      setStrokeRate(existing.strokeRate || 0)
    }
  }, [existing])

  async function handleSave() {
    const data = {
      workoutId,
      durationMinutes: duration,
      distanceMeters: distance || undefined,
      avgHeartRate: heartRate || undefined,
      strokeRate: strokeRate || undefined,
    }

    if (existing?.id) {
      await db.rowDetails.update(existing.id, data)
    } else {
      await db.rowDetails.add(data)
    }
    onFinish()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-around">
            <Stepper value={duration} onChange={setDuration} step={1} min={1} unit="min" label="Duration" />
            <Stepper value={distance} onChange={setDistance} step={100} min={0} unit="m" label="Distance" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Optional</Label>
          <div className="flex justify-around">
            <Stepper value={heartRate} onChange={setHeartRate} step={1} min={0} unit="bpm" label="Avg HR" size="sm" />
            <Stepper value={strokeRate} onChange={setStrokeRate} step={1} min={0} unit="spm" label="Stroke Rate" size="sm" />
          </div>
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSave}>
        Save Row
      </Button>
    </div>
  )
}
