import { Settings } from "lucide-react"

import { formatDateStamp } from "@/app/date-stamp"

import { VelocidadesPanel } from "./velocidades-panel"
import { IntegracionPanel } from "./integracion-panel"
import { DatosPanel } from "./datos-panel"
import { ParametrosPanel } from "./parametros-panel"
import { AccionesPanel } from "./acciones-panel"

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Settings className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Sistema ·{" "}
            <time
              dateTime={new Date().toISOString()}
              suppressHydrationWarning
              className="text-ink-400"
            >
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Configuración</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-400">
          Parámetros de la aplicación, la integración de WhatsApp Business y los intervalos de
          procesamiento del sistema. Cada cambio queda registrado en Auditoría.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <VelocidadesPanel />
        <IntegracionPanel />
        <DatosPanel />
        <ParametrosPanel />
        <AccionesPanel />
      </div>
    </div>
  )
}