import { getAppLocale } from "@/lib/app-config"

const MONTHS: Record<string, string[]> = {
  "es-CO": ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"],
  "en-US": ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
}

const DAYS: Record<string, string[]> = {
  "es-CO": ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"],
  "en-US": ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
}

function ramp(date: Date) {
  const locale = getAppLocale()
  const month = MONTHS[locale]
  const day = DAYS[locale]
  if (!month || !day) return null
  return {
    dayOfWeek: day[date.getDay()],
    monthAbbrev: month[date.getMonth()],
  }
}

export function formatDateStamp(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()
  const r = ramp(date)
  const weekday = r?.dayOfWeek ?? DAYS["es-CO"][date.getDay()]
  const month = r?.monthAbbrev ?? MONTHS["es-CO"][date.getMonth()]
  return `${weekday} ${day} ${month} ${year}`
}

export function formatDateShort(iso: string) {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, "0")
  const year = date.getFullYear()
  const r = ramp(date)
  const month = r?.monthAbbrev ?? MONTHS["es-CO"][date.getMonth()]
  return `${day} ${month} ${year}`
}