import type {
  Campaign,
  ConversationThread,
  DashboardStats,
  OutboundMessage,
} from "@/types"

import { dayKey, shortDay } from "@/features/reports/report-dates"

export interface DeliveryFunnel {
  total: number
  porEnviar: number
  enTransito: number
  recibidos: number
  errores: number
  cancelados: number
}

export interface OperacionPoint {
  key: string
  dia: string
  enviados: number
  recibidos: number
  errores: number
  respuestas: number
}

export interface UltimoError {
  id: string
  cliente: string
  campana: string
  codigo?: string
  mensaje?: string
  at: string
  campanaId?: string
}

function countStatuses(campañas: Campaign[]) {
  const counts = { PENDIENTE: 0, PROCESO: 0, ENTREGADO: 0, LEIDO: 0, FALLIDO: 0, CANCELADO: 0 }
  for (const campaign of campañas) {
    for (const recipient of campaign.recipients) counts[recipient.status]++
  }
  return counts
}

export function buildDeliveryFunnel(campañas: Campaign[]): DeliveryFunnel {
  const counts = countStatuses(campañas)
  return {
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    porEnviar: counts.PENDIENTE,
    enTransito: counts.PROCESO,
    recibidos: counts.ENTREGADO + counts.LEIDO,
    errores: counts.FALLIDO,
    cancelados: counts.CANCELADO,
  }
}

export function buildDashboardStats(params: {
  clientes: Array<{ valid: boolean }>
  campañas: Campaign[]
  threads: ConversationThread[]
}): DashboardStats {
  const { clientes, campañas, threads } = params

  const clientsValid = clientes.filter((c) => c.valid).length
  const clientsInvalid = clientes.length - clientsValid
  const campaignsTotal = campañas.length
  const campaignsActive = campañas.filter((c) => c.status === "EN_PROCESO").length

  const counts = countStatuses(campañas)
  const sent = counts.PROCESO + counts.ENTREGADO + counts.LEIDO
  const delivered = counts.ENTREGADO + counts.LEIDO
  const read = counts.LEIDO
  const failed = counts.FALLIDO

  const responded = threads.filter(
    (t) => t.origin !== "demo" && t.messages.some((m) => m.direction === "entrante")
  ).length

  return {
    clientsValid,
    clientsInvalid,
    campaignsTotal,
    campaignsActive,
    sent,
    delivered,
    read,
    failed,
    responded,
    notResponded: Math.max(0, sent - responded),
    deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
    readRate: sent > 0 ? Math.round((read / sent) * 100) : 0,
    responseRate: sent > 0 ? Math.round((responded / sent) * 100) : 0,
  }
}

export function buildOperacionPoints(
  campañas: Campaign[],
  threads: ConversationThread[],
  dias = 14
): OperacionPoint[] {
  const byDay = new Map<string, Omit<OperacionPoint, "key" | "dia">>()
  const bump = (iso: string, key: keyof Omit<OperacionPoint, "key" | "dia">) => {
    const k = dayKey(iso)
    const prev = byDay.get(k) ?? { enviados: 0, recibidos: 0, errores: 0, respuestas: 0 }
    byDay.set(k, { ...prev, [key]: prev[key as "enviados"] + 1 })
  }

  for (const campaign of campañas) {
    for (const recipient of campaign.recipients) {
      if (!recipient.sentAt) continue
      if (recipient.status === "PROCESO" || recipient.status === "ENTREGADO" || recipient.status === "LEIDO") {
        bump(recipient.sentAt, "enviados")
      }
      if (recipient.status === "ENTREGADO" || recipient.status === "LEIDO") {
        bump(recipient.sentAt, "recibidos")
      }
      if (recipient.status === "FALLIDO") {
        bump(recipient.sentAt, "errores")
      }
    }
  }

  for (const thread of threads) {
    if (thread.origin === "demo") continue
    for (const message of thread.messages) {
      if (message.direction !== "entrante") continue
      if (!message.sentAt) continue
      bump(message.sentAt, "respuestas")
    }
  }

  const hoy = new Date()
  const points: OperacionPoint[] = []
  for (let offset = dias - 1; offset >= 0; offset -= 1) {
    const date = new Date(hoy)
    date.setDate(date.getDate() - offset)
    date.setHours(0, 0, 0, 0)
    const iso = date.toISOString()
    const key = dayKey(iso)
    const data = byDay.get(key) ?? { enviados: 0, recibidos: 0, errores: 0, respuestas: 0 }
    points.push({ key, dia: shortDay(iso), ...data })
  }

  return points
}

export function buildUltimosMensajes(
  campañas: Campaign[],
  threads: ConversationThread[],
  limit = 8
): OutboundMessage[] {
  const rows = campañas.flatMap((campaign) =>
    campaign.recipients.flatMap((recipient, index) => {
      if (!recipient.sentAt) return []
      return {
        id: `${campaign.id}:${index}`,
        client: recipient.name,
        phone: recipient.phone.replace(/^57/, ""),
        campaign: campaign.name,
        status: recipient.status,
        metaId: recipient.metaId,
        errorCode: recipient.errorCode,
        errorMessage: recipient.errorMessage,
        sentAt: recipient.sentAt,
      }
    })
  )

  for (const thread of threads) {
    if (thread.origin === "demo") continue
    for (const message of thread.messages) {
      if (message.id.startsWith("camp:")) continue
      if (message.direction !== "saliente") continue
      if (!message.sentAt) continue
      rows.push({
        id: message.id,
        client: thread.phone.replace(/^57/, ""),
        phone: thread.phone.replace(/^57/, ""),
        campaign: "Respuesta manual",
        status: message.status,
        metaId: message.metaId,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        sentAt: message.sentAt,
      })
    }
  }

  return rows
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
    .slice(0, limit)
}

export function buildUltimosErrores(
  campañas: Campaign[],
  threads: ConversationThread[],
  limit = 6
): UltimoError[] {
  const rows: UltimoError[] = []

  for (const campaign of campañas) {
    for (const recipient of campaign.recipients) {
      if (recipient.status !== "FALLIDO") continue
      if (!recipient.sentAt) continue
      rows.push({
        id: `${campaign.id}:${recipient.code}:${recipient.sentAt}`,
        cliente: recipient.name,
        campana: campaign.name,
        codigo: recipient.errorCode,
        mensaje: recipient.errorMessage,
        at: recipient.sentAt,
        campanaId: campaign.id,
      })
    }
  }

  for (const thread of threads) {
    if (thread.origin === "demo") continue
    for (const message of thread.messages) {
      if (message.id.startsWith("camp:")) continue
      if (message.direction !== "saliente") continue
      if (message.status !== "FALLIDO") continue
      if (!message.sentAt) continue
      rows.push({
        id: message.id,
        cliente: thread.phone.replace(/^57/, ""),
        campana: "Respuesta manual",
        codigo: message.errorCode,
        mensaje: message.errorMessage ?? message.text,
        at: message.sentAt,
      })
    }
  }

  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}