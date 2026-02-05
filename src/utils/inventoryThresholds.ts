import type { MaterialStatusThresholds } from '@/utils/inventoryCalc'

export const DEFAULT_MATERIAL_THRESHOLDS: MaterialStatusThresholds = {
  criticalHours: 2,
  warningHours: 8,
  criticalKg: 50,
  warningKg: 200,
}
