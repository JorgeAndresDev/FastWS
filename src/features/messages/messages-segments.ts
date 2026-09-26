import type { MessageStatus, OutboundMessage } from "@/types"

export interface MessageSegment {
  status: MessageStatus
  count: number
}

const messageOrder: MessageStatus[] = [
  "PROCESO",
  "PENDIENTE",
  "ENTREGADO",
  "LEIDO",
  "FALLIDO",
  "CANCELADO",
]

export function messageSegments(messages: OutboundMessage[]): MessageSegment[] {
  return messageOrder.map((status) => ({
    status,
    count: messages.filter((m) => m.status === status).length,
  }))
}

export function messageTotals(messages: OutboundMessage[]) {
  const total = messages.length
  const processed = messages.filter(
    (m) => m.status !== "PROCESO" && m.status !== "PENDIENTE"
  ).length
  const errores = messages.filter((m) => m.status === "FALLIDO").length

  return {
    total,
    processed,
    errores,
    pct: total > 0 ? Math.round((processed / total) * 100) : 0,
    shown: messageSegments(messages).filter((s) => s.count > 0),
  }
}
