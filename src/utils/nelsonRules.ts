/**
 * Nelson Rules for SPC (Statistical Process Control)
 * Extended set of 8 rules including zone-based pattern detection
 */

import type { ControlLimits } from './spcCalculator'
import { calculateZoneBoundaries } from './spcCalculator'
import type { Violation } from './westernElectricRules'

/**
 * Nelson Rule 1: One point beyond 3σ (same as WE Rule 1)
 * Already implemented in Western Electric rules
 */

/**
 * Nelson Rule 2: Nine points in zone C or beyond (one side)
 * Warning - points clustered near center line
 */
function checkNelsonRule2(data: number[], limits: ControlLimits): Violation | null {
  const zones = calculateZoneBoundaries(limits)
  let zoneCCountAbove = 0
  let zoneCCountBelow = 0
  const violatingPointsAbove: number[] = []
  const violatingPointsBelow: number[] = []

  data.forEach((val, i) => {
    // Check if point is in zone C (between ±1σ)
    if (val >= zones.zoneB_lower && val <= zones.zoneB_upper) {
      if (val > limits.cl) {
        zoneCCountAbove++
        if (zoneCCountAbove >= 9) {
          violatingPointsAbove.push(i)
        }
      } else if (val < limits.cl) {
        zoneCCountBelow++
        if (zoneCCountBelow >= 9) {
          violatingPointsBelow.push(i)
        }
      }
    } else {
      // Point is outside zone C, reset counters
      zoneCCountAbove = 0
      zoneCCountBelow = 0
    }
  })

  const allViolatingPoints = [...violatingPointsAbove, ...violatingPointsBelow]

  if (allViolatingPoints.length > 0) {
    return {
      rule: 'Nine Points in Zone C',
      ruleNumber: 2,
      description: 'Nine consecutive points near center line (zone C)',
      dataPoints: allViolatingPoints,
      severity: 'warning',
    }
  }

  return null
}

/**
 * Nelson Rule 3: Six points increasing or decreasing (same as WE Rule 3)
 * Already implemented in Western Electric rules
 */

/**
 * Nelson Rule 4: Fourteen points alternating up/down (same as WE Rule 4)
 * Already implemented in Western Electric rules
 */

/**
 * Nelson Rule 5: Two out of three consecutive points in zone A or beyond
 * Critical - points near control limits
 */
function checkNelsonRule5(data: number[], limits: ControlLimits): Violation | null {
  const zones = calculateZoneBoundaries(limits)
  const violatingPoints: number[] = []

  for (let i = 2; i < data.length; i++) {
    const inZoneA = [
      data[i - 2] >= zones.zoneA_upper || data[i - 2] <= zones.zoneA_lower,
      data[i - 1] >= zones.zoneA_upper || data[i - 1] <= zones.zoneA_lower,
      data[i] >= zones.zoneA_upper || data[i] <= zones.zoneA_lower,
    ]

    const count = inZoneA.filter(Boolean).length

    if (count >= 2) {
      violatingPoints.push(i - 2, i - 1, i)
    }
  }

  if (violatingPoints.length > 0) {
    return {
      rule: 'Two of Three in Zone A',
      ruleNumber: 5,
      description: 'Two out of three consecutive points in zone A or beyond',
      dataPoints: [...new Set(violatingPoints)],
      severity: 'critical',
    }
  }

  return null
}

/**
 * Nelson Rule 6: Four out of five points in zone B or beyond
 * Warning - shift in process
 */
function checkNelsonRule6(data: number[], limits: ControlLimits): Violation | null {
  const zones = calculateZoneBoundaries(limits)
  const violatingPoints: number[] = []

  for (let i = 4; i < data.length; i++) {
    const inZoneBOrBeyond = [
      data[i - 4] >= zones.zoneB_upper || data[i - 4] <= zones.zoneB_lower,
      data[i - 3] >= zones.zoneB_upper || data[i - 3] <= zones.zoneB_lower,
      data[i - 2] >= zones.zoneB_upper || data[i - 2] <= zones.zoneB_lower,
      data[i - 1] >= zones.zoneB_upper || data[i - 1] <= zones.zoneB_lower,
      data[i] >= zones.zoneB_upper || data[i] <= zones.zoneB_lower,
    ]

    const count = inZoneBOrBeyond.filter(Boolean).length

    if (count >= 4) {
      violatingPoints.push(i - 4, i - 3, i - 2, i - 1, i)
    }
  }

  if (violatingPoints.length > 0) {
    return {
      rule: 'Four of Five in Zone B+',
      ruleNumber: 6,
      description: 'Four out of five consecutive points in zone B or beyond',
      dataPoints: [...new Set(violatingPoints)],
      severity: 'warning',
    }
  }

  return null
}

/**
 * Nelson Rule 7: Fifteen points in zone C (above or below CL)
 * Warning - reduced variability (stratification)
 */
function checkNelsonRule7(data: number[], limits: ControlLimits): Violation | null {
  const zones = calculateZoneBoundaries(limits)
  let zoneCCountAbove = 0
  let zoneCCountBelow = 0
  const violatingPointsAbove: number[] = []
  const violatingPointsBelow: number[] = []

  data.forEach((val, i) => {
    // Check if point is in zone C (between ±1σ)
    if (val >= zones.zoneB_lower && val <= zones.zoneB_upper) {
      if (val > limits.cl) {
        zoneCCountAbove++
        if (zoneCCountAbove >= 15) {
          violatingPointsAbove.push(i)
        }
      } else if (val < limits.cl) {
        zoneCCountBelow++
        if (zoneCCountBelow >= 15) {
          violatingPointsBelow.push(i)
        }
      }
    } else {
      // Point is outside zone C, reset counters
      zoneCCountAbove = 0
      zoneCCountBelow = 0
    }
  })

  const allViolatingPoints = [...violatingPointsAbove, ...violatingPointsBelow]

  if (allViolatingPoints.length > 0) {
    return {
      rule: 'Fifteen Points in Zone C',
      ruleNumber: 7,
      description: 'Fifteen consecutive points in zone C (stratification)',
      dataPoints: allViolatingPoints,
      severity: 'warning',
    }
  }

  return null
}

/**
 * Nelson Rule 8: Eight points on both sides of CL with none in zone C
 * Warning - mixture pattern
 */
function checkNelsonRule8(data: number[], limits: ControlLimits): Violation | null {
  const zones = calculateZoneBoundaries(limits)
  let patternCount = 0
  const violatingPoints: number[] = []

  for (let i = 0; i < data.length; i++) {
    const inZoneC = data[i] >= zones.zoneB_lower && data[i] <= zones.zoneB_upper

    if (!inZoneC) {
      patternCount++
    } else {
      patternCount = 0
    }

    if (patternCount >= 8) {
      // Record the last 8 points
      for (let j = 0; j < 8; j++) {
        violatingPoints.push(i - j)
      }
    }
  }

  if (violatingPoints.length > 0) {
    return {
      rule: 'Eight Points Outside Zone C',
      ruleNumber: 8,
      description: 'Eight consecutive points outside zone C (mixture)',
      dataPoints: [...new Set(violatingPoints)],
      severity: 'warning',
    }
  }

  return null
}

/**
 * Check all Nelson rules (rules 2, 5, 6, 7, 8)
 * Note: Rules 1, 3, 4 are the same as Western Electric rules 1, 3, 4
 */
export function checkNelsonRules(data: number[], limits: ControlLimits): Violation[] {
  const violations: Violation[] = []

  // Nelson Rule 2: Nine points in zone C
  const rule2Violation = checkNelsonRule2(data, limits)
  if (rule2Violation) {
    violations.push(rule2Violation)
  }

  // Nelson Rule 5: Two out of three in zone A
  const rule5Violation = checkNelsonRule5(data, limits)
  if (rule5Violation) {
    violations.push(rule5Violation)
  }

  // Nelson Rule 6: Four out of five in zone B or beyond
  const rule6Violation = checkNelsonRule6(data, limits)
  if (rule6Violation) {
    violations.push(rule6Violation)
  }

  // Nelson Rule 7: Fifteen points in zone C
  const rule7Violation = checkNelsonRule7(data, limits)
  if (rule7Violation) {
    violations.push(rule7Violation)
  }

  // Nelson Rule 8: Eight points outside zone C
  const rule8Violation = checkNelsonRule8(data, limits)
  if (rule8Violation) {
    violations.push(rule8Violation)
  }

  return violations
}
