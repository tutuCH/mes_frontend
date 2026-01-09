import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'
import type { Factory } from '@/types/api'

interface FactorySelectorDropdownProps {
  factories: Factory[]
  selectedFactoryId: number | 'all'
  onChange: (value: number | 'all') => void
}

export function FactorySelectorDropdown({
  factories,
  selectedFactoryId,
  onChange,
}: FactorySelectorDropdownProps) {
  const { t } = useTranslation()

  return (
    <Select
      value={selectedFactoryId.toString()}
      onValueChange={(value) => onChange(value === 'all' ? 'all' : parseInt(value))}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="-1">{t('factoryView.allFactories')}</SelectItem>
        {factories.map((factory) => (
          <SelectItem key={factory.factoryId} value={factory.factoryId.toString()}>
            {factory.factoryName || `Factory ${factory.factoryIndex}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
