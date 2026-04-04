import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/watch
 *
 * Receives workout data from an iOS Shortcut and returns a redirect URL
 * that imports the data into the client-side app via URL hash encoding.
 *
 * The Shortcut sends a JSON body like:
 * {
 *   "key": "<api_key>",
 *   "type": "Running",
 *   "start": "2026-04-04T08:00:00-07:00",
 *   "end": "2026-04-04T08:35:00-07:00",
 *   "duration": 35,
 *   "activeCalories": 320,
 *   "totalCalories": 380,
 *   "avgHeartRate": 142,
 *   "maxHeartRate": 165,
 *   "distance": 5200
 * }
 *
 * Returns: { "ok": true, "importUrl": "https://..." }
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for the app
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = req.body

  // Simple API key check
  const expectedKey = process.env.WATCH_API_KEY
  if (expectedKey && body.key !== expectedKey) {
    return res.status(401).json({ error: 'Invalid API key' })
  }

  // Validate required fields
  if (!body.type || !body.start || !body.end) {
    return res.status(400).json({ error: 'Missing required fields: type, start, end' })
  }

  // Build the metrics object
  const metrics = {
    watchWorkoutType: body.type,
    startTime: body.start,
    endTime: body.end,
    durationMinutes: body.duration || 0,
    activeCalories: body.activeCalories,
    totalCalories: body.totalCalories,
    avgHeartRate: body.avgHeartRate,
    maxHeartRate: body.maxHeartRate,
    distanceMeters: body.distance,
  }

  // Encode as base64 for the client-side import
  const json = JSON.stringify(metrics)
  const encoded = Buffer.from(json).toString('base64url')

  const host = req.headers.host || 'healthtracker-zeta.vercel.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const importUrl = `${protocol}://${host}/import-watch#${encoded}`

  return res.status(200).json({
    ok: true,
    importUrl,
    message: `Recorded ${metrics.watchWorkoutType} workout (${metrics.durationMinutes} min)`,
  })
}
