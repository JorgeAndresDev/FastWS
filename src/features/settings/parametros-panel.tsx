import { useState } from "react"
import { Languages } from "lucide-react"

import { Panel } from "@/components/ui"
import { cn } from "@/lib/utils"
import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"

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

export function ParametrosPanel() {
  const [locales] = useState(APP_LOCALES)
  const [locale, setLocaleState] = useState<AppLocale>(getAppLocale)

  const cambiar = (l: AppLocale) => {
    if (l === locale) return
    const anterior = locale
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    setLocaleState(l)
    setAppLocale(l)
    registrarAuditoria({
      categoria: "configuracion",
      titulo: "Formato regional actualizado",
      detalle: `${anterior} → ${l}`,
      entidad: l,
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
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
      </div>
    </Panel>
  )
}