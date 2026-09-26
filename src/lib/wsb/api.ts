import type {
  TemplateCategory,
  TemplateQuality,
  TemplateStatus,
  WaTemplate,
  WaTemplateComponent,
} from "@/types"

const GRAPH_ROOT = "https://graph.facebook.com/v21.0"

export async function readMetaError(response: Response): Promise<Error> {
  let message = `Meta respondió ${response.status} (código ${response.status})`
  let code = String(response.status)
  try {
    const json = (await response.json()) as { error?: { message?: string; code?: number } }
    const metaError = json.error
    if (metaError) {
      if (typeof metaError.message === "string" && metaError.message) {
        message = metaError.message
      }
      if (typeof metaError.code === "number") {
        code = String(metaError.code)
      }
    }
  } catch {
    /* cuerpo ilegible: se conserva el mensaje por defecto */
  }
  const error = new Error(message)
  ;(error as Error & { code?: string }).code = code
  return error
}

export function graphError(error: unknown): Error {
  if (error instanceof Error) {
    const network = error as Error & { name: string }
    if (network.name === "TypeError" || /fetch|network/i.test(error.message)) {
      return new Error("No hay conexión con Meta. Revisa tu internet e inténtalo de nuevo.")
    }
    return error
  }
  return new Error("No fue posible establecer la conexión con Meta.")
}

interface MetaFetchOptions {
  token: string
  method?: "GET" | "POST" | "DELETE"
  query?: Record<string, string>
  body?: unknown
}

async function metaFetch<T = unknown>(
  path: string,
  options: MetaFetchOptions
): Promise<T> {
  const { token, method = options.body !== undefined ? "POST" : "GET", query, body } = options
  const url = new URL(`${GRAPH_ROOT}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value) url.searchParams.set(key, value)
    }
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) throw await readMetaError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

const TEMPLATE_FIELDS =
  "id,name,status,category,language,components,quality_score,rejected_reason,last_updated_time"

interface RawTemplateComponent {
  type?: string
  format?: string
  text?: string
  example?: {
    body_text?: string[][]
    header_text?: string[]
  }
  buttons?: Array<{
    type?: string
    text?: string
    url?: string
    phone_number?: string
  }>
}

interface RawTemplate {
  id?: string | number
  name?: string
  status?: string
  category?: string
  language?: string
  components?: RawTemplateComponent[]
  quality_score?: { score?: string; date?: number } | null
  rejected_reason?: string
  last_updated_time?: number
}

const KNOWN_STATUSES: TemplateStatus[] = [
  "APPROVED",
  "PENDING",
  "REJECTED",
  "IN_APPEAL",
  "PAUSED",
  "DISABLED",
]

const KNOWN_QUALITIES: TemplateQuality[] = ["GREEN", "YELLOW", "RED"]

function normalizeComponent(raw: RawTemplateComponent): WaTemplateComponent {
  return {
    type: raw.type ?? "BODY",
    format: raw.format,
    text: raw.text,
    example: raw.example,
    buttons: raw.buttons
      ? raw.buttons.map((b) => ({
          type: b.type ?? "",
          text: b.text,
          url: b.url,
          phone_number: b.phone_number,
        }))
      : undefined,
  }
}

export function normalizeTemplate(raw: RawTemplate): WaTemplate {
  const status = KNOWN_STATUSES.includes(raw.status as TemplateStatus)
    ? (raw.status as TemplateStatus)
    : "UNKNOWN"
  const quality = raw.quality_score?.score
  return {
    id: String(raw.id ?? ""),
    name: raw.name ?? "",
    language: raw.language ?? "",
    category: raw.category ?? "MARKETING",
    status,
    qualityScore:
      quality && KNOWN_QUALITIES.includes(quality as TemplateQuality)
        ? (quality as TemplateQuality)
        : null,
    rejectedReason: raw.rejected_reason && raw.rejected_reason !== "NONE" ? raw.rejected_reason : "",
    updatedAt: typeof raw.last_updated_time === "number" ? raw.last_updated_time : null,
    components: (raw.components ?? []).map(normalizeComponent),
  }
}

export interface TemplateListResult {
  templates: WaTemplate[]
  nextCursor?: string
}

export async function listTemplates(
  wabaId: string,
  token: string,
  cursor?: string
): Promise<TemplateListResult> {
  const query: Record<string, string> = { fields: TEMPLATE_FIELDS, limit: "50" }
  if (cursor) query.after = cursor
  const json = await metaFetch<{
    data?: RawTemplate[]
    paging?: { cursors?: { after?: string }; next?: string }
  }>(`/${wabaId}/message_templates`, { token, query })
  return {
    templates: (json.data ?? []).map((raw) => normalizeTemplate(raw)),
    nextCursor: nextCursorOf(json.paging),
  }
}

function nextCursorOf(paging?: { cursors?: { after?: string }; next?: string }): string | undefined {
  if (paging?.cursors?.after) return paging.cursors.after
  const next = paging?.next
  if (next) {
    const match = /[?&]after=([^&]+)/.exec(next)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return undefined
}

export interface TemplateComponentInput {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS"
  format?: string
  text?: string
  example?: {
    body_text?: string[][]
    header_text?: string[]
  }
  buttons?: Array<{ type: string; text?: string; url?: string; phone_number?: string }>
}

export interface CreateTemplateInput {
  name: string
  language: string
  category: TemplateCategory
  components: TemplateComponentInput[]
}

export interface CreatedTemplateResult {
  id: string
  status: string
}

export async function createTemplate(
  wabaId: string,
  token: string,
  input: CreateTemplateInput
): Promise<CreatedTemplateResult> {
  const json = await metaFetch<{ id?: string | number; status?: string; category?: string }>(
    `/${wabaId}/message_templates`,
    { token, body: input }
  )
  return { id: String(json.id ?? ""), status: String(json.status ?? "PENDING") }
}

export interface DeleteTemplateInput {
  name?: string
  hsmId?: string
}

export async function deleteTemplate(
  wabaId: string,
  token: string,
  input: DeleteTemplateInput
): Promise<void> {
  const query: Record<string, string> = {}
  if (input.name) query.name = input.name
  if (input.hsmId) query.hsm_id = input.hsmId
  await metaFetch(`/${wabaId}/message_templates`, { token, query, method: "DELETE" })
}

export interface SendTemplateInput {
  phoneNumberId: string
  token: string
  to: string
  templateName: string
  languageCode: string
  bodyParams?: string[]
  headerParams?: string[]
}

export interface SendTemplateResult {
  wamid: string
  status: string
  waId?: string
}

export async function sendTemplate(input: SendTemplateInput): Promise<SendTemplateResult> {
  const components: Array<{
    type: "header" | "body"
    parameters: Array<{ type: "text"; text: string }>
  }> = []
  if (input.headerParams && input.headerParams.length > 0) {
    components.push({
      type: "header",
      parameters: input.headerParams.map((text) => ({ type: "text", text })),
    })
  }
  if (input.bodyParams && input.bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: input.bodyParams.map((text) => ({ type: "text", text })),
    })
  }
  const json = await metaFetch<{
    contacts?: Array<{ wa_id?: string | number }>
    messages?: Array<{ id?: string | number; message_status?: string }>
  }>(`/${input.phoneNumberId}/messages`, {
    token: input.token,
    body: {
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.languageCode },
        components,
      },
    },
  })
  const message = json.messages?.[0]
  return {
    wamid: message?.id !== undefined ? String(message.id) : "",
    status: String(message?.message_status ?? "accepted"),
    waId: json.contacts?.[0]?.wa_id !== undefined ? String(json.contacts[0].wa_id) : undefined,
  }
}

export interface SendTextInput {
  phoneNumberId: string
  token: string
  to: string
  text: string
}

export interface SendTextResult {
  wamid: string
  status: string
  waId?: string
}

export async function sendText(input: SendTextInput): Promise<SendTextResult> {
  const json = await metaFetch<{
    contacts?: Array<{ wa_id?: string | number }>
    messages?: Array<{ id?: string | number; message_status?: string }>
  }>(`/${input.phoneNumberId}/messages`, {
    token: input.token,
    body: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.to,
      type: "text",
      text: { preview_url: false, body: input.text },
    },
  })
  const message = json.messages?.[0]
  return {
    wamid: message?.id !== undefined ? String(message.id) : "",
    status: String(message?.message_status ?? "accepted"),
    waId: json.contacts?.[0]?.wa_id !== undefined ? String(json.contacts[0].wa_id) : undefined,
  }
}