import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { InventoryLotStatus } from '@/types/api'

interface LotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: {
    batchNumber?: string
    quantityKg: number
    status: InventoryLotStatus
    supplier?: string
    location?: string
  }) => Promise<void>
}

function parseNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function LotDialog({ open, onOpenChange, onCreate }: LotDialogProps) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const batchRef = useRef<HTMLInputElement | null>(null)
  const quantityRef = useRef<HTMLInputElement | null>(null)
  const statusRef = useRef<HTMLSelectElement | null>(null)
  const supplierRef = useRef<HTMLInputElement | null>(null)
  const locationRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false)
      setFormKey(prev => prev + 1)
    }
  }, [open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const quantityValue = parseNumber(quantityRef.current?.value ?? '0')
    if (!quantityValue || quantityValue <= 0) return

    setIsSubmitting(true)
    try {
      await onCreate({
        batchNumber: batchRef.current?.value || undefined,
        quantityKg: quantityValue,
        status: (statusRef.current?.value as InventoryLotStatus) ?? 'available',
        supplier: supplierRef.current?.value || undefined,
        location: locationRef.current?.value || undefined,
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
          <DialogTitle>{t('inventory.detail.addLot')}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit} key={formKey}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot-batch">{t('inventory.detail.batch')}</Label>
              <Input
                id="lot-batch"
                data-testid="lot-dialog-batch"
                placeholder={t('inventory.detail.batchPlaceholder')}
                defaultValue=""
                ref={batchRef}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-quantity">{t('inventory.detail.quantity')}</Label>
              <Input
                id="lot-quantity"
                data-testid="lot-dialog-quantity"
                type="number"
                placeholder={t('inventory.detail.quantityPlaceholder')}
                defaultValue=""
                ref={quantityRef}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lot-status">{t('inventory.detail.status')}</Label>
              <select
                id="lot-status"
                data-testid="lot-dialog-status"
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
                defaultValue="available"
                ref={statusRef}
              >
                <option value="available">{t('inventory.lotStatus.available')}</option>
                <option value="reserved">{t('inventory.lotStatus.reserved')}</option>
                <option value="consumed">{t('inventory.lotStatus.consumed')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-supplier">{t('inventory.detail.supplier')}</Label>
              <Input
                id="lot-supplier"
                data-testid="lot-dialog-supplier"
                placeholder={t('inventory.detail.supplierPlaceholder')}
                defaultValue=""
                ref={supplierRef}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot-location">{t('inventory.detail.location')}</Label>
            <Input
              id="lot-location"
              data-testid="lot-dialog-location"
              placeholder={t('inventory.detail.locationPlaceholder')}
              defaultValue=""
              ref={locationRef}
            />
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
              data-testid="lot-dialog-submit"
              disabled={isSubmitting}
            >
              {t('inventory.detail.createLot')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
