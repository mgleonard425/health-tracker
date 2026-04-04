import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format } from 'date-fns'
import { ArrowLeft, Plus, Play, Edit, Trash2, Dumbbell, Footprints, Waves } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import type { WorkoutPlan } from '@/db'

export function WorkoutPlansPage() {
  const navigate = useNavigate()
  const plans = useLiveQuery(() => db.workoutPlans.orderBy('createdAt').reverse().toArray(), [])

  async function handleStartPlan(plan: WorkoutPlan) {
    const now = new Date()
    const workoutId = await db.workouts.add({
      date: format(now, 'yyyy-MM-dd'),
      type: 'custom',
      startedAt: now.toISOString(),
      notes: `Plan: ${plan.name}`,
      planId: plan.id,
    })

    // Pre-populate exercise sets from all sections
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
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this workout plan?')) return
    await db.workoutPlans.delete(id)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Workout Plans</h1>
        <Button size="sm" onClick={() => navigate('/plans/new')}>
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 space-y-3">
          <p>No workout plans yet.</p>
          <p className="text-sm">Create a plan ahead of time so you can just tap Start at the gym.</p>
          <Button onClick={() => navigate('/plans/new')}>
            <Plus className="w-4 h-4 mr-1" />
            Create Plan
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const totalExercises = plan.sections.reduce((sum, s) => sum + s.exercises.length, 0)
            const hasRun = plan.sections.some(s => s.type === 'run')
            const hasRow = plan.sections.some(s => s.type === 'row')
            return (
              <Card key={plan.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm">{plan.name}</h3>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {plan.sections.length} sections
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <Dumbbell className="w-3 h-3 mr-1" />
                          {totalExercises} exercises
                        </Badge>
                        {hasRun && (
                          <Badge variant="secondary" className="text-xs">
                            <Footprints className="w-3 h-3 mr-1" />Run
                          </Badge>
                        )}
                        {hasRow && (
                          <Badge variant="secondary" className="text-xs">
                            <Waves className="w-3 h-3 mr-1" />Row
                          </Badge>
                        )}
                      </div>
                      {/* Section preview */}
                      <div className="text-xs text-muted-foreground mt-1">
                        {plan.sections.map(s => s.name || s.type).join(' → ')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(plan.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button size="sm" onClick={() => handleStartPlan(plan)} className="bg-emerald-600 hover:bg-emerald-700">
                        <Play className="w-4 h-4 mr-1" />Start
                      </Button>
                      <button type="button" onClick={() => navigate(`/plans/edit/${plan.id}`)}
                        className="p-2 text-muted-foreground hover:text-foreground">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(plan.id!)}
                        className="p-2 text-muted-foreground hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
