import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/components/ui/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] outline-none"
  + " disabled:pointer-events-none disabled:opacity-50"
  + " [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0"
  + " focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
  + " aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#1a1a1a] border border-[#363636] text-white cursor-pointer transition-colors hover:border-white"
          + " text-base py-[0.6em] px-[1.2em]",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90"
          + " focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border text-sm def-hover cursor-pointer",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs"
          + " hover:bg-secondary/80",
        ghost: "hover:text-accent-foreground cursor-pointer",
        link: "text-primary underline-offset-4 hover:underline",
        custom1:
          "cursor-pointer border text-sm hover:bg-gray-600 bg-gray-700 border-gray-400",
        custom2:
          "cursor-pointer border text-sm bg-gray-950/60 hover:bg-gray-950/90",
        custom3_approve: "cursor-pointer border-2 border-green-600 bg-green-800 hover:bg-green-700 hover:border-green-500",
        custom4_reject: "cursor-pointer border-2 border-red-600 bg-red-900 hover:bg-red-600 hover:border-red-400",
        custom5:
          "cursor-pointer border border-gray-700 text-sm bg-gray-800/60 def-hover",
      },
      size: {
        default: "h-auto py-[0.6em] px-[1.2em] text-base",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
