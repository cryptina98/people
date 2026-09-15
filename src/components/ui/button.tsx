import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[10px] text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:translate-y-px disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white shadow-[var(--shadow-primary)] hover:bg-brand-strong",
        outline: "surface-low text-ink hover:bg-neutral-50",
        secondary: "surface-low text-ink hover:bg-neutral-50",
        ghost: "text-meta hover:bg-neutral-100 hover:text-ink",
        destructive: "bg-status-red-bg text-status-red hover:bg-red-100",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 gap-2 px-4",
        sm: "min-h-11 gap-1.5 px-3 text-[13px]",
        lg: "min-h-12 gap-2 px-5 text-[15px]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
