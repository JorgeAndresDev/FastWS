import type { ComponentPropsWithoutRef, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface PanelProps extends ComponentPropsWithoutRef<"section"> {
  title?: string
  action?: ReactNode
}

export function Panel({ title, action, className, children, ...props }: PanelProps) {
  return (
    <section className={cn("panel", className)} {...props}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
          {title && (
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div>{children}</div>
    </section>
  )
}