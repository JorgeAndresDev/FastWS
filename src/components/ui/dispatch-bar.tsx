import type { MessageStatus } from "@/types"

import { cn } from "@/lib/utils"

export interface DispatchSegment {
  status: MessageStatus
  count: number
}

interface DispatchBarProps {
  segments: DispatchSegment[]
  total: number
  progress?: number
  className?: string
}

const segmentColor: Record<MessageStatus, string> = {
  PROCESO: "bg-proceso",
  PENDIENTE: "bg-base-600",
  ENTREGADO: "bg-entregado",
  LEIDO: "bg-leido",
  FALLIDO: "bg-fallido",
  CANCELADO: "bg-cancelado",
}

export function DispatchBar({ segments, total, className }: DispatchBarProps) {
  const width = (count: number) => (total > 0 ? (count / total) * 100 : 0)
  const shown = segments.filter((s) => s.count > 0)
  const empty = shown.length === 0

  return (
    <div
      role="img"
      aria-label="Progreso de la campaña por estado de envío"
      className={cn("flex h-3 w-full overflow-hidden rounded-sm", className)}
    >
      {empty ? (
        <div className="h-full w-full bg-base-700" />
      ) : (
        shown.map((s) => (
          <div
            key={s.status}
            data-status={s.status.toLowerCase()}
            className={cn("h-full", segmentColor[s.status])}
            style={{ width: `${width(s.count)}%` }}
          />
        ))
      )}
    </div>
  )
}