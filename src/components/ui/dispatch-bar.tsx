import type { MessageStatus } from "@/types"

import { cn } from "@/lib/utils"

export interface DispatchSegment {
  status: MessageStatus
  count: number
}

interface DispatchBarProps {
  segments: DispatchSegment[]
  total: number
  className?: string
  size?: "md" | "sm"
}

const segmentColor: Record<MessageStatus, string> = {
  PROCESO: "bg-proceso",
  PENDIENTE: "bg-pendiente",
  ENTREGADO: "bg-entregado",
  LEIDO: "bg-leido",
  FALLIDO: "bg-fallido",
  CANCELADO: "bg-cancelado",
}

const statusLabel: Record<MessageStatus, string> = {
  PROCESO: "en proceso",
  PENDIENTE: "pendientes",
  ENTREGADO: "entregados",
  LEIDO: "leídos",
  FALLIDO: "fallidos",
  CANCELADO: "cancelados",
}

export function DispatchBar({ segments, total, className, size = "md" }: DispatchBarProps) {
  const shown = segments.filter((s) => s.count > 0)
  const empty = shown.length === 0
  const label = empty
    ? "Sin envíos registrados"
    : shown.map((s) => `${s.count} ${statusLabel[s.status]}`).join(", ")

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex w-full overflow-hidden rounded-sm",
        size === "sm" ? "h-1.5" : "h-3",
        className
      )}
    >
      {empty ? (
        <div className="h-full w-full bg-base-700" />
      ) : (
        shown.map((s) => (
          <div
            key={s.status}
            data-status={s.status.toLowerCase()}
            className={cn("h-full", segmentColor[s.status])}
            style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }}
          />
        ))
      )}
    </div>
  )
}
