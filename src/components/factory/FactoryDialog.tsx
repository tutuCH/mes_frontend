import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Factory } from '@/types/api'

interface FactoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factory: Factory
  onSave?: () => void
}

interface FactoryFormData {
  factoryName: string
  factoryIndex: number
  width: number
  height: number
}

export function FactoryDialog({
  open,
  onOpenChange,
  factory,
  onSave,
}: FactoryDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FactoryFormData>({
    defaultValues: {
      factoryName: factory.factoryName || '',
      factoryIndex: Number(factory.factoryIndex || 0),
      width: Number(factory.factoryWidth || 10),
      height: Number(factory.factoryHeight || 10),
    },
  })

  // Reset form when dialog opens or factory changes
  useEffect(() => {
    if (open) {
      reset({
        factoryName: factory.factoryName || '',
        factoryIndex: Number(factory.factoryIndex || 0),
        width: Number(factory.factoryWidth || 10),
        height: Number(factory.factoryHeight || 10),
      })
    }
  }, [open, factory, reset])

  const watchedWidth = watch('width')
  const watchedHeight = watch('height')

  const validationRules = {
    factoryName: {
      required: t('factoryView.validation.nameRequired'),
      minLength: {
        value: 2,
        message: t('factoryView.validation.nameLength'),
      },
      maxLength: {
        value: 50,
        message: t('factoryView.validation.nameLength'),
      },
    },
    width: {
      required: 'Width is required',
      min: {
        value: 1,
        message: 'Width must be at least 1',
      },
      max: {
        value: 26,
        message: 'Width cannot exceed 26 columns',
      },
    },
    height: {
      required: 'Height is required',
      min: {
        value: 1,
        message: 'Height must be at least 1',
      },
    },
  }

  const validateFactorySize = (): boolean => {
    const newWidth = watchedWidth || 0
    const newHeight = watchedHeight || 0
    const totalCells = newWidth * newHeight

    // Check if factory can accommodate existing machines
    const machineCount = factory.machines?.length || 0
    if (totalCells < machineCount) {
      toast.error(t('factoryView.factoryDialog.sizeError'))
      return false
    }

    return true
  }

  const onSubmit = async (data: FactoryFormData) => {
    if (!validateFactorySize()) {
      return
    }

    setIsSubmitting(true)
    try {
      // Check if create mode (factoryId === 0) or edit mode
      const isCreateMode = factory.factoryId === 0

      if (isCreateMode) {
        await api.createFactory({
          factoryName: data.factoryName,
          factoryIndex: data.factoryIndex.toString(),
          width: data.width.toString(),
          height: data.height.toString(),
        })
        toast.success('Factory created successfully')
      } else {
        await api.updateFactory(factory.factoryId, {
          factoryName: data.factoryName,
          factoryIndex: data.factoryIndex,
          width: data.width,
          height: data.height,
        })
        toast.success('Factory updated successfully')
      }

      onOpenChange(false)
      onSave?.()
    } catch (error) {
      console.error('Failed to save factory:', error)
      toast.error('Failed to save factory')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('factoryView.factoryDialog.title')}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">{t('factoryView.factoryDialog.infoTab')}</TabsTrigger>
            <TabsTrigger value="criteria">{t('factoryView.factoryDialog.criteriaTab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Factory Name */}
              <div className="space-y-2">
                <Label htmlFor="factoryName">{t('factoryView.factoryDialog.name')}</Label>
                <Input
                  id="factoryName"
                  {...register('factoryName', validationRules.factoryName)}
                  className={cn(errors.factoryName && 'border-red-500')}
                />
                {errors.factoryName && (
                  <p className="text-xs text-red-500">{errors.factoryName.message}</p>
                )}
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">{t('factoryView.factoryDialog.width')}</Label>
                  <Input
                    id="width"
                    type="number"
                    min={1}
                    max={26}
                    {...register('width', { ...validationRules.width, valueAsNumber: true })}
                    className={cn(errors.width && 'border-red-500')}
                  />
                  {errors.width && (
                    <p className="text-xs text-red-500">{errors.width.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">{t('factoryView.factoryDialog.height')}</Label>
                  <Input
                    id="height"
                    type="number"
                    min={1}
                    {...register('height', { ...validationRules.height, valueAsNumber: true })}
                    className={cn(errors.height && 'border-red-500')}
                  />
                  {errors.height && (
                    <p className="text-xs text-red-500">{errors.height.message}</p>
                  )}
                </div>
              </div>

              {/* Current size info */}
              <div className="p-3 bg-muted rounded text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current size:</span>
                  <span className="font-medium">{factory.factoryWidth} × {factory.factoryHeight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total cells:</span>
                  <span className="font-medium">{watchedWidth * watchedHeight}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Machines:</span>
                  <span className="font-medium">{factory.machines?.length || 0}</span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('factoryView.factoryDialog.save')}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="criteria" className="space-y-4 mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Warning criteria configuration</p>
              <p className="text-xs mt-2">This feature will be available in a future update.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
