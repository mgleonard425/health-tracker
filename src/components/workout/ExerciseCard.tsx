import { useState } from 'react'
import { ChevronDown, ChevronUp, MessageSquare, Plus, Minus, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Stepper } from './Stepper'
import { cn } from '@/lib/utils'
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

interface ExerciseCardProps {
  exercise: ExerciseTemplate
  sets: SetData[]
  lastSessionSets?: ExerciseSet[]
  onUpdateSet: (setIndex: number, data: Partial<SetData>) => void
  onAddSet?: () => void
  onRemoveSet?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const bandColors: Record<BandResistance, string> = {
  light: 'bg-green-600',
  medium: 'bg-yellow-600',
  heavy: 'bg-red-600',
}

export function ExerciseCard({ exercise, sets, lastSessionSets, onUpdateSet, onAddSet, onRemoveSet, onMoveUp, onMoveDown }: ExerciseCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showNotes, setShowNotes] = useState<number | null>(null)
  const completedCount = sets.filter(s => s.completed).length

  const lastSessionSummary = lastSessionSets && lastSessionSets.length > 0
    ? lastSessionSets[0].weight
      ? `${lastSessionSets[0].weight} ${lastSessionSets[0].weightUnit} x ${lastSessionSets[0].reps}`
      : lastSessionSets[0].duration
        ? `${lastSessionSets[0].duration}s`
        : `${lastSessionSets[0].reps} reps`
    : null

  return (
    <Card className="overflow-hidden">
      <div
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight">{exercise.name}</div>
          {lastSessionSummary && (
            <div className="text-xs text-muted-foreground mt-0.5">
              Last: {lastSessionSummary}
            </div>
          )}
          {exercise.notes && (
            <div className="text-xs text-muted-foreground italic">{exercise.notes}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(onMoveUp || onMoveDown) && (
            <div className="flex items-center" onClick={e => e.stopPropagation()}>
              <button type="button" disabled={!onMoveUp} onClick={onMoveUp}
                className={cn('p-1 text-muted-foreground touch-manipulation', !onMoveUp && 'opacity-20')}>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" disabled={!onMoveDown} onClick={onMoveDown}
                className={cn('p-1 text-muted-foreground touch-manipulation', !onMoveDown && 'opacity-20')}>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              completedCount === sets.length && sets.length > 0 && 'bg-emerald-600/20 text-emerald-400'
            )}
          >
            {completedCount}/{sets.length}
          </Badge>
          {exercise.isOptional && <Badge variant="secondary" className="text-xs">Optional</Badge>}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-3 space-y-3">
          {sets.map((set, i) => (
            <div
              key={i}
              className={cn(
                'space-y-2 rounded-lg p-2 -mx-2 transition-colors',
                set.completed && 'bg-emerald-950/20'
              )}
            >
              {/* Set header with checkbox */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSet(i, { completed: !set.completed })}
                    className={cn(
                      'w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors touch-manipulation',
                      set.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-muted-foreground/40'
                    )}
                  >
                    {set.completed && <span className="text-sm font-bold">✓</span>}
                  </button>
                  <span className="text-xs text-muted-foreground font-medium">Set {i + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotes(showNotes === i ? null : i)}
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                {/* Weight stepper (if not bodyweight/band exercise) */}
                {!exercise.hasBandResistance && !exercise.defaultDuration && (
                  <Stepper
                    value={set.weight}
                    onChange={(v) => onUpdateSet(i, { weight: v })}
                    step={2.5}
                    min={0}
                    unit="lb"
                    label="Weight"
                  />
                )}

                {/* Reps stepper */}
                {exercise.defaultReps && (
                  <Stepper
                    value={set.reps}
                    onChange={(v) => onUpdateSet(i, { reps: v })}
                    step={1}
                    min={0}
                    label="Reps"
                  />
                )}

                {/* Duration stepper */}
                {exercise.defaultDuration && (
                  <Stepper
                    value={set.duration}
                    onChange={(v) => onUpdateSet(i, { duration: v })}
                    step={5}
                    min={0}
                    unit="s"
                    label="Seconds"
                  />
                )}

                {/* Band resistance selector */}
                {exercise.hasBandResistance && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">Band</span>
                    <div className="flex gap-1">
                      {(['light', 'medium', 'heavy'] as BandResistance[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => onUpdateSet(i, { bandResistance: level })}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-xs font-medium transition-all touch-manipulation',
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

              {/* Notes */}
              {showNotes === i && (
                <input
                  type="text"
                  placeholder="e.g., left knee tracked inward"
                  value={set.notes || ''}
                  onChange={(e) => onUpdateSet(i, { notes: e.target.value })}
                  className="w-full bg-secondary rounded-md px-3 py-2 text-sm placeholder:text-muted-foreground/50"
                />
              )}
            </div>
          ))}

          {/* Add/remove set buttons */}
          {(onAddSet || onRemoveSet) && (
            <div className="flex justify-center gap-2 pt-1">
              {onRemoveSet && sets.length > 1 && (
                <button
                  type="button"
                  onClick={onRemoveSet}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation"
                >
                  <Minus className="w-3 h-3" />
                  Remove Set
                </button>
              )}
              {onAddSet && (
                <button
                  type="button"
                  onClick={onAddSet}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation"
                >
                  <Plus className="w-3 h-3" />
                  Add Set
                </button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
