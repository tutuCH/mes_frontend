import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

import { cn } from "@/lib/utils"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger> & {
    render?: React.ReactNode
  }
>(({ className, render, children, ...props }, ref) => {
  return (
    <CollapsiblePrimitive.Trigger
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-2 whitespace-nowrap font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {render || children}
    </CollapsiblePrimitive.Trigger>
  )
})
CollapsibleTrigger.displayName = CollapsiblePrimitive.Trigger.displayName

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & {
    contentClassName?: string
    disableAnimation?: boolean
  }
>(({ className, children, contentClassName, disableAnimation, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden",
      disableAnimation
        ? "transition-none data-[state=closed]:animate-none data-[state=open]:animate-none"
        : "transition-all duration-300 ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-top-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  >
    <div className={cn("w-full bg-background", contentClassName)}>
      {children}
    </div>
  </CollapsiblePrimitive.Content>
))
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
