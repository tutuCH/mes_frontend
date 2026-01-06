import { cn } from "@/lib/utils"

interface VentSlotsProps {
  count?: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function VentSlots({ count = 4, orientation = 'vertical', className }: VentSlotsProps) {
  return (
    <div
      className={cn(
        "flex gap-1",
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "rounded-full bg-muted shadow-neu-recessed",
            orientation === 'horizontal' ? 'w-6 h-1' : 'w-1 h-6'
          )}
        />
      ))}
    </div>
  )
}
