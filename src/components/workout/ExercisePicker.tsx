import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  strengthAExercises,
  strengthBExercises,
  prehabExercises,
  type ExerciseTemplate,
} from '@/data/workout-templates'

interface ExercisePickerProps {
  selectedIds: Set<string>
  onToggle: (exercise: ExerciseTemplate) => void
  includeRun: boolean
  onToggleRun: () => void
  includeRow: boolean
  onToggleRow: () => void
}

const groups = [
  { label: 'Strength A (Upper + Core)', exercises: strengthAExercises, color: 'bg-blue-600' },
  { label: 'Strength B (Lower + Prehab)', exercises: strengthBExercises, color: 'bg-blue-500' },
  { label: 'IT Band Prehab', exercises: prehabExercises, color: 'bg-emerald-600' },
]

export function ExercisePicker({ selectedIds, onToggle, includeRun, onToggleRun, includeRow, onToggleRow }: ExercisePickerProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Build Your Workout</h2>

      {/* Exercise groups */}
      {groups.map(group => {
        const isExpanded = expandedGroup === group.label
        const selectedCount = group.exercises.filter(e => selectedIds.has(e.id)).length

        return (
          <div key={group.label} className="bg-secondary rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full px-3 py-3 flex items-center justify-between text-left"
              onClick={() => setExpandedGroup(isExpanded ? null : group.label)}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', group.color)} />
                <span className="text-sm font-medium">{group.label}</span>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{selectedCount}</Badge>
                )}
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-1">
                {group.exercises.map(ex => {
                  const selected = selectedIds.has(ex.id)
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => onToggle(ex)}
                      className={cn(
                        'w-full px-3 py-2 rounded-md text-sm text-left flex items-center justify-between transition-colors touch-manipulation',
                        selected ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-foreground'
                      )}
                    >
                      <div>
                        <span>{ex.name}</span>
                        {ex.isOptional && <span className="text-xs opacity-60 ml-1">(optional)</span>}
                      </div>
                      {selected ? (
                        <span className="text-xs font-bold">✓</span>
                      ) : (
                        <Plus className="w-4 h-4 opacity-40" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Cardio options */}
      <div className="bg-secondary rounded-lg px-3 py-3 space-y-2">
        <span className="text-sm font-medium">Add Cardio</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleRun}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
              includeRun ? 'bg-orange-600 text-white' : 'bg-background/50 text-muted-foreground'
            )}
          >
            {includeRun ? '✓ Run' : '+ Run'}
          </button>
          <button
            type="button"
            onClick={onToggleRow}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation',
              includeRow ? 'bg-cyan-600 text-white' : 'bg-background/50 text-muted-foreground'
            )}
          >
            {includeRow ? '✓ Row' : '+ Row'}
          </button>
        </div>
      </div>
    </div>
  )
}
