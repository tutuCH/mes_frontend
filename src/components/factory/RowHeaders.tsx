import { getCellSizeClass, getHeaderSizeClass } from '@/utils/gridUtils'

interface RowHeadersProps {
  height: number
}

export function RowHeaders({ height }: RowHeadersProps) {
  return (
    <div className="mr-1 sm:mr-2 sm:mt-2 flex flex-col gap-1">
      {Array.from({ length: height }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={`${getCellSizeClass()} sm:${getHeaderSizeClass()} flex items-center justify-center rounded bg-blue-100/50 text-xs sm:text-sm font-medium text-blue-800`}
        >
          {rowIndex + 1}
        </div>
      ))}
    </div>
  )
}
