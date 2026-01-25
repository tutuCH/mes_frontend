import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MachineBasicInfoStep } from './MachineBasicInfoStep'
import { MachinePositionStep } from './MachinePositionStep'
import { api } from '@/services/api'
import { fetchFactoriesWithMachines } from '@/store/slices/factorySlice'
import { type AppDispatch } from '@/store'
import type { Factory } from '@/types/api'

interface AddMachineWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  factories: Factory[]
}

interface WizardFormData {
  machineName: string
  factoryId: number | null
  selectedRow: number | null
  selectedCol: number | null
}

export function AddMachineWizard({ open, onOpenChange, factories }: AddMachineWizardProps) {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()

  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<WizardFormData>({
    machineName: '',
    factoryId: null,
    selectedRow: null,
    selectedCol: null,
  })

  const handleClose = () => {
    if (!isSubmitting) {
      setStep(1)
      setFormData({
        machineName: '',
        factoryId: null,
        selectedRow: null,
        selectedCol: null,
      })
      onOpenChange(false)
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const handleCreate = async () => {
    if (!formData.factoryId || formData.selectedRow === null || formData.selectedCol === null) {
      return
    }

    setIsSubmitting(true)
    try {
      const selectedFactory = factories.find(f => f.factoryId === formData.factoryId)
      if (!selectedFactory) {
        throw new Error('Selected factory not found')
      }

      // Calculate machineIndex from grid coordinates
      const gridWidth = selectedFactory.factoryWidth
      const machineIndex = formData.selectedRow * gridWidth + formData.selectedCol

      const payload = {
        machineName: formData.machineName,
        machineIndex: machineIndex.toString(),
        factoryId: formData.factoryId,
        factoryIndex: selectedFactory.factoryIndex,
      }

      await api.createMachine(payload)
      dispatch(fetchFactoriesWithMachines())
      handleClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('deviceRegistry.addDialog.wizard.title', 'Add New Machine')}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <MachineBasicInfoStep
            formData={formData}
            setFormData={setFormData}
            factories={factories}
            onNext={handleNext}
            onCancel={handleClose}
          />
        )}

        {step === 2 && (
          <MachinePositionStep
            formData={formData}
            setFormData={setFormData}
            factories={factories}
            onBack={handleBack}
            onCancel={handleClose}
            onCreate={handleCreate}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
