import { getAppLocale } from "./app-config"

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getAppLocale()).format(value)
}

export function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`
}