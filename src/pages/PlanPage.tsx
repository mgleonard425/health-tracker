import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getAllWeeks, getCurrentWeekNumber, getDaysUntilRace, type Phase } from '@/data/training-plan'
import { cn } from '@/lib/utils'

const phaseColors: Record<Phase, string> = {
  1: 'bg-green-600',
  2: 'bg-blue-600',
  3: 'bg-orange-600',
  4: 'bg-red-600',
  5: 'bg-purple-600',
}

export function PlanPage() {
  const weeks = getAllWeeks()
  const currentWeek = getCurrentWeekNumber()
  const daysUntilRace = getDaysUntilRace()
  const [expandedPhase, setExpandedPhase] = useState<Phase | null>(
    weeks.find(w => w.week === currentWeek)?.phase || 1
  )

  const phases = [
    { phase: 1 as Phase, name: 'Base + Prehab', weeks: '1-12' },
    { phase: 2 as Phase, name: 'Aerobic Build', weeks: '13-20' },
    { phase: 3 as Phase, name: 'Specificity', weeks: '21-26' },
    { phase: 4 as Phase, name: 'Marathon Specific', weeks: '27-35' },
    { phase: 5 as Phase, name: 'Taper + Race', weeks: '36-38' },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Training Plan</h1>
          <p className="text-sm text-muted-foreground">38-Week Honolulu Marathon Plan</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-500">{daysUntilRace}</div>
          <div className="text-xs text-muted-foreground">days to race</div>
        </div>
      </div>

      {/* Current week highlight */}
      {(() => {
        const cw = weeks.find(w => w.week === currentWeek)
        if (!cw) return null
        return (
          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={phaseColors[cw.phase]}>Week {cw.week}</Badge>
                <span className="text-sm font-medium">{cw.phaseName}</span>
                {cw.isDownWeek && <Badge variant="secondary">Down Week</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Mileage:</span>
                  <span className="font-medium ml-1">{cw.weeklyMileage} mi</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Long:</span>
                  <span className="font-medium ml-1">{cw.longRunMiles} mi</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Run days:</span>
                  <span className="font-medium ml-1">{cw.runDays}</span>
                </div>
              </div>
              {cw.notes && <p className="text-xs text-muted-foreground mt-2 italic">{cw.notes}</p>}
            </CardContent>
          </Card>
        )
      })()}

      {/* Phase accordion */}
      {phases.map(p => {
        const phaseWeeks = weeks.filter(w => w.phase === p.phase)
        const isExpanded = expandedPhase === p.phase
        const containsCurrent = phaseWeeks.some(w => w.week === currentWeek)

        return (
          <Card key={p.phase}>
            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              onClick={() => setExpandedPhase(isExpanded ? null : p.phase)}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', phaseColors[p.phase])} />
                <span className="font-medium text-sm">{p.name}</span>
                <span className="text-xs text-muted-foreground">Weeks {p.weeks}</span>
                {containsCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-3">
                <div className="space-y-2">
                  {phaseWeeks.map(w => (
                    <div
                      key={w.week}
                      className={cn(
                        'flex items-center justify-between py-2 px-3 rounded-lg text-sm',
                        w.week === currentWeek ? 'bg-primary/10 border border-primary/20' : '',
                        w.isDownWeek ? 'opacity-70' : ''
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium w-14">Wk {w.week}</span>
                        {w.isDownWeek && <Badge variant="secondary" className="text-xs">Down</Badge>}
                        {w.week === currentWeek && <Badge className="text-xs">Now</Badge>}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {w.weeklyMileage} mi &middot; Long {w.longRunMiles} mi
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
