import { invoke } from "@tauri-apps/api/core"

import type { DocStore } from "./contracts"
import { describeError, reportStoreError } from "./errors"

/**
 * El token de Meta es un secreto y ya no pasa por aquí: vive cifrado con DPAPI
 * (`src-tauri/src/secrets.rs`, `src/lib/secrets.ts`). Antes era la sesión
 * completa en `sessionStorage`; ahora el único nombre que hay que evitar es el
 * que usa el fallback de navegador, para que una copia de `localStorage` desde
 * el navegador a la base no arrastre un token en claro.
 */
const NO_MIGRAR = new Set(["fastws.meta-token"])

function leerDelNavegador(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const store = window.localStorage
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index)
      if (!key || !key.startsWith("fastws.") || NO_MIGRAR.has(key)) continue
      const value = store.getItem(key)
      if (value != null) out[key] = value
    }
  } catch {
    /* sin localStorage legible */
  }
  return out
}

/**
 * Implementacion de escritorio: SQLite via IPC de Tauri.
 *
 * `get` y `set` son sincronos porque todas las escrituras pasan por memoria y
 * se drenan a SQLite en una sola cola. La cola es la parte no obvia: dos
 * `set` seguidos sobre la misma clave pueden perder el orden si se lanzan como
 * invocaciones sueltas, y el motor de campanas escribe la misma clave cada vez
 * que avanza un envio.
 */
export function createTauriStore(): DocStore {
  const memory = new Map<string, string>()
  let dirty = new Map<string, string | null>()
  let draining: Promise<void> | null = null

  function schedule() {
    if (draining) return
    draining = (async () => {
      // El bucle recoge lo que haya entrado mientras awaited el lote anterior.
      while (dirty.size > 0) {
        const batch = dirty
        dirty = new Map()
        try {
          await invoke("doc_save", { entries: Object.fromEntries(batch) })
        } catch (err) {
          reportStoreError(`No se pudo guardar en la base local: ${describeError(err)}`)
        }
      }
    })().finally(() => {
      draining = null
    })
  }

  function mark(key: string, value: string | null) {
    if (value === null) memory.delete(key)
    else memory.set(key, value)
    dirty.set(key, value)
    schedule()
  }

  return {
    kind: "tauri",
    describe: () => "SQLite local (Tauri)",

    async hydrate() {
      let fromDb: Record<string, string> = {}
      try {
        fromDb = await invoke<Record<string, string>>("doc_all")
      } catch (err) {
        reportStoreError(`No se pudo abrir la base local: ${describeError(err)}`)
      }

      const local = leerDelNavegador()

      // Primera vez que la app de escritorio arranca con datos del navegador:
      // se traen y SQLite pasa a ser la fuente de verdad. Si SQLite ya tiene
      // algo, manda SQLite y lo del navegador se ignora.
      if (Object.keys(fromDb).length === 0 && Object.keys(local).length > 0) {
        for (const [key, raw] of Object.entries(local)) mark(key, raw)
        return
      }

      for (const [key, raw] of Object.entries(fromDb)) memory.set(key, raw)
    },

    get(key) {
      return memory.get(key) ?? null
    },

    set(key, raw) {
      mark(key, raw)
      return true
    },

    remove(key) {
      mark(key, null)
    },

    keys() {
      return [...memory.keys()]
    },

    removeMany(keys) {
      for (const key of keys) mark(key, null)
    },

    async flush() {
      while (draining || dirty.size > 0) {
        if (!draining) schedule()
        await draining
      }
    },
  }
}
