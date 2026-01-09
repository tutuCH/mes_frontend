/**
 * Statistical Process Control (SPC) Calculator
 * Provides functions for calculating control limits, subgroup statistics, and control chart factors
 */

export interface ControlLimits {
  cl: number // Center Line
  ucl: number // Upper Control Limit
  lcl: number // Lower Control Limit
}

export interface SubgroupStats {
  subgroupNumber: number
  mean: number
  range: number
  stdDev: number
  sampleSize: number
  timestamp: string
}

/**
 * Calculate standard deviation for a set of values
 */
export function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Calculate subgroup statistics from raw data
 */
export function calculateSubgroupStats(
  data: number[],
  subgroupNumber: number,
  timestamp: string
): SubgroupStats {
  const validValues = data.filter((v) => v != null && !isNaN(v))

  if (validValues.length === 0) {
    return {
      subgroupNumber,
      mean: 0,
      range: 0,
      stdDev: 0,
      sampleSize: 0,
      timestamp,
    }
  }

  const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length
  const range = Math.max(...validValues) - Math.min(...validValues)
  const stdDev = calculateStdDev(validValues, mean)

  return {
    subgroupNumber,
    mean,
    range,
    stdDev,
    sampleSize: validValues.length,
    timestamp,
  }
}

/**
 * Get A2 factor for X-bar chart control limits
 * Based on subgroup size (n)
 */
export function getA2Factor(n: number): number {
  const factors: Record<number, number> = {
    2: 1.880,
    3: 1.023,
    4: 0.729,
    5: 0.577,
    6: 0.483,
    7: 0.419,
    8: 0.373,
    9: 0.337,
    10: 0.308,
  }
  return factors[n] || 0.577 // Default to n=5
}

/**
 * Get D3 factor for R chart lower control limit
 * Based on subgroup size (n)
 */
export function getD3Factor(n: number): number {
  const factors: Record<number, number> = {
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0.076,
    8: 0.136,
    9: 0.184,
    10: 0.223,
  }
  return factors[n] || 0
}

/**
 * Get D4 factor for R chart upper control limit
 * Based on subgroup size (n)
 */
export function getD4Factor(n: number): number {
  const factors: Record<number, number> = {
    2: 3.267,
    3: 2.574,
    4: 2.282,
    5: 2.114,
    6: 2.004,
    7: 1.924,
    8: 1.864,
    9: 1.816,
    10: 1.777,
  }
  return factors[n] || 2.114 // Default to n=5
}

/**
 * Calculate control limits for X-bar chart
 * Uses average range method
 */
export function calculateXBarLimits(subgroups: SubgroupStats[]): ControlLimits {
  if (subgroups.length === 0) {
    return { cl: 0, ucl: 0, lcl: 0 }
  }

  // Calculate grand mean (average of subgroup means)
  const grandMean =
    subgroups.reduce((sum, sg) => sum + sg.mean, 0) / subgroups.length

  // Calculate average range
  const avgRange = subgroups.reduce((sum, sg) => sum + sg.range, 0) / subgroups.length

  // Get A2 factor based on subgroup size
  const n = subgroups[0]?.sampleSize || 5
  const A2 = getA2Factor(n)

  return {
    cl: grandMean,
    ucl: grandMean + A2 * avgRange,
    lcl: grandMean - A2 * avgRange,
  }
}

/**
 * Calculate control limits for R chart
 * Uses average range method
 */
export function calculateRLimits(subgroups: SubgroupStats[]): ControlLimits {
  if (subgroups.length === 0) {
    return { cl: 0, ucl: 0, lcl: 0 }
  }

  // Calculate average range
  const avgRange = subgroups.reduce((sum, sg) => sum + sg.range, 0) / subgroups.length

  // Get D3 and D4 factors based on subgroup size
  const n = subgroups[0]?.sampleSize || 5
  const D3 = getD3Factor(n)
  const D4 = getD4Factor(n)

  return {
    cl: avgRange,
    ucl: D4 * avgRange,
    lcl: D3 * avgRange,
  }
}

/**
 * Calculate control limits for individual measurements (I-MR chart)
 * Uses moving range method
 */
export function calculateIndividualLimits(values: number[]): ControlLimits {
  if (values.length < 2) {
    return { cl: 0, ucl: 0, lcl: 0 }
  }

  // Calculate mean
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length

  // Calculate moving ranges (absolute differences between consecutive values)
  const movingRanges: number[] = []
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]))
  }

  // Calculate average moving range
  const avgMR = movingRanges.reduce((sum, val) => sum + val, 0) / movingRanges.length

  // Control limits for individuals chart (using factor of 2.66)
  return {
    cl: mean,
    ucl: mean + 2.66 * avgMR,
    lcl: mean - 2.66 * avgMR,
  }
}

/**
 * Calculate zone boundaries for SPC rules
 * Zones are based on standard deviations from the center line
 */
export function calculateZoneBoundaries(limits: ControlLimits): {
  zoneA_upper: number
  zoneA_lower: number
  zoneB_upper: number
  zoneB_lower: number
} {
  const sigma = (limits.ucl - limits.lcl) / 6

  return {
    zoneA_upper: limits.cl + 2 * sigma, // +2σ
    zoneA_lower: limits.cl - 2 * sigma, // -2σ
    zoneB_upper: limits.cl + 1 * sigma, // +1σ
    zoneB_lower: limits.cl - 1 * sigma, // -1σ
  }
}
