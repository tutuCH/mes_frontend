export type MaterialStatus = 'ok' | 'warning' | 'critical'

export interface MaterialStatusThresholds {
  criticalHours: number
  warningHours: number
  criticalKg: number
  warningKg: number
}

export function calculateCycleDelta(
  previousCycle: number | null | undefined,
  nextCycle: number | null | undefined
): number {
  if (previousCycle == null || nextCycle == null) return 0
  if (nextCycle < previousCycle) return 0
  return nextCycle - previousCycle
}

export function calculateConsumptionKg(
  cycleDelta: number,
  shotWeightG: number | null | undefined,
  scrapPercent: number = 0
): number | null {
  if (shotWeightG == null || shotWeightG <= 0) return null
  if (cycleDelta <= 0) return 0

  const baseKg = (cycleDelta * shotWeightG) / 1000
  return baseKg * (1 + scrapPercent)
}

export function calculateRemainingHours(
  remainingKg: number,
  cycleRatePerHour: number | null | undefined,
  shotWeightG: number | null | undefined,
  scrapPercent: number = 0
): number | null {
  if (!cycleRatePerHour || cycleRatePerHour <= 0) return null
  if (shotWeightG == null || shotWeightG <= 0) return null

  const kgPerHour = (cycleRatePerHour * shotWeightG) / 1000 * (1 + scrapPercent)
  if (kgPerHour <= 0) return null
  return remainingKg / kgPerHour
}

export function classifyMaterialStatus({
  remainingKg,
  remainingHours,
  thresholds,
}: {
  remainingKg: number | null
  remainingHours: number | null
  thresholds: MaterialStatusThresholds
}): MaterialStatus {
  const isCritical =
    (remainingHours != null && remainingHours <= thresholds.criticalHours) ||
    (remainingKg != null && remainingKg <= thresholds.criticalKg)

  if (isCritical) return 'critical'

  const isWarning =
    (remainingHours != null && remainingHours <= thresholds.warningHours) ||
    (remainingKg != null && remainingKg <= thresholds.warningKg)

  if (isWarning) return 'warning'
  return 'ok'
}
