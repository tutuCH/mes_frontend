import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BlueprintGrid } from '@/components/factory/BlueprintGrid'
import { Loader2, CheckCircle2 } from 'lucide-react'
import type { Factory } from '@/types/api'

interface MachinePositionStepProps {
  formData: {
    machineName: string
    factoryId: number | null
    selectedRow: number | null
    selectedCol: number | null
  }
  setFormData: (data: any) => void
  factories: Factory[]
  onBack: () => void
  onCancel: () => void
  onCreate: () => void
  isSubmitting: boolean
}

export function MachinePositionStep({
  formData,
  setFormData,
  factories,
  onBack,
  onCancel,
  onCreate,
  isSubmitting,
}: MachinePositionStepProps) {
  const { t } = useTranslation()

  const selectedFactory = useMemo(() => {
    return factories.find(f => f.factoryId === formData.factoryId)
  }, [factories, formData.factoryId])

  const selectedPositionInfo = useMemo(() => {
    if (formData.selectedRow === null || formData.selectedCol === null || !selectedFactory) {
      return null
    }

    const gridWidth = selectedFactory.factoryWidth
    const machineIndex = formData.selectedRow * gridWidth + formData.selectedCol

    return {
      index: machineIndex,
      row: formData.selectedRow,
      col: formData.selectedCol,
    }
  }, [formData.selectedRow, formData.selectedCol, selectedFactory])

  const handleCellClick = (row: number, col: number) => {
    if (isSubmitting) return

    // Check if position is already occupied
    const gridWidth = selectedFactory?.factoryWidth || 0
    const clickedIndex = row * gridWidth + col
    const isOccupied = selectedFactory?.machines?.some(
      (m) => parseInt(m.machineIndex, 10) === clickedIndex
    )

    if (!isOccupied) {
      setFormData({
        ...formData,
        selectedRow: row,
        selectedCol: col,
      })
    }
  }

  if (!selectedFactory) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {t('deviceRegistry.addDialog.wizard.step2Title', 'Step 2 of 2: Select Position')}
      </div>

      <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
        <div className="text-sm">
          <span className="font-medium">
            {t('deviceRegistry.addDialog.wizard.machineInfo', 'Machine: "{{name}}"', {
              name: formData.machineName,
            })}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('deviceRegistry.addDialog.wizard.factoryInfo', 'Factory: "{{name}}"', {
            name: selectedFactory.factoryName,
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">
          {t('deviceRegistry.addDialog.wizard.clickToSelect', 'Click an empty position on the grid:')}
        </div>
        <BlueprintGrid
          factory={selectedFactory}
          machines={selectedFactory.machines || []}
          onCellClick={handleCellClick}
          selectionMode={true}
          selectedPosition={
            formData.selectedRow !== null && formData.selectedCol !== null
              ? { row: formData.selectedRow, col: formData.selectedCol }
              : null
          }
          disableDragDrop={true}
        />
      </div>

      {selectedPositionInfo ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            {t(
              'deviceRegistry.addDialog.wizard.selectedPosition',
              'Selected: Position {{index}} (Row {{row}}, Column {{col}})',
              {
                index: selectedPositionInfo.index,
                row: selectedPositionInfo.row,
                col: selectedPositionInfo.col,
              }
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              'deviceRegistry.addDialog.wizard.noPositionSelected',
              'Please select a position on the grid'
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          ← {t('deviceRegistry.addDialog.wizard.previousStep', 'Back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('deviceRegistry.addDialog.wizard.cancel', 'Cancel')}
          </Button>
          <Button onClick={onCreate} disabled={!selectedPositionInfo || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('deviceRegistry.addDialog.wizard.createMachine', 'Create Machine')}
          </Button>
        </div>
      </div>
    </div>
  )
}
