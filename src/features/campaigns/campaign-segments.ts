import type { Campaign, MessageStatus } from "@/types"

export interface CampaignSegment {
  status: MessageStatus
  count: number
}

export interface CampaignCounts {
  total: number
  pendiente: number
  procesando: number
  entregado: number
  leido: number
  fallido: number
  cancelado: number
}

export function campaignCounts(campaign: Campaign): CampaignCounts {
  const counts: CampaignCounts = {
    total: campaign.recipients.length,
    pendiente: 0,
    procesando: 0,
    entregado: 0,
    leido: 0,
    fallido: 0,
    cancelado: 0,
  }
  for (const recipient of campaign.recipients) {
    switch (recipient.status) {
      case "PENDIENTE":
        counts.pendiente++
        break
      case "PROCESO":
        counts.procesando++
        break
      case "ENTREGADO":
        counts.entregado++
        break
      case "LEIDO":
        counts.leido++
        break
      case "FALLIDO":
        counts.fallido++
        break
      case "CANCELADO":
        counts.cancelado++
        break
    }
  }
  return counts
}

export function campaignSegments(campaign: Campaign): CampaignSegment[] {
  const counts = campaignCounts(campaign)
  return [
    { status: "FALLIDO", count: counts.fallido },
    { status: "LEIDO", count: counts.leido },
    { status: "ENTREGADO", count: counts.entregado },
    { status: "PROCESO", count: counts.procesando },
    { status: "PENDIENTE", count: counts.pendiente },
    { status: "CANCELADO", count: counts.cancelado },
  ]
}

export function deliveryProgress(
  campaign: Campaign,
  counts: CampaignCounts = campaignCounts(campaign)
): { sellados: number; total: number; pct: number } {
  const sellados = counts.entregado + counts.leido
  return {
    sellados,
    total: counts.total,
    pct: counts.total > 0 ? Math.round((sellados / counts.total) * 100) : 0,
  }
}