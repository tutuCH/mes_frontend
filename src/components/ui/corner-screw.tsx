import { cn } from "@/lib/utils"

interface CornerScrewProps {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
}

export function CornerScrew({ position, className }: CornerScrewProps) {
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  }

  return (
    <div
      className={cn(
        "absolute w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500",
        "shadow-[inset_1px_1px_2px_rgba(255,255,255,0.6),inset_-1px_-1px_2px_rgba(0,0,0,0.2)]",
        positionClasses[position],
        className
      )}
    >
      {/* Phillips head cross slot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[6px] h-[1px] bg-gray-600 rounded-full" />
        <div className="absolute w-[1px] h-[6px] bg-gray-600 rounded-full" />
      </div>
    </div>
  )
}
