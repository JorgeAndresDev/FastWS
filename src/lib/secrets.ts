/**
 * Guardado de secretos (hoy: el token de la API de WhatsApp).
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
 * falla), el fallback limpia igual. Desconectar nunca debe dejar el token vivo
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

/**
 * Guarda el token cifrado. Devuelve `true` si quedó persistido en el almacén
 * seguro; `false` si solo quedó en la sesión (navegador), para que la UI pueda
 * avisar de que en este equipo no se va a recordar.
 */
export async function guardarToken(token: string): Promise<boolean> {
  if (hayTauri()) {
    try {
      await invocar("secret_write", { label: "meta-token", plain: token })
      return true
    } catch (err) {
      // Si el almacén seguro falla, el token sigue siendo válido en memoria:
      // que la conexión funcione ahora importa más que que se recuerde después.
      console.warn("No se pudo guardar el token cifrado:", err)
      return false
    }
  }
  try {
    window.sessionStorage.setItem(CLAVE_TOKEN, token)
  } catch {
    /* sin sessionStorage */
  }
  return false
}

/** Recupera el token guardado, o `null` si no hay ninguno. */
export async function leerToken(): Promise<string | null> {
  if (hayTauri()) {
    try {
      return (await invocar<string | null>("secret_read", { label: "meta-token" })) ?? null
    } catch (err) {
      console.warn("No se pudo leer el token cifrado:", err)
      return null
    }
  }
  try {
    return window.sessionStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

/** Borra el token del almacén seguro y del fallback. Idempotente. */
export async function borrarToken(): Promise<void> {
  if (hayTauri()) {
    try {
      await invocar("secret_delete", { label: "meta-token" })
    } catch (err) {
      console.warn("No se pudo borrar el token cifrado:", err)
    }
  }
  try {
    window.sessionStorage.removeItem(CLAVE_TOKEN)
  } catch {
    /* sin sessionStorage */
  }
}

/**
 * Si el token va a sobrevivir al cierre de la ventana. La UI lo usa para no
 * prometer "recordado" cuando en realidad solo vive en la sesión.
 */
export function persiste(): boolean {
  return hayTauri()
}