import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { format, parseISO } from 'date-fns'
import { Watch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'

const typeLabels: Record<string, string> = {
  'strength-a': 'Strength A',
  'strength-b': 'Strength B',
  'prehab': 'Prehab',
  'run': 'Run',
  'row': 'Row',
  'yoga-mobility': 'Yoga / Mobility',
  'custom': 'Custom',
}

const typeColors: Record<string, string> = {
  'strength-a': 'bg-blue-600',
  'strength-b': 'bg-blue-500',
  'prehab': 'bg-emerald-600',
  'run': 'bg-orange-600',
  'row': 'bg-cyan-600',
  'yoga-mobility': 'bg-purple-600',
  'custom': 'bg-zinc-600',
}

export function HistoryPage() {
  const navigate = useNavigate()
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().limit(50).toArray(),
    []
  )

  // Get workout IDs that have linked watch metrics
  const watchWorkoutIds = useLiveQuery(async () => {
    const metrics = await db.watchMetrics.toArray()
    return new Set(metrics.filter(m => m.workoutId).map(m => m.workoutId!))
  }, [])

  if (!workouts) {
    return <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground">Loading...</div>
  }

  // Group by date
  const grouped = workouts.reduce<Record<string, typeof workouts>>((acc, w) => {
    const key = w.date
    if (!acc[key]) acc[key] = []
    acc[key].push(w)
    return acc
  }, {})

  const dates = Object.keys(grouped).sort().reverse()

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Workout History</h1>

      {dates.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          No workouts logged yet. Start from the Today page!
        </div>
      ) : (
        dates.map(date => (
          <div key={date}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              {format(parseISO(date), 'EEEE, MMMM d')}
            </h2>
            <div className="space-y-2">
              {grouped[date].map(w => (
                <Card key={w.id} className="cursor-pointer" onClick={() => navigate(`/workout/${w.id}`)}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${typeColors[w.type]}`} />
                      <span className="font-medium text-sm">{typeLabels[w.type] || w.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {watchWorkoutIds?.has(w.id!) && (
                        <Watch className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      {w.completedAt ? (
                        <Badge variant="secondary" className="text-xs">
                          {format(new Date(w.completedAt), 'h:mm a')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">In Progress</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
