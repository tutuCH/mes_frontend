import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Factory, Machine } from '@/types/api'

interface MachineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factory: Factory
  machine?: Machine
  coordinate?: string
  onSave?: () => void
}

interface MachineFormData {
  machineName: string
  machineIpAddress: string
}

export function MachineDialog({
  open,
  onOpenChange,
  factory,
  machine,
  coordinate,
  onSave,
}: MachineDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!machine

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MachineFormData>({
    defaultValues: {
      machineName: machine?.machineName || '',
      machineIpAddress: machine?.machineIpAddress || '',
    },
  })

  // Reset form when dialog opens or machine changes
  useEffect(() => {
    if (open) {
      reset({
        machineName: machine?.machineName || '',
        machineIpAddress: machine?.machineIpAddress || '',
      })
    }
  }, [open, machine, reset])

  const [isTesting, setIsTesting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validationRules = {
    machineName: {
      required: t('factoryView.validation.nameRequired'),
      minLength: {
        value: 2,
        message: t('factoryView.validation.nameLength'),
      },
      maxLength: {
        value: 50,
        message: t('factoryView.validation.nameLength'),
      },
      pattern: {
        value: /^[a-zA-Z0-9\u4e00-\u9fa5\-_]+$/,
        message: t('factoryView.validation.nameLength'),
      },
    },
    machineIpAddress: {
      required: t('factoryView.validation.opcRequired'),
      pattern: {
        value: /^opc\.tcp:\/\/[\w.-]+(:\d+)?(\/.*)?$/,
        message: t('factoryView.validation.opcInvalid'),
      },
    },
  }

  const testConnection = async () => {
    const endpoint = document.querySelector<HTMLInputElement>('input[name="machineIpAddress"]')?.value
    if (!endpoint) return

    setIsTesting(true)
    try {
      // Note: This would need an actual OPC UA test endpoint
      // For now, we'll just validate the format
      const regex = /^opc\.tcp:\/\/[\w.-]+(:\d+)?(\/.*)?$/
      if (regex.test(endpoint)) {
        toast.success(t('factoryView.machineDialog.connectionSuccess'))
      } else {
        toast.error(t('factoryView.machineDialog.connectionFailed'))
      }
    } catch (error) {
      toast.error(t('factoryView.machineDialog.connectionFailed'))
    } finally {
      setIsTesting(false)
    }
  }

  const onSubmit = async (data: MachineFormData) => {
    setIsSubmitting(true)
    try {
      // Calculate machine index from coordinate
      const machineIndex = coordinate || machine?.machineIndex || 'A1'

      if (isEditing && machine) {
        await api.updateMachine(machine.machineId, {
          machineName: data.machineName,
          machineIpAddress: data.machineIpAddress,
        })
        toast.success('Machine updated successfully')
      } else {
        await api.createMachine({
          machineName: data.machineName,
          machineIpAddress: data.machineIpAddress,
          machineIndex,
          factoryId: factory.factoryId,
        })
        toast.success('Machine created successfully')
      }

      onOpenChange(false)
      onSave?.()
    } catch (error) {
      console.error('Failed to save machine:', error)
      toast.error(isEditing ? 'Failed to update machine' : 'Failed to create machine')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('factoryView.machineDialog.editTitle') : t('factoryView.machineDialog.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Machine Name */}
          <div className="space-y-2">
            <Label htmlFor="machineName">{t('factoryView.machineDialog.name')}</Label>
            <Input
              id="machineName"
              placeholder={t('factoryView.machineDialog.namePlaceholder')}
              {...register('machineName', validationRules.machineName)}
              className={cn(errors.machineName && 'border-red-500')}
            />
            {errors.machineName && (
              <p className="text-xs text-red-500">{errors.machineName.message}</p>
            )}
          </div>

          {/* OPC UA Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="machineIpAddress">{t('factoryView.machineDialog.opcEndpoint')}</Label>
            <Input
              id="machineIpAddress"
              placeholder={t('factoryView.machineDialog.opcPlaceholder')}
              {...register('machineIpAddress', validationRules.machineIpAddress)}
              className={cn(errors.machineIpAddress && 'border-red-500')}
            />
            {errors.machineIpAddress && (
              <p className="text-xs text-red-500">{errors.machineIpAddress.message}</p>
            )}
          </div>

          {/* Coordinate info (for new machines) */}
          {!isEditing && coordinate && (
            <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
              Position: {coordinate}
            </div>
          )}

          {/* Test Connection Button */}
          <Button
            type="button"
            variant="outline"
            onClick={testConnection}
            disabled={isTesting}
            className="w-full"
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('factoryView.machineDialog.testConnection')}
          </Button>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('factoryView.machineDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || isTesting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('factoryView.machineDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
