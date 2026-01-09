import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function FactoryInstructionFooter() {
  const { t } = useTranslation()

  return (
    <div className="mt-3 sm:mt-4 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-500">
      <Info className="h-3 w-3 sm:h-4 sm:w-4" />
      <p>{t('factoryView.dragInstruction')}</p>
    </div>
  )
}
