import type {
  Campaign,
  CampaignActivity,
  ConversationThread,
  HistoryEvent,
} from "@/types"

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

function campaignActivityEvent(
  campaign: Campaign,
  activity: CampaignActivity,
  index: number
): HistoryEvent {
  const esError = activity.tipo === "con_error" || activity.tipo === "cancelada"
  return {
    id: `${campaign.id}:act:${index}`,
    at: activity.at,
    tipo: esError ? "error" : "campana",
    titulo: activityTitles[activity.tipo],
    detalle:
      activity.tipo === "con_error"
        ? `«${campaign.name}» entró en espera por error de Meta (autenticación o límite de velocidad).`
        : `«${campaign.name}» · plantilla ${campaign.template.name} · ${campaign.recipients.length} destinatarios.`,
  }
}

export interface BuildHistoryOptions {
  success: boolean
}

export function buildHistory(
  campaigns: Campaign[],
  threads: ConversationThread[],
  options: BuildHistoryOptions
): HistoryEvent[] {
  const { success } = options
  const events: HistoryEvent[] = []
  const ok = (isError: boolean) => isError || success

  for (const campaign of campaigns) {
    const activity = campaign.activity.length > 0 ? campaign.activity : deduceActivity(campaign)
    activity.forEach((entry, index) => {
      events.push(campaignActivityEvent(campaign, entry, index))
    })

    campaign.recipients.forEach((recipient, index) => {
      if (!recipient.sentAt) return
      const isError = recipient.status === "FALLIDO"
      if (!ok(isError)) return
      events.push({
        id: `${campaign.id}:msg:${index}`,
        at: recipient.sentAt,
        tipo: isError ? "error" : "mensaje",
        titulo: isError ? "Mensaje fallido" : "Mensaje enviado",
        detalle: isError
          ? `${recipient.name} · ${recipient.phone} · ${recipient.errorMessage ?? "sin detalle"} · «${campaign.name}».`
          : `${recipient.name} · ${recipient.phone} · «${campaign.name}».`,
        codigoError: recipient.errorCode,
        wamid: recipient.metaId,
      })
    })
  }

  /* conversations: respuestas y ejemplo (los envíos de campaña están cubiertos arriba) */
  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.id.startsWith("camp:")) continue
      const isError = message.status === "FALLIDO"

      if (message.direction === "entrante") {
        if (!message.sentAt) continue
        events.push({
          id: `convo:${message.id}`,
          at: message.sentAt,
          tipo: thread.origin === "demo" ? "ejemplo" : "respuesta",
          titulo:
            thread.origin === "demo"
              ? "Respuesta de cliente (ejemplo)"
              : "Respuesta de cliente",
          detalle: `${thread.phone.replace(/^57/, "")} · ${message.text}`,
        })
        continue
      }

      if (!message.sentAt) continue
      if (!ok(isError)) continue
      events.push({
        id: `convo:${message.id}`,
        at: message.sentAt,
        tipo: isError ? "error" : "respuesta",
        titulo: isError
          ? "Respuesta fallida"
          : message.viaTemplate
            ? "Respuesta con plantilla"
            : "Respuesta enviada",
        detalle: `${message.text} · a ${thread.phone.replace(/^57/, "")}${message.errorMessage ? ` · ${message.errorMessage}` : ""}.`,
        codigoError: message.errorCode,
        wamid: message.metaId,
      })
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at))
}