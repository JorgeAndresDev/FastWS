import type { TemplateQuality, TemplateStatus, WaTemplate } from "@/types"
import type { TemplateParams } from "@/lib/wsb/api"
import {
  Ban,
  CheckCircle2,
  Clock3,
  Gauge,
  Pause,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

export const templateStatusTone: Record<TemplateStatus, string> = {
  APPROVED: "stamp--entregado",
  PENDING: "stamp--pendiente",
  REJECTED: "stamp--fallido",
  IN_APPEAL: "stamp--proceso",
  PAUSED: "stamp--cancelado",
  DISABLED: "stamp--cancelado",
  UNKNOWN: "stamp--fecha",
}

export const templateStatusLabel: Record<TemplateStatus, string> = {
  APPROVED: "Aprobada",
  PENDING: "En revisión",
  REJECTED: "Rechazada",
  IN_APPEAL: "En apelación",
  PAUSED: "Pausada",
  DISABLED: "Deshabilitada",
  UNKNOWN: "Desconocido",
}

const statusIcon: Record<TemplateStatus, typeof Clock3> = {
  APPROVED: CheckCircle2,
  PENDING: Clock3,
  REJECTED: TriangleAlert,
  IN_APPEAL: ShieldAlert,
  PAUSED: Pause,
  DISABLED: Ban,
  UNKNOWN: Ban,
}

export function TemplateStatusChip({ status }: { status: TemplateStatus }) {
  const Icon = statusIcon[status]
  return (
    <span className={cn("stamp", templateStatusTone[status])}>
      <Icon aria-hidden />
      {templateStatusLabel[status]}
    </span>
  )
}

export const categoryLabel: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidad",
  AUTHENTICATION: "Autenticación",
}

export const qualityLabel: Record<TemplateQuality, string> = {
  GREEN: "Excelente",
  YELLOW: "Regular",
  RED: "Baja",
}

const qualityTone: Record<TemplateQuality, string> = {
  GREEN: "stamp--entregado",
  YELLOW: "stamp--pendiente",
  RED: "stamp--fallido",
}

export function QualityBadge({ quality }: { quality: TemplateQuality | null }) {
  if (!quality) {
    return (
      <span className="stamp stamp--fecha">
        <Gauge aria-hidden />
        Sin datos
      </span>
    )
  }
  return (
    <span className={cn("stamp", qualityTone[quality])}>
      <Gauge aria-hidden />
      Calidad {qualityLabel[quality]}
    </span>
  )
}

const LANGUAGES: Record<string, string> = {
  es: "Español",
  es_CO: "Español (CO)",
  es_MX: "Español (MX)",
  es_AR: "Español (AR)",
  es_CL: "Español (CL)",
  en: "Inglés",
  en_US: "Inglés (US)",
  pt: "Portugués",
  pt_BR: "Portugués (BR)",
  fr: "Francés",
}

export function languageLabel(code: string) {
  return LANGUAGES[code] ?? (code || "—")
}

export interface DetectedVariable {
  /** "1","2" para numéricas ({{1}}); "nombre","fecha" para nombradas ({{nombre}}). */
  key: string
  /** Índice numérico (1,2) o null si es nombrada. */
  index: number | null
  label: string
  numeric: boolean
}

/**
 * Detecta las variables del cuerpo de una plantilla, tanto numéricas ({{1}})
 * como nombradas ({{nombre}}). Meta permite los dos formatos y el campo
 * `parameter_format` delata cuál usa cada una; el orden de aparición en el
 * texto es el que espera la API al enviar los parámetros.
 */
export function detectVariables(body: string): DetectedVariable[] {
  const pattern = /\{\{\s*(\d+|[a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
  const found = new Map<
    string,
    { key: string; index: number | null; label: string; numeric: boolean; pos: number }
  >()
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    const raw = match[1]
    const numeric = /^\d+$/.test(raw)
    if (!found.has(raw)) {
      found.set(raw, {
        key: raw,
        index: numeric ? Number(raw) : null,
        label: numeric ? `Variable ${raw}` : raw,
        numeric,
        pos: match.index,
      })
    }
  }
  return [...found.values()]
    .sort((a, b) => a.pos - b.pos)
    .map(({ pos: _pos, ...rest }) => rest)
}

/**
 * Cuenta los `{{}}` que no llevan nombre. Hay plantillas APPROVED creadas así:
 * Meta las aprueba sin nombre, pero ninguna petición puede llenarlas, porque no
 * hay contra qué nombre enviar el parámetro. La app tiene que avisar en vez de
 * pelearse con la API.
 */
export function countUnnamedPlaceholders(body: string): number {
  const pattern = /\{\{\s*\}\}/g
  let total = 0
  while (pattern.exec(body) !== null) total += 1
  return total
}

/**
 * Construye los parámetros de cuerpo para enviar una plantilla, leyendo los
 * ejemplos que Meta devuelve. Hay dos formatos de ejemplo según
 * `parameter_format`: `body_text` (numéricas, array de arrays) y
 * `body_text_named_params` (nombradas, array de { param_name, example }).
 * Devuelve undefined si la plantilla no lleva variables.
 *
 * Los nombrados salen con su `parameterName`: Meta lo exige y responde
 * «Parameter name is missing or empty» si falta.
 */
export function buildTemplateBodyParams(
  template: WaTemplate
): TemplateParams | undefined {
  const body = componentText(template, "BODY")
  const variables = detectVariables(body)
  if (variables.length === 0) return undefined

  const named = template.components.find((c) => c.type === "BODY")?.example
    ?.body_text_named_params
  if (named && named.length > 0) {
    return named.map((p) => ({ parameterName: p.param_name, text: p.example }))
  }
  const numeric = template.components.find((c) => c.type === "BODY")?.example?.body_text?.[0] ?? []
  const params: TemplateParams = [...numeric]
  while (params.length < variables.length) {
    params.push(`Ejemplo ${params.length + 1}`)
  }
  return params
}

/**
 * Los parámetros de cabecera, pero solo si la cabecera trae variables. Casi
 * todas las cabeceras de Meta son texto fijo («Hello World») y mandarles un
 * parámetro hace que Meta rechace el envío entero.
 */
export function buildTemplateHeaderParams(
  template: WaTemplate
): TemplateParams | undefined {
  const header = componentText(template, "HEADER")
  if (!header) return undefined
  const variables = detectVariables(header)
  if (variables.length === 0) return undefined

  const example = template.components.find((c) => c.type === "HEADER")?.example?.header_text?.[0]
  return variables.map(
    (variable, position) =>
      example ?? (variable.numeric ? `Ejemplo ${position + 1}` : variable.key)
  )
}

export function componentText(template: WaTemplate, type: "HEADER" | "BODY" | "FOOTER") {
  return template.components.find((c) => c.type === type && typeof c.text === "string")?.text ?? ""
}