import { deflate, inflate } from 'pako'
import type { WorkoutPlan } from '@/db'

/**
 * URL-safe base64 encode
 */
function toBase64Url(bytes: Uint8Array): string {
  const binaryStr = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(binaryStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * URL-safe base64 decode
 */
function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return bytes
}

/**
 * Encodes a workout plan into a compressed, URL-safe base64 string.
 */
export function encodePlan(plan: WorkoutPlan): string {
  const portable = {
    n: plan.name,
    s: plan.sections,
    g: plan.generalNotes,
  }
  const json = JSON.stringify(portable)
  const compressed = deflate(json)
  return toBase64Url(compressed)
}

/**
 * Decodes a compressed base64 string back into a portable plan object.
 */
export function decodePlan(encoded: string): Omit<WorkoutPlan, 'id' | 'createdAt'> | null {
  try {
    const compressed = fromBase64Url(encoded)
    const json = inflate(compressed, { to: 'string' })
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
    // Try uncompressed base64 as fallback (old links)
    try {
      const bytes = fromBase64Url(encoded)
      const json = new TextDecoder().decode(bytes)
      const parsed = JSON.parse(json)
      if (parsed.n && parsed.s) {
        return { name: parsed.n, sections: parsed.s, generalNotes: parsed.g }
      }
      if (parsed.name && parsed.sections) {
        return parsed
      }
    } catch { /* ignore */ }
    return null
  }
}

/**
 * Generates a full shareable URL for a plan.
 * Uses query parameter instead of hash so messaging apps don't split the URL.
 */
export function generateShareUrl(plan: WorkoutPlan): string {
  const encoded = encodePlan(plan)
  const base = window.location.origin
  return `${base}/import?p=${encoded}`
}
