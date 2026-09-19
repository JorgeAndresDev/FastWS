import type { ComponentPropsWithoutRef, ReactNode } from "react"
import { forwardRef } from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md"

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_oklab,var(--color-brand-500)_72%,transparent)] disabled:pointer-events-none disabled:opacity-45"

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-base-950 hover:bg-brand-400 active:bg-brand-600",
  secondary:
    "border border-rule bg-base-800 text-ink-100 hover:bg-base-750 active:bg-base-700",
  ghost: "text-ink-300 hover:bg-base-800 hover:text-ink-100",
  danger:
    "border border-fallido/30 bg-fallido/15 text-fallido hover:bg-fallido/25",
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem]",
  md: "h-10 px-4 text-sm",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "secondary", size = "md", loading, icon, children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
        {children}
      </button>
    )
  }
)