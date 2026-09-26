import type { Campaign, ConversationThread, MessageStatus } from "@/types"

import { dayKey, shortDay } from "./report-dates"

export type ReportKind = "mensaje" | "respuesta" | "ejemplo"

export interface ReportMessage {
  id: string
  tipo: ReportKind
  fecha: string
  campanaId?: string
  campana?: string
  cliente?: string
  telefono?: string
  estado: MessageStatus
  viaTemplate?: boolean
  wamid?: string
  errorCode?: string
  errorMessage?: string
  texto?: string
  usuario?: string
  dispositivo?: string
}

export type ReportOrigin = "todos" | "campana" | "respuesta" | "demo"

export const originKinds: Record<Exclude<ReportOrigin, "todos">, ReportKind[]> = {
  campana: ["mensaje"],
  respuesta: ["respuesta"],
  demo: ["ejemplo"],
}

export function esAceptado(row: ReportMessage) {
  return row.estado === "PROCESO" || row.estado === "ENTREGADO" || row.estado === "LEIDO"
}

export function esFallido(row: ReportMessage) {
  return row.estado === "FALLIDO"
}

export function buildReportMessages(
  campaigns: Campaign[],
  threads: ConversationThread[]
): ReportMessage[] {
  const rows: ReportMessage[] = []
  const clientCampaign = new Map<
    string,
    { id: string; name: string; usuario?: string; dispositivo?: string }
  >()

  for (const campaign of campaigns) {
    const info = {
      id: campaign.id,
      name: campaign.name,
      usuario: campaign.dispatchedBy?.usuario,
      dispositivo: campaign.dispatchedBy?.dispositivo,
    }
    campaign.recipients.forEach((recipient, index) => {
      if (recipient.sentAt) {
        rows.push({
          id: `${campaign.id}:${index}`,
          tipo: "mensaje",
          fecha: recipient.sentAt,
          campanaId: campaign.id,
          campana: campaign.name,
          cliente: recipient.name,
          telefono: recipient.phone.replace(/^57/, ""),
          estado: recipient.status,
          wamid: recipient.metaId,
          errorCode: recipient.errorCode,
          errorMessage: recipient.errorMessage,
          usuario: info.usuario,
          dispositivo: info.dispositivo,
        })
      }
      if (recipient.clientId) clientCampaign.set(recipient.clientId, info)
    })
  }

  for (const thread of threads) {
    if (thread.origin === "demo") {
      for (const message of thread.messages) {
        if (!message.sentAt) continue
        rows.push({
          id: `ejemplo:${message.id}`,
          tipo: "ejemplo",
          fecha: message.sentAt,
          telefono: thread.phone.replace(/^57/, ""),
          estado: message.status,
          texto: message.text,
        })
      }
      continue
    }
    for (const message of thread.messages) {
      if (message.id.startsWith("camp:")) continue
      if (message.direction !== "saliente") continue
      if (!message.sentAt) continue
      const parent = thread.clientId ? clientCampaign.get(thread.clientId) : undefined
      rows.push({
        id: `respuesta:${message.id}`,
        tipo: "respuesta",
        fecha: message.sentAt,
        campanaId: parent?.id,
        campana: parent?.name,
        telefono: thread.phone.replace(/^57/, ""),
        estado: message.status,
        viaTemplate: message.viaTemplate,
        wamid: message.metaId,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        texto: message.text,
        usuario: parent?.usuario,
        dispositivo: parent?.dispositivo,
      })
    }
  }

  return rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export interface ReportFilter {
  desde?: string
  hasta?: string
  origen: ReportOrigin
}

export function applyReportFilter(rows: ReportMessage[], filter: ReportFilter): ReportMessage[] {
  const kinds = filter.origen === "todos" ? null : originKinds[filter.origen]
  return rows.filter((row) => {
    if (kinds && !kinds.includes(row.tipo)) return false
    if (filter.desde && row.fecha < filter.desde) return false
    if (filter.hasta && row.fecha > filter.hasta) return false
    return true
  })
}

export type ReportStatusCounts = Record<MessageStatus, number>

export function statusCounts(rows: ReportMessage[]): ReportStatusCounts {
  const counts: ReportStatusCounts = {
    PROCESO: 0,
    PENDIENTE: 0,
    ENTREGADO: 0,
    LEIDO: 0,
    FALLIDO: 0,
    CANCELADO: 0,
  }
  for (const row of rows) counts[row.estado]++
  return counts
}

export interface DayPoint {
  key: string
  dia: string
  enviados: number
  fallidos: number
  respuestas: number
}

export function buildDayPoints(rows: ReportMessage[]): DayPoint[] {
  const map = new Map<string, DayPoint>()
  const ascending = [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha))
  for (const row of ascending) {
    const key = dayKey(row.fecha)
    let point = map.get(key)
    if (!point) {
      map.set(key, { key, dia: shortDay(row.fecha), enviados: 0, fallidos: 0, respuestas: 0 })
    }
    point = map.get(key)!
    if (row.tipo === "mensaje") {
      if (esAceptado(row)) point.enviados++
      else if (esFallido(row)) point.fallidos++
    } else if (row.tipo === "respuesta") {
      if (esFallido(row)) point.fallidos++
      else if (esAceptado(row)) point.respuestas++
    }
  }
  return [...map.values()]
}