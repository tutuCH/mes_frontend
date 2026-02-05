import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventoryKpiCard } from '@/components/inventory/InventoryKpiCard'
import { MaterialDialog } from '@/components/inventory/MaterialDialog'
import { MaterialRowEditor } from '@/components/inventory/MaterialRowEditor'
import { InventoryBarChart } from '@/components/inventory/charts/InventoryBarChart'
import { InventoryDoughnutChart } from '@/components/inventory/charts/InventoryDoughnutChart'
import { InventoryLineChart } from '@/components/inventory/charts/InventoryLineChart'
import { useInventoryState } from '@/hooks/useInventoryState'
import type { AppDispatch, RootState } from '@/store'
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  fetchInventoryTrend,
  fetchInventorySummary,
  fetchMaterialAssignments,
} from '@/store/slices/inventorySlice'
import type { Material, MaterialType } from '@/types/api'
import { MaterialStatusBadge } from '@/components/inventory/MaterialStatusBadge'
import { useInventoryState } from '@/hooks/useInventoryState'
import type { RootState } from '@/store'
import { calculateRemainingHours, classifyMaterialStatus } from '@/utils/inventoryCalc'
import { DEFAULT_MATERIAL_THRESHOLDS } from '@/utils/inventoryThresholds'

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function InventoryDashboard() {
  const { t } = useTranslation()
  const { materials, summary, assignments, lots, loading, error, refetchAll } = useInventoryState()
  const machines = useSelector((state: RootState) => state.machines.machines)

  const materialsById = useMemo(() => {
    return new Map(materials.map(material => [material.materialId, material]))
  }, [materials])

  const machineRatesByMaterial = useMemo(() => {
    const rates = new Map<string, number>()

    assignments.forEach((assignment) => {
      const machine = machines[assignment.machineId?.toString() ?? '']
      const cycleTime = machine?.cycleTime ?? 0
      const shotWeight = assignment.shotWeightG ?? null
      const scrapPercent = assignment.scrapPercent ?? 0
      if (!cycleTime || cycleTime <= 0 || !shotWeight || shotWeight <= 0) return

      const cyclesPerHour = 3600 / cycleTime
      const kgPerHour = (cyclesPerHour * shotWeight) / 1000 * (1 + scrapPercent)
      const current = rates.get(assignment.materialId) ?? 0
      rates.set(assignment.materialId, current + kgPerHour)
    })

    return rates
  }, [assignments, machines])

  const lotsById = useMemo(() => {
    return new Map(lots.map(lot => [lot.lotId, lot]))
  }, [lots])

  const derivedSummary = useMemo(() => {
    return summary.map((item) => {
      const rate = machineRatesByMaterial.get(item.materialId) ?? 0
      const remainingHours = rate > 0 ? item.availableKg / rate : null
      const status = classifyMaterialStatus({
        remainingKg: item.availableKg,
        remainingHours,
        thresholds: DEFAULT_MATERIAL_THRESHOLDS,
      })

      return {
        ...item,
        remainingHours,
        status,
      }
    })
  }, [summary, machineRatesByMaterial])

  const totalValue = useMemo(() => {
    return derivedSummary.reduce((sum, item) => {
      const material = materialsById.get(item.materialId)
      const cost = material?.defaultCostPerKg ?? 0
      return sum + (item.availableKg + item.reservedKg) * cost
    }, 0)
  }, [derivedSummary, materialsById])

  const materialsAtRisk = derivedSummary.filter(item => item.status !== 'ok').length

  const machinesAtRisk = useMemo(() => {
    let count = 0

    assignments.forEach((assignment) => {
      const lot = assignment.activeLotId ? lotsById.get(assignment.activeLotId) : null
      const remainingKg = lot?.quantityKg ?? null
      if (remainingKg == null) return

      const machine = machines[assignment.machineId?.toString() ?? '']
      const cycleTime = machine?.cycleTime ?? 0
      const cyclesPerHour = cycleTime > 0 ? 3600 / cycleTime : null

      const remainingHours = calculateRemainingHours(
        remainingKg,
        cyclesPerHour,
        assignment.shotWeightG ?? null,
        assignment.scrapPercent ?? 0
      )

      const status = classifyMaterialStatus({
        remainingKg,
        remainingHours,
        thresholds: DEFAULT_MATERIAL_THRESHOLDS,
      })

      if (status !== 'ok') count += 1
    })

    return count
  }, [assignments, lotsById, machines])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('inventory.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={refetchAll}>
          {t('common.refresh')}
        </Button>
      </div>

      {error && (
        <Card className="border-rose-200">
          <CardContent className="pt-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InventoryKpiCard
          title={t('inventory.kpi.totalValue')}
          value={currencyFormatter.format(totalValue)}
          subtitle={t('inventory.kpi.totalValueSubtitle')}
          testId="inventory-total-value"
        />
        <InventoryKpiCard
          title={t('inventory.kpi.materialsAtRisk')}
          value={numberFormatter.format(materialsAtRisk)}
          tone={materialsAtRisk > 0 ? 'warning' : 'default'}
          subtitle={t('inventory.kpi.materialsAtRiskSubtitle')}
          testId="inventory-materials-risk"
        />
        <InventoryKpiCard
          title={t('inventory.kpi.machinesAtRisk')}
          value={numberFormatter.format(machinesAtRisk)}
          tone={machinesAtRisk > 0 ? 'warning' : 'default'}
          subtitle={t('inventory.kpi.machinesAtRiskSubtitle')}
          testId="inventory-machines-risk"
        />
        <InventoryKpiCard
          title={t('inventory.kpi.ordersBlocked')}
          value="0"
          subtitle={t('inventory.kpi.ordersBlockedSubtitle')}
          testId="inventory-orders-blocked"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.table.title')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading.summary ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.table.material')}</TableHead>
                  <TableHead>{t('inventory.table.available')}</TableHead>
                  <TableHead>{t('inventory.table.reserved')}</TableHead>
                  <TableHead>{t('inventory.table.remainingHours')}</TableHead>
                  <TableHead>{t('inventory.table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {derivedSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {t('inventory.table.empty')}
                    </TableCell>
                  </TableRow>
                )}
                {derivedSummary.map((item) => (
                  <TableRow key={item.materialId} data-testid={`inventory-row-${item.materialId}`}>
                    <TableCell>
                      <Link
                        to={`/inventory/${item.materialId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{numberFormatter.format(item.availableKg)} kg</TableCell>
                    <TableCell>{numberFormatter.format(item.reservedKg)} kg</TableCell>
                    <TableCell>
                      {item.remainingHours == null
                        ? '--'
                        : `${numberFormatter.format(item.remainingHours)} h`}
                    </TableCell>
                    <TableCell>
                      <MaterialStatusBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
