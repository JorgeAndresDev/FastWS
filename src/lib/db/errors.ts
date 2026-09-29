/**
 * Canal de errores de la capa de persistencia.
 *
 * Las escrituras son sincronas y no pueden lanzar: un fallo aqui significa que
 * la app sigue funcionando pero sin guardar, y eso tiene que llegar a la
 * pantalla como aviso, no como excepcion.
 */
export type StoreErrorListener = (message: string) => void

let listener: StoreErrorListener | null = null

export function onStoreError(next: StoreErrorListener | null) {
  listener = next
}

export function reportStoreError(message: string) {
  listener?.(message)
}

export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "error desconocido"
}
