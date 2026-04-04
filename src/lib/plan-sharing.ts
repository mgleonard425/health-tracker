import type { WorkoutPlan } from '@/db'

/**
 * Encodes a workout plan into a URL-safe base64 string.
 * Strips the `id` and `createdAt` since those get regenerated on import.
 */
export function encodePlan(plan: WorkoutPlan): string {
  const portable = {
    name: plan.name,
    sections: plan.sections,
    generalNotes: plan.generalNotes,
  }
  const json = JSON.stringify(portable)
  // Use btoa for base64 encoding, handling unicode via encodeURIComponent
  const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  ))
  return encoded
}

/**
 * Decodes a base64 string back into a portable plan object.
 */
export function decodePlan(encoded: string): Omit<WorkoutPlan, 'id' | 'createdAt'> | null {
  try {
    const json = decodeURIComponent(
      Array.from(atob(encoded), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    const parsed = JSON.parse(json)
    if (!parsed.name || !parsed.sections) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Generates a full shareable URL for a plan.
 */
export function generateShareUrl(plan: WorkoutPlan): string {
  const encoded = encodePlan(plan)
  const base = window.location.origin
  return `${base}/import#${encoded}`
}
