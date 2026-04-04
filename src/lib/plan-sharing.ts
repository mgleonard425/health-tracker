import type { WorkoutPlan } from '@/db'

/**
 * URL-safe base64 encode (replaces +/= with URL-safe chars)
 */
function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * URL-safe base64 decode
 */
function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return atob(base64)
}

/**
 * Encodes a workout plan into a URL-safe base64 string.
 */
export function encodePlan(plan: WorkoutPlan): string {
  const portable = {
    n: plan.name,
    s: plan.sections,
    g: plan.generalNotes,
  }
  const json = JSON.stringify(portable)
  // Handle unicode: encode to URI component bytes, then base64
  const bytes = new TextEncoder().encode(json)
  const binaryStr = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return toBase64Url(binaryStr)
}

/**
 * Decodes a base64 string back into a portable plan object.
 */
export function decodePlan(encoded: string): Omit<WorkoutPlan, 'id' | 'createdAt'> | null {
  try {
    const binaryStr = fromBase64Url(encoded)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json)

    // Handle compact format
    if (parsed.n && parsed.s) {
      return {
        name: parsed.n,
        sections: parsed.s,
        generalNotes: parsed.g,
      }
    }

    // Handle full format (backwards compat)
    if (parsed.name && parsed.sections) {
      return parsed
    }

    return null
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
