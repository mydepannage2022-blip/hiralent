import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        soft: "border border-blue-200/70 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm",
        outline:
          "border border-slate-200/70 bg-white text-slate-700 hover:bg-slate-50",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100",
        danger:
          "border border-red-200/70 bg-white text-red-800 hover:bg-red-50",
        success:
          "border border-emerald-200/70 bg-white text-emerald-800 hover:bg-emerald-50",
        warning:
          "border border-amber-200/70 bg-white text-amber-800 hover:bg-amber-50",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "md",
    },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        data-slot="agency-button"
        className={cn(buttonVariants({ variant, size }), className)}
        type={type ?? (asChild ? undefined : "button")}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
