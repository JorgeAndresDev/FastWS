/**
 * Guardado de secretos (hoy: el token de Meta y el token del Worker de webhooks).
 *
 * Por que existe esto: el token estaba en `sessionStorage` del webview, que en
 * Tauri muere con la ventana. Al cerrar y abrir la app había que escribirlo
 * otra vez, que es lo que reportó el operador. Ahora va a la guarda de DPAPI del
 * lado nativo (`src-tauri/src/secrets.rs`), así que sobrevive al cierre y solo
 * desaparece cuando el usuario pulsa "Desconectar".
 *
 * Por qué una fachada y no llamar `invoke` desde el store: el simulacro corre en
 * un navegador normal, sin Tauri. `guardar`/`leer` detectan si el comando existe
 * y, si no, caen a `sessionStorage`. Así la UI y las pruebas del simulacro siguen
 * funcionando exactamente igual, y solo la app de escritorio gana la persistencia
 * cifrada.
 *
 * `borrar` es importante que no dependa del backend: si el comando no está (o
 * falla), el fallback limpia igual. Desconectar nunca debe dejar el secreto vivo
 * por un fallo del almacén seguro.
 */
const CLAVE_TOKEN = "fastws.meta-token"

/** Si estamos dentro de Tauri. `invoke` solo existe cuando lo estamos. */
function hayTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

async function invocar<T>(comando: string, args: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core")
  return invoke<T>(comando, args)
}

function claveFallback(label: string): string {
  return label === "meta-token" ? CLAVE_TOKEN : `fastws.secret.${label}`
}

/**
 * Guarda un secreto con una etiqueta propia. Devuelve `true` si quedó persistido
 * en el almacén seguro; `false` si solo quedó en la sesión (navegador).
 */
export async function guardarSecreto(label: string, plano: string): Promise<boolean> {
  if (hayTauri()) {
    try {
      await invocar("secret_write", { label, plain: plano })
      return true
    } catch (err) {
      console.warn(`No se pudo guardar el secreto "${label}":`, err)
      return false
    }
  }
  try {
    window.sessionStorage.setItem(claveFallback(label), plano)
  } catch {
    /* sin sessionStorage */
  }
  return false
}

/** Recupera un secreto guardado, o `null` si no hay ninguno. */
export async function leerSecreto(label: string): Promise<string | null> {
  if (hayTauri()) {
    try {
      return (await invocar<string | null>("secret_read", { label })) ?? null
    } catch (err) {
      console.warn(`No se pudo leer el secreto "${label}":`, err)
      return null
    }
  }
  try {
    return window.sessionStorage.getItem(claveFallback(label))
  } catch {
    return null
  }
}

/** Borra un secreto del almacén seguro y del fallback. Idempotente. */
export async function borrarSecreto(label: string): Promise<void> {
  if (hayTauri()) {
    try {
      await invocar("secret_delete", { label })
    } catch (err) {
      console.warn(`No se pudo borrar el secreto "${label}":`, err)
    }
  }
  try {
    window.sessionStorage.removeItem(claveFallback(label))
  } catch {
    /* sin sessionStorage */
  }
}

export function guardarToken(token: string): Promise<boolean> {
  return guardarSecreto("meta-token", token)
}

export function leerToken(): Promise<string | null> {
  return leerSecreto("meta-token")
}

export function borrarToken(): Promise<void> {
  return borrarSecreto("meta-token")
}

/**
 * Si el secreto va a sobrevivir al cierre de la ventana. La UI lo usa para no
 * prometer "recordado" cuando en realidad solo vive en la sesión.
 */
export function persiste(): boolean {
  return hayTauri()
}
