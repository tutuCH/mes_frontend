import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCellSizeClass } from '@/utils/gridUtils'

interface EmptyGridCellProps {
  row: number
  col: number
  coordinate: string
  onClick: () => void
  isOver?: boolean
  selectionMode?: boolean
  isSelected?: boolean
}

export function EmptyGridCell({
  coordinate,
  onClick,
  isOver,
  selectionMode = false,
  isSelected = false
}: EmptyGridCellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center rounded-md border transition-colors',
        getCellSizeClass(),
        selectionMode ? [
          // Selection mode styling
          'border-solid border-2',
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-green-300 bg-green-50/30 hover:bg-green-100/50 hover:border-green-400',
        ] : [
          // Normal mode styling
          'border-dashed border-blue-300 bg-white/80 hover:bg-blue-50/80',
          isOver && 'bg-blue-100'
        ]
      )}
      aria-label={selectionMode ? `Select position at ${coordinate}` : `Add machine at ${coordinate}`}
    >
      <Plus className={cn(
        'h-4 w-4 sm:h-5 sm:w-5',
        selectionMode
          ? (isSelected ? 'text-blue-500' : 'text-green-500')
          : 'text-blue-400'
      )} />
      <span className={cn(
        'mt-1 text-[10px] sm:text-xs font-medium',
        selectionMode
          ? (isSelected ? 'text-blue-700' : 'text-green-700')
          : 'text-blue-600/70'
      )}>
        {coordinate}
      </span>
    </button>
  )
}
