import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
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
} from '@/store/slices/inventorySlice'
import type { Material } from '@/types/api'
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
  const dispatch = useDispatch<AppDispatch>()
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false)
  const {
    materials,
    summary,
    assignments,
    lots,
    inventoryTrend,
    loading,
    error,
    refetchAll,
    refetchSummary,
  } = useInventoryState()
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

  const statusCounts = useMemo(() => {
    return derivedSummary.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { ok: 0, warning: 0, critical: 0 }
    )
  }, [derivedSummary])

  const stockLabels = useMemo(() => derivedSummary.map(item => item.name), [derivedSummary])
  const stockDatasets = useMemo(() => {
    return [
      {
        label: t('inventory.table.available'),
        data: derivedSummary.map(item => item.availableKg),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: t('inventory.table.reserved'),
        data: derivedSummary.map(item => item.reservedKg),
        backgroundColor: 'rgba(249, 115, 22, 0.6)',
      },
    ]
  }, [derivedSummary, t])

  const handleCreateMaterial = async (input: {
    name: string
    materialType: Material['materialType']
    densityKgPerM3?: number
    defaultCostPerKg?: number
  }) => {
    await dispatch(createMaterial(input)).unwrap()
    refetchSummary()
  }

  const handleSaveMaterial = async (materialId: string, patch: Partial<Material>) => {
    await dispatch(updateMaterial({ materialId, patch })).unwrap()
    refetchSummary()
  }

  const handleDeleteMaterial = async (materialId: string) => {
    await dispatch(deleteMaterial(materialId)).unwrap()
    refetchSummary()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('inventory.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setIsMaterialDialogOpen(true)}>
            {t('inventory.materials.add')}
          </Button>
          <Button variant="outline" onClick={refetchAll}>
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      <MaterialDialog
        open={isMaterialDialogOpen}
        onOpenChange={setIsMaterialDialogOpen}
        onCreate={handleCreateMaterial}
      />

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('inventory.charts.consumption')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InventoryLineChart
              points={inventoryTrend}
              testId="inventory-trend-chart"
              className="h-56"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('inventory.charts.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InventoryDoughnutChart
              labels={[
                t('inventory.status.ok'),
                t('inventory.status.warning'),
                t('inventory.status.critical'),
              ]}
              data={[statusCounts.ok, statusCounts.warning, statusCounts.critical]}
              testId="inventory-status-chart"
              className="h-56"
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('inventory.table.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InventoryBarChart
              labels={stockLabels}
              datasets={stockDatasets}
              testId="inventory-stock-chart"
              className="h-60"
            />
          </CardContent>
        </Card>
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
                  <TableHead>{t('inventory.table.type')}</TableHead>
                  <TableHead>{t('inventory.table.density')}</TableHead>
                  <TableHead>{t('inventory.table.cost')}</TableHead>
                  <TableHead>{t('inventory.table.available')}</TableHead>
                  <TableHead>{t('inventory.table.reserved')}</TableHead>
                  <TableHead>{t('inventory.table.remainingHours')}</TableHead>
                  <TableHead>{t('inventory.table.status')}</TableHead>
                  <TableHead className="text-right">{t('inventory.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {derivedSummary.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      {t('inventory.table.empty')}
                    </TableCell>
                  </TableRow>
                )}
                {derivedSummary.map((item) => (
                  <MaterialRowEditor
                    key={item.materialId}
                    summary={item}
                    material={materialsById.get(item.materialId)}
                    onSave={handleSaveMaterial}
                    onDelete={handleDeleteMaterial}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
