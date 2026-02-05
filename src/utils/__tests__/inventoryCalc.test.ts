import {
  calculateCycleDelta,
  calculateConsumptionKg,
  calculateRemainingHours,
  classifyMaterialStatus,
} from '@/utils/inventoryCalc'

describe('inventoryCalc', () => {
  describe('calculateCycleDelta', () => {
    it('returns 0 when previous cycle is missing', () => {
      expect(calculateCycleDelta(null, 120)).toBe(0)
    })

    it('returns positive delta for increasing cycle number', () => {
      expect(calculateCycleDelta(100, 120)).toBe(20)
    })

    it('returns 0 when cycle number resets', () => {
      expect(calculateCycleDelta(120, 5)).toBe(0)
    })
  })

  describe('calculateConsumptionKg', () => {
    it('returns null when shot weight is missing', () => {
      expect(calculateConsumptionKg(10, null, 0.02)).toBeNull()
    })

    it('calculates consumption with scrap factor', () => {
      const consumed = calculateConsumptionKg(100, 80, 0.05)
      // 100 * 80g = 8000g = 8kg * 1.05 = 8.4kg
      expect(consumed).toBeCloseTo(8.4, 5)
    })
  })

  describe('calculateRemainingHours', () => {
    it('returns null when cycle rate or shot weight missing', () => {
      expect(calculateRemainingHours(500, null, 80, 0.02)).toBeNull()
      expect(calculateRemainingHours(500, 120, null, 0.02)).toBeNull()
    })

    it('computes remaining hours from rate and shot weight', () => {
      // cycleRatePerHour = 120, shotWeight = 100g, scrap 0
      // kg/hour = 120 * 100 / 1000 = 12kg/h
      // remainingHours = 240 / 12 = 20
      const hours = calculateRemainingHours(240, 120, 100, 0)
      expect(hours).toBeCloseTo(20, 5)
    })
  })

  describe('classifyMaterialStatus', () => {
    it('returns critical when hours or kg are under thresholds', () => {
      const status = classifyMaterialStatus({
        remainingKg: 80,
        remainingHours: 1.5,
        thresholds: { criticalHours: 2, warningHours: 6, criticalKg: 100, warningKg: 300 },
      })
      expect(status).toBe('critical')
    })

    it('returns warning when below warning thresholds', () => {
      const status = classifyMaterialStatus({
        remainingKg: 250,
        remainingHours: 4,
        thresholds: { criticalHours: 2, warningHours: 6, criticalKg: 100, warningKg: 300 },
      })
      expect(status).toBe('warning')
    })

    it('returns ok when above thresholds', () => {
      const status = classifyMaterialStatus({
        remainingKg: 800,
        remainingHours: 12,
        thresholds: { criticalHours: 2, warningHours: 6, criticalKg: 100, warningKg: 300 },
      })
      expect(status).toBe('ok')
    })
  })
})
