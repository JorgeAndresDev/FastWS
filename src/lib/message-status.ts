import type { MessageStatus } from "@/types"

const ORDEN: Record<MessageStatus, number> = {
  PENDIENTE: 0,
  PROCESO: 1,
  ENTREGADO: 2,
  LEIDO: 3,
  FALLIDO: 4,
  CANCELADO: 5,
}

/**
 * Un webhook puede llegar desordenado. Un `delivered` tardío no debe borrar un
 * `read`, y un mensaje ya leído no debe volver a fallido. Los estados terminales
 * de cancelación y fallo tampoco se reabren.
 */
export function puedeAvanzarEstado(actual: MessageStatus, nuevo: MessageStatus): boolean {
  if (actual === nuevo) return false
  if (actual === "CANCELADO" || actual === "FALLIDO") return false
  if (nuevo === "CANCELADO") return true
  if (nuevo === "FALLIDO") return actual !== "LEIDO"
  return ORDEN[nuevo] > ORDEN[actual]
}
