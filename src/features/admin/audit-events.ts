import type {
  AuditCategory,
  AuditRecord,
  Campaign,
  CampaignActivity,
  ConversationThread,
} from "@/types"

import { listarAuditoria } from "@/lib/audit-log"
import { listarSesiones } from "@/lib/session-log"

function deduceActivity(campaign: Campaign): CampaignActivity[] {
  const activity: CampaignActivity[] = []
  activity.push({ tipo: "creada", at: campaign.createdAt })
  if (campaign.startedAt) {
    activity.push({ tipo: "iniciada", at: campaign.startedAt })
  }
  if (campaign.endedAt) {
    activity.push({
      tipo: campaign.status === "CANCELADA" ? "cancelada" : "finalizada",
      at: campaign.endedAt,
    })
  }
  return activity
}

const activityTitles: Record<CampaignActivity["tipo"], string> = {
  creada: "Campaña creada",
  iniciada: "Campaña iniciada",
  pausada: "Campaña pausada",
  reanudada: "Campaña reanudada",
  cancelada: "Campaña cancelada",
  finalizada: "Campaña finalizada",
  con_error: "Campaña detenida por error",
}

function fechaCorta(iso: string) {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

export function buildAuditRecords(
  campaigns: Campaign[],
  threads: ConversationThread[]
): AuditRecord[] {
  const records: AuditRecord[] = []

  records.push(...listarAuditoria())

  for (const s of listarSesiones()) {
    records.push({
      id: `ses:${s.id}`,
      at: s.inicio,
      categoria: "turno",
      titulo: s.origen === "restaurada" ? "Turno restaurado" : "Inicio de turno",
      detalle: s.fin
        ? `${s.usuario} · ${s.rol} · cierre ${fechaCorta(s.fin)}`
        : `${s.usuario} · ${s.rol} · turno aún abierto`,
      usuario: s.usuario,
      dispositivo: `${s.plataforma} · ${s.equipo}`,
    })
  }

  for (const campaign of campaigns) {
    const quien = campaign.dispatchedBy
    const activity = campaign.activity.length > 0 ? campaign.activity : deduceActivity(campaign)

    activity.forEach((entry, index) => {
      const esError = entry.tipo === "con_error"
      records.push({
        id: `${campaign.id}:act:${index}`,
        at: entry.at,
        categoria: esError ? "error" : "campana",
        titulo: activityTitles[entry.tipo],
        detalle: esError
          ? `«${campaign.name}» entró en espera por error de Meta (autenticación o límite de velocidad).`
          : `«${campaign.name}» · plantilla ${campaign.template.name} · ${campaign.recipients.length} destinatarios.`,
        entidad: campaign.name,
        usuario: quien?.usuario,
        dispositivo: quien?.dispositivo,
      })
    })

    campaign.recipients.forEach((recipient, index) => {
      if (recipient.status !== "FALLIDO") return
      records.push({
        id: `${campaign.id}:err:${index}`,
        at: recipient.sentAt ?? campaign.startedAt ?? campaign.createdAt,
        categoria: "error",
        titulo: "Mensaje fallido",
        detalle: `${recipient.name} · ${recipient.phone} · ${
          recipient.errorMessage ?? "sin detalle"
        } · «${campaign.name}».`,
        entidad: campaign.name,
        codigoError: recipient.errorCode,
        usuario: quien?.usuario,
        dispositivo: quien?.dispositivo,
      })
    })
  }

  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.id.startsWith("camp:")) continue
      if (message.direction !== "saliente") continue
      if (message.status !== "FALLIDO") continue
      if (!message.sentAt) continue
      records.push({
        id: `convo:${message.id}`,
        at: message.sentAt,
        categoria: "error",
        titulo: "Respuesta fallida",
        detalle: `${message.text} · a ${thread.phone.replace(/^57/, "")}${
          message.errorMessage ? ` · ${message.errorMessage}` : ""
        }.`,
        entidad: thread.phone,
        codigoError: message.errorCode,
      })
    }
  }

  return records.sort((a, b) => b.at.localeCompare(a.at))
}

export function contarCategorias(records: AuditRecord[]) {
  const counts: Record<AuditCategory, number> = {
    turno: 0,
    campana: 0,
    plantilla: 0,
    clientes: 0,
    error: 0,
    conexion: 0,
    importacion: 0,
    configuracion: 0,
  }
  for (const record of records) counts[record.categoria]++
  return counts
}