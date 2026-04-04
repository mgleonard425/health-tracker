import Dexie, { type Table } from 'dexie'

// --- Core Types ---

export type WorkoutType = 'strength-a' | 'strength-b' | 'prehab' | 'run' | 'row' | 'yoga-mobility'
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
