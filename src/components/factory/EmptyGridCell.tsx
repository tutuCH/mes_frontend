import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCellSizeClass } from '@/utils/gridUtils'

interface EmptyGridCellProps {
  row: number
  col: number
  coordinate: string
  onClick: () => void
  isOver?: boolean
}

export function EmptyGridCell({ coordinate, onClick, isOver }: EmptyGridCellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-blue-300 bg-white/80 transition-colors',
        getCellSizeClass(),
        'hover:bg-blue-50/80',
        isOver && 'bg-blue-100'
      )}
      aria-label={`Add machine at ${coordinate}`}
    >
      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
      <span className="mt-1 text-[10px] sm:text-xs text-blue-600/70 font-medium">
        {coordinate}
      </span>
    </button>
  )
}
