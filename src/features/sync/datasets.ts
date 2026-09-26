import type { Campaign, Client, ConversationThread } from "@/types"

import type { AuditRecord } from "@/types"
import type { SesionRegistro } from "@/lib/session-log"
import { getAppLocale } from "@/lib/app-config"

export interface SyncDataset {
  id: string
  label: string
  count: number
  lastActivity?: string
}

function maxIso(isoList: Array<string | undefined>) {
  return isoList
    .filter((iso): iso is string => Boolean(iso) && !Number.isNaN(new Date(iso as string).getTime()))
    .sort()
    .at(-1)
}

export function haceCuando(iso?: string) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined

  const diffMs = date.getTime() - Date.now()
  const abs = Math.abs(diffMs)
  const minutes = Math.floor(abs / 60_000)

  if (minutes < 1) return "justo ahora"
  if (minutes < 60) return minutes === 1 ? "hace 1 min" : `hace ${minutes} min`

  const horas = Math.floor(minutes / 60)
  const ahora = new Date()
  const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  if (key(date) === key(ahora)) {
    return `hoy ${date.toLocaleTimeString(getAppLocale(), {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }
  if (key(date) === key(new Date(ahora.getTime() - 86_400_000))) {
    return `ayer a las ${date.toLocaleTimeString(getAppLocale(), {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }
  if (horas >= 24 * 7) {
    return date.toLocaleDateString(getAppLocale(), { day: "numeric", month: "short" })
  }
  return `${horas >= 24 ? Math.floor(horas / 24) : horas} ${horas >= 24 ? (Math.floor(horas / 24) === 1 ? "día" : "días") : "h"} atrás`
}

export function buildDatasetStates(params: {
  clientes: Client[]
  campañas: Campaign[]
  threads: ConversationThread[]
  sesiones: SesionRegistro[]
  auditoria: AuditRecord[]
}): SyncDataset[] {
  const { clientes, campañas, threads, sesiones, auditoria } = params

  return [
    {
      id: "clientes",
      label: "Clientes",
      count: clientes.length,
      lastActivity: haceCuando(maxIso(clientes.map((c) => c.createdAt))),
    },
    {
      id: "campanas",
      label: "Campañas",
      count: campañas.length,
      lastActivity: haceCuando(
        maxIso(
          campañas.flatMap((c) => [
            ...c.activity.map((a) => a.at),
            c.startedAt,
            c.endedAt,
            ...c.recipients.map((r) => r.sentAt).filter((at): at is string => Boolean(at)),
          ])
        )
      ),
    },
    {
      id: "conversaciones",
      label: "Conversaciones",
      count: threads.length,
      lastActivity: haceCuando(maxIso(threads.map((t) => t.lastAt))),
    },
    {
      id: "turnos",
      label: "Turnos",
      count: sesiones.length,
      lastActivity: haceCuando(maxIso(sesiones.flatMap((s) => [s.inicio, s.fin]))),
    },
    {
      id: "auditoria",
      label: "Auditoría",
      count: auditoria.length,
      lastActivity: haceCuando(maxIso(auditoria.map((a) => a.at))),
    },
  ]
}