import type { CampaignStatus } from "@/types"

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

export function CampaignChip({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("stamp", campaignTone[status])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {campaignLabel[status]}
    </span>
  )
}