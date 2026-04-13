import { format, subDays } from 'date-fns'
import { db } from '@/db'
import { KNOWLEDGE_CATEGORIES } from '@/db'
import { getCurrentWeekNumber, getCurrentWeekPlan, getDaysUntilRace, getTodaySchedule } from '@/data/training-plan'

/**
 * Builds a structured markdown summary of knowledge base + recent training data from Dexie.
 * Sent with each coaching API call so the agent has current context.
 */
export async function buildCoachingContext(): Promise<string> {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const fourteenDaysAgo = format(subDays(now, 14), 'yyyy-MM-dd')
  const sections: string[] = []

  // --- Knowledge base entries ---
  const allEntries = await db.knowledgeEntries.toArray()
  if (allEntries.length > 0) {
    const byCategory = new Map<string, typeof allEntries>()
    for (const entry of allEntries) {
      const existing = byCategory.get(entry.category) || []
      existing.push(entry)
      byCategory.set(entry.category, existing)
    }

    const knowledgeLines: string[] = []
    const categoryLabels = new Map(KNOWLEDGE_CATEGORIES.map(c => [c.id, c.label]))

    for (const [catId, entries] of byCategory) {
      const label = categoryLabels.get(catId) || catId
      knowledgeLines.push(`### ${label}`)
      for (const entry of entries) {
        knowledgeLines.push(`**${entry.title}**`)
        knowledgeLines.push(entry.content)
        knowledgeLines.push('')
      }
    }
    sections.push(`## KNOWLEDGE BASE\n\n${knowledgeLines.join('\n')}`)
  }

  // --- Current plan status ---
  const weekNumber = getCurrentWeekNumber()
  const weekPlan = getCurrentWeekPlan()
  const daysUntilRace = getDaysUntilRace()
  const todaySchedule = getTodaySchedule()

  sections.push(`## Current Status
- **Today**: ${format(now, 'EEEE, MMMM d, yyyy')}
- **Training week**: ${weekNumber} of 38 — Phase ${weekPlan.phase}: ${weekPlan.phaseName}${weekPlan.isDownWeek ? ' (DOWN WEEK)' : ''}
- **Days until race**: ${daysUntilRace}
- **This week's plan**: ${weekPlan.weeklyMileage} mi total, ${weekPlan.longRunMiles} mi long run, ${weekPlan.runDays} run days${weekPlan.notes ? ` — ${weekPlan.notes}` : ''}
- **Today's schedule**: ${todaySchedule.sessions.join(', ')}`)

  // --- Recent workouts (14 days) ---
  const workouts = await db.workouts.where('date').between(fourteenDaysAgo, today, true, true).reverse().sortBy('date')

  if (workouts.length > 0) {
    const workoutLines: string[] = []
    for (const w of workouts) {
      let detail = `- **${w.date}** — ${w.type}`
      if (w.completedAt) {
        const mins = Math.round((new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 60000)
        if (mins > 0) detail += ` (${mins} min)`
      }

      // Run details
      if (w.id) {
        const runs = await db.runDetails.where('workoutId').equals(w.id).toArray()
        for (const r of runs) {
          const pace = r.pacePerMile ? `${Math.floor(r.pacePerMile / 60)}:${String(Math.round(r.pacePerMile % 60)).padStart(2, '0')}/mi` : ''
          detail += ` | ${r.runType} run: ${r.distanceMiles} mi, ${r.durationMinutes} min${pace ? `, ${pace}` : ''}, feel ${r.feelScale}/5`
          if (r.symptoms?.length) detail += `, symptoms: ${r.symptoms.join(', ')}`
        }

        // Row details
        const rows = await db.rowDetails.where('workoutId').equals(w.id).toArray()
        for (const r of rows) {
          detail += ` | Row: ${r.durationMinutes} min`
          if (r.distanceMeters) detail += `, ${r.distanceMeters}m`
          if (r.avgHeartRate) detail += `, avg HR ${r.avgHeartRate}`
        }

        // Exercise sets (summarize by exercise)
        const sets = await db.exerciseSets.where('workoutId').equals(w.id).toArray()
        if (sets.length > 0) {
          const byExercise = new Map<string, typeof sets>()
          for (const s of sets) {
            const existing = byExercise.get(s.exerciseId) || []
            existing.push(s)
            byExercise.set(s.exerciseId, existing)
          }
          const exerciseSummaries: string[] = []
          for (const [, exSets] of byExercise) {
            const completed = exSets.filter(s => s.completed)
            if (completed.length === 0) continue
            const first = completed[0]
            const name = first.exerciseId
            const setCount = completed.length
            if (first.weight) {
              exerciseSummaries.push(`${name} ${setCount}×${first.reps || '?'}@${first.weight}${first.weightUnit}`)
            } else if (first.duration) {
              exerciseSummaries.push(`${name} ${setCount}×${first.duration}s`)
            } else if (first.reps) {
              exerciseSummaries.push(`${name} ${setCount}×${first.reps}`)
            } else if (first.bandResistance) {
              exerciseSummaries.push(`${name} ${setCount}×${first.reps || '?'} (${first.bandResistance} band)`)
            }
          }
          if (exerciseSummaries.length > 0) {
            detail += `\n  Exercises: ${exerciseSummaries.join(', ')}`
          }
        }
      }

      if (w.notes) detail += `\n  Notes: ${w.notes}`
      workoutLines.push(detail)
    }
    sections.push(`## Recent Workouts (14 days)\n${workoutLines.join('\n')}`)
  } else {
    sections.push('## Recent Workouts (14 days)\nNo workouts logged in the last 14 days.')
  }

  // --- Health metrics (14 days) ---
  const healthMetrics = await db.healthMetrics.where('date').between(fourteenDaysAgo, today, true, true).reverse().sortBy('date')

  if (healthMetrics.length > 0) {
    const rows = healthMetrics.map(m => {
      const sleep = m.sleepDurationMinutes ? `${Math.floor(m.sleepDurationMinutes / 60)}h ${m.sleepDurationMinutes % 60}m` : '-'
      return `| ${m.date} | ${m.restingHeartRate ?? '-'} | ${m.heartRateVariability ?? '-'} | ${sleep} | ${m.vo2Max ?? '-'} | ${m.steps?.toLocaleString() ?? '-'} | ${m.activeCalories ?? '-'} |`
    })
    sections.push(`## Health Metrics (14 days)
| Date | RHR | HRV (ms) | Sleep | VO2 Max | Steps | Active Cal |
|------|-----|----------|-------|---------|-------|------------|
${rows.join('\n')}`)
  }

  // --- Daily check-ins (14 days) ---
  const checkIns = await db.dailyCheckIns.where('date').between(fourteenDaysAgo, today, true, true).reverse().sortBy('date')

  if (checkIns.length > 0) {
    const checkInLines = checkIns.map(c => {
      let line = `- **${c.date}**: Sleep ${c.sleepHours}h (quality ${c.sleepQuality}/5), Energy ${c.energyLevel}/5, Hydration ${c.hydrationOz}oz`
      if (c.bodyStatus?.length) {
        const symptoms = c.bodyStatus.map(s => `${s.area} (${s.type}, ${s.severity})`).join(', ')
        line += `\n  Body: ${symptoms}`
      }
      if (c.notes) line += `\n  Notes: ${c.notes}`
      return line
    })
    sections.push(`## Daily Check-ins (14 days)\n${checkInLines.join('\n')}`)
  }

  // --- Nutrition (7 days) ---
  const mealDates: string[] = []
  for (let i = 0; i < 7; i++) {
    mealDates.push(format(subDays(now, i), 'yyyy-MM-dd'))
  }

  const mealLines: string[] = []
  for (const date of mealDates) {
    const meals = await db.mealLogs.where('date').equals(date).toArray()
    if (meals.length === 0) continue
    const totalProtein = meals.reduce((s, m) => s + (m.proteinG || 0), 0)
    const totalCalories = meals.reduce((s, m) => s + (m.calories || 0), 0)
    mealLines.push(`- **${date}**: ${Math.round(totalProtein)}g protein, ${Math.round(totalCalories)} cal (${meals.length} meals)`)
  }
  if (mealLines.length > 0) {
    sections.push(`## Nutrition (7 days)\n${mealLines.join('\n')}`)
  }

  // --- Saved workout plans ---
  const plans = await db.workoutPlans.toArray()
  if (plans.length > 0) {
    const planLines = plans.map(p => {
      const totalExercises = p.sections.reduce((s, sec) => s + sec.exercises.length, 0)
      return `- "${p.name}" — ${p.sections.length} sections, ${totalExercises} exercises`
    })
    sections.push(`## Saved Workout Plans\n${planLines.join('\n')}`)
  }

  return sections.join('\n\n')
}
