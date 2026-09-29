import { isTauri } from "@tauri-apps/api/core"

import type { DocStore } from "./contracts"
import { createTauriStore } from "./tauri-store"
import { createWebStore } from "./web-store"

let store: DocStore | null = null

/**
 * Elige la implementacion una sola vez. En el navegador (y en el simulacro) es
 * `localStorage`; dentro de la app de escritorio es SQLite.
 */
export function getStore(): DocStore {
  if (!store) {
    store = isTauri() ? createTauriStore() : createWebStore()
  }
  return store
}

/**
 * Se llama una vez antes de montar la app. Es el unico punto asincrono del
 * arranque: hasta que no resuelve, ningun store puede leer porque todos leen
 * de forma sincronica en su mount.
 */
export async function hydrateStore(): Promise<void> {
  await getStore().hydrate()
}

export { onStoreError, reportStoreError, describeError } from "./errors"
export type { DocStore, DocKey } from "./contracts"
export { DOC_KEYS } from "./contracts"
