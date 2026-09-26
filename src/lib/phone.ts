/**
 * Normalización de teléfonos colombianos para la API de Meta.
 *
 * PRODUCT.md §Operating Context: «Números colombianos almacenados en formato
 * local y convertidos al formato Meta durante el envío (57 + número)».
 * Este módulo es el único lugar donde se define esa conversión.
 */

/** Móvil colombiano: 10 dígitos empezando por 3, con o sin prefijo 57. */
export function isMobileColombian(value: string): boolean {
  const digits = value.replace(/\D/g, "")
  const local = digits.startsWith("57") && digits.length === 12 ? digits.slice(2) : digits
  return /^3\d{9}$/.test(local)
}

/** Convierte un número local o ya prefijado al formato que espera Meta (57 + número). */
export function toWhatsAppNumber(display: string): string {
  const digits = display.replace(/\D/g, "")
  return digits.startsWith("57") ? digits : `57${digits}`
}
