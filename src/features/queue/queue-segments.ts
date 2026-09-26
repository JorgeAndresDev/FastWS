import type { Campaign } from "@/types"

import { campaignCounts } from "@/features/campaigns/campaign-segments"

export interface QueueLot {
  campaign: Campaign
}

export function queueTotals(campaigns: Campaign[]) {
  const enCola = campaigns.filter((c) => c.status !== "FINALIZADA").length
  const despachando = campaigns.filter((c) => c.status === "EN_PROCESO").length
  const pausadas = campaigns.filter(
    (c) => c.status === "PAUSADA" || c.status === "CON_ERROR"
  ).length
  const canceladas = campaigns.filter((c) => c.status === "CANCELADA").length
  const total = campaigns.reduce((acc, c) => acc + campaignCounts(c).total, 0)

  return { enCola, despachando, pausadas, canceladas, total }
}