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
    },
  })

  // Reset form when dialog opens or machine changes
  useEffect(() => {
    if (open) {
      reset({
        machineName: machine?.machineName || '',
      })
    }
  }, [open, machine, reset])

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
  }

  const onSubmit = async (data: MachineFormData) => {
    setIsSubmitting(true)
    try {
      // Calculate machine index from coordinate
      const machineIndex = coordinate || machine?.machineIndex || 'A1'

      if (isEditing && machine) {
        await api.updateMachine(machine.machineId, {
          machineName: data.machineName,
        })
        toast.success('Machine updated successfully')
      } else {
        await api.createMachine({
          machineName: data.machineName,
          machineIndex,
          factoryId: factory.factoryId,
          factoryIndex: factory.factoryIndex,
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

          {/* Coordinate info (for new machines) */}
          {!isEditing && coordinate && (
            <div className="p-2 bg-muted rounded text-xs text-muted-foreground">
              Position: {coordinate}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('factoryView.machineDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('factoryView.machineDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
