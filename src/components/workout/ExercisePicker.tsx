import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  strengthAExercises,
  strengthBExercises,
  prehabExercises,
  type ExerciseTemplate,
} from '@/data/workout-templates'

type CustomExerciseType = 'weight-reps' | 'reps-only' | 'duration' | 'band-reps'

interface ExercisePickerProps {
  selectedIds: Set<string>
  onToggle: (exercise: ExerciseTemplate) => void
  onAddCustomExercise: (exercise: ExerciseTemplate) => void
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

const customTypes: { value: CustomExerciseType; label: string }[] = [
  { value: 'weight-reps', label: 'Weight + Reps' },
  { value: 'reps-only', label: 'Reps Only' },
  { value: 'duration', label: 'Duration' },
  { value: 'band-reps', label: 'Band + Reps' },
]

export function ExercisePicker({ selectedIds, onToggle, onAddCustomExercise, includeRun, onToggleRun, includeRow, onToggleRow }: ExercisePickerProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<CustomExerciseType>('reps-only')
  const [customSets, setCustomSets] = useState(3)

  function handleAddCustom() {
    if (!customName.trim()) return

    const id = `custom-${customName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    const exercise: ExerciseTemplate = {
      id,
      name: customName.trim(),
      defaultSets: customSets,
      defaultReps: customType !== 'duration' ? 10 : undefined,
      defaultDuration: customType === 'duration' ? 30 : undefined,
      weightUnit: 'lbs',
      hasBandResistance: customType === 'band-reps',
    }

    onAddCustomExercise(exercise)
    setCustomName('')
    setShowCustomForm(false)
  }

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

      {/* Custom exercise */}
      <div className="bg-secondary rounded-lg px-3 py-3 space-y-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium w-full text-left"
          onClick={() => setShowCustomForm(!showCustomForm)}
        >
          <Plus className="w-4 h-4" />
          Add Custom Exercise
        </button>

        {showCustomForm && (
          <div className="space-y-2 pt-1">
            <Input
              value={customName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomName(e.target.value)}
              placeholder="Exercise name (e.g., Band pull-aparts)"
              onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCustom()}
            />
            <div className="flex flex-wrap gap-1">
              {customTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setCustomType(t.value)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                    customType === t.value ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-muted-foreground'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sets:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCustomSets(n)}
                    className={cn(
                      'w-8 h-8 rounded text-xs font-bold transition-colors touch-manipulation',
                      customSets === n ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-muted-foreground'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className={cn(
                  'ml-auto px-3 py-1.5 rounded text-xs font-medium transition-colors touch-manipulation',
                  customName.trim() ? 'bg-primary text-primary-foreground' : 'bg-background/50 text-muted-foreground opacity-50'
                )}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

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
