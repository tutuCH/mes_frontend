import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Factory } from '@/types/api'

interface MachineBasicInfoStepProps {
  formData: {
    machineName: string
    factoryId: number | null
    selectedRow: number | null
    selectedCol: number | null
  }
  setFormData: (data: any) => void
  factories: Factory[]
  onNext: () => void
  onCancel: () => void
}

export function MachineBasicInfoStep({
  formData,
  setFormData,
  factories,
  onNext,
  onCancel,
}: MachineBasicInfoStepProps) {
  const { t } = useTranslation()

  // Get available positions for selected factory
  const { availablePositions, hasSpace } = useMemo(() => {
    if (!formData.factoryId) {
      return { availablePositions: 0, hasSpace: false }
    }

    const factory = factories.find(f => f.factoryId === formData.factoryId)
    if (!factory) {
      return { availablePositions: 0, hasSpace: false }
    }

    const totalPositions = factory.factoryWidth * factory.factoryHeight
    const occupiedPositions = factory.machines?.length || 0
    const available = totalPositions - occupiedPositions

    return {
      availablePositions: available,
      hasSpace: available > 0,
    }
  }, [formData.factoryId, factories])

  const selectedFactory = factories.find(f => f.factoryId === formData.factoryId)
  const isValid = formData.machineName.trim().length > 0 && formData.factoryId !== null && hasSpace

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {t('deviceRegistry.addDialog.wizard.step1Title', 'Step 1 of 2: Basic Information')}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="machineName">
            {t('deviceRegistry.addDialog.wizard.machineName', 'Machine Name')} *
          </Label>
          <Input
            id="machineName"
            value={formData.machineName}
            onChange={(e) => setFormData({ ...formData, machineName: e.target.value })}
            placeholder={t('deviceRegistry.addDialog.wizard.machineNamePlaceholder', 'Enter machine name')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="factoryId">
            {t('deviceRegistry.addDialog.wizard.factory', 'Factory Location')} *
          </Label>
          <Select
            value={formData.factoryId?.toString() || ''}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                factoryId: parseInt(value),
                selectedRow: null,
                selectedCol: null,
              })
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t('deviceRegistry.addDialog.wizard.selectFactory', 'Select factory')}
              />
            </SelectTrigger>
            <SelectContent>
              {factories.map((factory) => (
                <SelectItem key={factory.factoryId} value={factory.factoryId.toString()}>
                  {factory.factoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedFactory && hasSpace && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900">
              {t(
                'deviceRegistry.addDialog.wizard.availablePositions',
                'Factory "{{name}}" has {{count}} available positions',
                { name: selectedFactory.factoryName, count: availablePositions }
              )}
            </AlertDescription>
          </Alert>
        )}

        {selectedFactory && !hasSpace && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t(
                'deviceRegistry.addDialog.wizard.noAvailablePositions',
                'Selected factory has no available positions. Please choose a different factory or contact admin to expand the grid.'
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t('deviceRegistry.addDialog.wizard.cancel', 'Cancel')}
        </Button>
        <Button onClick={onNext} disabled={!isValid}>
          {t('deviceRegistry.addDialog.wizard.nextStep', 'Next Step')} →
        </Button>
      </div>
    </div>
  )
}
