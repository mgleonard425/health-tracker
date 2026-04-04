import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Check, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExerciseCard } from '@/components/workout/ExerciseCard'
import { RunForm } from '@/components/workout/RunForm'
import { RowForm } from '@/components/workout/RowForm'
import { YogaMobilityForm } from '@/components/workout/YogaMobilityForm'
import { db, getLastWorkoutOfType, getExerciseSetsForWorkout } from '@/db'
import { getExercisesForWorkoutType } from '@/data/workout-templates'
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
}

export function WorkoutActivePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const workoutId = Number(id)

  const workout = useLiveQuery(() => db.workouts.get(workoutId), [workoutId])
  const [exerciseSets, setExerciseSets] = useState<ExerciseSetsMap>({})
  const [lastSessionData, setLastSessionData] = useState<Record<string, ExerciseSet[]>>({})
  const [initialized, setInitialized] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const exercises = workout ? getExercisesForWorkoutType(workout.type) : []
  const isPrehab = workout?.type === 'prehab'
  const isStrength = workout?.type === 'strength-a' || workout?.type === 'strength-b'
  const isExerciseBased = isStrength || isPrehab

  // Timer
  useEffect(() => {
    if (!workout?.startedAt || workout.completedAt) return
    const start = new Date(workout.startedAt).getTime()
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [workout?.startedAt, workout?.completedAt])

  // Initialize sets from template + last session data
  useEffect(() => {
    if (!workout || initialized || exercises.length === 0) return
    const workoutType = workout.type

    async function init() {
      // Check if there are already saved sets for this workout
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

      // Load last session data
      const lastWorkout = await getLastWorkoutOfType(workoutType)
      const lastSets: Record<string, ExerciseSet[]> = {}

      if (lastWorkout?.id && lastWorkout.id !== workoutId) {
        const allLastSets = await getExerciseSetsForWorkout(lastWorkout.id)
        for (const ex of exercises) {
          lastSets[ex.id] = allLastSets.filter(s => s.exerciseId === ex.id)
        }
      }
      setLastSessionData(lastSets)

      // Initialize from last session or defaults
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
  }, [workout, workoutId, initialized, exercises])

  function createDefaultSets(ex: { defaultSets: number; defaultWeight?: number; defaultReps?: number; defaultDuration?: number }) {
    return Array.from({ length: ex.defaultSets }, () => ({
      weight: ex.defaultWeight,
      reps: ex.defaultReps,
      duration: ex.defaultDuration,
      completed: false,
    }))
  }

  const handleUpdateSet = useCallback((exerciseId: string, setIndex: number, data: Partial<SetData>) => {
    setExerciseSets(prev => {
      const sets = [...(prev[exerciseId] || [])]
      sets[setIndex] = { ...sets[setIndex], ...data }
      return { ...prev, [exerciseId]: sets }
    })
  }, [])

  async function handleFinish() {
    if (!workout) return

    // Save all exercise sets
    const setsToSave: Omit<ExerciseSet, 'id'>[] = []
    for (const ex of exercises) {
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

    // Delete existing sets and add new ones
    await db.exerciseSets.where('workoutId').equals(workoutId).delete()
    await db.exerciseSets.bulkAdd(setsToSave)
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
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
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
          <Button size="sm" onClick={handleFinish}>
            <Check className="w-4 h-4 mr-1" />
            Finish
          </Button>
        )}
      </div>

      {/* Exercise-based workouts */}
      {isExerciseBased && exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          sets={exerciseSets[ex.id] || []}
          lastSessionSets={lastSessionData[ex.id]}
          onUpdateSet={(setIndex, data) => handleUpdateSet(ex.id, setIndex, data)}
          isPrehab={isPrehab}
        />
      ))}

      {/* Run form */}
      {workout.type === 'run' && (
        <RunForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {/* Row form */}
      {workout.type === 'row' && (
        <RowForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {/* Yoga/Mobility form */}
      {workout.type === 'yoga-mobility' && (
        <YogaMobilityForm workoutId={workoutId} onFinish={handleFinish} />
      )}

      {/* Finish button at bottom for exercise workouts */}
      {isExerciseBased && !workout.completedAt && (
        <Button className="w-full h-12 text-base" onClick={handleFinish}>
          <Check className="w-5 h-5 mr-2" />
          Finish Workout
        </Button>
      )}
    </div>
  )
}
