import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/components/ui/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "text-muted-foreground inline-flex h-full w-fit items-center justify-center rounded-lg",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "bg-gray-900 border-1 border-gray-600 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-md font-medium"
        + " transition-[color,box-shadow] whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring"
        + " disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        + " data-[state=active]:bg-gray-950 data-[state=active]:text-blue-500 data-[state=active]:shadow-md"
        + " data-[state=inactive]:hover:bg-gray-700 data-[state=inactive]:text-white data-[state=inactive]:cursor-pointer"
        ,
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 flex-1 transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
