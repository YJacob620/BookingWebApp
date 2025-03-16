import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/components/ui/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "cursor-pointer peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-gray-600 " +
        "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        "data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-700 " +
        "hover:border-gray-400 def-hover",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 " +
          "transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }