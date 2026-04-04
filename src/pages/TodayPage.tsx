import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { Dumbbell, Footprints, Timer, Heart, ClipboardCheck, Waves, Shuffle, Play, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import { getTodaySchedule, getCurrentWeekPlan, getDaysUntilRace, getCurrentWeekNumber } from '@/data/training-plan'
import type { WorkoutType } from '@/db'

const today = format(new Date(), 'yyyy-MM-dd')

const workoutIcons: Record<string, typeof Dumbbell> = {
  'strength-a': Dumbbell,
  'strength-b': Dumbbell,
  'prehab': Heart,
  'run': Footprints,
  'row': Waves,
  'yoga-mobility': Timer,
  'custom': Shuffle,
}

const quickActions: { label: string; type: WorkoutType; color: string }[] = [
  { label: 'Strength A', type: 'strength-a', color: 'bg-blue-600' },
  { label: 'Strength B', type: 'strength-b', color: 'bg-blue-500' },
  { label: 'Prehab', type: 'prehab', color: 'bg-emerald-600' },
  { label: 'Run', type: 'run', color: 'bg-orange-600' },
  { label: 'Row', type: 'row', color: 'bg-cyan-600' },
  { label: 'Yoga / Mobility', type: 'yoga-mobility', color: 'bg-purple-600' },
  { label: 'Custom', type: 'custom', color: 'bg-zinc-600' },
]

export function TodayPage() {
  const navigate = useNavigate()
  const schedule = getTodaySchedule()
  const weekPlan = getCurrentWeekPlan()
  const daysUntilRace = getDaysUntilRace()
  const weekNumber = getCurrentWeekNumber()

  const todayWorkouts = useLiveQuery(
    () => db.workouts.where('date').equals(today).toArray(),
    []
  )

  const workoutPlans = useLiveQuery(
    () => db.workoutPlans.orderBy('createdAt').reverse().toArray(),
    []
  )

  const todayCheckIn = useLiveQuery(
    () => db.dailyCheckIns.where('date').equals(today).first(),
    []
  )

  const dayName = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{dayName}</h1>
          <p className="text-muted-foreground text-sm">
            Week {weekNumber} &middot; {weekPlan.phaseName}
            {weekPlan.isDownWeek && <Badge variant="secondary" className="ml-2">Down Week</Badge>}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-500">{daysUntilRace}</div>
          <div className="text-xs text-muted-foreground">days to race</div>
        </div>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Today's Schedule</h2>
          <div className="space-y-1">
            {schedule.sessions.map((session, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-sm">{session}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Log Workout</h2>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <Button
              key={action.type}
              variant="outline"
              className="h-14 justify-start gap-3 text-base"
              onClick={() => navigate(`/workout/new/${action.type}`)}
            >
              <div className={`w-8 h-8 rounded-md ${action.color} flex items-center justify-center`}>
                {(() => {
                  const Icon = workoutIcons[action.type] || Dumbbell
                  return <Icon className="w-4 h-4 text-white" />
                })()}
              </div>
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Saved Workout Plans */}
      {workoutPlans && workoutPlans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Workout Plans</h2>
            <button onClick={() => navigate('/plans')} className="text-xs text-muted-foreground underline">
              Manage
            </button>
          </div>
          <div className="space-y-2">
            {workoutPlans.slice(0, 3).map(plan => (
              <Card key={plan.id} className="cursor-pointer" onClick={() => navigate('/plans')}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium text-sm">{plan.name}</span>
                      <div className="text-xs text-muted-foreground">
                        {plan.sections.length} sections &middot; {plan.sections.reduce((s, sec) => s + sec.exercises.length, 0)} exercises
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={async (e) => {
                      e.stopPropagation()
                      const now = new Date()
                      const workoutId = await db.workouts.add({
                        date: format(now, 'yyyy-MM-dd'),
                        type: 'custom',
                        startedAt: now.toISOString(),
                        notes: `Plan: ${plan.name}`,
                        planId: plan.id,
                      })
                      for (const section of plan.sections) {
                        for (const ex of section.exercises) {
                          for (let s = 0; s < ex.targetSets; s++) {
                            await db.exerciseSets.add({
                              workoutId: workoutId as number,
                              exerciseId: ex.exerciseId,
                              setNumber: s + 1,
                              weight: ex.targetWeight,
                              weightUnit: 'lbs',
                              reps: ex.targetReps,
                              duration: ex.targetDuration,
                              completed: false,
                            })
                          }
                        }
                      }
                      navigate(`/workout/${workoutId}`)
                    }}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {workoutPlans.length > 3 && (
            <button onClick={() => navigate('/plans')} className="text-xs text-muted-foreground underline mt-1">
              View all {workoutPlans.length} plans
            </button>
          )}
        </div>
      )}

      {/* Create Plan shortcut */}
      <Button variant="outline" className="w-full" onClick={() => navigate('/plans/new')}>
        <FileText className="w-4 h-4 mr-2" />
        Create Workout Plan
      </Button>

      {/* Daily Check-In */}
      <Button
        variant={todayCheckIn ? 'secondary' : 'default'}
        className="w-full h-12 text-base"
        onClick={() => navigate('/checkin')}
      >
        <ClipboardCheck className="w-5 h-5 mr-2" />
        {todayCheckIn ? 'Edit Check-In' : 'Daily Check-In'}
      </Button>

      {/* Today's Logged Workouts */}
      {todayWorkouts && todayWorkouts.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed Today</h2>
            <div className="space-y-2">
              {todayWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between py-1 cursor-pointer"
                  onClick={() => navigate(`/workout/${w.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{w.type.replace('-', ' ')}</Badge>
                    {w.completedAt && <span className="text-xs text-muted-foreground">
                      {format(new Date(w.completedAt), 'h:mm a')}
                    </span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Week Summary */}
      <Card>
        <CardContent className="pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">This Week</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Target mileage:</span>
              <span className="ml-1 font-medium">{weekPlan.weeklyMileage} mi</span>
            </div>
            <div>
              <span className="text-muted-foreground">Long run:</span>
              <span className="ml-1 font-medium">{weekPlan.longRunMiles} mi</span>
            </div>
            <div>
              <span className="text-muted-foreground">Run days:</span>
              <span className="ml-1 font-medium">{weekPlan.runDays}</span>
            </div>
          </div>
          {weekPlan.notes && (
            <p className="text-xs text-muted-foreground mt-2 italic">{weekPlan.notes}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
