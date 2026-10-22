import { readDurable, writeDurable } from "@/lib/db/session-scope"
import { toWhatsAppNumber } from "@/lib/phone"

/**
 * Guardas de envío real. Tres capas que se suman al token:
 *
 * 1. Modo global: `ensayo` (por defecto) no deja salir nada a Meta.
 * 2. Lista blanca: en compilaciones de desarrollo, si tiene números, solo esos
 *    destinos salen; el resto se bloquea antes de llamar a la API.
 * 3. Confirmación explícita en la cola antes de iniciar una campaña.
 *
 * La política vive aquí para que el motor, las pruebas de plantilla y las
 * respuestas de conversaciones usen exactamente la misma regla.
 */

export type ModoEnvio = "ensayo" | "real"

export const MODO_ENVIO_KEY = "fastws.envio.modo"
export const LISTA_BLANCA_KEY = "fastws.envio.listaBlanca"
export const MODO_ENVIO_DEFAULT: ModoEnvio = "ensayo"

export interface GuardasEnvio {
  modo: ModoEnvio
  listaBlanca: string[]
  desarrollo: boolean
}

export function esDesarrollo(): boolean {
  return import.meta.env.DEV
}

/** Acepta el valor crudo y el JSON con comillas (`"real"`). */
export function parseModoEnvio(raw: string | null): ModoEnvio {
  if (!raw) return MODO_ENVIO_DEFAULT
  let valor = raw
  if (raw.startsWith('"')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed === "string") valor = parsed
    } catch {
      /* se queda el crudo */
    }
  }
  return valor === "real" ? "real" : "ensayo"
}

export function getModoEnvio(): ModoEnvio {
  return parseModoEnvio(readDurable(MODO_ENVIO_KEY))
}

export function setModoEnvio(modo: ModoEnvio): boolean {
  return writeDurable(MODO_ENVIO_KEY, JSON.stringify(modo))
}

/** Deduplica, normaliza a 57 + número y descarta lo que no parece un móvil. */
export function normalizarLista(phones: string[]): string[] {
  const out: string[] = []
  for (const phone of phones) {
    const numero = toWhatsAppNumber(phone.trim())
    if (!/^\d{11,15}$/.test(numero)) continue
    if (!out.includes(numero)) out.push(numero)
  }
  return out
}

export function getListaBlanca(): string[] {
  const raw = readDurable(LISTA_BLANCA_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return normalizarLista(parsed.filter((p): p is string => typeof p === "string"))
  } catch {
    return []
  }
}

export function setListaBlanca(phones: string[]): boolean {
  return writeDurable(LISTA_BLANCA_KEY, JSON.stringify(normalizarLista(phones)))
}

export function guardasActuales(): GuardasEnvio {
  return { modo: getModoEnvio(), listaBlanca: getListaBlanca(), desarrollo: esDesarrollo() }
}

/**
 * Devuelve el motivo por el que el número no puede recibir, o `null` si puede.
 * La lista blanca solo se aplica en desarrollo: una instalación de producción
 * no depende de una preferencia local que se pueda vaciar.
 */
export function motivoBloqueoEnvio(
  phone: string,
  guardas: GuardasEnvio = guardasActuales()
): string | null {
  if (guardas.modo !== "real") {
    return "La app está en modo ensayo: no se envía nada a Meta. Actívalo en Configuración → Guardas de envío."
  }
  if (guardas.desarrollo && guardas.listaBlanca.length > 0) {
    const destino = toWhatsAppNumber(phone)
    if (!guardas.listaBlanca.includes(destino)) {
      return `El número ${destino} no está en la lista blanca de desarrollo. Agrégalo en Configuración o vacía la lista para permitir todos.`
    }
  }
  return null
}
