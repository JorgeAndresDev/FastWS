import type { MessageStatus } from "@/types"

import { readDurable, writeDurable, clearDurable } from "@/lib/db/session-scope"
import { borrarSecreto, guardarSecreto, leerSecreto, persiste } from "@/lib/secrets"
import { toWhatsAppNumber } from "@/lib/phone"

export const WEBHOOKS_URL_KEY = "fastws.webhooks.url"
export const WEBHOOKS_CURSOR_KEY = "fastws.webhooks.cursor"
export const WEBHOOKS_ULTIMO_KEY = "fastws.webhooks.ultimo"
export const WEBHOOKS_ERROR_KEY = "fastws.webhooks.error"
export const WEBHOOKS_TOKEN_LABEL = "webhook-token"
export const WEBHOOKS_INTERVALO_MS = 15_000
const WEBHOOKS_TIMEOUT_MS = 15_000

export interface WebhookEvent {
  id: number
  type: string
  received_at?: number
  payload: Record<string, unknown>
}

export interface WebhookConfig {
  url: string
  token: string
  cursor: number
}

export interface WebhookSyncState {
  at: string
  eventos: number
}

export interface WebhookErrorState {
  at: string
  message: string
}

export interface EstadoMeta {
  metaId: string
  estado: MessageStatus
  errorCode?: string
  errorMessage?: string
}

export interface MensajeEntrante {
  wamid: string
  phone: string
  text: string
  sentAt: string
  contactName?: string
}

function leerUrl(): string {
  const raw = readDurable(WEBHOOKS_URL_KEY)
  if (!raw) return ""
  let valor = raw
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === "string") valor = parsed
  } catch {
    /* valor plano de una versión anterior */
  }
  return normalizarUrl(valor) ?? ""
}

export function leerUrlConfigurada(): string {
  return leerUrl()
}

function leerCursor(): number {
  const raw = readDurable(WEBHOOKS_CURSOR_KEY)
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as unknown
    const value = Number(parsed)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : 0
  }
}

export function normalizarUrl(valor: string): string | null {
  const limpio = valor.trim()
  if (!limpio) return null
  let url: URL
  try {
    url = new URL(limpio)
  } catch {
    return null
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null
  if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    return null
  }
  if (url.username || url.password) return null
  url.pathname = url.pathname.replace(/\/+$/, "")
  for (const sufijo of ["/webhook", "/events", "/health"]) {
    if (url.pathname.endsWith(sufijo)) url.pathname = url.pathname.slice(0, -sufijo.length)
  }
  url.pathname = url.pathname.replace(/\/+$/, "")
  url.search = ""
  url.hash = ""
  return url.toString().replace(/\/+$/, "")
}

export async function guardarConfigWebhooks(
  url: string,
  token: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const normalizada = normalizarUrl(url)
  if (!normalizada) {
    return {
      ok: false,
      error: "La URL no es válida. Usa https://… (o http://localhost:8787 en desarrollo).",
    }
  }
  const anterior = leerUrl()
  const nuevoToken = token.trim()
  const tokenFinal = nuevoToken || (await leerSecreto(WEBHOOKS_TOKEN_LABEL)) || ""
  if (!tokenFinal) {
    return { ok: false, error: "Falta el token del escritorio que configuraste en el Worker." }
  }

  if (nuevoToken) {
    const persistido = await guardarSecreto(WEBHOOKS_TOKEN_LABEL, nuevoToken)
    if (!persistido && persiste()) {
      return {
        ok: false,
        error: "No se pudo guardar el token en el almacén seguro de Windows. Inténtalo de nuevo.",
      }
    }
  }
  if (!writeDurable(WEBHOOKS_URL_KEY, JSON.stringify(normalizada))) {
    return {
      ok: false,
      error: "No se pudo guardar la configuración de webhooks en este equipo. Inténtalo de nuevo.",
    }
  }
  if (anterior && anterior !== normalizada) {
    writeDurable(WEBHOOKS_CURSOR_KEY, "0")
    clearDurable(WEBHOOKS_ULTIMO_KEY)
    clearDurable(WEBHOOKS_ERROR_KEY)
  }
  return { ok: true, url: normalizada }
}

export async function leerConfigWebhooks(): Promise<WebhookConfig | null> {
  const url = leerUrl()
  if (!url) return null
  const token = await leerSecreto(WEBHOOKS_TOKEN_LABEL)
  if (!token) return null
  return { url, token, cursor: leerCursor() }
}

export async function limpiarConfigWebhooks(): Promise<void> {
  clearDurable(WEBHOOKS_URL_KEY)
  clearDurable(WEBHOOKS_CURSOR_KEY)
  clearDurable(WEBHOOKS_ULTIMO_KEY)
  clearDurable(WEBHOOKS_ERROR_KEY)
  await borrarSecreto(WEBHOOKS_TOKEN_LABEL)
}

export function leerEstadoSync(): WebhookSyncState | null {
  const raw = readDurable(WEBHOOKS_ULTIMO_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<WebhookSyncState>
    if (typeof parsed.at === "string" && typeof parsed.eventos === "number") {
      return { at: parsed.at, eventos: parsed.eventos }
    }
  } catch {
    /* dato corrupto */
  }
  return null
}

export function guardarEstadoSync(eventos: number) {
  writeDurable(WEBHOOKS_ULTIMO_KEY, JSON.stringify({ at: new Date().toISOString(), eventos }))
}

export function leerErrorSync(): WebhookErrorState | null {
  const raw = readDurable(WEBHOOKS_ERROR_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<WebhookErrorState>
    if (typeof parsed.at === "string" && typeof parsed.message === "string") {
      return { at: parsed.at, message: parsed.message }
    }
  } catch {
    /* dato corrupto */
  }
  return null
}

export function guardarErrorSync(message: string) {
  writeDurable(WEBHOOKS_ERROR_KEY, JSON.stringify({ at: new Date().toISOString(), message }))
}

export function limpiarErrorSync() {
  clearDurable(WEBHOOKS_ERROR_KEY)
}

export function mapearEstado(estado: string): MessageStatus | null {
  const mapa: Record<string, MessageStatus> = {
    accepted: "PROCESO",
    sent: "PROCESO",
    delivered: "ENTREGADO",
    read: "LEIDO",
    failed: "FALLIDO",
  }
  return mapa[estado] ?? null
}

function esEvento(item: unknown): item is WebhookEvent {
  if (item == null || typeof item !== "object") return false
  const evento = item as Partial<WebhookEvent>
  return (
    typeof evento.id === "number" &&
    typeof evento.type === "string" &&
    evento.payload != null &&
    typeof evento.payload === "object"
  )
}

export async function descargarEventos(
  config: WebhookConfig,
  fetchImpl: typeof fetch = fetch
): Promise<{ eventos: WebhookEvent[]; cursor: number; hasMore: boolean }> {
  const url = new URL(`${config.url}/events`)
  url.searchParams.set("after", String(config.cursor))
  url.searchParams.set("limit", "200")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOKS_TIMEOUT_MS)
  try {
    const response = await fetchImpl(url.toString(), {
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) {
      let detalle = ""
      try {
        const cuerpo = (await response.json()) as { error?: unknown }
        if (typeof cuerpo.error === "string") detalle = `: ${cuerpo.error}`
      } catch {
        /* respuesta sin JSON */
      }
      if (response.status === 401) {
        throw new Error("El Worker rechazó el token del escritorio. Revisa el DESKTOP_TOKEN.")
      }
      throw new Error(`El Worker respondió ${response.status}${detalle}`)
    }
    const data = (await response.json()) as {
      events?: unknown
      cursor?: unknown
      has_more?: unknown
    }
    if (!Array.isArray(data.events)) {
      throw new Error("El Worker devolvió una respuesta inesperada.")
    }
    const eventos = data.events.filter(esEvento)
    const cursor = Number(data.cursor)
    return {
      eventos,
      cursor: Number.isFinite(cursor) ? cursor : config.cursor,
      hasMore: Boolean(data.has_more),
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("El Worker no respondió a tiempo. Revisa la URL y tu conexión.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function errorDeWebhook(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TypeError" || /fetch|network/i.test(error.message)) {
      return "No hay conexión con el Worker de webhooks. Revisa la URL y tu internet."
    }
    return error.message
  }
  return "No fue posible consultar el Worker de webhooks."
}

export function estadoDeEvento(evento: WebhookEvent): EstadoMeta | null {
  if (evento.type !== "status") return null
  const payload = evento.payload
  const metaId = typeof payload.id === "string" ? payload.id : ""
  const estado = mapearEstado(typeof payload.status === "string" ? payload.status : "")
  if (!metaId || !estado) return null
  const primero = Array.isArray(payload.errors)
    ? (payload.errors[0] as Record<string, unknown> | undefined)
    : undefined
  const errorCode = primero?.code != null ? String(primero.code) : undefined
  const errorMessage =
    typeof primero?.message === "string"
      ? primero.message
      : typeof primero?.title === "string"
        ? primero.title
        : undefined
  return {
    metaId,
    estado,
    ...(errorCode ? { errorCode } : {}),
    ...(errorMessage ? { errorMessage } : {}),
  }
}

function telefonoMeta(from: string): string {
  const digits = from.replace(/\D/g, "")
  return digits.length >= 11 ? digits : toWhatsAppNumber(digits)
}

export function mensajeDeEvento(evento: WebhookEvent): MensajeEntrante | null {
  if (evento.type !== "message") return null
  const payload = evento.payload
  const wamid = typeof payload.id === "string" ? payload.id : ""
  const from = typeof payload.from === "string" ? payload.from : ""
  if (!wamid || !from) return null
  const texto = typeof payload.text === "string" && payload.text.trim() ? payload.text : "[mensaje]"
  const timestamp = Number(payload.timestamp)
  const sentAt =
    Number.isFinite(timestamp) && timestamp > 0
      ? new Date(timestamp * 1000).toISOString()
      : new Date().toISOString()
  const contactName =
    typeof payload.contact_name === "string" && payload.contact_name.trim()
      ? payload.contact_name.trim()
      : undefined
  return {
    wamid,
    phone: telefonoMeta(from),
    text: texto,
    sentAt,
    ...(contactName ? { contactName } : {}),
  }
}
