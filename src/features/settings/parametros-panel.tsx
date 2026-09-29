import { useState } from "react"
import { Languages, Moon, Palette, Sun } from "lucide-react"

import { Panel } from "@/components/ui"
import { cn } from "@/lib/utils"
import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { useTheme, type ThemeMode } from "@/lib/theme"

import {
  APP_LOCALES,
  getAppLocale,
  setAppLocale,
  type AppLocale,
} from "@/lib/app-config"

const LOCALE_LABEL: Record<AppLocale, string> = {
  "es-CO": "Español (Colombia)",
  "en-US": "English (Estados Unidos)",
}

const THEME_LABEL: Record<ThemeMode, string> = {
  oscuro: "Oscuro",
  claro: "Claro",
}

const THEME_ICON: Record<ThemeMode, typeof Sun> = {
  oscuro: Moon,
  claro: Sun,
}

export function ParametrosPanel() {
  const [locales] = useState(APP_LOCALES)
  const [locale, setLocaleState] = useState<AppLocale>(getAppLocale)
  const { mode, setMode } = useTheme()

  const auditar = (titulo: string, detalle: string, entidad: string) => {
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    registrarAuditoria({
      categoria: "configuracion",
      titulo,
      detalle,
      entidad,
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
  }

  const cambiar = (l: AppLocale) => {
    if (l === locale) return
    const anterior = locale
    setLocaleState(l)
    setAppLocale(l)
    auditar("Formato regional actualizado", `${anterior} → ${l}`, l)
  }

  const cambiarTema = (next: ThemeMode) => {
    if (next === mode) return
    const anterior = mode
    setMode(next)
    auditar(
      "Apariencia actualizada",
      `${THEME_LABEL[anterior]} → ${THEME_LABEL[next]}`,
      next
    )
  }

  return (
    <Panel
      title="Parámetros de la aplicación"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <Languages aria-hidden />
          Formato
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Formato regional">
          {locales.map((l) => {
            const active = l === locale
            return (
              <button
                key={l}
                type="button"
                aria-pressed={active}
                onClick={() => cambiar(l)}
                className={cn(
                  "h-9 rounded-md border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                  active
                    ? "border-rule bg-base-750 text-ink-100"
                    : "border-rule bg-base-800 text-ink-300 hover:bg-base-750 hover:text-ink-100"
                )}
              >
                {LOCALE_LABEL[l]}
              </button>
            )
          })}
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          El formato regional aplica a los números y las fechas en toda la app (sello de fecha,
          conteos, horas). Los textos de la interfaz siguen en español colombiano en esta versión.
        </p>

        <div className="border-t border-rule-soft pt-4">
          <div className="mb-2.5 flex items-center gap-2 text-ink-500">
            <Palette className="size-3.5" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Apariencia</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Apariencia">
            {(["oscuro", "claro"] as const).map((m) => {
              const active = m === mode
              const Icon = THEME_ICON[m]
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => cambiarTema(m)}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                    active
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-300 hover:bg-base-750 hover:text-ink-100"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {THEME_LABEL[m]}
                </button>
              )
            })}
          </div>
          <p role="note" className="mt-2.5 text-xs leading-relaxed text-ink-500">
            La app arranca en oscuro, el modo para el que está calibrada la paleta. La preferencia
            queda guardada en este equipo. El login es siempre claro: es la puerta de entrada y no
            cambia con el tema.
          </p>
        </div>
      </div>
    </Panel>
  )
}