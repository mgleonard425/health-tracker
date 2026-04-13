import Dexie, { type Table } from 'dexie'

// --- Core Types ---

export type WorkoutType = 'strength-a' | 'strength-b' | 'prehab' | 'run' | 'row' | 'yoga-mobility' | 'custom'
export type RunType = 'easy' | 'long' | 'tempo' | 'strides' | 'marathon-pace' | 'fartlek'
export type MobilityType = 'daily' | 'extended-monday' | 'yoga-class'
export type MobilityLocation = 'home' | 'yogabeach-sf' | 'ocean-beach-yoga' | 'fitlocalfit'
export type BandResistance = 'light' | 'medium' | 'heavy'
export type Severity = 'mild' | 'moderate' | 'severe'
export type SymptomType = 'tightness' | 'pain'
export type MealTimeOfDay = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre-workout' | 'post-workout'
export type MealSource = 'home-cooked' | 'work-cafeteria' | 'restaurant' | 'takeout'

// --- Entities ---

export interface Workout {
  id?: number
  date: string           // YYYY-MM-DD
  type: WorkoutType
  startedAt: string      // ISO datetime
  completedAt?: string
  notes?: string
  planId?: number        // FK to WorkoutPlan if started from a plan
}

export interface ExerciseSet {
  id?: number
  workoutId: number
  exerciseId: string     // stable ID from template
  setNumber: number
  weight?: number
  weightUnit: 'lbs' | 'kg'
  reps?: number
  duration?: number      // seconds (planks, holds)
  bandResistance?: BandResistance
  completed: boolean
  notes?: string
}

export interface RunDetail {
  id?: number
  workoutId: number
  distanceMiles: number
  durationMinutes: number
  pacePerMile?: number   // auto-calculated seconds
  runType: RunType
  route?: string
  feelScale: number      // 1-5
  symptoms?: string[]    // body area keys
}

export interface RowDetail {
  id?: number
  workoutId: number
  durationMinutes: number
  distanceMeters?: number
  avgHeartRate?: number
  strokeRate?: number
}

export interface YogaMobilityDetail {
  id?: number
  workoutId: number
  durationMinutes: number
  mobilityType: MobilityType
  location?: MobilityLocation
}

export interface BodyAreaStatus {
  area: string
  type: SymptomType
  severity: Severity
}

export interface DailyCheckIn {
  id?: number
  date: string           // YYYY-MM-DD, unique
  sleepHours: number
  sleepQuality: number   // 1-5
  energyLevel: number    // 1-5
  bodyStatus: BodyAreaStatus[]
  hydrationOz: number
  microIron: boolean
  microB12: boolean
  microCalcium: boolean
  microVitaminD: boolean
  notes?: string
}

export interface MealLog {
  id?: number
  date: string           // YYYY-MM-DD
  timeOfDay: MealTimeOfDay
  description: string
  source?: MealSource
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  isFavorite?: boolean
}

export interface FavoriteMeal {
  id?: number
  name: string
  calories?: number
  proteinG?: number
  carbsG?: number
  fatG?: number
  source?: MealSource
  usageCount: number
}

export interface HealthMetrics {
  id?: number
  date: string              // YYYY-MM-DD, unique
  restingHeartRate?: number
  heartRateVariability?: number  // ms
  sleepDurationMinutes?: number
  sleepStages?: { deep?: number; core?: number; rem?: number; awake?: number }
  vo2Max?: number
  steps?: number
  activeCalories?: number
}

export interface CoachingNote {
  id?: number
  createdAt: string         // ISO datetime
  text: string
  dismissed: boolean
}

export interface CoachConversation {
  id?: number
  title: string              // first 50 chars of first user message
  createdAt: string          // ISO datetime
  updatedAt: string          // ISO datetime
}

export interface CoachMessage {
  id?: number
  conversationId: number     // FK to CoachConversation
  role: 'user' | 'assistant'
  content: string
  createdAt: string          // ISO datetime
}

export interface WatchMetrics {
  id?: number
  date: string              // YYYY-MM-DD
  workoutId?: number        // FK to Workout, if we can match it
  watchWorkoutType: string  // "Running", "Traditional Strength Training", etc.
  startTime: string         // ISO datetime
  endTime: string           // ISO datetime
  durationMinutes: number
  activeCalories?: number
  totalCalories?: number
  avgHeartRate?: number
  maxHeartRate?: number
  distanceMeters?: number
  rawData?: string          // full JSON from Shortcuts for debugging
}

export interface PlannedExercise {
  exerciseId: string       // stable ID or custom-generated ID
  name: string
  targetSets: number
  targetReps?: number
  targetDuration?: number  // seconds
  targetWeight?: number
  hasBandResistance?: boolean
  coachingNotes?: string   // "watch left knee tracking", "slow 3-4 sec eccentric"
}

export type PlanSectionType = 'exercises' | 'run' | 'row'

export interface SupersetGroup {
  id: string              // "group-{timestamp}"
  exerciseIds: string[]   // ordered exercise IDs in this group
}

export interface PlanSection {
  id: string               // unique within the plan (e.g., "section-1")
  name: string             // "Warmup", "Cardio A", "Strength", etc.
  type: PlanSectionType
  exercises: PlannedExercise[]  // populated for 'exercises' type
  notes?: string           // section-level notes (run/row instructions, or general notes)
  supersets?: SupersetGroup[]  // optional exercise groupings for round-based logging
}

export interface WorkoutPlan {
  id?: number
  name: string
  createdAt: string        // ISO datetime
  sections: PlanSection[]
  generalNotes?: string    // overall plan notes
}

// --- Database ---

class HealthTrackerDB extends Dexie {
  workouts!: Table<Workout>
  exerciseSets!: Table<ExerciseSet>
  runDetails!: Table<RunDetail>
  rowDetails!: Table<RowDetail>
  yogaMobilityDetails!: Table<YogaMobilityDetail>
  dailyCheckIns!: Table<DailyCheckIn>
  mealLogs!: Table<MealLog>
  favoriteMeals!: Table<FavoriteMeal>
  workoutPlans!: Table<WorkoutPlan>
  watchMetrics!: Table<WatchMetrics>
  healthMetrics!: Table<HealthMetrics>
  coachingNotes!: Table<CoachingNote>
  coachConversations!: Table<CoachConversation>
  coachMessages!: Table<CoachMessage>

  constructor() {
    super('HealthTrackerDB')
    this.version(1).stores({
      workouts: '++id, date, type, [date+type]',
      exerciseSets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
      runDetails: '++id, workoutId',
      rowDetails: '++id, workoutId',
      yogaMobilityDetails: '++id, workoutId',
      dailyCheckIns: '++id, &date',
      mealLogs: '++id, date, [date+timeOfDay]',
      favoriteMeals: '++id, name, usageCount',
    })
    this.version(2).stores({
      workouts: '++id, date, type, [date+type]',
      exerciseSets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
      runDetails: '++id, workoutId',
      rowDetails: '++id, workoutId',
      yogaMobilityDetails: '++id, workoutId',
      dailyCheckIns: '++id, &date',
      mealLogs: '++id, date, [date+timeOfDay]',
      favoriteMeals: '++id, name, usageCount',
      workoutPlans: '++id, name, createdAt',
    })
    this.version(3).stores({
      workouts: '++id, date, type, [date+type]',
      exerciseSets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
      runDetails: '++id, workoutId',
      rowDetails: '++id, workoutId',
      yogaMobilityDetails: '++id, workoutId',
      dailyCheckIns: '++id, &date',
      mealLogs: '++id, date, [date+timeOfDay]',
      favoriteMeals: '++id, name, usageCount',
      workoutPlans: '++id, name, createdAt',
      watchMetrics: '++id, date, workoutId, startTime',
    })
    this.version(4).stores({
      workouts: '++id, date, type, [date+type]',
      exerciseSets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
      runDetails: '++id, workoutId',
      rowDetails: '++id, workoutId',
      yogaMobilityDetails: '++id, workoutId',
      dailyCheckIns: '++id, &date',
      mealLogs: '++id, date, [date+timeOfDay]',
      favoriteMeals: '++id, name, usageCount',
      workoutPlans: '++id, name, createdAt',
      watchMetrics: '++id, date, workoutId, startTime',
      healthMetrics: '++id, &date',
      coachingNotes: '++id, createdAt',
    })
    this.version(5).stores({
      workouts: '++id, date, type, [date+type]',
      exerciseSets: '++id, workoutId, exerciseId, [workoutId+exerciseId]',
      runDetails: '++id, workoutId',
      rowDetails: '++id, workoutId',
      yogaMobilityDetails: '++id, workoutId',
      dailyCheckIns: '++id, &date',
      mealLogs: '++id, date, [date+timeOfDay]',
      favoriteMeals: '++id, name, usageCount',
      workoutPlans: '++id, name, createdAt',
      watchMetrics: '++id, date, workoutId, startTime',
      healthMetrics: '++id, &date',
      coachingNotes: '++id, createdAt',
      coachConversations: '++id, updatedAt',
      coachMessages: '++id, conversationId',
    })
  }
}

export const db = new HealthTrackerDB()

// --- Helper Queries ---

export async function getLastWorkoutOfType(type: WorkoutType): Promise<Workout | undefined> {
  return db.workouts.where('type').equals(type).reverse().sortBy('date').then(w => w[0])
}

export async function getExerciseSetsForWorkout(workoutId: number): Promise<ExerciseSet[]> {
  return db.exerciseSets.where('workoutId').equals(workoutId).sortBy('setNumber')
}

export async function getLastExerciseData(exerciseId: string, workoutType: WorkoutType): Promise<ExerciseSet[]> {
  const lastWorkout = await getLastWorkoutOfType(workoutType)
  if (!lastWorkout?.id) return []
  return db.exerciseSets
    .where('[workoutId+exerciseId]')
    .equals([lastWorkout.id, exerciseId])
    .sortBy('setNumber')
}

export async function getMealsForDate(date: string): Promise<MealLog[]> {
  return db.mealLogs.where('date').equals(date).toArray()
}

export async function getCheckInForDate(date: string): Promise<DailyCheckIn | undefined> {
  return db.dailyCheckIns.where('date').equals(date).first()
}

export async function getWorkoutsForDateRange(startDate: string, endDate: string): Promise<Workout[]> {
  return db.workouts.where('date').between(startDate, endDate, true, true).toArray()
}

export async function getFavoriteMeals(): Promise<FavoriteMeal[]> {
  return db.favoriteMeals.orderBy('usageCount').reverse().toArray()
}
