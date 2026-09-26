import type { AuditCategory } from "@/types"

import { Contact, FileText, FileUp, Send, Settings, TriangleAlert, UserRound, Wifi } from "lucide-react"

import { cn } from "@/lib/utils"

export const auditCategoryLabel: Record<AuditCategory, string> = {
  turno: "Turno",
  campana: "Campaña",
  plantilla: "Plantilla",
  clientes: "Clientes",
  error: "Error",
  conexion: "Conexión",
  importacion: "Importación",
  configuracion: "Configuración",
}

const auditTone: Record<AuditCategory, string> = {
  turno: "stamp--amber",
  campana: "stamp--indigo",
  plantilla: "stamp--cyan",
  clientes: "stamp--emerald",
  error: "stamp--fallido",
  conexion: "stamp--teal",
  importacion: "stamp--sky",
  configuracion: "stamp--fuchsia",
}

const auditIcon: Record<AuditCategory, typeof Send> = {
  turno: UserRound,
  campana: Send,
  plantilla: FileText,
  clientes: Contact,
  error: TriangleAlert,
  conexion: Wifi,
  importacion: FileUp,
  configuracion: Settings,
}

export function AuditChip({ categoria }: { categoria: AuditCategory }) {
  const Icon = auditIcon[categoria]
  return (
    <span className={cn("stamp", auditTone[categoria])}>
      <Icon aria-hidden />
      {auditCategoryLabel[categoria]}
    </span>
  )
}