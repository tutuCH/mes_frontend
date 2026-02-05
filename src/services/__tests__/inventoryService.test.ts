import {
  __resetInventoryMocks,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialAssignments,
  createMaterialAssignment,
  updateMaterialAssignment,
  deleteMaterialAssignment,
  getInventoryTrend,
  getLotStockSeries,
} from '@/services/inventoryService'

describe('inventoryService (mock)', () => {
  beforeEach(() => {
    __resetInventoryMocks()
  })

  it('returns seeded materials', async () => {
    const materials = await getMaterials()
    expect(materials.length).toBeGreaterThan(0)
    expect(materials[0].materialId).toBeTruthy()
  })

  it('creates, updates, and deletes a material', async () => {
    const created = await createMaterial({
      name: 'Nylon',
      materialType: 'virgin',
      densityKgPerM3: 1100,
      defaultCostPerKg: 3.2,
    })

    const afterCreate = await getMaterials()
    expect(afterCreate.find(m => m.materialId === created.materialId)).toBeTruthy()

    const updated = await updateMaterial(created.materialId, { name: 'Nylon 6' })
    expect(updated.name).toBe('Nylon 6')

    await deleteMaterial(created.materialId)
    const afterDelete = await getMaterials()
    expect(afterDelete.find(m => m.materialId === created.materialId)).toBeUndefined()
  })

  it('creates, updates, and deletes a material assignment', async () => {
    const created = await createMaterialAssignment({
      machineId: 3,
      materialId: 'mat_001',
      activeLotId: 'lot_001',
      shotWeightG: 120,
      scrapPercent: 0.03,
      cavities: 2,
      effectiveAt: new Date().toISOString(),
    })

    const assignmentsAfterCreate = await getMaterialAssignments()
    expect(assignmentsAfterCreate.find(a => a.assignmentId === created.assignmentId)).toBeTruthy()

    const updated = await updateMaterialAssignment(created.assignmentId, { scrapPercent: 0.05 })
    expect(updated.scrapPercent).toBe(0.05)

    await deleteMaterialAssignment(created.assignmentId)
    const assignmentsAfterDelete = await getMaterialAssignments()
    expect(assignmentsAfterDelete.find(a => a.assignmentId === created.assignmentId)).toBeUndefined()
  })

  it('returns inventory trend series', async () => {
    const trend = await getInventoryTrend()
    expect(trend.length).toBeGreaterThan(0)
    expect(trend[0].timestamp).toBeTruthy()
    expect(typeof trend[0].consumedKg).toBe('number')
  })

  it('returns lot stock series for a material', async () => {
    const series = await getLotStockSeries('mat_001')
    expect(series.length).toBeGreaterThan(0)
    expect(series[0].lotId).toBeTruthy()
  })
})
