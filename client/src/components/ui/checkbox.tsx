import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "./utils";
import { Check } from "lucide-react";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "cursor-pointer bg-gray-600 hover:bg-white peer size-4 shrink-0 rounded-[4px] " +
        "data-[state=checked]:bg-gray-200 data-[state=checked]:text-primary-foreground " +
        "data-[state=checked]:border-primary ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 " +
        "outline-ring/50 shadow-xs transition-[color,box-shadow] " +
        "focus-visible:ring-4 focus-visible:outline-1 " +
        "disabled:cursor-not-allowed disabled:opacity-50 " +
        "aria-invalid:focus-visible:ring-0 " +
        "data-[disabled]:hover:bg-gray-600", // Prevents hover:bg-white when disabled
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        <Check className="size-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
