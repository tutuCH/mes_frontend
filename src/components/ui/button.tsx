import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-card text-foreground shadow-soft border border-border/50 hover:-translate-y-0.5 hover:shadow-card hover:border-border active:translate-y-0 active:shadow-soft",
        primary:
          "bg-primary text-primary-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-card hover:bg-primary/90 active:translate-y-0 active:shadow-soft",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:-translate-y-0.5 hover:shadow-card hover:bg-destructive/90 active:translate-y-0",
        outline:
          "border border-border bg-transparent hover:bg-muted/50 hover:border-border active:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground border border-border/30 hover:-translate-y-0.5 hover:bg-secondary/80 active:translate-y-0",
        ghost:
          "hover:bg-muted/50 active:bg-muted",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm rounded-lg",
        sm: "h-9 px-4 text-xs rounded-md",
        lg: "h-12 px-8 text-base rounded-xl",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
