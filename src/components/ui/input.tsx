import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg bg-card border border-border px-4 py-2 text-sm transition-all duration-200 ease-smooth",
          "placeholder:text-muted-foreground/60",
          "hover:border-border/80",
          "focus:outline-none focus:border-primary/50 focus:shadow-glow",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          type === "number" && "font-mono tabular-nums",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
