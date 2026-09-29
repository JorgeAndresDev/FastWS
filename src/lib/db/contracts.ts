export type { StoreErrorListener } from "./errors"

/**
 * Contrato de persistencia de la app.
 *
 * Espeja a proposito la superficie de `Storage` (getItem/setItem/removeItem):
 * los stores ya leen de forma sincronica en el mount y este contrato los deja
 * intactos, que es lo que permite que el simulacro siga probando la UI.
 *
 * SQLite en Tauri es asincrono por IPC. Toda la asincronia se concentra en un
 * unico punto, `hydrate()`, que corre antes de montar el arbol. Despues de eso
 * `get` y `set` son sincronos porque `impl-tauri` sirve desde memoria y
 * persiste en segundo plano respetando el orden de las escrituras.
 */
export interface DocStore {
  /** Que implementacion quedo activa: util para diagnostico y avisos. */
  readonly kind: "web" | "tauri"
  /** Se llama una vez, antes de montar la app. */
  hydrate(): Promise<void>
  /** Texto crudo, igual que `Storage.getItem`. */
  get(key: string): string | null
  /** Escribe y persiste. `false` = no se pudo guardar ahora. */
  set(key: string, raw: string): boolean
  remove(key: string): void
  keys(): string[]
  removeMany(keys: readonly string[]): void
  /** Espera a que termine toda la cola de escrituras. */
  flush(): Promise<void>
  describe(): string
}

/** Claves de dominio que la app persiste. */
export const DOC_KEYS = {
  clientes: "fastws.clientes",
  campanas: "fastws.campanas",
  campanasVelocidad: "fastws.campanas.velocidad",
  conversaciones: "fastws.conversaciones",
  auditoria: "fastws.auditoria",
  sesiones: "fastws.sesiones",
  conexionIds: "fastws.conexion.ids",
  appLocale: "fastws.app.locale",
} as const

export type DocKey = (typeof DOC_KEYS)[keyof typeof DOC_KEYS]
