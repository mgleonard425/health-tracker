import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp, X, GripVertical, Link, Unlink } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  strengthAExercises,
  strengthBExercises,
  prehabExercises,
  type ExerciseTemplate,
} from '@/data/workout-templates'
import type { SupersetGroup } from '@/db'

type CustomExerciseType = 'weight-reps' | 'reps-only' | 'duration' | 'band-reps'

interface ExercisePickerProps {
  selectedIds: Set<string>
  customExercises: ExerciseTemplate[]
  onToggle: (exercise: ExerciseTemplate) => void
  onAddCustomExercise: (exercise: ExerciseTemplate) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  includeRun: boolean
  onToggleRun: () => void
  includeRow: boolean
  onToggleRow: () => void
  showCardio?: boolean
  compact?: boolean
  supersetGroups?: SupersetGroup[]
  onCreateSuperset?: (exerciseIds: string[]) => void
  onRemoveSuperset?: (groupId: string) => void
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

function SortableWorkoutItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center justify-between px-3 py-1.5 bg-background/50 rounded-md">
      <div {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      {children}
    </div>
  )
}

export function ExercisePicker({ selectedIds, customExercises, onToggle, onAddCustomExercise, onReorder, includeRun, onToggleRun, includeRow, onToggleRow, showCardio = true, compact, supersetGroups = [], onCreateSuperset, onRemoveSuperset }: ExercisePickerProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState<CustomExerciseType>('reps-only')
  const [customSets, setCustomSets] = useState(3)
  const [groupMode, setGroupMode] = useState(false)
  const [groupSelection, setGroupSelection] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = customExercises.findIndex(e => e.id === active.id)
      const newIndex = customExercises.findIndex(e => e.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex)
    }
  }

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
      {!compact && <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Build Your Workout</h2>}

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
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={customSets}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  if (!isNaN(v) && v >= 1 && v <= 20) setCustomSets(v)
                }}
                className="w-14 h-8 rounded bg-background/50 text-center text-sm font-bold border border-border"
              />
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
      {showCardio && (
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
      )}

      {/* Selected exercises summary */}
      {!compact && (customExercises.length > 0 || includeRun || includeRow) && (
        <div className="bg-secondary rounded-lg px-3 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Workout</span>
            {onCreateSuperset && customExercises.length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  if (groupMode && groupSelection.size >= 2) {
                    onCreateSuperset([...groupSelection])
                    setGroupSelection(new Set())
                    setGroupMode(false)
                  } else {
                    setGroupMode(!groupMode)
                    setGroupSelection(new Set())
                  }
                }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                  groupMode
                    ? groupSelection.size >= 2 ? 'bg-violet-600 text-white' : 'bg-violet-600/30 text-violet-300'
                    : 'text-muted-foreground'
                )}
              >
                <Link className="w-3 h-3" />
                {groupMode ? (groupSelection.size >= 2 ? 'Make Superset' : 'Select 2+') : 'Group'}
              </button>
            )}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={customExercises.map(e => e.id)} strategy={verticalListSortingStrategy}>
              {(() => {
                const seenGroups = new Set<string>()
                return customExercises.map((ex) => {
                  const group = supersetGroups.find(g => g.exerciseIds.includes(ex.id))

                  // If this exercise is in a superset, render the group block (once)
                  if (group) {
                    if (seenGroups.has(group.id)) return null
                    seenGroups.add(group.id)
                    const groupExercises = group.exerciseIds.map(id => customExercises.find(e => e.id === id)!).filter(Boolean)
                    return (
                      <div key={group.id} className="border-l-2 border-l-violet-500 rounded-md bg-background/50 px-3 py-1.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
                            {groupExercises.length === 2 ? 'Superset' : 'Circuit'}
                          </span>
                          {onRemoveSuperset && (
                            <button type="button" onClick={() => onRemoveSuperset(group.id)} className="p-0.5 text-muted-foreground hover:text-violet-400">
                              <Unlink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {groupExercises.map(gex => (
                          <div key={gex.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-sm truncate">{gex.name}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {gex.defaultSets}×{gex.defaultReps ? `${gex.defaultReps}` : gex.defaultDuration ? `${gex.defaultDuration}s` : ''}
                              </span>
                            </div>
                            <button type="button" onClick={() => onToggle(gex)} className="p-1 text-muted-foreground hover:text-red-500 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                  }

                  // Ungrouped exercise
                  return (
                    <SortableWorkoutItem key={ex.id} id={ex.id}>
                      {groupMode && (
                        <button
                          type="button"
                          onClick={() => setGroupSelection(prev => {
                            const next = new Set(prev)
                            next.has(ex.id) ? next.delete(ex.id) : next.add(ex.id)
                            return next
                          })}
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors touch-manipulation',
                            groupSelection.has(ex.id) ? 'bg-violet-600 border-violet-600 text-white' : 'border-muted-foreground/40'
                          )}
                        >
                          {groupSelection.has(ex.id) && <span className="text-xs font-bold">✓</span>}
                        </button>
                      )}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm truncate">{ex.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {ex.defaultSets}×{ex.defaultReps ? `${ex.defaultReps}` : ex.defaultDuration ? `${ex.defaultDuration}s` : ''}
                        </span>
                      </div>
                      {!groupMode && (
                        <button type="button" onClick={() => onToggle(ex)} className="p-1 text-muted-foreground hover:text-red-500 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </SortableWorkoutItem>
                  )
                })
              })()}
            </SortableContext>
          </DndContext>
          {includeRun && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-background/50 rounded-md">
              <span className="text-sm">Run</span>
              <button type="button" onClick={onToggleRun} className="p-1 text-muted-foreground hover:text-red-500 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {includeRow && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-background/50 rounded-md">
              <span className="text-sm">Row</span>
              <button type="button" onClick={onToggleRow} className="p-1 text-muted-foreground hover:text-red-500 shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
