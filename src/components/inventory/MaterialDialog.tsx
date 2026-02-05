import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MaterialType } from '@/types/api'

interface MaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: {
    name: string
    materialType: MaterialType
    densityKgPerM3?: number
    defaultCostPerKg?: number
  }) => Promise<void>
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function MaterialDialog({ open, onOpenChange, onCreate }: MaterialDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const typeRef = useRef<HTMLSelectElement | null>(null)
  const densityRef = useRef<HTMLInputElement | null>(null)
  const costRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
      setFormKey(prev => prev + 1)
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nameValue = nameRef.current?.value ?? ''
    if (!nameValue.trim()) return

    setIsSubmitting(true)
    try {
      await onCreate({
        name: nameValue.trim(),
        materialType: (typeRef.current?.value as MaterialType) ?? 'virgin',
        densityKgPerM3: parseOptionalNumber(densityRef.current?.value ?? ''),
        defaultCostPerKg: parseOptionalNumber(costRef.current?.value ?? ''),
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('inventory.materials.addTitle')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} key={formKey}>
          <div className="space-y-2">
            <Label htmlFor="material-name">{t('inventory.materials.name')}</Label>
            <Input
              id="material-name"
              data-testid="material-dialog-name"
              placeholder={t('inventory.materials.namePlaceholder')}
              defaultValue=""
              ref={nameRef}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-type">{t('inventory.materials.type')}</Label>
            <select
              id="material-type"
              data-testid="material-dialog-type"
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
              defaultValue="virgin"
              ref={typeRef}
            >
              <option value="virgin">{t('inventory.materialType.virgin')}</option>
              <option value="regrind">{t('inventory.materialType.regrind')}</option>
              <option value="additive">{t('inventory.materialType.additive')}</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="material-density">{t('inventory.materials.density')}</Label>
              <Input
                id="material-density"
                data-testid="material-dialog-density"
                type="number"
                placeholder={t('inventory.materials.densityPlaceholder')}
                defaultValue=""
                ref={densityRef}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-cost">{t('inventory.materials.cost')}</Label>
              <Input
                id="material-cost"
                data-testid="material-dialog-cost"
                type="number"
                placeholder={t('inventory.materials.costPlaceholder')}
                defaultValue=""
                ref={costRef}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              data-testid="material-dialog-submit"
            >
              {t('inventory.materials.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
