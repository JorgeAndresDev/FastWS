import type { AuditCategory, AuditRecord } from "@/types"

export type OperacionCategoria = Extract<
  AuditCategory,
  "conexion" | "importacion" | "configuracion" | "campana" | "plantilla" | "clientes"
>

export type AuditOperacionParms = Pick<
  AuditRecord,
  "categoria" | "titulo" | "detalle"
> &
  Partial<Pick<AuditRecord, "entidad" | "usuario" | "dispositivo" | "codigoError">>

const AUDIT_KEY = "fastws.auditoria"
const MAX_REGISTROS = 300

const CATEGORIAS: readonly AuditCategory[] = [
  "conexion",
  "importacion",
  "configuracion",
  "campana",
  "plantilla",
  "clientes",
]

export function esRegistroAuditoria(item: unknown): item is AuditRecord {
  if (item == null || typeof item !== "object") return false
  const registro = item as Partial<AuditRecord>
  return (
    typeof registro.id === "string" &&
    typeof registro.at === "string" &&
    typeof registro.titulo === "string" &&
    typeof registro.detalle === "string" &&
    registro.categoria != null &&
    CATEGORIAS.includes(registro.categoria as AuditCategory)
  )
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function leer(): AuditRecord[] {
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.filter(esRegistroAuditoria)
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return []
}

function escribir(lista: AuditRecord[]) {
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(lista.slice(0, MAX_REGISTROS)))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function registrarAuditoria(parms: AuditOperacionParms) {
  const registro: AuditRecord = {
    id: makeId(),
    at: new Date().toISOString(),
    categoria: parms.categoria,
    titulo: parms.titulo,
    detalle: parms.detalle,
    entidad: parms.entidad,
    usuario: parms.usuario,
    dispositivo: parms.dispositivo,
    codigoError: parms.codigoError,
  }
  escribir([registro, ...leer().slice(0, MAX_REGISTROS - 1)])
}

export function listarAuditoria(): AuditRecord[] {
  return leer().sort((a, b) => b.at.localeCompare(a.at))
}