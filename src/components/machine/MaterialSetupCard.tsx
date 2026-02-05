import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInventoryState } from '@/hooks/useInventoryState'
import type { AppDispatch } from '@/store'
import {
  createMaterialAssignment,
  updateMaterialAssignment,
} from '@/store/slices/inventorySlice'
import type { MaterialAssignment } from '@/types/api'

interface MaterialSetupCardProps {
  machineId: number
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function MaterialSetupCard({ machineId }: MaterialSetupCardProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { materials, lots, assignments } = useInventoryState()
  const assignment = useMemo(
    () => assignments.find(item => item.machineId === machineId),
    [assignments, machineId]
  )

  const [selectedMaterialId, setSelectedMaterialId] = useState(
    assignment?.materialId ?? materials[0]?.materialId ?? ''
  )
  const [selectedLotId, setSelectedLotId] = useState(assignment?.activeLotId ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const shotWeightRef = useRef<HTMLInputElement | null>(null)
  const scrapRef = useRef<HTMLInputElement | null>(null)
  const cavitiesRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (assignment) {
      setSelectedMaterialId(assignment.materialId)
      setSelectedLotId(assignment.activeLotId ?? '')
    }
  }, [assignment?.assignmentId])

  const availableLots = useMemo(() => {
    return lots.filter(lot => lot.materialId === selectedMaterialId)
  }, [lots, selectedMaterialId])

  useEffect(() => {
    if (!availableLots.find(lot => lot.lotId === selectedLotId)) {
      setSelectedLotId(availableLots[0]?.lotId ?? '')
    }
  }, [availableLots, selectedLotId])

  const handleSave = async () => {
    if (!selectedMaterialId) return
    setIsSaving(true)
    try {
      const shotWeight = parseOptionalNumber(shotWeightRef.current?.value ?? '')
      const cavities = parseOptionalNumber(cavitiesRef.current?.value ?? '')
      const scrapPercentInput = parseOptionalNumber(scrapRef.current?.value ?? '')
      const scrapPercent = scrapPercentInput != null ? scrapPercentInput / 100 : undefined

      const patch: Partial<MaterialAssignment> = {
        materialId: selectedMaterialId,
        activeLotId: selectedLotId || null,
        shotWeightG: shotWeight ?? assignment?.shotWeightG ?? null,
        scrapPercent: scrapPercent ?? assignment?.scrapPercent ?? null,
        cavities: cavities ?? assignment?.cavities ?? null,
      }

      if (assignment) {
        await dispatch(updateMaterialAssignment({
          assignmentId: assignment.assignmentId,
          patch,
        })).unwrap()
      } else {
        await dispatch(createMaterialAssignment({
          machineId,
          materialId: patch.materialId ?? selectedMaterialId,
          activeLotId: patch.activeLotId ?? null,
          shotWeightG: patch.shotWeightG ?? null,
          scrapPercent: patch.scrapPercent ?? null,
          cavities: patch.cavities ?? null,
          effectiveAt: new Date().toISOString(),
        })).unwrap()
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('machine.materialSetup.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('machine.materialSetup.empty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('machine.materialSetup.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">
              {t('machine.materialSetup.material')}
            </label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={selectedMaterialId}
              onChange={(event) => setSelectedMaterialId(event.target.value)}
              data-testid="material-select"
            >
              {materials.map(material => (
                <option key={material.materialId} value={material.materialId}>
                  {material.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">
              {t('machine.materialSetup.activeLot')}
            </label>
            <select
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              value={selectedLotId}
              onChange={(event) => setSelectedLotId(event.target.value)}
              data-testid="lot-select"
            >
              <option value="">{t('common.none')}</option>
              {availableLots.map(lot => (
                <option key={lot.lotId} value={lot.lotId}>
                  {lot.batchNumber || lot.lotId}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">
              {t('machine.materialSetup.shotWeight')}
            </label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              defaultValue={assignment?.shotWeightG?.toString() ?? ''}
              ref={shotWeightRef}
              data-testid="shot-weight-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">
              {t('machine.materialSetup.scrap')}
            </label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              defaultValue={assignment?.scrapPercent != null ? (assignment.scrapPercent * 100).toString() : ''}
              ref={scrapRef}
              data-testid="scrap-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase text-muted-foreground">
              {t('machine.materialSetup.cavities')}
            </label>
            <input
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              defaultValue={assignment?.cavities?.toString() ?? ''}
              ref={cavitiesRef}
              data-testid="cavities-input"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            data-testid="material-setup-save"
            disabled={isSaving}
          >
            {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
