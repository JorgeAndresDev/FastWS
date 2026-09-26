export type SesionOrigen = "inicio" | "restaurada"

export interface SesionRegistro {
  id: string
  origen: SesionOrigen
  usuario: string
  email: string
  rol: string
  recordar: boolean
  equipo: string
  plataforma: string
  inicio: string
  fin?: string
}

export interface RegistrarSesionParms {
  usuario: string
  email: string
  rol: string
  recordar: boolean
  equipo: string
  plataforma: string
  origen?: SesionOrigen
}

const SESSION_LOG_KEY = "fastws.sesiones"
const MAX_REGISTROS = 300

function esRegistro(item: unknown): item is SesionRegistro {
  if (item == null || typeof item !== "object") return false
  const registro = item as Partial<SesionRegistro>
  return (
    typeof registro.id === "string" &&
    (registro.origen === "inicio" || registro.origen === "restaurada") &&
    typeof registro.usuario === "string" &&
    typeof registro.equipo === "string" &&
    typeof registro.inicio === "string" &&
    (registro.fin === undefined || typeof registro.fin === "string")
  )
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function leer(): SesionRegistro[] {
  try {
    const raw = window.localStorage.getItem(SESSION_LOG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.filter(esRegistro)
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return []
}

function escribir(lista: SesionRegistro[]) {
  try {
    window.localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(lista.slice(0, MAX_REGISTROS)))
  } catch {
    /* almacenamiento no disponible */
  }
}

function mismaSesion(a: SesionRegistro, parms: RegistrarSesionParms) {
  return a.equipo === parms.equipo && a.usuario === parms.usuario
}

export function registrarSesion(parms: RegistrarSesionParms): SesionRegistro {
  const lista = leer()
  const ahora = new Date().toISOString()

  const abiertas = lista.filter((registro) => !registro.fin && mismaSesion(registro, parms))
  const cerradas = lista.filter((registro) => registro.fin || !mismaSesion(registro, parms))

  const nueva: SesionRegistro = {
    id: makeId(),
    origen: parms.origen ?? "inicio",
    usuario: parms.usuario,
    email: parms.email,
    rol: parms.rol,
    recordar: parms.recordar,
    equipo: parms.equipo,
    plataforma: parms.plataforma,
    inicio: ahora,
  }

  escribir([
    nueva,
    ...cerradas,
    ...abiertas.flatMap((registro) =>
      registro.fin ? [registro] : [{ ...registro, fin: ahora }]
    ),
  ])
  return nueva
}

export function cerrarSesion(equipo: string, usuario: string) {
  const lista = leer()
  const abiertas = lista.filter((registro) => !registro.fin && registro.equipo === equipo)
  if (abiertas.length === 0) return
  const ahora = new Date().toISOString()
  escribir(
    lista.map((registro) =>
      !registro.fin && registro.equipo === equipo && registro.usuario === usuario
        ? { ...registro, fin: ahora }
        : registro
    )
  )
}

export function listarSesiones(): SesionRegistro[] {
  return leer().sort((a, b) => b.inicio.localeCompare(a.inicio))
}

export function tieneSesionAbierta(equipo: string, usuario: string) {
  return leer().some((registro) => !registro.fin && equipo === registro.equipo && usuario === registro.usuario)
}