const MONTHS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
]

const DAYS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

export function formatDateStamp(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  const weekday = DAYS[date.getDay()]
  return `${weekday} ${day} ${month} ${year}`
}

export function formatDateShort(iso: string) {
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, "0")
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}