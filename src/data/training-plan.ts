import { differenceInWeeks, parseISO, format, addWeeks } from 'date-fns'

export const PLAN_START_DATE = '2026-03-21'  // Saturday
export const RACE_DATE = '2026-12-13'

export type Phase = 1 | 2 | 3 | 4 | 5

export interface WeekPlan {
  week: number
  phase: Phase
  phaseName: string
  isDownWeek: boolean
  weeklyMileage: string       // e.g. "15-18"
  longRunMiles: number
  runDays: number
  notes: string
}

export interface DaySchedule {
  dayOfWeek: number           // 0=Sunday, 1=Monday, ...
  sessions: string[]
}

export const weeklySchedule: DaySchedule[] = [
  { dayOfWeek: 0, sessions: ['Yoga class', 'Optional row'] },
  { dayOfWeek: 1, sessions: ['Rest', 'Extended mobility flow (30-40 min)'] },
  { dayOfWeek: 2, sessions: ['Easy run (35 min)', 'Prehab circuit'] },
  { dayOfWeek: 3, sessions: ['Strength A at fitLOCALfit (5:50 PM)'] },
  { dayOfWeek: 4, sessions: ['Easy run with strides', 'Prehab circuit', 'Concept 2 row (PM)', 'Thoracic mobility'] },
  { dayOfWeek: 5, sessions: ['Strength B at fitLOCALfit (5:00 PM)'] },
  { dayOfWeek: 6, sessions: ['Long run (morning)'] },
]

const trainingPlan: WeekPlan[] = [
  // Phase 1: Base + Prehab (Weeks 1-12)
  { week: 1, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '15', longRunMiles: 8, runDays: 3, notes: '' },
  { week: 2, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '16', longRunMiles: 8, runDays: 3, notes: '' },
  { week: 3, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '18', longRunMiles: 9, runDays: 3, notes: '' },
  { week: 4, phase: 1, phaseName: 'Base + Prehab', isDownWeek: true, weeklyMileage: '13', longRunMiles: 7, runDays: 3, notes: 'Down week' },
  { week: 5, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '18', longRunMiles: 10, runDays: 3, notes: '' },
  { week: 6, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '20', longRunMiles: 10, runDays: 3, notes: '' },
  { week: 7, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '22', longRunMiles: 11, runDays: 3, notes: '' },
  { week: 8, phase: 1, phaseName: 'Base + Prehab', isDownWeek: true, weeklyMileage: '16', longRunMiles: 8, runDays: 3, notes: 'Down week' },
  { week: 9, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '22', longRunMiles: 12, runDays: 3, notes: '' },
  { week: 10, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '24', longRunMiles: 12, runDays: 3, notes: '' },
  { week: 11, phase: 1, phaseName: 'Base + Prehab', isDownWeek: false, weeklyMileage: '25', longRunMiles: 13, runDays: 3, notes: '' },
  { week: 12, phase: 1, phaseName: 'Base + Prehab', isDownWeek: true, weeklyMileage: '18', longRunMiles: 9, runDays: 3, notes: 'Down week' },

  // Phase 2: Aerobic Build (Weeks 13-20)
  { week: 13, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '26', longRunMiles: 14, runDays: 4, notes: 'Add weekly tempo: 2x10 min w/ 3 min jog' },
  { week: 14, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '28', longRunMiles: 14, runDays: 4, notes: '2x10 min tempo w/ 3 min jog' },
  { week: 15, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '30', longRunMiles: 15, runDays: 4, notes: '2x15 min tempo w/ 3 min jog' },
  { week: 16, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '32', longRunMiles: 15, runDays: 4, notes: '2x15 min tempo w/ 3 min jog' },
  { week: 17, phase: 2, phaseName: 'Aerobic Build', isDownWeek: true, weeklyMileage: '22', longRunMiles: 10, runDays: 4, notes: 'Down week - easy' },
  { week: 18, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '32', longRunMiles: 16, runDays: 4, notes: '3x10 min tempo w/ 2 min jog' },
  { week: 19, phase: 2, phaseName: 'Aerobic Build', isDownWeek: false, weeklyMileage: '33', longRunMiles: 16, runDays: 4, notes: '3x10 min tempo w/ 2 min jog' },
  { week: 20, phase: 2, phaseName: 'Aerobic Build', isDownWeek: true, weeklyMileage: '22', longRunMiles: 10, runDays: 4, notes: 'Down week - light fartlek only' },

  // Phase 3: Specificity (Weeks 21-26)
  { week: 21, phase: 3, phaseName: 'Specificity', isDownWeek: false, weeklyMileage: '34', longRunMiles: 16, runDays: 4, notes: '16 mi, last 3 at MP. Heat acclimation starts.' },
  { week: 22, phase: 3, phaseName: 'Specificity', isDownWeek: false, weeklyMileage: '36', longRunMiles: 17, runDays: 5, notes: '17 mi, miles 12-15 at MP' },
  { week: 23, phase: 3, phaseName: 'Specificity', isDownWeek: true, weeklyMileage: '25', longRunMiles: 12, runDays: 4, notes: 'Down week - 12 mi easy' },
  { week: 24, phase: 3, phaseName: 'Specificity', isDownWeek: false, weeklyMileage: '36', longRunMiles: 17, runDays: 5, notes: '17 mi, miles 10-14 at MP' },
  { week: 25, phase: 3, phaseName: 'Specificity', isDownWeek: false, weeklyMileage: '38', longRunMiles: 18, runDays: 5, notes: '18 mi, miles 12-16 at MP' },
  { week: 26, phase: 3, phaseName: 'Specificity', isDownWeek: true, weeklyMileage: '26', longRunMiles: 13, runDays: 4, notes: 'Down week - 13 mi, last 2 at MP' },

  // Phase 4: Marathon Specific (Weeks 27-35)
  { week: 27, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '38', longRunMiles: 18, runDays: 5, notes: '18 mi, miles 10-16 at MP' },
  { week: 28, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '40', longRunMiles: 20, runDays: 5, notes: '20 mi steady easy' },
  { week: 29, phase: 4, phaseName: 'Marathon Specific', isDownWeek: true, weeklyMileage: '28', longRunMiles: 13, runDays: 5, notes: 'Down week - 13 mi easy' },
  { week: 30, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '40', longRunMiles: 20, runDays: 5, notes: 'DRESS REHEARSAL: 20 mi, MP miles 8-18' },
  { week: 31, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '38', longRunMiles: 18, runDays: 5, notes: '18 mi moderate' },
  { week: 32, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '42', longRunMiles: 22, runDays: 5, notes: 'PEAK: 22 mi, miles 14-20 at MP' },
  { week: 33, phase: 4, phaseName: 'Marathon Specific', isDownWeek: true, weeklyMileage: '28', longRunMiles: 14, runDays: 5, notes: 'Down week - 14 mi easy' },
  { week: 34, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '36', longRunMiles: 18, runDays: 5, notes: 'Dress rehearsal #2' },
  { week: 35, phase: 4, phaseName: 'Marathon Specific', isDownWeek: false, weeklyMileage: '30', longRunMiles: 14, runDays: 5, notes: '14 mi easy, transition to taper' },

  // Phase 5: Taper + Race (Weeks 36-38)
  { week: 36, phase: 5, phaseName: 'Taper + Race', isDownWeek: false, weeklyMileage: '30', longRunMiles: 14, runDays: 4, notes: '14 mi long run, short tempo' },
  { week: 37, phase: 5, phaseName: 'Taper + Race', isDownWeek: false, weeklyMileage: '22', longRunMiles: 10, runDays: 3, notes: '10 mi with 3 at MP' },
  { week: 38, phase: 5, phaseName: 'Taper + Race', isDownWeek: false, weeklyMileage: '12', longRunMiles: 0, runDays: 2, notes: 'RACE DAY: Dec 13, 2026' },
]

export function getCurrentWeekNumber(): number {
  const now = new Date()
  const start = parseISO(PLAN_START_DATE)
  const weeks = differenceInWeeks(now, start) + 1
  return Math.max(1, Math.min(38, weeks))
}

export function getWeekStartDate(weekNumber: number): Date {
  const start = parseISO(PLAN_START_DATE)
  return addWeeks(start, weekNumber - 1)
}

export function getWeekDateRange(weekNumber: number): { start: string; end: string } {
  const weekStart = getWeekStartDate(weekNumber)
  const weekEnd = addWeeks(weekStart, 1)
  return {
    start: format(weekStart, 'yyyy-MM-dd'),
    end: format(weekEnd, 'yyyy-MM-dd'),
  }
}

export function getCurrentWeekPlan(): WeekPlan {
  const weekNum = getCurrentWeekNumber()
  return trainingPlan[weekNum - 1] || trainingPlan[0]
}

export function getWeekPlan(weekNumber: number): WeekPlan | undefined {
  return trainingPlan[weekNumber - 1]
}

export function getTodaySchedule(): DaySchedule {
  const today = new Date().getDay()
  return weeklySchedule.find(d => d.dayOfWeek === today) || weeklySchedule[0]
}

export function getDaysUntilRace(): number {
  const now = new Date()
  const race = parseISO(RACE_DATE)
  return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function getAllWeeks(): WeekPlan[] {
  return trainingPlan
}

export function getPhaseWeeks(phase: Phase): WeekPlan[] {
  return trainingPlan.filter(w => w.phase === phase)
}
