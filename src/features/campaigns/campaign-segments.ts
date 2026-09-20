import type { Campaign, MessageStatus } from "@/types"

export interface CampaignSegment {
  status: MessageStatus
  count: number
}

export function campaignSegments(campaign: Campaign): CampaignSegment[] {
  return [
    { status: "PROCESO", count: campaign.procesando },
    { status: "ENTREGADO", count: campaign.entregado },
    { status: "LEIDO", count: campaign.leido },
    { status: "FALLIDO", count: campaign.fallido },
    { status: "PENDIENTE", count: campaign.pendiente },
  ]
}