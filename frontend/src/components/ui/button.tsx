import * as React from "react"
import { cn } from "@/src/lib/utils"

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "icon";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({ className, variant = "default", size = "md", ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none";
  const variants: Record<string, string> = {
    default: "bg-primary text-white px-3 py-1.5",
    outline: "border px-3 py-1.5",
    ghost: "bg-transparent",
    secondary: "bg-secondary text-white px-3 py-1.5",
    destructive: "bg-red-600 text-white px-3 py-1.5",
    icon: "p-2",
  };
  const sizes: Record<string, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    icon: "w-8 h-8",
  };

  return (
    <button data-slot="button" className={cn(base, variants[variant] || variants.default, sizes[size] || sizes.md, className)} {...props} />
  )
}

export default Button
