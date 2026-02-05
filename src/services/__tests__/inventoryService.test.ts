import {
  __resetInventoryMocks,
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
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
})
