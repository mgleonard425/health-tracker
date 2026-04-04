import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { db } from '@/db'
import type { WorkoutType } from '@/db'

export function WorkoutNewPage() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    async function createWorkout() {
      const workoutType = type as WorkoutType
      const now = new Date()
      const id = await db.workouts.add({
        date: format(now, 'yyyy-MM-dd'),
        type: workoutType,
        startedAt: now.toISOString(),
      })
      navigate(`/workout/${id}`, { replace: true })
    }
    createWorkout()
  }, [type, navigate])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-muted-foreground">Starting workout...</div>
    </div>
  )
}
