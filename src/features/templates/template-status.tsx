import type { TemplateQuality, TemplateStatus, WaTemplate } from "@/types"
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
  index: number
  label: string
}

export function detectVariables(body: string): DetectedVariable[] {
  const found = new Map<number, string>()
  const pattern = /\{\{\s*(\d+)\s*\}\}/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(body)) !== null) {
    const index = Number(match[1])
    if (!found.has(index)) {
      found.set(index, `Variable ${index}`)
    }
  }
  return [...found.entries()]
    .map(([index]) => ({ index, label: `Variable ${index}` }))
    .sort((a, b) => a.index - b.index)
}

export function componentText(template: WaTemplate, type: "HEADER" | "BODY" | "FOOTER") {
  return template.components.find((c) => c.type === type && typeof c.text === "string")?.text ?? ""
}