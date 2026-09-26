import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { sileo } from "sileo"

import type {
  ConvoOrigin,
  ConvoStatus,
  ConversationMessage,
  ConversationThread,
} from "@/types"

import { graphError, sendTemplate, sendText } from "@/lib/wsb/api"

import { useConexion } from "@/features/connection/conexion-store"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useClients } from "@/features/clients/clients-store"

interface ConversationsContextValue {
  threads: ConversationThread[]
  responder: (phone: string, text: string) => Promise<boolean>
  responderPlantilla: (
    phone: string,
    templateName: string,
    languageCode: string,
    params: string[],
    headerParams?: string[],
    renderedText?: string
  ) => Promise<boolean>
  sembrarDemo: () => void
  limpiarDemo: () => void
  reescanearCampañas: () => void
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

const CONVOS_KEY = "fastws.conversaciones"

interface Persisted {
  threads: ConversationThread[]
  merged: Record<string, string>
}

function sortMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return [...messages].sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))
}

function deriveStatus(messages: ConversationMessage[]): ConvoStatus {
  const last = sortMessages(messages).at(-1)
  if (!last) return "pendiente"
  if (last.direction === "entrante") return "respondida"
  if (last.status === "FALLIDO") return "con_error"
  return "pendiente"
}

function finalizeThread(thread: ConversationThread): ConversationThread {
  const messages = sortMessages(thread.messages)
  const last = messages.at(-1)
  return {
    ...thread,
    messages,
    status: deriveStatus(messages),
    lastMessage: last ? last.text : thread.lastMessage,
    lastAt: last?.sentAt ?? thread.lastAt,
  }
}

function byLastAt(a: ConversationThread, b: ConversationThread) {
  return b.lastAt.localeCompare(a.lastAt)
}

function isThread(item: unknown): item is ConversationThread {
  if (item == null || typeof item !== "object") return false
  const thread = item as Partial<ConversationThread>
  return (
    typeof thread.id === "string" &&
    typeof thread.phone === "string" &&
    typeof thread.status === "string" &&
    typeof thread.origin === "string" &&
    Array.isArray(thread.messages)
  )
}

function loadPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(CONVOS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Persisted>
      return {
        threads: Array.isArray(parsed.threads) ? parsed.threads.filter(isThread) : [],
        merged: parsed.merged && typeof parsed.merged === "object" ? parsed.merged : {},
      }
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return { threads: [], merged: {} }
}

function upsertMessage(threads: ConversationThread[], message: ConversationMessage): ConversationThread[] {
  const existing = threads.find((t) => t.phone === message.phone)
  if (existing) {
    const already = existing.messages.some((m) => m.id === message.id)
    if (already) return threads
    return threads.map((t) =>
      t.phone === message.phone
        ? finalizeThread({ ...t, messages: [...t.messages, message] })
        : t
    )
  }
  const created: ConversationThread = {
    id: message.phone,
    phone: message.phone,
    lastMessage: message.text,
    lastAt: message.sentAt ?? new Date().toISOString(),
    status: "pendiente",
    origin: "respuesta",
    messages: [message],
  }
  return [...threads, finalizeThread(created)]
}

function patchMessage(
  threads: ConversationThread[],
  messageId: string,
  patch: Partial<ConversationMessage>
): ConversationThread[] {
  return threads.map((t) => {
    if (!t.messages.some((m) => m.id === messageId)) return t
    return finalizeThread({
      ...t,
      messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
    })
  })
}

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const { ids, token } = useConexion()
  const { campaigns } = useCampaigns()
  const { clients } = useClients()

  const [persisted, setPersisted] = useState<Persisted>(loadPersisted)
  const threadsRef = useRef(persisted.threads)
  threadsRef.current = persisted.threads
  const mergedRef = useRef(persisted.merged)
  mergedRef.current = persisted.merged

  const idsRef = useRef(ids)
  idsRef.current = ids
  const tokenRef = useRef(token)
  tokenRef.current = token
  const campaignsRef = useRef(campaigns)
  campaignsRef.current = campaigns
  const clientsRef = useRef(clients)
  clientsRef.current = clients

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const commit = useCallback((threads: ConversationThread[]) => {
    const ordered = [...threads].sort(byLastAt)
    threadsRef.current = ordered
    setPersisted((prev) => ({ ...prev, threads: ordered }))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(
          CONVOS_KEY,
          JSON.stringify({ threads: ordered, merged: mergedRef.current })
        )
      } catch {
        /* almacenamiento no disponible */
      }
    }, 250)
  }, [])

  const reescanearCampañas = useCallback(() => {
    const existingIds = new Set(threadsRef.current.flatMap((t) => t.messages.map((m) => m.id)))
    const nextMap = new Map(threadsRef.current.map((t) => [t.phone, t]))
    let changed = false

    for (const campaign of campaignsRef.current) {
      const token =
        `${campaign.id}:${campaign.recipients.length}:${campaign.status}:${campaign.endedAt ?? ""}`
      if (mergedRef.current[campaign.id] === token) continue
      for (let index = 0; index < campaign.recipients.length; index += 1) {
        const recipient = campaign.recipients[index]
        if (
          recipient.status !== "PROCESO" &&
          recipient.status !== "ENTREGADO" &&
          recipient.status !== "LEIDO" &&
          recipient.status !== "FALLIDO" &&
          recipient.status !== "CANCELADO"
        ) {
          continue
        }
        const id = `camp:${campaign.id}:${index}`
        if (existingIds.has(id)) continue
        const text =
          recipient.status === "CANCELADO"
            ? "Envío de campaña cancelado por el operador"
            : recipient.errorCode
              ? `Intento de plantilla ${campaign.template.name}`
              : campaign.template.name
        const message: ConversationMessage = {
          id,
          phone: recipient.phone,
          direction: "saliente",
          text,
          status: recipient.status,
          metaId: recipient.metaId,
          errorCode: recipient.errorCode,
          errorMessage: recipient.errorMessage,
          sentAt: recipient.sentAt,
          viaTemplate: true,
        }
        const thread = nextMap.get(recipient.phone) ?? {
          id: recipient.phone,
          phone: recipient.phone,
          clientId: recipient.clientId,
          lastMessage: message.text,
          lastAt: message.sentAt ?? "",
          status: "pendiente",
          origin: "campaña" as ConvoOrigin,
          messages: [],
        }
        thread.messages.push(message)
        nextMap.set(recipient.phone, thread)
        existingIds.add(id)
        changed = true
      }
      mergedRef.current[campaign.id] = token
    }

    if (changed) {
      commit([...nextMap.values()].map(finalizeThread))
    }
  }, [commit])

  useEffect(() => {
    reescanearCampañas()
  }, [reescanearCampañas, campaigns])

  const responder = useCallback(
    async (phone: string, text: string): Promise<boolean> => {
      if (!tokenRef.current || !idsRef.current.phoneNumberId) {
        sileo.error({
          title: "Conecta tu cuenta primero",
          description:
            "Responder necesita la conexión Meta (token en sesión) para enviar el mensaje.",
        })
        return false
      }
      const messageId = `resp:${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimistic: ConversationMessage = {
        id: messageId,
        phone,
        direction: "saliente",
        text,
        status: "PENDIENTE",
        sentAt: now,
      }
      commit(upsertMessage(threadsRef.current, optimistic))
      try {
        const result = await sendText({
          phoneNumberId: idsRef.current.phoneNumberId,
          token: tokenRef.current,
          to: phone,
          text,
        })
        sileo.success({
          title: "Respuesta enviada",
          description: `Meta aceptó el envío · ${result.wamid.slice(0, 30)}…`,
        })
        commit(
          patchMessage(threadsRef.current, messageId, {
            status: "PROCESO",
            metaId: result.wamid,
          })
        )
        return true
      } catch (err) {
        const clean = graphError(err)
        sileo.error({ title: "Meta rechazó la respuesta", description: clean.message })
        commit(
          patchMessage(threadsRef.current, messageId, {
            status: "FALLIDO",
            errorCode: (clean as Error & { code?: string }).code,
            errorMessage: clean.message,
          })
        )
        return false
      }
    },
    [commit]
  )

  const responderPlantilla = useCallback(
    async (
      phone: string,
      templateName: string,
      languageCode: string,
      params: string[],
      headerParams?: string[],
      renderedText?: string
    ): Promise<boolean> => {
      if (!tokenRef.current || !idsRef.current.phoneNumberId) {
        sileo.error({
          title: "Conecta tu cuenta primero",
          description:
            "Responder necesita la conexión Meta (token en sesión) para enviar el mensaje.",
        })
        return false
      }
      const messageId = `resp:${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimistic: ConversationMessage = {
        id: messageId,
        phone,
        direction: "saliente",
        text: renderedText ?? templateName,
        status: "PENDIENTE",
        sentAt: now,
        viaTemplate: true,
      }
      commit(upsertMessage(threadsRef.current, optimistic))
      try {
        const result = await sendTemplate({
          phoneNumberId: idsRef.current.phoneNumberId,
          token: tokenRef.current,
          to: phone,
          templateName,
          languageCode,
          bodyParams: params.length > 0 ? params : undefined,
          headerParams: headerParams && headerParams.length > 0 ? headerParams : undefined,
        })
        sileo.success({
          title: "Plantilla enviada",
          description: `Meta aceptó el envío · ${result.wamid.slice(0, 30)}…`,
        })
        commit(
          patchMessage(threadsRef.current, messageId, {
            status: "PROCESO",
            metaId: result.wamid,
          })
        )
        return true
      } catch (err) {
        const clean = graphError(err)
        sileo.error({ title: "Meta rechazó la plantilla", description: clean.message })
        commit(
          patchMessage(threadsRef.current, messageId, {
            status: "FALLIDO",
            errorCode: (clean as Error & { code?: string }).code,
            errorMessage: clean.message,
          })
        )
        return false
      }
    },
    [commit]
  )

  const sembrarDemo = useCallback(() => {
    const candidates = clientsRef.current
      .filter((c) => c.valid && /^3\d{9}$/.test(c.phone.replace(/\D/g, "")))
      .slice(0, 3)
    if (candidates.length === 0) {
      sileo.error({
        title: "Sin clientes de ejemplo",
        description: "Importa clientes válidos para poder sembrar conversaciones de muestra.",
      })
      return
    }
    const speeches = [
      "Hola, gracias por el mensaje. ¿Me confirmas el estado de mi pedido?",
      "¿La promoción aplica para mi zona o solo para Bogotá y Medellín?",
      "Perfecto, muchas gracias. ¿Dónde hago el pago?",
    ]
    const now = Date.now()
    const nextMap = new Map(threadsRef.current.map((t) => [t.phone, t]))
    candidates.forEach((client, index) => {
      const phone = `57${client.phone.replace(/\D/g, "")}`
      if (nextMap.has(phone)) return
      const sentAt = new Date(now - (12 + index * 21) * 60000).toISOString()
      const message: ConversationMessage = {
        id: `demo:${client.id}`,
        phone,
        direction: "entrante",
        text: speeches[index] ?? speeches[0],
        status: "LEIDO",
        sentAt,
      }
      nextMap.set(phone, {
        id: phone,
        phone,
        clientId: client.id,
        lastMessage: message.text,
        lastAt: sentAt,
        status: "respondida",
        origin: "demo",
        messages: [message],
      })
    })
    commit([...nextMap.values()].map(finalizeThread))
    sileo.success({
      title: "Datos de ejemplo",
      description:
        "Se agregaron conversaciones de muestra, identificadas como demo en cada hilo.",
    })
  }, [commit])

  const limpiarDemo = useCallback(() => {
    const next = threadsRef.current.filter((t) => t.origin !== "demo")
    if (next.length === threadsRef.current.length) return
    commit(next)
    sileo.success({
      title: "Demo eliminada",
      description: "Se retiraron las conversaciones de muestra.",
    })
  }, [commit])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const value = useMemo<ConversationsContextValue>(
    () => ({
      threads: persisted.threads,
      responder,
      responderPlantilla,
      sembrarDemo,
      limpiarDemo,
      reescanearCampañas,
    }),
    [persisted.threads, responder, responderPlantilla, sembrarDemo, limpiarDemo, reescanearCampañas]
  )

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
}

export function useConversations() {
  const context = useContext(ConversationsContext)
  if (!context) {
    throw new Error("useConversations debe usarse dentro de ConversationsProvider")
  }
  return context
}