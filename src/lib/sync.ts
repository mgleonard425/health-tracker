import { db } from '@/db'

const SYNC_TOKEN_KEY = 'health-tracker-sync-token'
const SYNC_ENABLED_KEY = 'health-tracker-sync-enabled'
const LAST_SYNC_KEY = 'health-tracker-last-sync'

// --- Token management ---

export function generateSyncToken(): string {
  const token = crypto.randomUUID()
  localStorage.setItem(SYNC_TOKEN_KEY, token)
  return token
}

export function getSyncToken(): string | null {
  return localStorage.getItem(SYNC_TOKEN_KEY)
}

export function setSyncToken(token: string) {
  localStorage.setItem(SYNC_TOKEN_KEY, token)
}

export function isSyncEnabled(): boolean {
  return localStorage.getItem(SYNC_ENABLED_KEY) === 'true'
}

export function setSyncEnabled(enabled: boolean) {
  localStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false')
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

// --- Build snapshot from all Dexie tables ---

async function buildSnapshot() {
  return {
    exportDate: new Date().toISOString(),
    workouts: await db.workouts.toArray(),
    exerciseSets: await db.exerciseSets.toArray(),
    runDetails: await db.runDetails.toArray(),
    rowDetails: await db.rowDetails.toArray(),
    yogaMobilityDetails: await db.yogaMobilityDetails.toArray(),
    dailyCheckIns: await db.dailyCheckIns.toArray(),
    mealLogs: await db.mealLogs.toArray(),
    favoriteMeals: await db.favoriteMeals.toArray(),
    workoutPlans: await db.workoutPlans.toArray(),
    watchMetrics: await db.watchMetrics.toArray(),
    healthMetrics: await db.healthMetrics.toArray(),
    knowledgeEntries: await db.knowledgeEntries.toArray(),
  }
}

// --- Sync to cloud ---

export async function syncToCloud(): Promise<boolean> {
  if (!isSyncEnabled()) return false
  const token = getSyncToken()
  if (!token) return false

  try {
    const data = await buildSnapshot()
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ source: 'pwa', data }),
    })

    if (response.ok) {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
      return true
    }
    console.error('Sync failed:', response.status, await response.text())
    return false
  } catch (err) {
    console.error('Sync error:', err)
    return false
  }
}

// --- Fetch coaching notes + health data from cloud ---

export async function fetchCloudData(): Promise<{
  coachingNotes: Array<{ text: string; createdAt: string }>
  planAdjustments: unknown
} | null> {
  if (!isSyncEnabled()) return null
  const token = getSyncToken()
  if (!token) return null

  try {
    const response = await fetch('/api/sync', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (response.ok) {
      return response.json()
    }
    return null
  } catch {
    return null
  }
}
