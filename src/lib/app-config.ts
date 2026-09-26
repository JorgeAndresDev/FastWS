export type AppLocale = "es-CO" | "en-US"

const LOCALE_KEY = "fastws.app.locale"

export const APP_LOCALES: readonly AppLocale[] = ["es-CO", "en-US"]

const APP_LOCALES_SET = new Set<string>(APP_LOCALES)

export function getAppLocale(): AppLocale {
  try {
    const raw = window.localStorage.getItem(LOCALE_KEY)
    if (raw != null && APP_LOCALES_SET.has(raw)) return raw as AppLocale
  } catch {
    /* almacenamiento no disponible */
  }
  return "es-CO"
}

export function setAppLocale(locale: AppLocale) {
  try {
    window.localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* almacenamiento no disponible */
  }
}