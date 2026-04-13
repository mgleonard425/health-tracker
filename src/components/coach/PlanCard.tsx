import { useState } from 'react'
import { CheckCircle, Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/db'
import type { WorkoutPlan, PlanSection } from '@/db'

interface ParsedPlan {
  name: string
  sections: PlanSection[]
  generalNotes?: string
}

/**
 * Tries to extract a WorkoutPlan JSON from a message's code blocks.
 */
export function extractPlanFromMessage(content: string): ParsedPlan | null {
  // Match ```json ... ``` or ``` ... ``` blocks containing "sections"
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const block = match[1].trim()
    if (!block.includes('"sections"')) continue
    try {
      const parsed = JSON.parse(block)
      if (
        typeof parsed.name === 'string' &&
        Array.isArray(parsed.sections) &&
        parsed.sections.length > 0
      ) {
        return parsed as ParsedPlan
      }
    } catch {
      continue
    }
  }
  return null
}

interface PlanCardProps {
  plan: ParsedPlan
}

export function PlanCard({ plan }: PlanCardProps) {
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const existing = await db.workoutPlans.where('name').equals(plan.name).first()
    if (existing) {
      await db.workoutPlans.update(existing.id!, {
        sections: plan.sections,
        generalNotes: plan.generalNotes,
        createdAt: new Date().toISOString(),
      })
    } else {
      await db.workoutPlans.add({
        name: plan.name,
        sections: plan.sections,
        generalNotes: plan.generalNotes,
        createdAt: new Date().toISOString(),
      } as WorkoutPlan)
    }
    setSaved(true)
  }

  const totalExercises = plan.sections.reduce((s, sec) => s + sec.exercises.length, 0)

  return (
    <Card className="my-2 border-emerald-800">
      <CardContent className="py-3">
        <div className="flex items-start gap-2">
          <Dumbbell className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {plan.sections.length} sections, {totalExercises} exercises
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saved}
            className={saved ? 'bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            {saved ? (
              <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Saved</>
            ) : (
              'Save Plan'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
