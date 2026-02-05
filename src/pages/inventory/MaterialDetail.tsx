import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
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
import { InventoryBarChart } from '@/components/inventory/charts/InventoryBarChart'
import { InventoryLineChart } from '@/components/inventory/charts/InventoryLineChart'
import { LotDialog } from '@/components/inventory/LotDialog'
import { MaterialStatusBadge } from '@/components/inventory/MaterialStatusBadge'
import { useInventoryState } from '@/hooks/useInventoryState'
import type { AppDispatch, RootState } from '@/store'
import type { InventoryLotStatus } from '@/types/api'
import {
  createInventoryLot,
  deleteInventoryLot,
  fetchInventorySummary,
  fetchMaterialConsumption,
  updateInventoryLot,
} from '@/store/slices/inventorySlice'
import { calculateRemainingHours, classifyMaterialStatus } from '@/utils/inventoryCalc'
import { DEFAULT_MATERIAL_THRESHOLDS } from '@/utils/inventoryThresholds'

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
const emptyConsumption: { timestamp: string; consumedKg: number }[] = []

export default function MaterialDetail() {
  const { t } = useTranslation()
  const { materialId } = useParams()
  const dispatch = useDispatch<AppDispatch>()
  const { materials, lots, assignments, summary, loading } = useInventoryState()
  const machines = useSelector((state: RootState) => state.machines.machines)
  const [isLotDialogOpen, setIsLotDialogOpen] = useState(false)
  const [editingLotId, setEditingLotId] = useState<string | null>(null)
  const batchRef = useRef<HTMLInputElement | null>(null)
  const quantityRef = useRef<HTMLInputElement | null>(null)
  const statusRef = useRef<HTMLSelectElement | null>(null)
  const consumption = useSelector((state: RootState) =>
    materialId ? state.inventory.consumptionByMaterial[materialId] ?? emptyConsumption : emptyConsumption
  )
  const consumptionLoading = useSelector((state: RootState) =>
    materialId ? state.inventory.loading.consumption[materialId] : false
  )

  useEffect(() => {
    if (materialId) {
      dispatch(fetchMaterialConsumption({ materialId }))
    }
  }, [dispatch, materialId])

  const material = materials.find(item => item.materialId === materialId)
  const materialSummary = summary.find(item => item.materialId === materialId)
  const materialLots = lots.filter(lot => lot.materialId === materialId)
  const materialAssignments = assignments.filter(assign => assign.materialId === materialId)

  const lotStockLabels = useMemo(() => materialLots.map(lot => lot.batchNumber || lot.lotId), [materialLots])
  const lotStockData = useMemo(() => materialLots.map(lot => lot.quantityKg), [materialLots])

  const handleCreateLot = useCallback(async (input: {
    batchNumber?: string
    quantityKg: number
    status: InventoryLotStatus
    supplier?: string
    location?: string
  }) => {
    if (!materialId) return
    await dispatch(createInventoryLot({
      materialId,
      quantityKg: input.quantityKg,
      status: input.status,
      batchNumber: input.batchNumber,
      supplier: input.supplier,
      location: input.location,
      receivedAt: new Date().toISOString(),
    })).unwrap()
    await dispatch(fetchInventorySummary()).unwrap()
  }, [dispatch, materialId])

  const handleUpdateLot = useCallback(async (lotId: string, existingStatus: InventoryLotStatus) => {
    const quantityValue = Number(quantityRef.current?.value ?? '')
    const patch = {
      batchNumber: batchRef.current?.value || undefined,
      quantityKg: Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : undefined,
      status: (statusRef.current?.value as InventoryLotStatus) || existingStatus,
    }

    await dispatch(updateInventoryLot({ lotId, patch })).unwrap()
    await dispatch(fetchInventorySummary()).unwrap()
    setEditingLotId(null)
  }, [dispatch])

  const handleDeleteLot = useCallback(async (lotId: string) => {
    await dispatch(deleteInventoryLot(lotId)).unwrap()
    await dispatch(fetchInventorySummary()).unwrap()
  }, [dispatch])

  const remainingHours = useMemo(() => {
    if (!materialSummary) return null
    let rate = 0

    materialAssignments.forEach((assignment) => {
      const machine = machines[assignment.machineId?.toString() ?? '']
      const cycleTime = machine?.cycleTime ?? 0
      const shotWeight = assignment.shotWeightG ?? null
      const scrapPercent = assignment.scrapPercent ?? 0
      if (!cycleTime || cycleTime <= 0 || !shotWeight || shotWeight <= 0) return

      const cyclesPerHour = 3600 / cycleTime
      rate += (cyclesPerHour * shotWeight) / 1000 * (1 + scrapPercent)
    })

    if (rate <= 0) return null
    return materialSummary.availableKg / rate
  }, [materialSummary, materialAssignments, machines])

  const status = materialSummary
    ? classifyMaterialStatus({
        remainingKg: materialSummary.availableKg,
        remainingHours,
        thresholds: DEFAULT_MATERIAL_THRESHOLDS,
      })
    : 'ok'

  if (!materialId) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link to="/inventory">{t('common.back')}</Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('inventory.detail.missingMaterial')}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading.materials && materials.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!material) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link to="/inventory">{t('common.back')}</Link>
        </Button>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('inventory.detail.notFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" asChild className="mb-3 px-0">
            <Link to="/inventory">{t('common.back')}</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{material.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inventory.detail.materialType')}: {material.materialType}
          </p>
        </div>
        <MaterialStatusBadge status={status} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">
              {t('inventory.detail.available')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {materialSummary ? `${numberFormatter.format(materialSummary.availableKg)} kg` : '--'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">
              {t('inventory.detail.reserved')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {materialSummary ? `${numberFormatter.format(materialSummary.reservedKg)} kg` : '--'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground">
              {t('inventory.detail.remainingHours')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {remainingHours == null ? '--' : `${numberFormatter.format(remainingHours)} h`}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t('inventory.detail.stockByLot')}</CardTitle>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLotDialogOpen(true)}
            data-testid="inventory-add-lot"
          >
            {t('inventory.detail.addLot')}
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.detail.lotId')}</TableHead>
                <TableHead>{t('inventory.detail.batch')}</TableHead>
                <TableHead>{t('inventory.detail.quantity')}</TableHead>
                <TableHead>{t('inventory.detail.status')}</TableHead>
                <TableHead className="text-right">{t('inventory.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialLots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('inventory.detail.noLots')}
                  </TableCell>
                </TableRow>
              )}
              {materialLots.map(lot => (
                <TableRow key={lot.lotId} data-testid={`lot-row-${lot.lotId}`}>
                  <TableCell className="font-medium">{lot.lotId}</TableCell>
                  <TableCell>
                    {editingLotId === lot.lotId ? (
                      <input
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm"
                        defaultValue={lot.batchNumber ?? ''}
                        ref={batchRef}
                      />
                    ) : (
                      lot.batchNumber || '--'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingLotId === lot.lotId ? (
                      <input
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm"
                        defaultValue={lot.quantityKg.toString()}
                        data-testid="lot-quantity-input"
                        ref={quantityRef}
                      />
                    ) : (
                      `${numberFormatter.format(lot.quantityKg)} kg`
                    )}
                  </TableCell>
                  <TableCell className="capitalize">
                    {editingLotId === lot.lotId ? (
                      <select
                        className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm"
                        defaultValue={lot.status}
                        ref={statusRef}
                      >
                        <option value="available">{t('inventory.lotStatus.available')}</option>
                        <option value="reserved">{t('inventory.lotStatus.reserved')}</option>
                        <option value="consumed">{t('inventory.lotStatus.consumed')}</option>
                      </select>
                    ) : (
                      t(`inventory.lotStatus.${lot.status}`)
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {editingLotId === lot.lotId ? (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleUpdateLot(lot.lotId, lot.status)}
                            data-testid={`lot-save-${lot.lotId}`}
                          >
                            {t('common.save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLotId(null)}
                          >
                            {t('common.cancel')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingLotId(lot.lotId)}
                            data-testid={`lot-edit-${lot.lotId}`}
                          >
                            {t('common.edit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteLot(lot.lotId)}
                            data-testid={`lot-delete-${lot.lotId}`}
                          >
                            {t('common.delete')}
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {materialLots.length > 0 && (
            <div className="mt-6">
              <InventoryBarChart
                labels={lotStockLabels}
                datasets={[
                  {
                    label: t('inventory.detail.quantity'),
                    data: lotStockData,
                    backgroundColor: 'rgba(34, 197, 94, 0.65)',
                  },
                ]}
                testId="material-lot-stock-chart"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <LotDialog
        open={isLotDialogOpen}
        onOpenChange={setIsLotDialogOpen}
        onCreate={handleCreateLot}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.detail.machinesConsuming')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('inventory.detail.machine')}</TableHead>
                <TableHead>{t('inventory.detail.shotWeight')}</TableHead>
                <TableHead>{t('inventory.detail.scrap')}</TableHead>
                <TableHead>{t('inventory.detail.remainingHours')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialAssignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t('inventory.detail.noAssignments')}
                  </TableCell>
                </TableRow>
              )}
              {materialAssignments.map((assignment) => {
                const machine = machines[assignment.machineId?.toString() ?? '']
                const lot = assignment.activeLotId
                  ? materialLots.find(item => item.lotId === assignment.activeLotId)
                  : null
                const cycleTime = machine?.cycleTime ?? 0
                const cyclesPerHour = cycleTime > 0 ? 3600 / cycleTime : null
                const remainingMachineHours = lot
                  ? calculateRemainingHours(
                      lot.quantityKg,
                      cyclesPerHour,
                      assignment.shotWeightG ?? null,
                      assignment.scrapPercent ?? 0
                    )
                  : null

                return (
                  <TableRow key={assignment.assignmentId}>
                    <TableCell>{machine?.name || assignment.machineId}</TableCell>
                    <TableCell>
                      {assignment.shotWeightG != null
                        ? `${numberFormatter.format(assignment.shotWeightG)} g`
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {assignment.scrapPercent != null
                        ? `${numberFormatter.format(assignment.scrapPercent * 100)}%`
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {remainingMachineHours == null
                        ? '--'
                        : `${numberFormatter.format(remainingMachineHours)} h`}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('inventory.detail.consumptionTrend')}</CardTitle>
          <span data-testid="consumption-count" className="text-xs text-muted-foreground">
            {consumption.length}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {consumptionLoading ? (
            <div className="py-6 text-sm text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <>
              <InventoryLineChart
                points={consumption}
                label={t('inventory.detail.consumed')}
                testId="material-consumption-chart"
              />
              <Table className="mt-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inventory.detail.timestamp')}</TableHead>
                    <TableHead>{t('inventory.detail.consumed')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumption.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground">
                        {t('inventory.detail.noConsumption')}
                      </TableCell>
                    </TableRow>
                  )}
                  {consumption.map(point => (
                    <TableRow key={point.timestamp}>
                      <TableCell>{new Date(point.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{numberFormatter.format(point.consumedKg)} kg</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
