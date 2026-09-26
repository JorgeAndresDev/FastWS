import { Building2, Wallet } from "lucide-react"

import type { ClientKind } from "@/types"
import { cn } from "@/lib/utils"

export type ClientType = ClientKind

export const clientTone: Record<ClientType, string> = {
  NORMAL: "stamp--proceso",
  CASHLESS: "stamp--leido",
}

export const clientLabel: Record<ClientType, string> = {
  NORMAL: "Normal",
  CASHLESS: "Cashless",
}

const clientIcon: Record<ClientType, typeof Building2> = {
  NORMAL: Building2,
  CASHLESS: Wallet,
}

export function ClientChip({ clientType }: { clientType: ClientType }) {
  const Icon = clientIcon[clientType]
  return (
    <span className={cn("stamp", clientTone[clientType])} data-testid="client-chip">
      <Icon aria-hidden />
      {clientLabel[clientType]}
    </span>
  )
}