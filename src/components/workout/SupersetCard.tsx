import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Unlink, Minus, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Stepper } from './Stepper'
import { cn } from '@/lib/utils'
import type { ExerciseTemplate } from '@/data/workout-templates'
import type { SupersetGroup, BandResistance } from '@/db'

interface SetData {
  weight?: number
  reps?: number
  duration?: number
  bandResistance?: BandResistance
  completed: boolean
  notes?: string
}

interface SupersetCardProps {
  group?: SupersetGroup
  exercises: ExerciseTemplate[]
  exerciseSets: Record<string, SetData[]>
  onUpdateSet: (exerciseId: string, setIndex: number, data: Partial<SetData>) => void
  onAddRound: () => void
  onRemoveRound: () => void
  onUngroup?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandleProps?: any
}

const bandColors: Record<BandResistance, string> = {
  light: 'bg-green-600',
  medium: 'bg-yellow-600',
  heavy: 'bg-red-600',
}

export function SupersetCard({
  exercises, exerciseSets, onUpdateSet,
  onAddRound, onRemoveRound, onUngroup, dragHandleProps,
}: SupersetCardProps) {
  const [expanded, setExpanded] = useState(true)

  // Determine round count from the max set count across exercises
  const roundCount = Math.max(...exercises.map(ex => (exerciseSets[ex.id] || []).length), 0)
  const exerciseNames = exercises.map(ex => ex.name)
  const label = exercises.length === 2 ? 'Superset' : 'Circuit'

  // Count completed rounds (a round is complete when ALL exercises have that set completed)
  let completedRounds = 0
  for (let r = 0; r < roundCount; r++) {
    const allDone = exercises.every(ex => {
      const sets = exerciseSets[ex.id] || []
      return sets[r]?.completed
    })
    if (allDone) completedRounds++
  }

  return (
    <Card className="overflow-hidden border-l-4 border-l-violet-500">
      <div
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-2 mr-1 text-muted-foreground" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight">{label}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {exerciseNames.join(' + ')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              completedRounds === roundCount && roundCount > 0 && 'bg-emerald-600/20 text-emerald-400'
            )}
          >
            {completedRounds}/{roundCount}
          </Badge>
          {onUngroup && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onUngroup(); }}
              className="p-1 text-muted-foreground hover:text-violet-400" title="Ungroup">
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-3 space-y-3">
          {Array.from({ length: roundCount }, (_, roundIndex) => {
            const roundComplete = exercises.every(ex => {
              const sets = exerciseSets[ex.id] || []
              return sets[roundIndex]?.completed
            })

            return (
              <div
                key={roundIndex}
                className={cn(
                  'rounded-lg p-2 -mx-2 transition-colors space-y-2',
                  roundComplete && 'bg-emerald-950/20'
                )}
              >
                {/* Round header */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-1',
                    roundComplete ? 'text-emerald-400' : 'text-muted-foreground'
                  )}>
                    Round {roundIndex + 1} {roundComplete && '✓'}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Exercise rows within this round */}
                {exercises.map(ex => {
                  const sets = exerciseSets[ex.id] || []
                  const set = sets[roundIndex]
                  if (!set) return null

                  return (
                    <div key={ex.id} className="space-y-1.5">
                      {/* Exercise name + checkbox */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateSet(ex.id, roundIndex, { completed: !set.completed })}
                          className={cn(
                            'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors touch-manipulation shrink-0',
                            set.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-muted-foreground/40'
                          )}
                        >
                          {set.completed && <span className="text-xs font-bold">✓</span>}
                        </button>
                        <span className="text-sm font-medium truncate">{ex.name}</span>
                      </div>

                      {/* Steppers */}
                      <div className="flex items-center justify-center gap-4 flex-wrap pl-8">
                        {!ex.hasBandResistance && !ex.defaultDuration && (
                          <Stepper
                            value={set.weight}
                            onChange={(v) => onUpdateSet(ex.id, roundIndex, { weight: v })}
                            step={2.5}
                            min={0}
                            unit="lb"
                            label="Weight"
                            size="sm"
                          />
                        )}
                        {ex.defaultReps && (
                          <Stepper
                            value={set.reps}
                            onChange={(v) => onUpdateSet(ex.id, roundIndex, { reps: v })}
                            step={1}
                            min={0}
                            label="Reps"
                            size="sm"
                          />
                        )}
                        {ex.defaultDuration && (
                          <Stepper
                            value={set.duration}
                            onChange={(v) => onUpdateSet(ex.id, roundIndex, { duration: v })}
                            step={5}
                            min={0}
                            unit="s"
                            label="Seconds"
                            size="sm"
                          />
                        )}
                        {ex.hasBandResistance && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-muted-foreground">Band</span>
                            <div className="flex gap-1">
                              {(['light', 'medium', 'heavy'] as BandResistance[]).map((level) => (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => onUpdateSet(ex.id, roundIndex, { bandResistance: level })}
                                  className={cn(
                                    'px-2 py-1 rounded-full text-xs font-medium transition-all touch-manipulation',
                                    set.bandResistance === level
                                      ? `${bandColors[level]} text-white`
                                      : 'bg-secondary text-muted-foreground'
                                  )}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Add/remove round buttons */}
          <div className="flex justify-center gap-2 pt-1">
            {roundCount > 1 && (
              <button
                type="button"
                onClick={onRemoveRound}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation"
              >
                <Minus className="w-3 h-3" />
                Remove Round
              </button>
            )}
            <button
              type="button"
              onClick={onAddRound}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation"
            >
              <Plus className="w-3 h-3" />
              Add Round
            </button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
