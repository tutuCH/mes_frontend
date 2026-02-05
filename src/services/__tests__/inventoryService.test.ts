import {
  __resetInventoryMocks,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialAssignments,
  createMaterialAssignment,
  updateMaterialAssignment,
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

  it('creates and updates material assignments', async () => {
    const existing = await getMaterialAssignments()
    expect(existing.length).toBeGreaterThan(0)

    const created = await createMaterialAssignment({
      machineId: 3,
      materialId: 'mat_002',
      activeLotId: 'lot_003',
      shotWeightG: 90,
      scrapPercent: 0.03,
      cavities: 2,
      effectiveAt: new Date().toISOString(),
    })

    const afterCreate = await getMaterialAssignments()
    expect(afterCreate.find(item => item.assignmentId === created.assignmentId)).toBeTruthy()

    const updated = await updateMaterialAssignment(created.assignmentId, {
      activeLotId: null,
      shotWeightG: 100,
    })
    expect(updated.activeLotId).toBeNull()
    expect(updated.shotWeightG).toBe(100)
  })
})
