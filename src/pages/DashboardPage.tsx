import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import { getCurrentWeekNumber } from '@/data/training-plan'

export function DashboardPage() {
  const [weekOffset, setWeekOffset] = useState(0)

  const now = new Date()
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 })
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(weekEnd, 'yyyy-MM-dd')

  const workouts = useLiveQuery(
    () => db.workouts.where('date').between(startStr, endStr, true, true).toArray(),
    [startStr, endStr]
  )

  const checkIns = useLiveQuery(
    () => db.dailyCheckIns.where('date').between(startStr, endStr, true, true).toArray(),
    [startStr, endStr]
  )

  const runDetails = useLiveQuery(async () => {
    if (!workouts) return []
    // Check all workouts for run details (run type + custom workouts can both have runs)
    const allDetails = await Promise.all(
      workouts.map(w => db.runDetails.where('workoutId').equals(w.id!).toArray())
    )
    return allDetails.flat()
  }, [workouts])

  const meals = useLiveQuery(
    () => db.mealLogs.where('date').between(startStr, endStr, true, true).toArray(),
    [startStr, endStr]
  )

  if (!workouts || !checkIns) {
    return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>
  }

  const strengthCount = workouts.filter(w => w.type === 'strength-a' || w.type === 'strength-b').length
  const prehabCount = workouts.filter(w => w.type === 'prehab').length
  const mobilityCount = workouts.filter(w => w.type === 'yoga-mobility').length
  const rowCount = workouts.filter(w => w.type === 'row').length
  const runCount = workouts.filter(w => w.type === 'run' || w.type === 'custom').length

  const totalMiles = runDetails?.reduce((sum, r) => sum + (r.distanceMiles || 0), 0) || 0
  const longRunMiles = runDetails?.length
    ? Math.max(...runDetails.map(r => r.distanceMiles || 0))
    : 0

  const avgSleep = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + c.sleepHours, 0) / checkIns.length
    : 0
  const avgEnergy = checkIns.length > 0
    ? checkIns.reduce((sum, c) => sum + c.energyLevel, 0) / checkIns.length
    : 0

  const symptoms = checkIns.flatMap(c => c.bodyStatus || [])
  const uniqueSymptoms = [...new Set(symptoms.map(s => s.area))]

  // Nutrition
  const daysWithMeals = meals ? [...new Set(meals.map(m => m.date))].length : 0
  const avgCalories = daysWithMeals > 0
    ? Math.round(meals!.reduce((sum, m) => sum + (m.calories || 0), 0) / daysWithMeals)
    : 0
  const avgProtein = daysWithMeals > 0
    ? Math.round(meals!.reduce((sum, m) => sum + (m.proteinG || 0), 0) / daysWithMeals)
    : 0

  const microDays = checkIns.length
  const ironDays = checkIns.filter(c => c.microIron).length
  const b12Days = checkIns.filter(c => c.microB12).length
  const calciumDays = checkIns.filter(c => c.microCalcium).length
  const vitDDays = checkIns.filter(c => c.microVitaminD).length

  return (
    <div className="p-4 space-y-4">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold">Weekly Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-muted-foreground">Week {getCurrentWeekNumber() + weekOffset}</p>
        </div>
        <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} className="p-2"
          disabled={weekOffset >= 0}>
          <ChevronRight className={`w-5 h-5 ${weekOffset >= 0 ? 'opacity-30' : ''}`} />
        </button>
      </div>

      {/* Running */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Running</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalMiles.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Total Miles</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{longRunMiles.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Long Run</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{runCount}</div>
              <div className="text-xs text-muted-foreground">Runs</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Counts */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sessions</h2>
          <SessionRow label="Strength" count={strengthCount} target={2} />
          <SessionRow label="Prehab" count={prehabCount} target={3} />
          <SessionRow label="Mobility / Yoga" count={mobilityCount} target={3} />
          <SessionRow label="Rowing" count={rowCount} target={1} />
        </CardContent>
      </Card>

      {/* Nutrition */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Nutrition (daily avg)</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{avgCalories}</div>
              <div className="text-xs text-muted-foreground">Calories / 2800</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{avgProtein}g</div>
              <div className="text-xs text-muted-foreground">Protein / 140g</div>
            </div>
          </div>
          {microDays > 0 && (
            <div className="mt-3 flex justify-center gap-3 text-xs">
              <span>Iron {ironDays}/{microDays}</span>
              <span>B12 {b12Days}/{microDays}</span>
              <span>Ca {calciumDays}/{microDays}</span>
              <span>D {vitDDays}/{microDays}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wellness */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Wellness</h2>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{avgSleep.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Sleep (hrs)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{avgEnergy.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg Energy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptoms */}
      {uniqueSymptoms.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Symptoms This Week</h2>
            <div className="flex flex-wrap gap-1">
              {uniqueSymptoms.map(area => {
                const entries = symptoms.filter(s => s.area === area)
                const worst = entries.some(e => e.severity === 'severe')
                  ? 'severe'
                  : entries.some(e => e.severity === 'moderate')
                    ? 'moderate'
                    : 'mild'
                return (
                  <Badge
                    key={area}
                    variant="secondary"
                    className={worst === 'severe' ? 'bg-red-600 text-white' : worst === 'moderate' ? 'bg-orange-600 text-white' : 'bg-yellow-600 text-white'}
                  >
                    {area.replace(/-/g, ' ')} ({entries.length}x)
                  </Badge>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SessionRow({ label, count, target }: { label: string; count: number; target: number }) {
  const pct = Math.min(100, (count / target) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{count} / {target}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}
