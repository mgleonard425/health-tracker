import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put, get, list, del } from '@vercel/blob'

/**
 * POST /api/sync — Receives data from PWA or Apple Watch daily health Shortcut
 * GET  /api/sync — Returns coaching notes + plan adjustments for the app
 *
 * Auth: Authorization: Bearer {sync-token} (UUID generated client-side)
 *
 * POST body for PWA sync:
 * { "source": "pwa", "data": { ...full snapshot... } }
 *
 * POST body for Apple Watch daily health:
 * { "source": "watch-health", "date": "YYYY-MM-DD", "restingHeartRate": 52, ... }
 *
 * GET returns: { coachingNotes: [...], planAdjustments: {...} }
 */

function getToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7).trim() || null
}

function blobKey(token: string, path: string) {
  return `sync/${token}/${path}`
}

async function readBlob(key: string): Promise<unknown | null> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (blobs.length === 0) return null
    const response = await get(blobs[0].url, { access: 'private' })
    if (!response) return null
    const text = await new Response(response.body).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function writeBlob(key: string, data: unknown) {
  // Delete existing blob at this key first (put doesn't overwrite by path)
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    if (blobs.length > 0) {
      await del(blobs.map(b => b.url))
    }
  } catch { /* ignore */ }

  await put(key, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const token = getToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Use: Bearer {sync-token}' })
  }

  // --- GET: Return coaching notes + plan adjustments ---
  if (req.method === 'GET') {
    // Debug mode: ?debug=1 shows blob diagnostics
    if (req.query.debug === '1') {
      const key = blobKey(token, 'app-data.json')
      const debugInfo: Record<string, unknown> = { key }
      try {
        const { blobs } = await list({ prefix: key, limit: 1 })
        debugInfo.listResult = blobs.map(b => ({ url: b.url, pathname: b.pathname, size: b.size }))
        if (blobs.length > 0) {
          const response = await get(blobs[0].url, { access: 'private' })
          debugInfo.getResult = response ? 'ok' : 'null'
          if (response) {
            const text = await new Response(response.body).text()
            debugInfo.dataLength = text.length
            debugInfo.dataPreview = text.slice(0, 200)
          }
        }
      } catch (e) {
        debugInfo.error = e instanceof Error ? e.message : String(e)
      }
      // Also list ALL blobs for this token
      try {
        const { blobs } = await list({ prefix: `sync/${token}/`, limit: 20 })
        debugInfo.allBlobs = blobs.map(b => ({ pathname: b.pathname, size: b.size }))
      } catch (e) {
        debugInfo.allBlobsError = e instanceof Error ? e.message : String(e)
      }
      return res.status(200).json(debugInfo)
    }

    const coachingNotes = await readBlob(blobKey(token, 'coaching-notes.json'))
    const planAdjustments = await readBlob(blobKey(token, 'plan-adjustments.json'))
    return res.status(200).json({
      coachingNotes: coachingNotes || [],
      planAdjustments: planAdjustments || null,
    })
  }

  // --- POST: Accept data from PWA or watch ---
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body
  if (!body?.source) {
    return res.status(400).json({ error: 'Missing "source" field. Use "pwa" or "watch-health".' })
  }

  if (body.source === 'pwa') {
    if (!body.data) {
      return res.status(400).json({ error: 'Missing "data" field for PWA sync.' })
    }
    await writeBlob(blobKey(token, 'app-data.json'), {
      syncedAt: new Date().toISOString(),
      ...body.data,
    })
    return res.status(200).json({ ok: true, message: 'PWA data synced.' })
  }

  if (body.source === 'watch-health') {
    if (!body.date) {
      return res.status(400).json({ error: 'Missing "date" field for watch-health sync.' })
    }

    const dayData = {
      date: body.date,
      restingHeartRate: body.restingHeartRate,
      heartRateVariability: body.heartRateVariability,
      sleepDurationMinutes: body.sleepDurationMinutes,
      sleepStages: body.sleepStages,
      vo2Max: body.vo2Max,
      steps: body.steps,
      activeCalories: body.activeCalories,
      workouts: body.workouts,
      syncedAt: new Date().toISOString(),
    }

    // Store per-day health data
    await writeBlob(blobKey(token, `health/${body.date}.json`), dayData)

    // Merge into rolling 14-day latest
    const latestData = (await readBlob(blobKey(token, 'health-latest.json'))) as Record<string, unknown>[] | null
    const existing = Array.isArray(latestData) ? latestData : []
    const filtered = existing.filter((d: Record<string, unknown>) => d.date !== body.date)
    filtered.push(dayData)
    // Keep only last 14 days
    filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      (a.date as string) > (b.date as string) ? -1 : 1
    )
    const rolling = filtered.slice(0, 14)
    await writeBlob(blobKey(token, 'health-latest.json'), rolling)

    return res.status(200).json({ ok: true, message: `Health data saved for ${body.date}.` })
  }

  return res.status(400).json({ error: `Unknown source: "${body.source}". Use "pwa" or "watch-health".` })
}
