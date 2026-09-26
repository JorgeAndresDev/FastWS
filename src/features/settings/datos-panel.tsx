import { useMemo } from "react"
import { Globe, HardDrive, MonitorSmartphone } from "lucide-react"

import { Panel } from "@/components/ui"
import { useClients } from "@/features/clients/clients-store"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { buildDatasetStates } from "@/features/sync/datasets"
import { listarSesiones } from "@/lib/session-log"
import { listarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { formatNumber } from "@/lib/utils"

export function DatosPanel() {
  const { clients } = useClients()
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()

  const device = useMemo(() => getDeviceIdentity(), [])
  const zona = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, [])

  const datasets = useMemo(
    () =>
      buildDatasetStates({
        clientes: clients,
        campañas: campaigns,
        threads,
        sesiones: listarSesiones(),
        auditoria: listarAuditoria(),
      }),
    [clients, campaigns, threads]
  )

  return (
    <Panel
      title="Estado del equipo"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <HardDrive aria-hidden />
          Solo local
        </span>
      }
    >
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-2">
        <dl className="grid gap-2">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="flex items-baseline justify-between gap-4">
              <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                {dataset.label}
              </dt>
              <dd className="tabular-nums text-[0.8125rem] text-ink-100">
                {formatNumber(dataset.count)}
                <span className="ml-1 text-xs text-ink-500">{dataset.lastActivity ?? "—"}</span>
              </dd>
            </div>
          ))}
        </dl>
        <dl className="grid gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              <MonitorSmartphone className="size-3.5" aria-hidden />
              Equipo
            </dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">
              {device.id} · {device.platform}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              <Globe className="size-3.5" aria-hidden />
              Zona horaria
            </dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{zona || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Versión</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">v0.1</dd>
          </div>
          <p role="note" className="border-t border-rule-soft pt-3 text-xs leading-relaxed text-ink-500">
            La zona horaria es la del sistema operativo: los sellos de la bitácora se estampan con la
            hora real del equipo, nunca con una preferencia override.
          </p>
        </dl>
      </div>
    </Panel>
  )
}