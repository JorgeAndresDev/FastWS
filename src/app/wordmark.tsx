import { cn } from "@/lib/utils"

import logoUrl from "@/assets/logo.png"

interface WordmarkProps {
  descriptor?: string
  className?: string
}

export function Wordmark({ descriptor, className }: WordmarkProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src={logoUrl} alt="" aria-hidden="true" className="h-6 w-auto shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-ink-100" aria-hidden="true">
          Fast<span className="text-brand-400">WS</span>
        </p>
        <span className="sr-only">FastWS</span>
        {descriptor && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-500">
            {descriptor}
          </p>
        )}
      </div>
    </div>
  )
}
