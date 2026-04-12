import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Stepper } from '@/components/workout/Stepper'
import { BodyStatusPicker } from '@/components/checkin/BodyStatusPicker'
import { MealLogger } from '@/components/checkin/MealLogger'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import { syncToCloud } from '@/lib/sync'
import type { BodyAreaStatus } from '@/db'

const today = format(new Date(), 'yyyy-MM-dd')

export function CheckInPage() {
  const navigate = useNavigate()

  const existing = useLiveQuery(() => db.dailyCheckIns.where('date').equals(today).first(), [])

  const [sleepHours, setSleepHours] = useState(7)
  const [sleepQuality, setSleepQuality] = useState(3)
  const [energyLevel, setEnergyLevel] = useState(3)
  const [bodyStatus, setBodyStatus] = useState<BodyAreaStatus[]>([])
  const [hydration, setHydration] = useState(64)
  const [microIron, setMicroIron] = useState(false)
  const [microB12, setMicroB12] = useState(false)
  const [microCalcium, setMicroCalcium] = useState(false)
  const [microVitaminD, setMicroVitaminD] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (existing) {
      setSleepHours(existing.sleepHours)
      setSleepQuality(existing.sleepQuality)
      setEnergyLevel(existing.energyLevel)
      setBodyStatus(existing.bodyStatus)
      setHydration(existing.hydrationOz)
      setMicroIron(existing.microIron)
      setMicroB12(existing.microB12)
      setMicroCalcium(existing.microCalcium)
      setMicroVitaminD(existing.microVitaminD)
      setNotes(existing.notes || '')
    }
  }, [existing])

  async function handleSave() {
    const data = {
      date: today,
      sleepHours,
      sleepQuality,
      energyLevel,
      bodyStatus,
      hydrationOz: hydration,
      microIron,
      microB12,
      microCalcium,
      microVitaminD,
      notes: notes || undefined,
    }

    if (existing?.id) {
      await db.dailyCheckIns.update(existing.id, data)
    } else {
      await db.dailyCheckIns.add(data)
    }

    // Fire-and-forget cloud sync
    syncToCloud().catch(() => {})

    navigate('/')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Daily Check-In</h1>
        <Button size="sm" onClick={handleSave}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      {/* Sleep */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-3 block">Sleep</Label>
          <div className="flex justify-around items-end">
            <Stepper value={sleepHours} onChange={setSleepHours} step={0.5} min={0} max={14} unit="hrs" label="Hours" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground">Quality</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSleepQuality(n)}
                    className={cn(
                      'w-10 h-10 rounded-full text-sm font-bold transition-colors touch-manipulation',
                      sleepQuality === n ? 'bg-blue-600 text-white' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Energy */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Energy Level</Label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setEnergyLevel(n)}
                className={cn(
                  'w-12 h-12 rounded-full text-lg font-bold transition-colors touch-manipulation',
                  energyLevel === n ? 'bg-yellow-600 text-white' : 'bg-secondary text-muted-foreground'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-2">
            <span>Exhausted</span>
            <span>Energized</span>
          </div>
        </CardContent>
      </Card>

      {/* Body Status */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Body Status</Label>
          <BodyStatusPicker value={bodyStatus} onChange={setBodyStatus} />
        </CardContent>
      </Card>

      {/* Nutrition - Meal Logger */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-2 block">Nutrition</Label>
          <MealLogger date={today} />

          {/* Micronutrient Toggles */}
          <div className="mt-4">
            <span className="text-xs text-muted-foreground block mb-2">Micronutrients today?</span>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'iron', label: 'Iron', value: microIron, set: setMicroIron },
                { key: 'b12', label: 'B12', value: microB12, set: setMicroB12 },
                { key: 'calcium', label: 'Calcium', value: microCalcium, set: setMicroCalcium },
                { key: 'vitd', label: 'Vit D', value: microVitaminD, set: setMicroVitaminD },
              ].map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => m.set(!m.value)}
                  className={cn(
                    'px-3 py-2 rounded-full text-sm font-medium transition-colors touch-manipulation',
                    m.value ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {m.value ? '✓ ' : ''}{m.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hydration */}
      <Card>
        <CardContent className="pt-4 flex justify-center">
          <Stepper value={hydration} onChange={setHydration} step={8} min={0} unit="oz" label="Hydration" />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm text-muted-foreground mb-1 block">Notes</Label>
          <Textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Missed prehab, felt great on the run, left glute DOMS..."
            rows={3}
          />
        </CardContent>
      </Card>

      <Button className="w-full h-12 text-base" onClick={handleSave}>
        <Save className="w-5 h-5 mr-2" />
        Save Check-In
      </Button>
    </div>
  )
}
