import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const ledVariants = cva(
  "rounded-full transition-all duration-300",
  {
    variants: {
      status: {
        online: "bg-status-green shadow-[0_0_12px_2px] shadow-status-green/60",
        warning: "bg-status-yellow shadow-[0_0_12px_2px] shadow-status-yellow/60",
        error: "bg-status-red shadow-[0_0_12px_2px] shadow-status-red/60",
        offline: "bg-muted shadow-neu-recessed",
      },
      size: {
        sm: "w-2 h-2",
        md: "w-3 h-3",
        lg: "w-4 h-4",
      },
      pulse: {
        true: "animate-led-pulse",
        false: "",
      },
    },
    defaultVariants: {
      status: "offline",
      size: "md",
      pulse: false,
    },
  }
)

export interface LEDIndicatorProps extends VariantProps<typeof ledVariants> {
  className?: string
}

export function LEDIndicator({ status, size, pulse, className }: LEDIndicatorProps) {
  return (
    <div className={cn(ledVariants({ status, size, pulse }), className)} />
  )
}
