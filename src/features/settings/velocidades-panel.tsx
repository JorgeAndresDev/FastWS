import { Gauge } from "lucide-react"

import { Panel } from "@/components/ui"
import { cn } from "@/lib/utils"
import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"

import { useCampaigns, VELOCIDADES } from "@/features/campaigns/campaigns-store"

export function VelocidadesPanel() {
  const { velocidad, setVelocidad } = useCampaigns()

  const cambiar = (v: string) => {
    if (v === velocidad) return
    const anterior = velocidad
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    setVelocidad(v)
    registrarAuditoria({
      categoria: "configuracion",
      titulo: "Velocidad de despacho actualizada",
      detalle: `${anterior} → ${v}`,
      entidad: v,
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
  }

  return (
    <Panel
      title="Intercambio con Meta"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <Gauge aria-hidden />
          Límite por teléfono
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
            Velocidad de despacho global
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Velocidad de despacho global">
            {VELOCIDADES.map((v) => {
              const active = v === velocidad
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={active}
                  onClick={() => cambiar(v)}
                  className={cn(
                    "h-9 rounded-md border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                    active
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-300 hover:bg-base-750 hover:text-ink-100"
                  )}
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          El límite de envíos de Meta se mide por teléfono: la velocidad es global para el número y
          aplica en caliente a todas las campañas en vuelo, sin reiniciarlas. Se gestiona aquí y ya
          no desde la cola de envíos.
        </p>
      </div>
    </Panel>
  )
}