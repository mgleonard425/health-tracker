import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Save, Plus, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExercisePicker } from '@/components/workout/ExercisePicker'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import type { ExerciseTemplate } from '@/data/workout-templates'
import type { PlannedExercise } from '@/db'

export function PlanWorkoutPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const editId = id ? Number(id) : undefined

  const existingPlan = useLiveQuery(
    () => editId ? db.workoutPlans.get(editId) : undefined,
    [editId]
  )

  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<PlannedExercise[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [includeRun, setIncludeRun] = useState(false)
  const [runNotes, setRunNotes] = useState('')
  const [includeRow, setIncludeRow] = useState(false)
  const [rowNotes, setRowNotes] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [showPicker, setShowPicker] = useState(true)
  const [loaded, setLoaded] = useState(false)

  // Load existing plan for editing
  if (existingPlan && !loaded) {
    setName(existingPlan.name)
    setExercises(existingPlan.exercises)
    setSelectedIds(new Set(existingPlan.exercises.map(e => e.exerciseId)))
    setIncludeRun(existingPlan.includeRun)
    setRunNotes(existingPlan.runNotes || '')
    setIncludeRow(existingPlan.includeRow)
    setRowNotes(existingPlan.rowNotes || '')
    setGeneralNotes(existingPlan.generalNotes || '')
    setShowPicker(false)
    setLoaded(true)
  }

  function handleToggleExercise(template: ExerciseTemplate) {
    if (selectedIds.has(template.id)) {
      setSelectedIds(prev => { const n = new Set(prev); n.delete(template.id); return n })
      setExercises(prev => prev.filter(e => e.exerciseId !== template.id))
    } else {
      setSelectedIds(prev => new Set([...prev, template.id]))
      setExercises(prev => [...prev, {
        exerciseId: template.id,
        name: template.name,
        targetSets: template.defaultSets,
        targetReps: template.defaultReps,
        targetDuration: template.defaultDuration,
        hasBandResistance: template.hasBandResistance,
      }])
    }
  }

  function handleAddCustomExercise(template: ExerciseTemplate) {
    setSelectedIds(prev => new Set([...prev, template.id]))
    setExercises(prev => [...prev, {
      exerciseId: template.id,
      name: template.name,
      targetSets: template.defaultSets,
      targetReps: template.defaultReps,
      targetDuration: template.defaultDuration,
      hasBandResistance: template.hasBandResistance,
    }])
  }

  function updateExercise(index: number, data: Partial<PlannedExercise>) {
    setExercises(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...data }
      return next
    })
  }

  function removeExercise(index: number) {
    const ex = exercises[index]
    setSelectedIds(prev => { const n = new Set(prev); n.delete(ex.exerciseId); return n })
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= exercises.length) return
    setExercises(prev => {
      const next = [...prev]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!name.trim() || exercises.length === 0) return

    const plan = {
      name: name.trim(),
      createdAt: new Date().toISOString(),
      exercises,
      includeRun,
      runNotes: runNotes || undefined,
      includeRow,
      rowNotes: rowNotes || undefined,
      generalNotes: generalNotes || undefined,
    }

    if (editId) {
      await db.workoutPlans.update(editId, plan)
    } else {
      await db.workoutPlans.add(plan)
    }
    navigate('/plans')
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{editId ? 'Edit Plan' : 'Create Workout Plan'}</h1>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || exercises.length === 0}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      {/* Plan name */}
      <div>
        <Label className="text-sm text-muted-foreground">Plan Name</Label>
        <Input
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="e.g., Tuesday Hybrid — Prehab + Run + Gym"
          className="mt-1"
        />
      </div>

      {/* General notes */}
      <div>
        <Label className="text-sm text-muted-foreground">General Notes (optional)</Label>
        <Textarea
          value={generalNotes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGeneralNotes(e.target.value)}
          placeholder="Overall plan notes, warm-up instructions, etc."
          rows={2}
          className="mt-1"
        />
      </div>

      {/* Exercise picker toggle */}
      <Button variant="outline" className="w-full" onClick={() => setShowPicker(!showPicker)}>
        <Plus className="w-4 h-4 mr-1" />
        {showPicker ? 'Hide Exercise Picker' : 'Add Exercises'}
      </Button>

      {showPicker && (
        <ExercisePicker
          selectedIds={selectedIds}
          onToggle={handleToggleExercise}
          onAddCustomExercise={handleAddCustomExercise}
          includeRun={includeRun}
          onToggleRun={() => setIncludeRun(r => !r)}
          includeRow={includeRow}
          onToggleRow={() => setIncludeRow(r => !r)}
        />
      )}

      {/* Run notes */}
      {includeRun && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm text-muted-foreground mb-1 block">Run Notes</Label>
            <Textarea
              value={runNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRunNotes(e.target.value)}
              placeholder="e.g., Easy jog to gym, 12-15 min. Walk if knee feels off."
              rows={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Row notes */}
      {includeRow && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm text-muted-foreground mb-1 block">Row Notes</Label>
            <Textarea
              value={rowNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRowNotes(e.target.value)}
              placeholder="e.g., 20 min Zone 2, HR 130-145, damper 3-5"
              rows={2}
            />
          </CardContent>
        </Card>
      )}

      {/* Exercise list with detail editing */}
      {exercises.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Exercises ({exercises.length})
          </h2>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <Card key={ex.exerciseId + i}>
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <button
                        type="button"
                        onClick={() => moveExercise(i, -1)}
                        disabled={i === 0}
                        className={cn('text-xs', i === 0 ? 'opacity-20' : 'text-muted-foreground')}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveExercise(i, 1)}
                        disabled={i === exercises.length - 1}
                        className={cn('text-xs', i === exercises.length - 1 ? 'opacity-20' : 'text-muted-foreground')}
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{ex.name}</span>
                        <button type="button" onClick={() => removeExercise(i)} className="p-1 text-muted-foreground hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Target sets/reps/weight */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-muted-foreground">Sets:</label>
                          <Input
                            type="number"
                            value={ex.targetSets}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { targetSets: Number(e.target.value) || 1 })}
                            className="w-14 h-8 text-sm text-center"
                          />
                        </div>
                        {ex.targetReps !== undefined && (
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-muted-foreground">Reps:</label>
                            <Input
                              type="number"
                              value={ex.targetReps}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { targetReps: Number(e.target.value) || 1 })}
                              className="w-14 h-8 text-sm text-center"
                            />
                          </div>
                        )}
                        {ex.targetDuration !== undefined && (
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-muted-foreground">Sec:</label>
                            <Input
                              type="number"
                              value={ex.targetDuration}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { targetDuration: Number(e.target.value) || 1 })}
                              className="w-14 h-8 text-sm text-center"
                            />
                          </div>
                        )}
                        {!ex.hasBandResistance && !ex.targetDuration && (
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-muted-foreground">Wt:</label>
                            <Input
                              type="number"
                              value={ex.targetWeight || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { targetWeight: e.target.value ? Number(e.target.value) : undefined })}
                              placeholder="—"
                              className="w-16 h-8 text-sm text-center"
                            />
                          </div>
                        )}
                      </div>

                      {/* Coaching notes */}
                      <Input
                        value={ex.coachingNotes || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(i, { coachingNotes: e.target.value || undefined })}
                        placeholder="Coaching notes (e.g., watch left knee)"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Save button at bottom */}
      <Button className="w-full h-12 text-base" onClick={handleSave} disabled={!name.trim() || exercises.length === 0}>
        <Save className="w-5 h-5 mr-2" />
        {editId ? 'Update Plan' : 'Save Plan'}
      </Button>
    </div>
  )
}
