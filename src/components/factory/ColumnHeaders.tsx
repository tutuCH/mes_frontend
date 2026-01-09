import { getHeaderSizeClass } from '@/utils/gridUtils'

interface ColumnHeadersProps {
  width: number
}

export function ColumnHeaders({ width }: ColumnHeadersProps) {
  return (
    <div className="mb-1 sm:mb-2 ml-8 sm:ml-10 grid" style={{ gridTemplateColumns: `repeat(${width}, minmax(4rem, 6rem))` }}>
      {Array.from({ length: width }).map((_, colIndex) => (
        <div
          key={colIndex}
          className={`flex items-center justify-center rounded bg-blue-100/50 ${getHeaderSizeClass()} text-xs sm:text-sm font-medium text-blue-800`}
        >
          {String.fromCharCode(65 + colIndex)}
        </div>
      ))}
    </div>
  )
}
