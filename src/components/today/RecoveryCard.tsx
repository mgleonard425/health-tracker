import { useLiveQuery } from 'dexie-react-hooks'
import { Heart, Activity, Moon, Wind } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'
import { cn } from '@/lib/utils'

function TrendIndicator({ current, average }: { current: number; average: number | null }) {
  if (average === null) return null
  const diff = current - average
  const pct = Math.round((diff / average) * 100)
  if (Math.abs(pct) < 3) return <span className="text-xs text-muted-foreground">avg</span>
  return (
    <span className={cn('text-xs', pct > 0 ? 'text-red-400' : 'text-emerald-400')}>
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

function HrvTrend({ current, average }: { current: number; average: number | null }) {
  if (average === null) return null
  const diff = current - average
  const pct = Math.round((diff / average) * 100)
  if (Math.abs(pct) < 3) return <span className="text-xs text-muted-foreground">avg</span>
  // Higher HRV is better (opposite of HR)
  return (
    <span className={cn('text-xs', pct > 0 ? 'text-emerald-400' : 'text-red-400')}>
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

function getRecoveryStatus(metrics: {
  restingHeartRate?: number; heartRateVariability?: number;
  sleepDurationMinutes?: number; avgHR?: number; avgHRV?: number
}): { label: string; color: string } {
  let score = 0
  let factors = 0

  if (metrics.restingHeartRate && metrics.avgHR) {
    factors++
    if (metrics.restingHeartRate <= metrics.avgHR) score++
  }
  if (metrics.heartRateVariability && metrics.avgHRV) {
    factors++
    if (metrics.heartRateVariability >= metrics.avgHRV) score++
  }
  if (metrics.sleepDurationMinutes) {
    factors++
    if (metrics.sleepDurationMinutes >= 420) score++ // 7 hours
  }

  if (factors === 0) return { label: 'No data', color: 'text-muted-foreground' }
  const ratio = score / factors
  if (ratio >= 0.8) return { label: 'Good', color: 'text-emerald-400' }
  if (ratio >= 0.5) return { label: 'Fair', color: 'text-yellow-400' }
  return { label: 'Low', color: 'text-red-400' }
}

export function RecoveryCard() {
  const today = new Date().toISOString().split('T')[0]

  // Get the most recent health metrics (today or yesterday)
  const recentMetrics = useLiveQuery(async () => {
    const metrics = await db.healthMetrics.orderBy('date').reverse().limit(7).toArray()
    return metrics
  }, [])

  if (!recentMetrics || recentMetrics.length === 0) return null

  // Find the most recent day with meaningful recovery data (not just steps)
  const latest = recentMetrics.find(
    m => m.restingHeartRate || m.heartRateVariability || m.sleepDurationMinutes || m.vo2Max
  )
  if (!latest) return null

  // Calculate 7-day averages (excluding today)
  const older = recentMetrics.filter(m => m.date !== today).slice(0, 6)
  const avgHR = older.filter(m => m.restingHeartRate).length > 0
    ? older.reduce((s, m) => s + (m.restingHeartRate || 0), 0) / older.filter(m => m.restingHeartRate).length
    : null
  const avgHRV = older.filter(m => m.heartRateVariability).length > 0
    ? older.reduce((s, m) => s + (m.heartRateVariability || 0), 0) / older.filter(m => m.heartRateVariability).length
    : null

  const recovery = getRecoveryStatus({
    restingHeartRate: latest.restingHeartRate,
    heartRateVariability: latest.heartRateVariability,
    sleepDurationMinutes: latest.sleepDurationMinutes,
    avgHR: avgHR ?? undefined,
    avgHRV: avgHRV ?? undefined,
  })

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recovery</h2>
          <span className={cn('text-sm font-semibold', recovery.color)}>{recovery.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {latest.restingHeartRate && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{latest.restingHeartRate} bpm</span>
                  <TrendIndicator current={latest.restingHeartRate} average={avgHR} />
                </div>
                <span className="text-xs text-muted-foreground">Resting HR</span>
              </div>
            </div>
          )}
          {latest.heartRateVariability && (
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium">{latest.heartRateVariability} ms</span>
                  <HrvTrend current={latest.heartRateVariability} average={avgHRV} />
                </div>
                <span className="text-xs text-muted-foreground">HRV</span>
              </div>
            </div>
          )}
          {latest.sleepDurationMinutes && (
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-sm font-medium">
                  {Math.floor(latest.sleepDurationMinutes / 60)}h {latest.sleepDurationMinutes % 60}m
                </span>
                <span className="text-xs text-muted-foreground block">Sleep</span>
              </div>
            </div>
          )}
          {latest.vo2Max && (
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-sm font-medium">{latest.vo2Max}</span>
                <span className="text-xs text-muted-foreground block">VO2 Max</span>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {latest.date === today ? 'Today' : latest.date}
          {latest.steps && ` \u00b7 ${latest.steps.toLocaleString()} steps`}
        </div>
      </CardContent>
    </Card>
  )
}
