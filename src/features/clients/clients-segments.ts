import type { Client } from "@/types"

export interface ClientSegment {
  clientType: string
  count: number
}

const clientOrder: string[] = ["NORMAL", "CASHLESS"]

export function clientSegments(clients: Client[]): ClientSegment[] {
  return clientOrder.map((clientType) => ({
    clientType,
    count: clients.filter((c) => c.clientType === clientType).length,
  }))
}

export function sortClientType(clientType: string): number {
  return clientOrder.indexOf(clientType)
}

export function clientTotals(clients: Client[]) {
  const total = clients.length
  const valid = clients.filter((c) => c.valid).length
  const activos = clients.filter((c) => c.status === "activo").length
  const shown = clientSegments(clients).filter((s) => s.count > 0)

  return {
    total,
    valid,
    activos,
    pct: total > 0 ? Math.round((valid / total) * 100) : 0,
    shown,
  }
}