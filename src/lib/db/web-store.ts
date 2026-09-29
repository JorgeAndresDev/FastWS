import type { DocStore } from "./contracts"

/**
 * Implementacion de navegador: `localStorage`, tal como funcionaba antes de
 * Tauri. Es la que usa el simulacro, asi que su comportamiento debe quedar
 * exactamente igual, incluidas las escrituras que fallan en silencio.
 */
export function createWebStore(): DocStore {
  const storage = (): Storage | null => {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  return {
    kind: "web",
    describe: () => "localStorage del navegador",

    async hydrate() {
      // localStorage ya esta disponible en el momento del montaje: no hay nada
      // que trae desde ningun lado.
    },

    get(key) {
      try {
        return storage()?.getItem(key) ?? null
      } catch {
        return null
      }
    },

    set(key, raw) {
      try {
        const store = storage()
        if (!store) return false
        store.setItem(key, raw)
        return true
      } catch {
        return false
      }
    },

    remove(key) {
      try {
        storage()?.removeItem(key)
      } catch {
        /* almacenamiento no disponible */
      }
    },

    keys() {
      const store = storage()
      if (!store) return []
      const out: string[] = []
      try {
        for (let index = 0; index < store.length; index += 1) {
          const key = store.key(index)
          if (key) out.push(key)
        }
      } catch {
        /* almacenamiento no disponible */
      }
      return out
    },

    removeMany(keys) {
      for (const key of keys) this.remove(key)
    },

    async flush() {
      // localStorage escribe de forma sincrona: no hay cola que esperar.
    },
  }
}
