import { readDurable, writeDurable } from "@/lib/db/session-scope"

export type AppLocale = "es-CO" | "en-US"

const LOCALE_KEY = "fastws.app.locale"

export const APP_LOCALES: readonly AppLocale[] = ["es-CO", "en-US"]

const APP_LOCALES_SET = new Set<string>(APP_LOCALES)

export function getAppLocale(): AppLocale {
  const raw = readDurable(LOCALE_KEY)
  if (raw != null && APP_LOCALES_SET.has(raw)) return raw as AppLocale
  return "es-CO"
}

export function setAppLocale(locale: AppLocale) {
  writeDurable(LOCALE_KEY, locale)
}