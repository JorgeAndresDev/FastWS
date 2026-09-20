import type { CampaignStatus, DashboardStats, OutboundMessage } from "@/types"
import { useNavigate } from "react-router-dom"
import { Clock3, ExternalLink } from "lucide-react"

import { Button, DispatchBar, Kbd, Panel, StatusStamp } from "@/components/ui"
import { campaigns, recentMessages, stats } from "@/lib/mock/data"
import { cn, formatNumber, formatPercent } from "@/lib/utils"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

function KpiCard({
  labelText,
  value,
  detail,
  detailTone = "muted",
}: {
  labelText: string
  value: string
  detail?: { text: string; tone?: "muted" | "danger" }
  detailTone?: "muted" | "danger"
}) {
  const detailText = detail?.text
  const tone = detail?.tone ?? detailTone
  return (
    <div className="panel group flex flex-col gap-2 px-4 py-3 transition-colors hover:border-rule">
      <p className={label}>{labelText}</p>
      <p className="text-[1.375rem] font-bold tabular-nums tracking-tight text-ink-100">
        {value}
      </p>
      {detailText && (
        <p
          className={cn(
            "text-xs tabular-nums",
            tone === "danger" && "text-fallido",
            tone === "muted" && "text-ink-500"
          )}
        >
          {detailText}
        </p>
      )}
    </div>
  )
}

const campaignTone: Record<CampaignStatus, string> = {
  BORRADOR: "stamp--fecha",
  PROGRAMADA: "stamp--pendiente",
  EN_PROCESO: "stamp--proceso",
  PAUSADA: "stamp--cancelado",
  FINALIZADA: "stamp--entregado",
  CANCELADA: "stamp--cancelado",
  CON_ERROR: "stamp--fallido",
}

const campaignLabel: Record<CampaignStatus, string> = {
  BORRADOR: "Borrador",
  PROGRAMADA: "Programada",
  EN_PROCESO: "En curso",
  PAUSADA: "Pausada",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  CON_ERROR: "Con error",
}

function CampaignChip({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn("stamp", campaignTone[status])}>
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden
      />
      {campaignLabel[status]}
    </span>
  )
}

function ProgressRow({
  message,
}: {
  message: OutboundMessage
}) {
  return (
    <tr className="border-b border-rule-soft transition-colors last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-2.5 text-xs text-ink-500">{message.sentAt}</td>
      <td className="px-4 py-2.5">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{message.client}</p>
        <p className="text-xs text-ink-500">{message.campaign}</p>
      </td>
      <td className="hidden px-4 py-2.5 font-mono text-[0.75rem] text-ink-400 sm:table-cell">
        {message.phone}
      </td>
      <td className="hidden px-4 py-2.5 lg:table-cell">
        {message.metaId ? (
          <span className="font-mono text-xs text-ink-500">{message.metaId}</span>
        ) : (
          <span className="text-xs text-ink-600">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <StatusStamp status={message.status} />
      </td>
    </tr>
  )
}

function ActiveCampaignPanel() {
  const active = campaigns.find((c) => c.status === "EN_PROCESO")
  if (!active) return null

  const processed = active.total - active.pendiente
  const progress = Math.round((processed / active.total) * 100)

  const segments = [
    { status: "PROCESO" as const, count: active.procesando },
    { status: "ENTREGADO" as const, count: active.entregado },
    { status: "LEIDO" as const, count: active.leido },
    { status: "FALLIDO" as const, count: active.fallido },
    { status: "PENDIENTE" as const, count: active.pendiente },
  ]

  return (
    <Panel
      title="Campaña activa"
      className="mt-6"
      action={<CampaignChip status={active.status} />}
    >
      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-ink-100">{active.name}</h3>
            <p className="mt-0.5 text-[0.75rem] text-ink-500">{active.description}</p>
          </div>
          <div className="flex items-baseline gap-6 tabular-nums">
            <div>
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500">
                Progreso
              </p>
              <p className="text-xl font-bold text-ink-100">{progress} %</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500">
                Planilla
              </p>
              <p className="text-sm font-semibold text-ink-100">
                {formatNumber(processed)}{" "}
                <span className="font-normal text-ink-500">/ {formatNumber(active.total)}</span>
              </p>
            </div>
          </div>
        </div>

        <DispatchBar segments={segments} total={active.total} className="mt-5" />

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <StatusStamp key={s.status} status={s.status} />
            ))}
        </div>
      </div>
    </Panel>
  )
}

function RecentCampaigns() {
  const recent = campaigns.slice(1)
  return (
    <Panel title="Últimas campañas">
      <ul className="divide-y divide-rule-soft">
        {recent.map((c) => {
          const processed = c.total - c.pendiente
          const pct = c.total > 0 ? Math.round((processed / c.total) * 100) : 0
          return (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-semibold text-ink-100">{c.name}</p>
                <DispatchBar
                  segments={[
                    { status: "PROCESO", count: c.procesando },
                    { status: "ENTREGADO", count: c.entregado },
                    { status: "LEIDO", count: c.leido },
                    { status: "FALLIDO", count: c.fallido },
                    { status: "PENDIENTE", count: c.pendiente },
                  ]}
                  total={c.total}
                  className="mt-1.5 h-1.5"
                />
              </div>
              <div className="text-right">
                <CampaignChip status={c.status} />
                <p className="mt-1 tabular-nums text-xs text-ink-500">{pct} %</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function LatestErrors() {
  const errors = recentMessages.filter((m) => m.status === "FALLIDO")
  if (errors.length === 0) return null
  return (
    <Panel title="Últimos errores" className="mt-6">
      <ul className="divide-y divide-rule-soft">
        {errors.map((e) => (
          <li key={e.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.8125rem] font-semibold text-ink-100">{e.client}</p>
              <span className="font-mono text-xs text-fallido">
                {e.errorCode}
              </span>
            </div>
            <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-400">{e.errorMessage}</p>
            <p className="mt-0.5 text-xs text-ink-500">{e.campaign}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function KpiStrip({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
      <KpiCard
        labelText="Clientes válidos"
        value={formatNumber(stats.clientsValid)}
        detail={{ text: `${formatNumber(stats.clientsInvalid)} inválidos`, tone: "danger" }}
      />
      <KpiCard
        labelText="Campañas"
        value={formatNumber(stats.campaignsTotal)}
        detail={{ text: `${stats.campaignsActive} activa` }}
      />
      <KpiCard labelText="Enviados" value={formatNumber(stats.sent)} detail={{ text: "últimos 30 días" }} />
      <KpiCard
        labelText="Entregados"
        value={formatNumber(stats.delivered)}
        detail={{ text: `${formatPercent(stats.deliveryRate)} de entrega` }}
      />
      <KpiCard
        labelText="Leídos"
        value={formatNumber(stats.read)}
        detail={{ text: `${formatPercent(stats.readRate)} de lectura` }}
      />
      <KpiCard
        labelText="Fallidos"
        value={formatNumber(stats.failed)}
        detail={{ text: "requieren revisión", tone: "danger" }}
      />
      <KpiCard
        labelText="Respondidos"
        value={formatNumber(stats.responded)}
        detail={{ text: `${formatPercent(stats.responseRate)} de respuesta` }}
      />
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">Planilla general</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-400">
            Estado del despacho y del mes en curso · datos de demostración
          </p>
        </div>
        <p className="text-xs text-ink-600">
          Sincronizado · <Kbd>Alt</Kbd> + <Kbd>1</Kbd> vuelve aquí
        </p>
      </header>

      <KpiStrip stats={stats} />

      <ActiveCampaignPanel />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Panel title="Últimos mensajes">
            <div className="max-h-[24rem] overflow-x-auto overflow-y-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-rule-soft">
                    {["Hora", "Cliente", "Teléfono", "Código Meta", "Sello"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className={cn(
                          "px-4 py-2 text-left text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500",
                          h === "Sello" && "text-right"
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMessages.map((m) => (
                    <ProgressRow key={m.id} message={m} />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <RecentCampaigns />
          <LatestErrors />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-md border border-dashed border-rule bg-base-900/50 px-5 py-4">
        <div>
          <p className="text-[0.8125rem] font-semibold text-ink-200">
            ¿Listo para la próxima campaña?
          </p>
          <p className="mt-0.5 text-[0.75rem] text-ink-500">
            Selecciona destinatarios, una plantilla aprobada y arma el despacho.
          </p>
        </div>
        <span className="inline-flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<ExternalLink className="size-4" aria-hidden />}
            onClick={() => navigate("/app/campanas")}
          >
            Ir a campañas
          </Button>
          <span className="stamp stamp--pendiente">
            <Clock3 aria-hidden />
            Próximamente
          </span>
        </span>
      </div>
    </div>
  )
}