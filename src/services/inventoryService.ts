import type {
  Material,
  MaterialType,
  InventoryLot,
  InventoryLotStatus,
  MaterialAssignment,
  MaterialSummary,
  MaterialConsumptionPoint,
} from '@/types/api'

let materialCounter = 3
let lotCounter = 3

const seedMaterials: Material[] = [
  {
    materialId: 'mat_001',
    name: 'ABS',
    materialType: 'virgin',
    densityKgPerM3: 1040,
    defaultCostPerKg: 2.4,
    createdAt: new Date().toISOString(),
  },
  {
    materialId: 'mat_002',
    name: 'PP',
    materialType: 'virgin',
    densityKgPerM3: 910,
    defaultCostPerKg: 1.8,
    createdAt: new Date().toISOString(),
  },
  {
    materialId: 'mat_003',
    name: 'Color Masterbatch',
    materialType: 'additive',
    densityKgPerM3: 1200,
    defaultCostPerKg: 4.2,
    createdAt: new Date().toISOString(),
  },
]

const seedLots: InventoryLot[] = [
  {
    lotId: 'lot_001',
    materialId: 'mat_001',
    supplier: 'ACME Resins',
    batchNumber: 'ABS-2026-01',
    quantityKg: 600,
    receivedAt: new Date().toISOString(),
    status: 'available',
    factoryId: 1,
    location: 'Warehouse A',
  },
  {
    lotId: 'lot_002',
    materialId: 'mat_001',
    supplier: 'ACME Resins',
    batchNumber: 'ABS-2026-02',
    quantityKg: 400,
    receivedAt: new Date().toISOString(),
    status: 'reserved',
    factoryId: 1,
    location: 'Warehouse A',
  },
  {
    lotId: 'lot_003',
    materialId: 'mat_002',
    supplier: 'PolyCo',
    batchNumber: 'PP-2026-01',
    quantityKg: 800,
    receivedAt: new Date().toISOString(),
    status: 'available',
    factoryId: 1,
    location: 'Warehouse B',
  },
]

const seedAssignments: MaterialAssignment[] = [
  {
    assignmentId: 'ma_001',
    machineId: 1,
    materialId: 'mat_001',
    activeLotId: 'lot_001',
    shotWeightG: 80,
    scrapPercent: 0.02,
    cavities: 2,
    effectiveAt: new Date().toISOString(),
  },
  {
    assignmentId: 'ma_002',
    machineId: 2,
    materialId: 'mat_002',
    activeLotId: 'lot_003',
    shotWeightG: 95,
    scrapPercent: 0.01,
    cavities: 1,
    effectiveAt: new Date().toISOString(),
  },
]

let materials = [...seedMaterials]
let lots = [...seedLots]
let assignments = [...seedAssignments]

export function __resetInventoryMocks() {
  materialCounter = 3
  lotCounter = 3
  materials = [...seedMaterials]
  lots = [...seedLots]
  assignments = [...seedAssignments]
}

function nextMaterialId() {
  materialCounter += 1
  return `mat_${String(materialCounter).padStart(3, '0')}`
}

function nextLotId() {
  lotCounter += 1
  return `lot_${String(lotCounter).padStart(3, '0')}`
}

export async function getMaterials(): Promise<Material[]> {
  return [...materials]
}

export async function createMaterial(input: {
  name: string
  materialType: MaterialType
  densityKgPerM3?: number
  defaultCostPerKg?: number
}): Promise<Material> {
  const material: Material = {
    materialId: nextMaterialId(),
    name: input.name,
    materialType: input.materialType,
    densityKgPerM3: input.densityKgPerM3,
    defaultCostPerKg: input.defaultCostPerKg,
    createdAt: new Date().toISOString(),
  }
  materials = [...materials, material]
  return material
}

export async function updateMaterial(materialId: string, patch: Partial<Material>): Promise<Material> {
  const index = materials.findIndex(m => m.materialId === materialId)
  if (index === -1) throw new Error('Material not found')

  const updated = { ...materials[index], ...patch, updatedAt: new Date().toISOString() }
  materials = materials.map(m => (m.materialId === materialId ? updated : m))
  return updated
}

export async function deleteMaterial(materialId: string): Promise<void> {
  materials = materials.filter(m => m.materialId !== materialId)
  lots = lots.filter(l => l.materialId !== materialId)
}

export async function getInventoryLots(filter?: {
  materialId?: string
  status?: InventoryLotStatus
  factoryId?: number
}): Promise<InventoryLot[]> {
  return lots.filter(lot => {
    if (filter?.materialId && lot.materialId !== filter.materialId) return false
    if (filter?.status && lot.status !== filter.status) return false
    if (filter?.factoryId && lot.factoryId !== filter.factoryId) return false
    return true
  })
}

export async function createInventoryLot(input: Omit<InventoryLot, 'lotId'>): Promise<InventoryLot> {
  const lot: InventoryLot = {
    ...input,
    lotId: nextLotId(),
  }
  lots = [...lots, lot]
  return lot
}

export async function updateInventoryLot(lotId: string, patch: Partial<InventoryLot>): Promise<InventoryLot> {
  const index = lots.findIndex(l => l.lotId === lotId)
  if (index === -1) throw new Error('Lot not found')

  const updated = { ...lots[index], ...patch }
  lots = lots.map(l => (l.lotId === lotId ? updated : l))
  return updated
}

export async function deleteInventoryLot(lotId: string): Promise<void> {
  lots = lots.filter(l => l.lotId !== lotId)
}

export async function getMaterialAssignments(): Promise<MaterialAssignment[]> {
  return [...assignments]
}

export async function getInventorySummary(): Promise<MaterialSummary[]> {
  return materials.map(material => {
    const materialLots = lots.filter(l => l.materialId === material.materialId)
    const availableKg = materialLots
      .filter(l => l.status === 'available')
      .reduce((sum, l) => sum + l.quantityKg, 0)
    const reservedKg = materialLots
      .filter(l => l.status === 'reserved')
      .reduce((sum, l) => sum + l.quantityKg, 0)

    return {
      materialId: material.materialId,
      name: material.name,
      availableKg,
      reservedKg,
      remainingHours: null,
      status: 'ok',
    }
  })
}

export async function getMaterialConsumption(
  _materialId: string,
  options?: { start?: string; end?: string }
): Promise<MaterialConsumptionPoint[]> {
  const start = options?.start ? new Date(options.start) : new Date(Date.now() - 6 * 3600 * 1000)
  const points: MaterialConsumptionPoint[] = []
  for (let i = 0; i < 6; i += 1) {
    const ts = new Date(start.getTime() + i * 60 * 60 * 1000)
    points.push({
      timestamp: ts.toISOString(),
      consumedKg: Math.max(5, 20 - i * 2),
    })
  }
  return points
}
