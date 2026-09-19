import type { MessageStatus } from "@/types"
import {
  Activity,
  Ban,
  Check,
  CheckCheck,
  Clock3,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

const statusConfig: Record<MessageStatus, { label: string; icon: typeof Check }> = {
  PROCESO: { label: "Proceso", icon: Activity },
  PENDIENTE: { label: "Pendiente", icon: Clock3 },
  ENTREGADO: { label: "Entregado", icon: Check },
  LEIDO: { label: "Leído", icon: CheckCheck },
  FALLIDO: { label: "Fallido", icon: TriangleAlert },
  CANCELADO: { label: "Cancelado", icon: Ban },
}

export function StatusStamp({
  status,
  className,
}: {
  status: MessageStatus
  className?: string
}) {
  const { label, icon: Icon } = statusConfig[status]
  return (
    <span
      className={cn("stamp", `stamp--${status.toLowerCase()}`, className)}
      data-testid="status-stamp"
    >
      <Icon aria-hidden />
      {label}
    </span>
  )
}