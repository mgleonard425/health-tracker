import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Clock, Trash2, Watch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ExerciseCard } from '@/components/workout/ExerciseCard'
import { ExercisePicker } from '@/components/workout/ExercisePicker'
import { RunForm } from '@/components/workout/RunForm'
import { RowForm } from '@/components/workout/RowForm'
import { YogaMobilityForm } from '@/components/workout/YogaMobilityForm'
import { db, getLastWorkoutOfType, getExerciseSetsForWorkout } from '@/db'
import { getExercisesForWorkoutType, strengthAExercises, strengthBExercises, prehabExercises } from '@/data/workout-templates'
import type { ExerciseTemplate } from '@/data/workout-templates'
import type { ExerciseSet, BandResistance } from '@/db'

interface SetData {
  weight?: number
  reps?: number
  duration?: number
  bandResistance?: BandResistance
  completed: boolean
  notes?: string
}

type ExerciseSetsMap = Record<string, SetData[]>

const workoutLabels: Record<string, string> = {
  'strength-a': 'Strength A (Upper + Core)',
  'strength-b': 'Strength B (Lower + Prehab)',
  'prehab': 'IT Band Prehab Circuit',
  'run': 'Run',
  'row': 'Row',
  'yoga-mobility': 'Yoga / Mobility',
  'custom': 'Custom Workout',
}

const allExerciseTemplates = [...strengthAExercises, ...strengthBExercises, ...prehabExercises]

export function WorkoutActivePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const workoutId = Number(id)

  const workout = useLiveQuery(() => db.workouts.get(workoutId), [workoutId])
  const [exerciseSets, setExerciseSets] = useState<ExerciseSetsMap>({})
  const [lastSessionData, setLastSessionData] = useState<Record<string, ExerciseSet[]>>({})
  const [initialized, setInitialized] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Custom workout state
  const [customExercises, setCustomExercises] = useState<ExerciseTemplate[]>([])
  const [customSelectedIds, setCustomSelectedIds] = useState<Set<string>>(new Set())
  const [includeRun, setIncludeRun] = useState(false)
  const [includeRow, setIncludeRow] = useState(false)
  const [buildPhase, setBuildPhase] = useState(true) // true = picking exercises, false = logging

  // Plan data
  const [coachingNotes, setCoachingNotes] = useState<Record<string, string>>({})
  const [planGeneralNotes, setPlanGeneralNotes] = useState<string>('')
  const [planSections, setPlanSections] = useState<{ name: string; type: string; exerciseIds: string[]; notes?: string }[]>([])
  const hasPlanSections = planSections.length > 0

  // Watch metrics for this workout
  const watchMetrics = useLiveQuery(
    () => workout?.id ? db.watchMetrics.where('workoutId').equals(workout.id).toArray() : [],
    [workout?.id]
  )

  const isCustom = workout?.type === 'custom'
  const exercises = isCustom ? customExercises : (workout ? getExercisesForWorkoutType(workout.type) : [])
  const isPrehab = workout?.type === 'prehab'
  const isStrength = workout?.type === 'strength-a' || workout?.type === 'strength-b'
  const isExerciseBased = isStrength || isPrehab || (isCustom && !buildPhase)

  // Timer
  useEffect(() => {
    if (!workout?.startedAt || workout.completedAt) return
    const start = new Date(workout.startedAt).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [workout?.startedAt, workout?.completedAt])

  // Initialize sets from template + last session data (non-custom workouts)
  useEffect(() => {
    if (!workout || initialized || isCustom) return
    if (exercises.length === 0) return
    const workoutType = workout.type

    async function init() {
      const existingSets = await getExerciseSetsForWorkout(workoutId)
      if (existingSets.length > 0) {
        const map: ExerciseSetsMap = {}
        for (const ex of exercises) {
          const saved = existingSets.filter(s => s.exerciseId === ex.id)
          map[ex.id] = saved.map(s => ({
            weight: s.weight,
            reps: s.reps,
            duration: s.duration,
            bandResistance: s.bandResistance,
            completed: s.completed,
            notes: s.notes,
          }))
          if (map[ex.id].length === 0) {
            map[ex.id] = createDefaultSets(ex)
          }
        }
        setExerciseSets(map)
        setInitialized(true)
        return
      }

      const lastWorkout = await getLastWorkoutOfType(workoutType)
      const lastSets: Record<string, ExerciseSet[]> = {}

      if (lastWorkout?.id && lastWorkout.id !== workoutId) {
        const allLastSets = await getExerciseSetsForWorkout(lastWorkout.id)
        for (const ex of exercises) {
          lastSets[ex.id] = allLastSets.filter(s => s.exerciseId === ex.id)
        }
      }
      setLastSessionData(lastSets)

      const map: ExerciseSetsMap = {}
      for (const ex of exercises) {
        const last = lastSets[ex.id]
        if (last && last.length > 0) {
          map[ex.id] = last.map(s => ({
            weight: s.weight,
            reps: s.reps,
            duration: s.duration,
            bandResistance: s.bandResistance,
            completed: false,
            notes: undefined,
          }))
        } else {
          map[ex.id] = createDefaultSets(ex)
        }
      }
      setExerciseSets(map)
      setInitialized(true)
    }

    init()
  }, [workout, workoutId, initialized, exercises, isCustom])

  // Initialize custom workout from saved sets (re-opening a completed custom workout)
  useEffect(() => {
    if (!workout || !isCustom || initialized) return
    const currentPlanId = workout.planId

    async function initCustom() {
      // Load plan coaching notes if started from a plan
      if (currentPlanId) {
        const plan = await db.workoutPlans.get(currentPlanId)
        if (plan && plan.sections) {
          // Build coaching notes, sections, and exercise list from plan sections
          const notes: Record<string, string> = {}
          const allPlanExercises: ExerciseTemplate[] = []
          const sectionData: typeof planSections = []
          let hasRun = false
          let hasRow = false

          for (const section of plan.sections) {
            const sectionExIds: string[] = []
            for (const pe of section.exercises) {
              if (pe.coachingNotes) notes[pe.exerciseId] = pe.coachingNotes
              sectionExIds.push(pe.exerciseId)
              const template = allExerciseTemplates.find(t => t.id === pe.exerciseId)
              allPlanExercises.push(template || {
                id: pe.exerciseId,
                name: pe.name,
                defaultSets: pe.targetSets,
                defaultReps: pe.targetReps,
                defaultDuration: pe.targetDuration,
                weightUnit: 'lbs' as const,
                hasBandResistance: pe.hasBandResistance,
              })
            }
            sectionData.push({ name: section.name, type: section.type, exerciseIds: sectionExIds, notes: section.notes })
            if (section.type === 'run') hasRun = true
            if (section.type === 'row') hasRow = true
          }

          setCoachingNotes(notes)
          setPlanSections(sectionData)
          if (plan.generalNotes) setPlanGeneralNotes(plan.generalNotes)
          setIncludeRun(hasRun)
          setIncludeRow(hasRow)

          const planExercises = allPlanExercises

          // Check for existing sets (already saved from plan start)
          const existingSets = await getExerciseSetsForWorkout(workoutId)
          if (existingSets.length > 0) {
            const map: ExerciseSetsMap = {}
            for (const ex of planExercises) {
              const saved = existingSets.filter(s => s.exerciseId === ex.id)
              map[ex.id] = saved.length > 0
                ? saved.map(s => ({
                    weight: s.weight,
                    reps: s.reps,
                    duration: s.duration,
                    bandResistance: s.bandResistance,
                    completed: s.completed,
                    notes: s.notes,
                  }))
                : createDefaultSets(ex)
            }
            setExerciseSets(map)
          }

          setCustomExercises(planExercises)
          setCustomSelectedIds(new Set(planExercises.map(e => e.id)))
          setBuildPhase(false)
          setInitialized(true)
          return
        }
      }

      const existingSets = await getExerciseSetsForWorkout(workoutId)
      if (existingSets.length > 0) {
        // Rebuild the exercise list from saved data
        const savedIds = new Set(existingSets.map(s => s.exerciseId))
        const selectedExercises = allExerciseTemplates.filter(e => savedIds.has(e.id))
        setCustomExercises(selectedExercises)
        setCustomSelectedIds(savedIds)

        const map: ExerciseSetsMap = {}
        for (const ex of selectedExercises) {
          const saved = existingSets.filter(s => s.exerciseId === ex.id)
          map[ex.id] = saved.map(s => ({
            weight: s.weight,
            reps: s.reps,
            duration: s.duration,
            bandResistance: s.bandResistance,
            completed: s.completed,
            notes: s.notes,
          }))
        }
        setExerciseSets(map)
        setBuildPhase(false)

        // Check if run/row were included
        const hasRun = await db.runDetails.where('workoutId').equals(workoutId).count()
        const hasRow = await db.rowDetails.where('workoutId').equals(workoutId).count()
        setIncludeRun(hasRun > 0)
        setIncludeRow(hasRow > 0)
      }
      setInitialized(true)
    }

    initCustom()
  }, [workout, workoutId, isCustom, initialized])

  function createDefaultSets(ex: { defaultSets: number; defaultWeight?: number; defaultReps?: number; defaultDuration?: number }) {
    return Array.from({ length: ex.defaultSets }, () => ({
      weight: ex.defaultWeight,
      reps: ex.defaultReps,
      duration: ex.defaultDuration,
      completed: false,
    }))
  }

  // Custom workout: toggle exercise
  function handleToggleExercise(exercise: ExerciseTemplate) {
    setCustomSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(exercise.id)) {
        next.delete(exercise.id)
        setCustomExercises(exs => exs.filter(e => e.id !== exercise.id))
      } else {
        next.add(exercise.id)
        setCustomExercises(exs => [...exs, exercise])
      }
      return next
    })
  }

  // Custom workout: add a freeform exercise
  function handleAddCustomExercise(exercise: ExerciseTemplate) {
    setCustomSelectedIds(prev => new Set([...prev, exercise.id]))
    setCustomExercises(exs => [...exs, exercise])
  }

  // Custom workout: transition from build to log phase
  async function handleStartCustom() {
    // Initialize sets for selected exercises, loading last-session data
    const map: ExerciseSetsMap = {}
    const lastSets: Record<string, ExerciseSet[]> = {}

    // Try to find last session data from the last custom workout
    const lastCustom = await getLastWorkoutOfType('custom')
    if (lastCustom?.id && lastCustom.id !== workoutId) {
      const allLastSets = await getExerciseSetsForWorkout(lastCustom.id)
      for (const ex of customExercises) {
        lastSets[ex.id] = allLastSets.filter(s => s.exerciseId === ex.id)
      }
    }

    // Also check the template-specific workouts for last session data
    for (const ex of customExercises) {
      if (lastSets[ex.id]?.length) continue
      // Find which template this exercise belongs to and check that workout type
      for (const [type, templates] of [
        ['strength-a', strengthAExercises],
        ['strength-b', strengthBExercises],
        ['prehab', prehabExercises],
      ] as const) {
        if (templates.some(t => t.id === ex.id)) {
          const lastTyped = await getLastWorkoutOfType(type)
          if (lastTyped?.id) {
            const sets = await getExerciseSetsForWorkout(lastTyped.id)
            const matching = sets.filter(s => s.exerciseId === ex.id)
            if (matching.length > 0) {
              lastSets[ex.id] = matching
            }
          }
          break
        }
      }
    }

    setLastSessionData(lastSets)

    for (const ex of customExercises) {
      const last = lastSets[ex.id]
      if (last && last.length > 0) {
        map[ex.id] = last.map(s => ({
          weight: s.weight,
          reps: s.reps,
          duration: s.duration,
          bandResistance: s.bandResistance,
          completed: false,
          notes: undefined,
        }))
      } else {
        map[ex.id] = createDefaultSets(ex)
      }
    }

    setExerciseSets(map)
    setBuildPhase(false)
  }

  const handleUpdateSet = useCallback((exerciseId: string, setIndex: number, data: Partial<SetData>) => {
    setExerciseSets(prev => {
      const sets = [...(prev[exerciseId] || [])]
      sets[setIndex] = { ...sets[setIndex], ...data }
      return { ...prev, [exerciseId]: sets }
    })
  }, [])

  const handleAddSet = useCallback((exerciseId: string) => {
    setExerciseSets(prev => {
      const sets = prev[exerciseId] || []
      // Clone the last set's values (minus notes and completed) as a starting point
      const lastSet = sets[sets.length - 1]
      const newSet: SetData = lastSet
        ? { ...lastSet, completed: false, notes: undefined }
        : { completed: false }
      return { ...prev, [exerciseId]: [...sets, newSet] }
    })
  }, [])

  const handleRemoveSet = useCallback((exerciseId: string) => {
    setExerciseSets(prev => {
      const sets = prev[exerciseId] || []
      if (sets.length <= 1) return prev
      return { ...prev, [exerciseId]: sets.slice(0, -1) }
    })
  }, [])

  async function handleDelete() {
    if (!confirm('Delete this workout?')) return
    await db.exerciseSets.where('workoutId').equals(workoutId).delete()
    await db.runDetails.where('workoutId').equals(workoutId).delete()
    await db.rowDetails.where('workoutId').equals(workoutId).delete()
    await db.yogaMobilityDetails.where('workoutId').equals(workoutId).delete()
    await db.workouts.delete(workoutId)
    navigate('/')
  }

  async function handleFinish() {
    if (!workout) return

    // Save all exercise sets
    const exerciseList = isCustom ? customExercises : exercises
    const setsToSave: Omit<ExerciseSet, 'id'>[] = []
    for (const ex of exerciseList) {
      const sets = exerciseSets[ex.id] || []
      sets.forEach((set, i) => {
        setsToSave.push({
          workoutId,
          exerciseId: ex.id,
          setNumber: i + 1,
          weight: set.weight,
          weightUnit: 'lbs',
          reps: set.reps,
          duration: set.duration,
          bandResistance: set.bandResistance,
          completed: set.completed ?? true,
          notes: set.notes,
        })
      })
    }

    await db.exerciseSets.where('workoutId').equals(workoutId).delete()
    if (setsToSave.length > 0) {
      await db.exerciseSets.bulkAdd(setsToSave)
    }
    await db.workouts.update(workoutId, { completedAt: new Date().toISOString() })

    navigate('/')
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!workout) {
    return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-red-500" title="Delete workout">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold">{workoutLabels[workout.type] || workout.type}</h1>
          {!workout.completedAt && (
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTime(elapsed)}
            </div>
          )}
        </div>
        {workout.completedAt ? (
          <Badge variant="secondary">Done</Badge>
        ) : (
          <Button size="sm" onClick={handleFinish} disabled={isCustom && buildPhase}>
            <Check className="w-4 h-4 mr-1" />
            Finish
          </Button>
        )}
      </div>

      {/* Watch metrics (if linked) */}
      {watchMetrics && watchMetrics.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 mb-2">
              <Watch className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Apple Watch</span>
            </div>
            {watchMetrics.map(m => (
              <div key={m.id} className="grid grid-cols-3 gap-2 text-center text-sm">
                {m.avgHeartRate && (
                  <div>
                    <div className="font-bold text-red-400">{m.avgHeartRate}</div>
                    <div className="text-xs text-muted-foreground">Avg HR</div>
                  </div>
                )}
                {m.maxHeartRate && (
                  <div>
                    <div className="font-bold text-red-500">{m.maxHeartRate}</div>
                    <div className="text-xs text-muted-foreground">Max HR</div>
                  </div>
                )}
                {m.activeCalories && (
                  <div>
                    <div className="font-bold text-orange-400">{m.activeCalories}</div>
                    <div className="text-xs text-muted-foreground">Active Cal</div>
                  </div>
                )}
                {m.durationMinutes > 0 && (
                  <div>
                    <div className="font-bold">{m.durationMinutes}</div>
                    <div className="text-xs text-muted-foreground">Min</div>
                  </div>
                )}
                {m.distanceMeters && (
                  <div>
                    <div className="font-bold">{(m.distanceMeters / 1609.34).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Miles</div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom workout: build phase */}
      {isCustom && buildPhase && (
        <>
          <ExercisePicker
            selectedIds={customSelectedIds}
            onToggle={handleToggleExercise}
            onAddCustomExercise={handleAddCustomExercise}
            includeRun={includeRun}
            onToggleRun={() => setIncludeRun(r => !r)}
            includeRow={includeRow}
            onToggleRow={() => setIncludeRow(r => !r)}
          />
          {(customSelectedIds.size > 0 || includeRun || includeRow) && (
            <Button className="w-full h-12 text-base" onClick={handleStartCustom}>
              Start Workout ({customSelectedIds.size} exercises{includeRun ? ' + Run' : ''}{includeRow ? ' + Row' : ''})
            </Button>
          )}
        </>
      )}

      {/* Plan general notes */}
      {isCustom && !buildPhase && planGeneralNotes && (
        <div className="bg-secondary rounded-lg px-3 py-2 text-sm text-muted-foreground italic">
          {planGeneralNotes}
        </div>
      )}

      {/* Custom workout: log phase with sections */}
      {isCustom && !buildPhase && hasPlanSections && planSections.map((section, sIdx) => (
        <div key={sIdx} className="space-y-3">
          {/* Section header */}
          <div className="flex items-center gap-2 pt-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-2">
              {section.name || section.type}
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Section notes */}
          {section.notes && (
            <div className="bg-secondary rounded-lg px-3 py-2 text-sm text-muted-foreground italic">
              {section.notes}
            </div>
          )}

          {/* Exercise cards in this section */}
          {section.type === 'exercises' && section.exerciseIds.map(exId => {
            const ex = customExercises.find(e => e.id === exId)
            if (!ex) return null
            const coaching = coachingNotes[ex.id]
            const exerciseWithNotes = coaching
              ? { ...ex, notes: coaching + (ex.notes ? ` | ${ex.notes}` : '') }
              : ex
            return (
              <ExerciseCard
                key={ex.id}
                exercise={exerciseWithNotes}
                sets={exerciseSets[ex.id] || []}
                lastSessionSets={lastSessionData[ex.id]}
                onUpdateSet={(setIndex, data) => handleUpdateSet(ex.id, setIndex, data)}
                onAddSet={() => handleAddSet(ex.id)}
                onRemoveSet={() => handleRemoveSet(ex.id)}
                isPrehab={ex.hasBandResistance}
              />
            )
          })}

          {/* Run form in this section */}
          {section.type === 'run' && (
            <RunForm workoutId={workoutId} onFinish={handleFinish} embedded />
          )}

          {/* Row form in this section */}
          {section.type === 'row' && (
            <RowForm workoutId={workoutId} onFinish={handleFinish} />
          )}
        </div>
      ))}

      {/* Custom workout without plan sections: flat list */}
      {isCustom && !buildPhase && !hasPlanSections && customExercises.map((ex) => {
        const coaching = coachingNotes[ex.id]
        const exerciseWithNotes = coaching
          ? { ...ex, notes: coaching + (ex.notes ? ` | ${ex.notes}` : '') }
          : ex
        return (
          <ExerciseCard
            key={ex.id}
            exercise={exerciseWithNotes}
            sets={exerciseSets[ex.id] || []}
            lastSessionSets={lastSessionData[ex.id]}
            onUpdateSet={(setIndex, data) => handleUpdateSet(ex.id, setIndex, data)}
            onAddSet={() => handleAddSet(ex.id)}
            onRemoveSet={() => handleRemoveSet(ex.id)}
            isPrehab={ex.hasBandResistance}
          />
        )
      })}

      {/* Non-plan custom workout: run/row at the end */}
      {isCustom && !buildPhase && !hasPlanSections && includeRun && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Run</h2>
          <RunForm workoutId={workoutId} onFinish={handleFinish} embedded />
        </>
      )}
      {isCustom && !buildPhase && !hasPlanSections && includeRow && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide pt-2">Row</h2>
          <RowForm workoutId={workoutId} onFinish={handleFinish} />
        </>
      )}

      {/* Exercise-based template workouts (non-custom) */}
      {!isCustom && isExerciseBased && exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={exerciseSets[ex.id] || []}
          lastSessionSets={lastSessionData[ex.id]}
          onUpdateSet={(setIndex, data) => handleUpdateSet(ex.id, setIndex, data)}
          onAddSet={() => handleAddSet(ex.id)}
          onRemoveSet={() => handleRemoveSet(ex.id)}
          isPrehab={isPrehab}
        />
      ))}

      {/* Non-custom single-type forms */}
      {workout.type === 'run' && (
        <RunForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {workout.type === 'row' && (
        <RowForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {workout.type === 'yoga-mobility' && (
        <YogaMobilityForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {/* Finish button at bottom */}
      {((isExerciseBased && !isCustom) || (isCustom && !buildPhase)) && !workout.completedAt && (
        <Button className="w-full h-12 text-base" onClick={handleFinish}>
          <Check className="w-5 h-5 mr-2" />
          Finish Workout
        </Button>
      )}
    </div>
  )
}
