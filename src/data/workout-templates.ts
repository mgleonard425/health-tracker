export interface ExerciseTemplate {
  id: string
  name: string
  defaultSets: number
  defaultReps?: number
  defaultDuration?: number  // seconds
  defaultWeight?: number    // lbs
  weightUnit: 'lbs' | 'kg'
  hasBandResistance?: boolean
  isOptional?: boolean
  notes?: string
}

export const strengthAExercises: ExerciseTemplate[] = [
  { id: 'db-bench-press', name: 'DB Bench Press', defaultSets: 3, defaultReps: 12, weightUnit: 'lbs' },
  { id: 'single-arm-db-row', name: 'Single-Arm DB Row', defaultSets: 3, defaultReps: 12, weightUnit: 'lbs' },
  { id: 'half-kneeling-ohp', name: 'Half-Kneeling Overhead Press', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'cable-face-pulls', name: 'Cable Face Pulls', defaultSets: 3, defaultReps: 15, weightUnit: 'lbs' },
  { id: 'farmer-carries', name: 'Farmer\'s Carries / Suitcase Holds', defaultSets: 3, defaultDuration: 30, weightUnit: 'lbs' },
  { id: 'pallof-press', name: 'Pallof Press', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'dead-bugs', name: 'Dead Bugs', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'hanging-leg-raises', name: 'Hanging Leg Raises / Ab Wheel', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
]

export const strengthBExercises: ExerciseTemplate[] = [
  { id: 'goblet-squat', name: 'Goblet Squat', defaultSets: 3, defaultReps: 12, weightUnit: 'lbs', notes: 'Progress to front squat' },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'hip-abduction-banded', name: 'Side-Lying Hip Abduction (Banded)', defaultSets: 3, defaultReps: 15, weightUnit: 'lbs', hasBandResistance: true },
  { id: 'clamshells-banded', name: 'Clamshells (Banded)', defaultSets: 3, defaultReps: 15, weightUnit: 'lbs', hasBandResistance: true },
  { id: 'single-leg-glute-bridge', name: 'Single-Leg Glute Bridge', defaultSets: 3, defaultReps: 12, weightUnit: 'lbs' },
  { id: 'step-downs', name: 'Step-Downs', defaultSets: 3, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'copenhagen-plank', name: 'Copenhagen Plank', defaultSets: 3, defaultDuration: 20, weightUnit: 'lbs' },
]

export const prehabExercises: ExerciseTemplate[] = [
  { id: 'prehab-hip-abduction', name: 'Side-Lying Hip Abduction (Band)', defaultSets: 2, defaultReps: 15, weightUnit: 'lbs', hasBandResistance: true },
  { id: 'prehab-clamshells', name: 'Clamshells (Band)', defaultSets: 2, defaultReps: 15, weightUnit: 'lbs', hasBandResistance: true },
  { id: 'prehab-glute-bridge', name: 'Single-Leg Glute Bridge', defaultSets: 2, defaultReps: 12, weightUnit: 'lbs' },
  { id: 'prehab-step-downs', name: 'Step-Downs', defaultSets: 2, defaultReps: 10, weightUnit: 'lbs', isOptional: true, notes: 'Only on Strength B days' },
  { id: 'prehab-copenhagen', name: 'Copenhagen Plank', defaultSets: 2, defaultDuration: 20, weightUnit: 'lbs', isOptional: true, notes: 'Only on Strength B days' },
]

export const dailyMobilityExercises: ExerciseTemplate[] = [
  { id: 'foam-roller-thoracic', name: 'Foam Roller Thoracic Extension', defaultSets: 1, defaultDuration: 90, weightUnit: 'lbs' },
  { id: 'cat-cow', name: 'Cat-Cow', defaultSets: 1, defaultReps: 10, weightUnit: 'lbs' },
  { id: 'thread-the-needle', name: 'Thread the Needle', defaultSets: 1, defaultReps: 8, weightUnit: 'lbs', notes: '8 each side' },
  { id: 'wall-slides', name: 'Wall Slides', defaultSets: 1, defaultReps: 10, weightUnit: 'lbs' },
  { id: '90-90-hip-switches', name: '90/90 Hip Switches', defaultSets: 1, defaultReps: 8, weightUnit: 'lbs', notes: '8 each side' },
  { id: 'hk-hip-flexor-stretch', name: 'Half-Kneeling Hip Flexor Stretch + Overhead Reach', defaultSets: 1, defaultDuration: 45, weightUnit: 'lbs', notes: '45 sec each side' },
  { id: 'sl-rdl-hold', name: 'Single-Leg RDL Hold', defaultSets: 2, defaultDuration: 18, weightUnit: 'lbs', notes: '15-20 sec each side' },
]

export function getExercisesForWorkoutType(type: string): ExerciseTemplate[] {
  switch (type) {
    case 'strength-a': return strengthAExercises
    case 'strength-b': return strengthBExercises
    case 'prehab': return prehabExercises
    default: return []
  }
}

export const BODY_AREAS = [
  { group: 'Left Side', areas: [
    { id: 'left-it-band', name: 'IT Band' },
    { id: 'left-knee', name: 'Knee' },
    { id: 'left-hip', name: 'Hip' },
    { id: 'left-hamstring', name: 'Hamstring' },
    { id: 'left-calf', name: 'Calf' },
    { id: 'left-shoulder', name: 'Shoulder' },
  ]},
  { group: 'Right Side', areas: [
    { id: 'right-it-band', name: 'IT Band' },
    { id: 'right-knee', name: 'Knee' },
    { id: 'right-hip', name: 'Hip' },
    { id: 'right-hamstring', name: 'Hamstring' },
    { id: 'right-calf', name: 'Calf' },
    { id: 'right-shoulder', name: 'Shoulder' },
  ]},
  { group: 'Core / Back', areas: [
    { id: 'lower-back-left', name: 'Lower Back (L)' },
    { id: 'lower-back-right', name: 'Lower Back (R)' },
    { id: 'upper-back-left', name: 'Upper Back (L)' },
    { id: 'upper-back-right', name: 'Upper Back (R)' },
    { id: 'neck-left', name: 'Neck (L)' },
    { id: 'neck-right', name: 'Neck (R)' },
    { id: 'core', name: 'Core' },
  ]},
]
