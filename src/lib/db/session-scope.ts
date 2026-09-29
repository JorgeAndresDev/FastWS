import { getStore } from "./index"

/**
 * Dos alcances de persistencia, y la diferencia importa:
 *
 * - **duradero**: sobrevive al cierre. Va a la base (SQLite en escritorio,
 *   localStorage en navegador). Es donde viven clientes, campanas, auditoria,
 *   la identidad del equipo y la sesion "recordada".
 * - **efimero**: muere con la ventana. Se queda en `sessionStorage` incluso en
 *   Tauri, porque en el webview su vida util ya es la de la sesion. Es donde
 *   viven los secretos: el token de Meta y la sesion "temporal".
 */

export function readDurable(key: string): string | null {
  return getStore().get(key)
}

export function writeDurable(key: string, raw: string): boolean {
  return getStore().set(key, raw)
}

export function clearDurable(key: string): void {
  getStore().remove(key)
}

export function readEphemeral(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeEphemeral(key: string, raw: string): void {
  try {
    window.sessionStorage.setItem(key, raw)
  } catch {
    /* sessionStorage no disponible */
  }
}

export function clearEphemeral(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* sessionStorage no disponible */
  }
}

/** La lectura que usan las sesiones: primero lo durable, luego lo efimero. */
export function readEither(key: string): string | null {
  return readDurable(key) ?? readEphemeral(key)
}
