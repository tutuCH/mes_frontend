/**
 * Western Electric Rules for SPC (Statistical Process Control)
 * Four rules for detecting out-of-control conditions
 */

import type { ControlLimits } from './spcCalculator'

export interface Violation {
  rule: string
  ruleNumber: number
  description: string
  dataPoints: number[] // Indices of violating points
  severity: 'warning' | 'critical'
}

/**
 * Check Western Electric Rule 1: One point beyond 3σ
 * Critical violation - point outside control limits
 */
function checkRule1(data: number[], limits: ControlLimits): Violation | null {
  const violatingPoints: number[] = []

  data.forEach((val, i) => {
    if (val > limits.ucl || val < limits.lcl) {
      violatingPoints.push(i)
    }
  })

  if (violatingPoints.length > 0) {
    return {
      rule: 'Point Beyond 3σ',
      ruleNumber: 1,
      description: 'One or more points outside control limits',
      dataPoints: violatingPoints,
      severity: 'critical',
    }
  }

  return null
}

/**
 * Check Western Electric Rule 2: Nine consecutive points on one side of CL
 * Warning violation - shift in process mean
 */
function checkRule2(data: number[], limits: ControlLimits): Violation | null {
  let sideCount = 0
  let currentSide: 'above' | 'below' | null = null
  const violatingPoints: number[] = []

  data.forEach((val, i) => {
    if (val > limits.cl) {
      if (currentSide === 'above') {
        sideCount++
      } else {
        sideCount = 1
        currentSide = 'above'
      }
    } else if (val < limits.cl) {
      if (currentSide === 'below') {
        sideCount++
      } else {
        sideCount = 1
        currentSide = 'below'
      }
    } else {
      // Point is exactly on CL, reset
      sideCount = 0
      currentSide = null
    }

    // Check if we have 9 or more consecutive points
    if (sideCount >= 9) {
      // Record the last 9 points
      for (let j = 0; j < 9; j++) {
        violatingPoints.push(i - j)
      }
    }
  })

  if (violatingPoints.length > 0) {
    return {
      rule: 'Nine Points on One Side',
      ruleNumber: 2,
      description: 'Nine consecutive points above/below center line',
      dataPoints: [...new Set(violatingPoints)], // Remove duplicates
      severity: 'warning',
    }
  }

  return null
}

/**
 * Check Western Electric Rule 3: Six consecutive points increasing or decreasing
 * Warning violation - trend in process
 */
function checkRule3(data: number[]): Violation | null {
  let trendCount = 0
  let currentTrend: 'up' | 'down' | null = null
  const violatingPoints: number[] = []

  for (let i = 1; i < data.length; i++) {
    if (data[i] > data[i - 1]) {
      if (currentTrend === 'up') {
        trendCount++
      } else {
        trendCount = 1
        currentTrend = 'up'
      }
    } else if (data[i] < data[i - 1]) {
      if (currentTrend === 'down') {
        trendCount++
      } else {
        trendCount = 1
        currentTrend = 'down'
      }
    } else {
      // Values are equal, reset
      trendCount = 0
      currentTrend = null
    }

    // Check if we have 6 or more consecutive points
    if (trendCount >= 6) {
      // Record the last 6 points
      for (let j = 0; j < 6; j++) {
        violatingPoints.push(i - j)
      }
    }
  }

  if (violatingPoints.length > 0) {
    return {
      rule: 'Six Point Trend',
      ruleNumber: 3,
      description: 'Six consecutive points increasing/decreasing',
      dataPoints: [...new Set(violatingPoints)], // Remove duplicates
      severity: 'warning',
    }
  }

  return null
}

/**
 * Check Western Electric Rule 4: Fourteen points alternating up/down
 * Warning violation - systematic variation
 */
function checkRule4(data: number[]): Violation | null {
  let alternations = 0
  const violatingPoints: number[] = []

  for (let i = 2; i < data.length; i++) {
    const trend1 = data[i - 1] > data[i - 2]
    const trend2 = data[i] > data[i - 1]

    if (trend1 !== trend2) {
      alternations++
    } else {
      alternations = 0
    }

    // Check if we have 14 or more alternations
    if (alternations >= 14) {
      // Record the last 14 points
      for (let j = 0; j < 14; j++) {
        violatingPoints.push(i - j)
      }
    }
  }

  if (violatingPoints.length > 0) {
    return {
      rule: 'Alternating Pattern',
      ruleNumber: 4,
      description: 'Fourteen points alternating up/down',
      dataPoints: [...new Set(violatingPoints)], // Remove duplicates
      severity: 'warning',
    }
  }

  return null
}

/**
 * Check all Western Electric rules
 * Returns array of violations found
 */
export function checkWesternElectricRules(
  data: number[],
  limits: ControlLimits
): Violation[] {
  const violations: Violation[] = []

  // Rule 1: One point beyond 3σ
  const rule1Violation = checkRule1(data, limits)
  if (rule1Violation) {
    violations.push(rule1Violation)
  }

  // Rule 2: Nine consecutive points on one side of CL
  const rule2Violation = checkRule2(data, limits)
  if (rule2Violation) {
    violations.push(rule2Violation)
  }

  // Rule 3: Six consecutive points increasing or decreasing
  const rule3Violation = checkRule3(data)
  if (rule3Violation) {
    violations.push(rule3Violation)
  }

  // Rule 4: Fourteen points alternating up/down
  const rule4Violation = checkRule4(data)
  if (rule4Violation) {
    violations.push(rule4Violation)
  }

  return violations
}

/**
 * Get a summary of violations for display
 */
export function getViolationSummary(violations: Violation[]): {
  total: number
  critical: number
  warning: number
} {
  return {
    total: violations.length,
    critical: violations.filter((v) => v.severity === 'critical').length,
    warning: violations.filter((v) => v.severity === 'warning').length,
  }
}
