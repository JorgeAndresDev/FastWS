import { cn } from "@/lib/utils"

import logoUrl from "@/assets/logo.png"

interface WordmarkProps {
  descriptor?: string
  className?: string
  size?: "md" | "lg"
}

const sizes = {
  md: { logo: "h-6", name: "text-sm", gap: "gap-2.5", descriptor: "text-xs" },
  lg: { logo: "h-20", name: "text-5xl", gap: "gap-4", descriptor: "text-sm" },
} as const

export function Wordmark({ descriptor, className, size = "md" }: WordmarkProps) {
  const s = sizes[size]
  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <img src={logoUrl} alt="" aria-hidden="true" className={cn("w-auto shrink-0", s.logo)} />
      <div className="leading-tight">
        <p className={cn("font-bold tracking-tight text-ink-100", s.name)} aria-hidden="true">
          Fast<span className="text-brand-400">WS</span>
        </p>
        <span className="sr-only">FastWS</span>
        {descriptor && (
          <p
            className={cn(
              "font-medium uppercase tracking-[0.14em] text-ink-500",
              s.descriptor
            )}
          >
            {descriptor}
          </p>
        )}
      </div>
    </div>
  )
}
