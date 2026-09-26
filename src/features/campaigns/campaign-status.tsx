import type { CampaignStatus } from "@/types"

import {
  Activity,
  Ban,
  CalendarClock,
  CheckCircle2,
  FileEdit,
  Pause,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

export const campaignTone: Record<CampaignStatus, string> = {
  BORRADOR: "stamp--fecha",
  PROGRAMADA: "stamp--pendiente",
  EN_PROCESO: "stamp--proceso",
  PAUSADA: "stamp--cancelado",
  FINALIZADA: "stamp--entregado",
  CANCELADA: "stamp--cancelado",
  CON_ERROR: "stamp--fallido",
}

export const campaignLabel: Record<CampaignStatus, string> = {
  BORRADOR: "Borrador",
  PROGRAMADA: "Programada",
  EN_PROCESO: "En curso",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  CON_ERROR: "Con error",
}

const campaignIcon: Record<CampaignStatus, typeof Activity> = {
  BORRADOR: FileEdit,
  PROGRAMADA: CalendarClock,
  EN_PROCESO: Activity,
  PAUSADA: Pause,
  FINALIZADA: CheckCircle2,
  CANCELADA: Ban,
  CON_ERROR: TriangleAlert,
}

export function CampaignChip({
  status,
  className,
}: {
  status: CampaignStatus
  className?: string
}) {
  const Icon = campaignIcon[status]
  return (
    <span className={cn("stamp", campaignTone[status], className)}>
      <Icon aria-hidden />
      {campaignLabel[status]}
    </span>
  )
}