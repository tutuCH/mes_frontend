/**
 * SPC Limits Service
 * Fetches and caches control limits from the backend
 */

import { api } from './api'

export interface ControlLimits {
  ucl: number
  lcl: number
  mean: number
}

const limitsCache = new Map<string, { limits: ControlLimits; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes (matching backend cache)

/**
 * Get control limits for a specific field
 * Uses cache to reduce API calls
 */
export async function getFieldControlLimits(
  machineId: number | string,
  field: string
): Promise<ControlLimits | null> {
  const cacheKey = `${machineId}:${field}`
  const cached = limitsCache.get(cacheKey)

  // Return cached value if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.limits
  }

  try {
    // Fetch limits from backend (API v2.0 format)
    const response = await api.getSPCLimits(machineId, field)

    // Extract the limit data for the specific field
    const fieldLimit = response.limits[field]

    if (fieldLimit && fieldLimit.ucl !== null && fieldLimit.lcl !== null && fieldLimit.mean !== null) {
      const limits: ControlLimits = {
        ucl: fieldLimit.ucl,
        lcl: fieldLimit.lcl,
        mean: fieldLimit.mean,
      }

      // Cache the result
      limitsCache.set(cacheKey, {
        limits,
        timestamp: Date.now(),
      })

      return limits
    }

    // Field limit not found or invalid - return null but don't log as error
    return null
  } catch (error) {
    // Chart should still work without limits, just won't show UCL/LCL/Mean lines
    return null
  }
}

/**
 * Clear the limits cache (useful when switching machines)
 */
export function clearLimitsCache(): void {
  limitsCache.clear()
}

/**
 * Clear cache for a specific device
 */
export function clearDeviceLimitsCache(machineId: number | string): void {
  for (const key of limitsCache.keys()) {
    if (key.startsWith(`${machineId}:`)) {
      limitsCache.delete(key)
    }
  }
}
