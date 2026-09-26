import { getAppLocale } from "@/lib/app-config"

export function dayKey(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "fecha-invalida"
  // Con padding: la clave se usa para ordenar y para volver a construir la fecha.
  const mes = String(date.getMonth() + 1).padStart(2, "0")
  const dia = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mes}-${dia}`
}

function shortDate(iso: string, options: Intl.DateTimeFormatOptions) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(getAppLocale(), options)
}

export function shortDay(iso: string) {
  const formatted = shortDate(iso, { weekday: "short", day: "numeric", month: "short" })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace(/\.$/, "")
}

export function fullDay(iso: string) {
  const formatted = shortDate(iso, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function dayLabel(iso: string) {
  const key = dayKey(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (key === dayKey(today.toISOString())) return "Hoy"
  if (key === dayKey(yesterday.toISOString())) return "Ayer"
  return fullDay(iso)
}

export function hourMinute(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleTimeString(getAppLocale(), { hour12: false, hour: "2-digit", minute: "2-digit" })
}