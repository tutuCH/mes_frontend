import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { MaterialStatusBadge } from '@/components/inventory/MaterialStatusBadge'
import type { Material, MaterialSummary } from '@/types/api'

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

interface MaterialRowEditorProps {
  summary: MaterialSummary & { remainingHours: number | null; status: 'ok' | 'warning' | 'critical' }
  material?: Material
  onSave: (materialId: string, patch: Partial<Material>) => Promise<void>
  onDelete: (materialId: string) => Promise<void>
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function MaterialRowEditor({ summary, material, onSave, onDelete }: MaterialRowEditorProps) {
  const { t } = useTranslation()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const typeRef = useRef<HTMLSelectElement | null>(null)
  const densityRef = useRef<HTMLInputElement | null>(null)
  const costRef = useRef<HTMLInputElement | null>(null)

  const initialForm = useMemo(() => {
    return {
      name: material?.name ?? summary.name,
      materialType: material?.materialType ?? 'virgin',
      densityKgPerM3: material?.densityKgPerM3?.toString() ?? '',
      defaultCostPerKg: material?.defaultCostPerKg?.toString() ?? '',
    }
  }, [material, summary.name])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    const nameValue = nameRef.current?.value ?? ''
    if (!nameValue.trim()) return
    setIsSaving(true)
    try {
      await onSave(summary.materialId, {
        name: nameValue.trim(),
        materialType: (typeRef.current?.value as Material['materialType']) ?? initialForm.materialType,
        densityKgPerM3: parseOptionalNumber(densityRef.current?.value ?? ''),
        defaultCostPerKg: parseOptionalNumber(costRef.current?.value ?? ''),
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = material?.name ?? summary.name
  const displayType = material?.materialType ?? 'virgin'
  const displayDensity = material?.densityKgPerM3
  const displayCost = material?.defaultCostPerKg

  return (
    <TableRow key={summary.materialId} data-testid={`inventory-row-${summary.materialId}`}>
      <TableCell className="font-medium">
        {isEditing ? (
          <Input
            data-testid="material-name-input"
            defaultValue={initialForm.name}
            ref={nameRef}
          />
        ) : (
          <Link
            to={`/inventory/${summary.materialId}`}
            className="text-primary hover:underline"
          >
            {displayName}
          </Link>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <select
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            defaultValue={initialForm.materialType}
            ref={typeRef}
          >
            <option value="virgin">{t('inventory.materialType.virgin')}</option>
            <option value="regrind">{t('inventory.materialType.regrind')}</option>
            <option value="additive">{t('inventory.materialType.additive')}</option>
          </select>
        ) : (
          t(`inventory.materialType.${displayType}`)
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="number"
            defaultValue={initialForm.densityKgPerM3}
            ref={densityRef}
          />
        ) : (
          displayDensity != null ? numberFormatter.format(displayDensity) : '--'
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            type="number"
            defaultValue={initialForm.defaultCostPerKg}
            ref={costRef}
          />
        ) : (
          displayCost != null ? currencyFormatter.format(displayCost) : '--'
        )}
      </TableCell>
      <TableCell>{numberFormatter.format(summary.availableKg)} kg</TableCell>
      <TableCell>{numberFormatter.format(summary.reservedKg)} kg</TableCell>
      <TableCell>
        {summary.remainingHours == null
          ? '--'
          : `${numberFormatter.format(summary.remainingHours)} h`}
      </TableCell>
      <TableCell>
        <MaterialStatusBadge status={summary.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap justify-end gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                data-testid={`inventory-save-${summary.materialId}`}
                disabled={isSaving}
              >
                {t('common.save')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                data-testid={`inventory-cancel-${summary.materialId}`}
              >
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                data-testid={`inventory-edit-${summary.materialId}`}
              >
                {t('common.edit')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(summary.materialId)}
                data-testid={`inventory-delete-${summary.materialId}`}
              >
                {t('common.delete')}
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
