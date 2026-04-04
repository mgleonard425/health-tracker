import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ExercisePicker } from '@/components/workout/ExercisePicker'
import { db } from '@/db'
import { cn } from '@/lib/utils'
import type { ExerciseTemplate } from '@/data/workout-templates'
import type { PlanSection, PlannedExercise, PlanSectionType } from '@/db'

let sectionCounter = 0
function nextSectionId() {
  return `section-${Date.now()}-${++sectionCounter}`
}

function emptySection(type: PlanSectionType = 'exercises', name = ''): PlanSection {
  return { id: nextSectionId(), name, type, exercises: [] }
}

const sectionPresets = [
  { label: 'Warmup', type: 'exercises' as PlanSectionType },
  { label: 'Strength', type: 'exercises' as PlanSectionType },
  { label: 'Core Circuit', type: 'exercises' as PlanSectionType },
  { label: 'Prehab', type: 'exercises' as PlanSectionType },
  { label: 'Mobility', type: 'exercises' as PlanSectionType },
  { label: 'Run', type: 'run' as PlanSectionType },
  { label: 'Row', type: 'row' as PlanSectionType },
]

export function PlanWorkoutPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const editId = id ? Number(id) : undefined

  const existingPlan = useLiveQuery(
    () => editId ? db.workoutPlans.get(editId) : undefined,
    [editId]
  )

  const [name, setName] = useState('')
  const [sections, setSections] = useState<PlanSection[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Load existing plan
  if (existingPlan && !loaded) {
    setName(existingPlan.name)
    setSections(existingPlan.sections || [])
    setGeneralNotes(existingPlan.generalNotes || '')
    setLoaded(true)
  }

  // Collect all selected exercise IDs across all sections
  const allSelectedIds = new Set(
    sections.flatMap(s => s.exercises.map(e => e.exerciseId))
  )

  function addSection(type: PlanSectionType, presetName?: string) {
    const section = emptySection(type, presetName || '')
    setSections(prev => [...prev, section])
    setActiveSectionId(section.id)
  }

  function updateSection(sectionId: string, data: Partial<PlanSection>) {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...data } : s))
  }

  function removeSection(sectionId: string) {
    setSections(prev => prev.filter(s => s.id !== sectionId))
    if (activeSectionId === sectionId) setActiveSectionId(null)
  }

  function moveSection(index: number, direction: -1 | 1) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sections.length) return
    setSections(prev => {
      const next = [...prev]
      ;[next[index], next[newIndex]] = [next[newIndex], next[index]]
      return next
    })
  }

  // Exercise management within active section
  function handleToggleExercise(template: ExerciseTemplate) {
    if (!activeSectionId) return
    setSections(prev => prev.map(s => {
      if (s.id !== activeSectionId) return s
      const exists = s.exercises.find(e => e.exerciseId === template.id)
      if (exists) {
        return { ...s, exercises: s.exercises.filter(e => e.exerciseId !== template.id) }
      }
      return {
        ...s,
        exercises: [...s.exercises, {
          exerciseId: template.id,
          name: template.name,
          targetSets: template.defaultSets,
          targetReps: template.defaultReps,
          targetDuration: template.defaultDuration,
          hasBandResistance: template.hasBandResistance,
        }],
      }
    }))
  }

  function handleAddCustomExercise(template: ExerciseTemplate) {
    if (!activeSectionId) return
    setSections(prev => prev.map(s => {
      if (s.id !== activeSectionId) return s
      return {
        ...s,
        exercises: [...s.exercises, {
          exerciseId: template.id,
          name: template.name,
          targetSets: template.defaultSets,
          targetReps: template.defaultReps,
          targetDuration: template.defaultDuration,
          hasBandResistance: template.hasBandResistance,
        }],
      }
    }))
  }

  function updateExercise(sectionId: string, exIndex: number, data: Partial<PlannedExercise>) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const exercises = [...s.exercises]
      exercises[exIndex] = { ...exercises[exIndex], ...data }
      return { ...s, exercises }
    }))
  }

  function removeExercise(sectionId: string, exIndex: number) {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      return { ...s, exercises: s.exercises.filter((_, i) => i !== exIndex) }
    }))
  }

  async function handleSave() {
    if (!name.trim() || sections.length === 0) return
    const plan = {
      name: name.trim(),
      createdAt: new Date().toISOString(),
      sections,
      generalNotes: generalNotes || undefined,
    }
    if (editId) {
      await db.workoutPlans.update(editId, plan)
    } else {
      await db.workoutPlans.add(plan)
    }
    navigate('/plans')
  }

  const totalExercises = sections.reduce((sum, s) => sum + s.exercises.length, 0)
  const hasRun = sections.some(s => s.type === 'run')
  const hasRow = sections.some(s => s.type === 'row')

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{editId ? 'Edit Plan' : 'Create Workout Plan'}</h1>
        <Button size="sm" onClick={handleSave} disabled={!name.trim() || sections.length === 0}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      {/* Plan name */}
      <Input
        value={name}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        placeholder="Plan name (e.g., Tuesday Hybrid)"
        className="text-base"
      />

      {/* General notes */}
      <Textarea
        value={generalNotes}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGeneralNotes(e.target.value)}
        placeholder="General notes (optional)"
        rows={2}
        className="text-sm"
      />

      {/* Add section buttons */}
      <div>
        <Label className="text-sm text-muted-foreground mb-2 block">Add Section</Label>
        <div className="flex flex-wrap gap-2">
          {sectionPresets.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addSection(preset.type, preset.label)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation hover:bg-secondary/70"
            >
              + {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addSection('exercises')}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-secondary text-muted-foreground transition-colors touch-manipulation hover:bg-secondary/70"
          >
            + Custom Section
          </button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, sectionIndex) => {
        const isActive = activeSectionId === section.id
        const isExerciseSection = section.type === 'exercises'

        return (
          <Card key={section.id} className={cn(isActive && 'border-primary')}>
            {/* Section header */}
            <button
              type="button"
              className="w-full px-4 py-3 flex items-center justify-between text-left"
              onClick={() => setActiveSectionId(isActive ? null : section.id)}
            >
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionIndex, -1) }}
                    className={cn('text-xs leading-none', sectionIndex === 0 ? 'opacity-20' : 'text-muted-foreground')}>▲</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); moveSection(sectionIndex, 1) }}
                    className={cn('text-xs leading-none', sectionIndex === sections.length - 1 ? 'opacity-20' : 'text-muted-foreground')}>▼</button>
                </div>
                <div>
                  <span className={cn('font-medium text-sm', !section.name && 'text-muted-foreground italic')}>
                    {section.name || 'Untitled Section'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {section.type === 'run' ? '🏃 Run' : section.type === 'row' ? '🚣 Row' : `${section.exercises.length} exercises`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); removeSection(section.id) }}
                  className="p-1 text-muted-foreground hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
                {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Section content (when active) */}
            {isActive && (
              <CardContent className="pt-0 pb-4 space-y-3">
                {/* Section name */}
                <Input
                  value={section.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSection(section.id, { name: e.target.value })}
                  placeholder="Section name"
                  className="text-sm h-9"
                />

                {/* Section notes (for run/row, or general) */}
                <Textarea
                  value={section.notes || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSection(section.id, { notes: e.target.value || undefined })}
                  placeholder={
                    section.type === 'run' ? 'Run instructions (e.g., Easy jog to gym, 12-15 min)'
                    : section.type === 'row' ? 'Row instructions (e.g., 20 min Zone 2, HR 130-145)'
                    : 'Section notes (optional)'
                  }
                  rows={2}
                  className="text-sm"
                />

                {/* Exercise list within section */}
                {isExerciseSection && section.exercises.length > 0 && (
                  <div className="space-y-2">
                    {section.exercises.map((ex, exIndex) => (
                      <div key={ex.exerciseId + exIndex} className="bg-secondary rounded-lg px-3 py-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{ex.name}</span>
                          <button type="button" onClick={() => removeExercise(section.id, exIndex)}
                            className="p-1 text-muted-foreground hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-muted-foreground">Sets:</label>
                            <Input type="number" value={ex.targetSets}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(section.id, exIndex, { targetSets: Number(e.target.value) || 1 })}
                              className="w-14 h-7 text-xs text-center" />
                          </div>
                          {ex.targetReps !== undefined && (
                            <div className="flex items-center gap-1">
                              <label className="text-xs text-muted-foreground">Reps:</label>
                              <Input type="number" value={ex.targetReps}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(section.id, exIndex, { targetReps: Number(e.target.value) || 1 })}
                                className="w-14 h-7 text-xs text-center" />
                            </div>
                          )}
                          {ex.targetDuration !== undefined && (
                            <div className="flex items-center gap-1">
                              <label className="text-xs text-muted-foreground">Sec:</label>
                              <Input type="number" value={ex.targetDuration}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(section.id, exIndex, { targetDuration: Number(e.target.value) || 1 })}
                                className="w-14 h-7 text-xs text-center" />
                            </div>
                          )}
                          {!ex.hasBandResistance && !ex.targetDuration && (
                            <div className="flex items-center gap-1">
                              <label className="text-xs text-muted-foreground">Wt:</label>
                              <Input type="number" value={ex.targetWeight || ''} placeholder="—"
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(section.id, exIndex, { targetWeight: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-16 h-7 text-xs text-center" />
                            </div>
                          )}
                        </div>
                        <Input value={ex.coachingNotes || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateExercise(section.id, exIndex, { coachingNotes: e.target.value || undefined })}
                          placeholder="Coaching notes (e.g., watch left knee)"
                          className="text-xs h-7" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Exercise picker (only for exercise sections) */}
                {isExerciseSection && (
                  <ExercisePicker
                    selectedIds={allSelectedIds}
                    onToggle={handleToggleExercise}
                    onAddCustomExercise={handleAddCustomExercise}
                    includeRun={false}
                    onToggleRun={() => {}}
                    includeRow={false}
                    onToggleRow={() => {}}
                  />
                )}
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Summary + Save */}
      {sections.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {sections.length} sections &middot; {totalExercises} exercises
          {hasRun ? ' + Run' : ''}{hasRow ? ' + Row' : ''}
        </div>
      )}

      <Button className="w-full h-12 text-base" onClick={handleSave} disabled={!name.trim() || sections.length === 0}>
        <Save className="w-5 h-5 mr-2" />
        {editId ? 'Update Plan' : 'Save Plan'}
      </Button>
    </div>
  )
}
