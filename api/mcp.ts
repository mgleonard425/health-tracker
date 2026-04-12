import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, get, list, del } from '@vercel/blob'

/**
 * POST /api/mcp — MCP Streamable HTTP server
 *
 * JSON-RPC handler implementing MCP protocol.
 * Auth: Authorization: Bearer {sync-token}
 *
 * Read tools:
 *   get_weekly_summary, get_workouts, get_check_ins, get_nutrition,
 *   get_health_metrics, get_training_plan_progress
 *
 * Write tools:
 *   push_coaching_note, update_week_plan
 */

// --- Training plan constants (duplicated from src/data — separate module resolution) ---

const PLAN_START_DATE = '2026-03-21'
const RACE_DATE = '2026-12-13'

function getCurrentWeekNumber(): number {
  const now = new Date()
  const start = new Date(PLAN_START_DATE)
  const diffMs = now.getTime() - start.getTime()
  return Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1)
}

function getDaysUntilRace(): number {
  const now = new Date()
  const race = new Date(RACE_DATE)
  return Math.max(0, Math.ceil((race.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

// --- Blob helpers ---

function blobKey(token: string, path: string) {
  return `sync/${token}/${path}`
}

async function readBlob(key: string): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (blobs.length === 0) return null
    const response = await get(blobs[0].url)
    if (!response) return null
    const text = await new Response(response.body).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeBlob(key: string, data: unknown) {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (blobs.length > 0) {
      await del(blobs.map(b => b.url))
    }
  } catch { /* ignore */ }
  await put(key, JSON.stringify(data), { access: 'private', addRandomSuffix: false })
}

// --- Token extraction ---

function getToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

// --- Tool definitions ---

const TOOLS = [
  {
    name: 'get_weekly_summary',
    description: 'Get a summary of the current or specified week: workout counts, mileage, check-in averages, health metric averages.',
    inputSchema: {
      type: 'object',
      properties: {
        week: { type: 'number', description: 'Week number (defaults to current week)' },
      },
    },
  },
  {
    name: 'get_workouts',
    description: 'Get detailed workout data including exercise sets, run details, etc. for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_check_ins',
    description: 'Get daily check-in data (sleep, energy, body status, hydration) for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_nutrition',
    description: 'Get meal logs with macro totals for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_health_metrics',
    description: 'Get Apple Watch health metrics (resting HR, HRV, sleep, VO2 max, steps) for a date range.',
    inputSchema: {
      type: 'object',
      properties: {
        start_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'End date YYYY-MM-DD' },
      },
      required: ['start_date', 'end_date'],
    },
  },
  {
    name: 'get_training_plan_progress',
    description: 'Get actual vs planned training data for the current week: mileage, workouts completed, check-in status.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'push_coaching_note',
    description: 'Push a coaching note that will appear in the app on the Today page.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The coaching note text' },
      },
      required: ['text'],
    },
  },
  {
    name: 'update_week_plan',
    description: 'Push week plan adjustments that the user can review in the app.',
    inputSchema: {
      type: 'object',
      properties: {
        week: { type: 'number', description: 'Week number' },
        changes: { type: 'string', description: 'Description of changes to the week plan' },
      },
      required: ['week', 'changes'],
    },
  },
]

// --- Tool handlers ---

interface AppData {
  workouts?: Array<{ id?: number; date: string; type: string; startedAt: string; completedAt?: string; notes?: string }>
  exerciseSets?: Array<{ workoutId: number; exerciseId: string; setNumber: number; weight?: number; reps?: number; duration?: number; completed: boolean }>
  runDetails?: Array<{ workoutId: number; distanceMiles: number; durationMinutes: number; runType: string; route?: string; feelScale: number }>
  rowDetails?: Array<{ workoutId: number; durationMinutes: number; distanceMeters?: number }>
  dailyCheckIns?: Array<{ date: string; sleepHours: number; sleepQuality: number; energyLevel: number; bodyStatus: unknown[]; hydrationOz: number; notes?: string }>
  mealLogs?: Array<{ date: string; timeOfDay: string; description: string; calories?: number; proteinG?: number; carbsG?: number; fatG?: number }>
  healthMetrics?: Array<{ date: string; restingHeartRate?: number; heartRateVariability?: number; sleepDurationMinutes?: number; vo2Max?: number; steps?: number; activeCalories?: number }>
}

function filterByDateRange<T extends { date: string }>(items: T[], start: string, end: string): T[] {
  return items.filter(i => i.date >= start && i.date <= end)
}

function getWeekDateRange(weekNumber: number): { start: string; end: string } {
  const startDate = new Date(PLAN_START_DATE)
  startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(startDate), end: fmt(endDate) }
}

async function handleTool(token: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  const appData = (await readBlob(blobKey(token, 'app-data.json'))) as AppData | null

  switch (name) {
    case 'get_weekly_summary': {
      const week = (args.week as number) || getCurrentWeekNumber()
      const { start, end } = getWeekDateRange(week)
      if (!appData) return { week, start, end, error: 'No synced data found. Ask the user to sync from Settings.' }

      const workouts = filterByDateRange(appData.workouts || [], start, end)
      const checkIns = filterByDateRange(appData.dailyCheckIns || [], start, end)
      const runs = appData.runDetails?.filter(r => {
        const w = workouts.find(w => w.id === r.workoutId)
        return !!w
      }) || []
      const healthMetrics = filterByDateRange(appData.healthMetrics || [], start, end)

      const totalMileage = runs.reduce((sum, r) => sum + r.distanceMiles, 0)
      const avgSleep = checkIns.length > 0 ? checkIns.reduce((s, c) => s + c.sleepHours, 0) / checkIns.length : null
      const avgEnergy = checkIns.length > 0 ? checkIns.reduce((s, c) => s + c.energyLevel, 0) / checkIns.length : null
      const avgHR = healthMetrics.filter(h => h.restingHeartRate).length > 0
        ? healthMetrics.reduce((s, h) => s + (h.restingHeartRate || 0), 0) / healthMetrics.filter(h => h.restingHeartRate).length
        : null
      const avgHRV = healthMetrics.filter(h => h.heartRateVariability).length > 0
        ? healthMetrics.reduce((s, h) => s + (h.heartRateVariability || 0), 0) / healthMetrics.filter(h => h.heartRateVariability).length
        : null

      return {
        week,
        dateRange: { start, end },
        daysUntilRace: getDaysUntilRace(),
        workoutCount: workouts.length,
        workoutTypes: workouts.map(w => w.type),
        totalRunMileage: Math.round(totalMileage * 10) / 10,
        checkInDays: checkIns.length,
        averages: {
          sleepHours: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
          energyLevel: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null,
          restingHR: avgHR ? Math.round(avgHR) : null,
          hrv: avgHRV ? Math.round(avgHRV) : null,
        },
      }
    }

    case 'get_workouts': {
      if (!appData) return { error: 'No synced data. Ask the user to sync from Settings.' }
      const start = args.start_date as string
      const end = args.end_date as string
      const workouts = filterByDateRange(appData.workouts || [], start, end)
      return workouts.map(w => ({
        ...w,
        exerciseSets: (appData.exerciseSets || []).filter(s => s.workoutId === w.id),
        runDetails: (appData.runDetails || []).filter(r => r.workoutId === w.id),
        rowDetails: (appData.rowDetails || []).filter(r => r.workoutId === w.id),
      }))
    }

    case 'get_check_ins': {
      if (!appData) return { error: 'No synced data.' }
      return filterByDateRange(appData.dailyCheckIns || [], args.start_date as string, args.end_date as string)
    }

    case 'get_nutrition': {
      if (!appData) return { error: 'No synced data.' }
      const meals = filterByDateRange(appData.mealLogs || [], args.start_date as string, args.end_date as string)
      // Group by date with daily totals
      const byDate: Record<string, { meals: typeof meals; totals: { calories: number; protein: number; carbs: number; fat: number } }> = {}
      for (const m of meals) {
        if (!byDate[m.date]) byDate[m.date] = { meals: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } }
        byDate[m.date].meals.push(m)
        byDate[m.date].totals.calories += m.calories || 0
        byDate[m.date].totals.protein += m.proteinG || 0
        byDate[m.date].totals.carbs += m.carbsG || 0
        byDate[m.date].totals.fat += m.fatG || 0
      }
      return byDate
    }

    case 'get_health_metrics': {
      // Check both synced app data and watch-health blob data
      const start = args.start_date as string
      const end = args.end_date as string

      // First try app data
      const appMetrics = filterByDateRange(appData?.healthMetrics || [], start, end)

      // Also check watch-health rolling data
      const healthLatest = (await readBlob(blobKey(token, 'health-latest.json'))) as Array<{ date: string }> | null
      const watchMetrics = healthLatest ? healthLatest.filter(h => h.date >= start && h.date <= end) : []

      // Merge: prefer watch data (more recent), fill gaps from app data
      const merged: Record<string, unknown> = {}
      for (const m of appMetrics) merged[m.date] = m
      for (const m of watchMetrics) merged[m.date] = { ...(merged[m.date] as object || {}), ...m }

      return Object.values(merged)
    }

    case 'get_training_plan_progress': {
      const week = getCurrentWeekNumber()
      const { start, end } = getWeekDateRange(week)
      if (!appData) return { week, error: 'No synced data.' }

      const workouts = filterByDateRange(appData.workouts || [], start, end)
      const runs = appData.runDetails?.filter(r => workouts.some(w => w.id === r.workoutId)) || []
      const checkIns = filterByDateRange(appData.dailyCheckIns || [], start, end)
      const totalMileage = runs.reduce((s, r) => s + r.distanceMiles, 0)

      return {
        currentWeek: week,
        daysUntilRace: getDaysUntilRace(),
        dateRange: { start, end },
        actual: {
          workoutCount: workouts.length,
          workoutTypes: workouts.map(w => w.type),
          runMileage: Math.round(totalMileage * 10) / 10,
          runCount: runs.length,
          checkInDays: checkIns.length,
          longestRun: runs.length > 0 ? Math.max(...runs.map(r => r.distanceMiles)) : 0,
        },
      }
    }

    case 'push_coaching_note': {
      const text = args.text as string
      if (!text) return { error: 'Missing "text" argument.' }
      const existing = (await readBlob(blobKey(token, 'coaching-notes.json'))) as Array<{ text: string; createdAt: string }> | null
      const notes = Array.isArray(existing) ? existing : []
      notes.push({ text, createdAt: new Date().toISOString() })
      await writeBlob(blobKey(token, 'coaching-notes.json'), notes)
      return { ok: true, message: 'Coaching note pushed. User will see it on their Today page after opening the app.' }
    }

    case 'update_week_plan': {
      const existing = (await readBlob(blobKey(token, 'plan-adjustments.json'))) as Record<string, unknown> | null
      const adjustments = existing || {}
      const weekKey = `week-${args.week}`
      const prev = (adjustments[weekKey] as Array<{ changes: string; createdAt: string }>) || []
      prev.push({ changes: args.changes as string, createdAt: new Date().toISOString() })
      adjustments[weekKey] = prev
      await writeBlob(blobKey(token, 'plan-adjustments.json'), adjustments)
      return { ok: true, message: `Week ${args.week} plan adjustment saved.` }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// --- JSON-RPC handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // MCP Streamable HTTP: GET for SSE (not used in our simple implementation)
  if (req.method === 'GET') {
    return res.status(200).json({ name: 'health-tracker-mcp', version: '1.0.0' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = getToken(req)
  if (!token) {
    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Missing Authorization header' }, id: null })
  }

  const body = req.body
  const id = body?.id ?? null

  if (!body?.method) {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid request' }, id })
  }

  switch (body.method) {
    case 'initialize': {
      return res.status(200).json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2025-03-26',
          capabilities: { tools: {} },
          serverInfo: { name: 'health-tracker', version: '1.0.0' },
        },
      })
    }

    case 'notifications/initialized': {
      return res.status(200).end()
    }

    case 'tools/list': {
      return res.status(200).json({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      })
    }

    case 'tools/call': {
      const toolName = body.params?.name
      const toolArgs = body.params?.arguments || {}
      if (!toolName) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32602, message: 'Missing tool name' }, id })
      }
      try {
        const result = await handleTool(token, toolName, toolArgs)
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        })
      } catch (err) {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          },
        })
      }
    }

    default: {
      return res.status(200).json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Method not found: ${body.method}` },
        id,
      })
    }
  }
}
