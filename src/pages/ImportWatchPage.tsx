import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Watch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'
import { format } from 'date-fns'

export function ImportWatchPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [summary, setSummary] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function importWatch() {
      const hash = window.location.hash.slice(1)
      if (!hash) {
        setStatus('error')
        setErrorMsg('No watch data found in the URL.')
        return
      }

      try {
        // Decode base64url
        const json = atob(hash.replace(/-/g, '+').replace(/_/g, '/'))
        const metrics = JSON.parse(json)

        if (!metrics.watchWorkoutType || !metrics.startTime) {
          setStatus('error')
          setErrorMsg('Invalid watch data format.')
          return
        }

        const startDate = new Date(metrics.startTime)
        const dateStr = format(startDate, 'yyyy-MM-dd')

        // Try to find a matching workout logged today
        const todayWorkouts = await db.workouts
          .where('date').equals(dateStr)
          .toArray()

        // Simple time-based matching: find a workout started within 30 min of the watch workout
        let matchedWorkoutId: number | undefined
        for (const w of todayWorkouts) {
          const wStart = new Date(w.startedAt).getTime()
          const watchStart = startDate.getTime()
          if (Math.abs(wStart - watchStart) < 30 * 60 * 1000) {
            matchedWorkoutId = w.id
            break
          }
        }

        await db.watchMetrics.add({
          date: dateStr,
          workoutId: matchedWorkoutId,
          watchWorkoutType: metrics.watchWorkoutType,
          startTime: metrics.startTime,
          endTime: metrics.endTime,
          durationMinutes: metrics.durationMinutes || 0,
          activeCalories: metrics.activeCalories,
          totalCalories: metrics.totalCalories,
          avgHeartRate: metrics.avgHeartRate,
          maxHeartRate: metrics.maxHeartRate,
          distanceMeters: metrics.distanceMeters,
          rawData: JSON.stringify(metrics),
        })

        const parts = [metrics.watchWorkoutType]
        if (metrics.durationMinutes) parts.push(`${metrics.durationMinutes} min`)
        if (metrics.avgHeartRate) parts.push(`avg HR ${metrics.avgHeartRate}`)
        if (metrics.activeCalories) parts.push(`${metrics.activeCalories} cal`)
        setSummary(parts.join(' · '))

        setStatus('success')
      } catch {
        setStatus('error')
        setErrorMsg('Could not decode watch data.')
      }
    }

    importWatch()
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background safe-area-pt">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Watch className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Importing watch data...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
              <h2 className="text-lg font-bold">Watch Data Imported!</h2>
              <p className="text-sm text-muted-foreground">{summary}</p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => navigate('/')}>
                  Go to Today
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
              <h2 className="text-lg font-bold">Import Failed</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
