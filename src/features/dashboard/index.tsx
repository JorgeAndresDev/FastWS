import { useMemo, useState } from "react"
import type { DashboardStats, OutboundMessage } from "@/types"
import { useNavigate, Link } from "react-router-dom"
import {
  BarChart3,
  ExternalLink,
  HardDrive,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  TriangleAlert,
  Wifi,
} from "lucide-react"

import { Button, DispatchBar, EmptyState, Panel, StatusStamp } from "@/components/ui"
import { cn, formatNumber, formatPercent } from "@/lib/utils"

import { campaignCounts, campaignSegments, deliveryProgress } from "@/features/campaigns/campaign-segments"
import { CampaignChip } from "@/features/campaigns/campaign-status"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useClients } from "@/features/clients/clients-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { useConexion } from "@/features/connection/conexion-store"
import { hourMinute } from "@/features/reports/report-dates"

import {
  buildDashboardStats,
  buildDeliveryFunnel,
  buildOperacionPoints,
  buildUltimosErrores,
  buildUltimosMensajes,
} from "./dashboard-stats"
import { EntregaDonut, ProgressRing, TendenciaOperacion } from "./dashboard-charts"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const RANGES = [7, 14, 30] as const

function KpiCard({
  labelText,
  value,
  detail,
  tone = "muted",
}: {
  labelText: string
  value: string
  detail?: { text: string; tone?: "muted" | "danger" }
  tone?: "muted" | "danger"
}) {
  const detailText = detail?.text
  const detailTone = detail?.tone ?? tone
  return (
    <div className="panel group flex flex-col gap-1 px-4 py-3 transition-colors hover:border-rule">
      <p className={label}>{labelText}</p>
      <div className="border-t border-rule/80 pt-1.5">
        <p className="text-[1.375rem] font-bold leading-none tabular-nums tracking-tight text-ink-100">
          {value}
        </p>
      </div>
      {detailText && (
        <p
          className={cn(
            "text-xs tabular-nums",
            detailTone === "danger" && "text-fallido",
            detailTone === "muted" && "text-ink-500"
          )}
        >
          {detailText}
        </p>
      )}
    </div>
  )
}

function ProgressRow({ message }: { message: OutboundMessage }) {
  return (
    <tr className="border-b border-rule-soft transition-colors last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-2.5 text-xs tabular-nums text-ink-500">
        {message.sentAt ? hourMinute(message.sentAt) : "—"}
      </td>
      <td className="px-4 py-2.5">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{message.client}</p>
        <p className="text-xs text-ink-500">{message.campaign}</p>
      </td>
      <td className="hidden px-4 py-2.5 font-mono text-[0.75rem] text-ink-400 sm:table-cell">
        {message.phone}
      </td>
      <td className="hidden px-4 py-2.5 lg:table-cell">
        {message.metaId ? (
          <span className="font-mono text-xs text-ink-500" title={message.metaId}>
            {message.metaId.length > 30 ? `${message.metaId.slice(0, 30)}…` : message.metaId}
          </span>
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
  const { campaigns } = useCampaigns()
  const active = campaigns.find((c) => c.status === "EN_PROCESO")
  if (!active) return null

  const counts = campaignCounts(active)
  const processed = counts.total - counts.pendiente
  const progress = counts.total > 0 ? Math.round((processed / counts.total) * 100) : 0
  const segments = campaignSegments(active)

  return (
    <Panel
      title="Campaña activa"
      className="mt-6"
      action={<CampaignChip status={active.status} className="stamp--container" />}
    >
      <div className="px-5 pb-5 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-ink-100">{active.name}</h3>
            <p className="mt-0.5 truncate text-[0.75rem] text-ink-500">{active.description}</p>
            <p className="mt-2 text-sm tabular-nums text-ink-400">
              {formatNumber(processed)}{" "}
              <span className="text-ink-500">/ {formatNumber(counts.total)} procesados</span>
            </p>
          </div>
          <ProgressRing pct={progress} />
        </div>

        <DispatchBar segments={segments} total={counts.total} className="mt-4" />

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
  const { campaigns } = useCampaigns()
  const activeId = campaigns.find((c) => c.status === "EN_PROCESO")?.id
  const recent = campaigns
    .filter((c) => c.id !== activeId)
    .sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt))
    .slice(0, 5)
  return (
    <Panel title="Últimas campañas">
      <ul className="divide-y divide-rule-soft">
        {recent.map((c) => {
          const counts = campaignCounts(c)
          const { sellados, pct } = deliveryProgress(c, counts)
          return (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-semibold text-ink-100">{c.name}</p>
                <DispatchBar
                  segments={campaignSegments(c)}
                  total={counts.total}
                  size="sm"
                  className="mt-1.5"
                />
              </div>
              <div className="text-right">
                <CampaignChip status={c.status} />
                <p title={`${formatNumber(sellados)} de ${formatNumber(counts.total)} sellados`} className="mt-1 tabular-nums text-xs text-ink-500">{pct} %</p>
              </div>
            </li>
          )
        })}
        {recent.length === 0 && (
          <li className="px-5 py-4 text-xs text-ink-500">
            Todavía no hay campañas. Crea una desde el módulo Campañas.
          </li>
        )}
      </ul>
    </Panel>
  )
}

function LatestErrors({ errors }: { errors: ReturnType<typeof buildUltimosErrores> }) {
  if (errors.length === 0) return null
  return (
    <Panel title="Últimos errores" className="mt-6">
      <ul className="divide-y divide-rule-soft">
        {errors.map((e) => {
          const to = e.campanaId ? "/app/campanas" : "/app/conversaciones"
          return (
            <li key={e.id}>
              <Link
                to={to}
                className="block px-5 py-3 transition-colors hover:bg-base-800/45 focus-visible:bg-base-800/45"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-ink-100">
                    <span className="font-mono text-xs tabular-nums text-ink-500">
                      {hourMinute(e.at)}
                    </span>
                    {e.cliente}
                  </p>
                  {e.codigo && <span className="font-mono text-xs text-fallido">{e.codigo}</span>}
                </div>
                {e.mensaje && (
                  <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-400">{e.mensaje}</p>
                )}
                <p className="mt-0.5 text-xs text-ink-500">{e.campana}</p>
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function KpiStrip({ stats }: { stats: DashboardStats }) {
  const pendienteWebhook = "hasta confirmación por webhook"
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        labelText="Clientes"
        value={formatNumber(stats.clientsValid)}
        detail={{
          text: `${formatNumber(stats.clientsInvalid)} ${stats.clientsInvalid === 1 ? "inválido" : "inválidos"}`,
          tone: "danger",
        }}
      />
      <KpiCard labelText="Enviados" value={formatNumber(stats.sent)} detail={{ text: "aceptados por Meta" }} />
      <KpiCard
        labelText="Recibidos"
        value={formatNumber(stats.delivered)}
        detail={{ text: stats.delivered > 0 ? `${formatPercent(stats.deliveryRate)} de entrega` : pendienteWebhook }}
      />
      <KpiCard
        labelText="Fallidos"
        value={formatNumber(stats.failed)}
        detail={{ text: "requieren revisión", tone: "danger" }}
      />
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { clients } = useClients()
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()
  const { status: conexionStatus, verifiedAt, token } = useConexion()

  const [range, setRange] = useState<number>(14)

  const stats = useMemo(
    () => buildDashboardStats({ clientes: clients, campañas: campaigns, threads }),
    [clients, campaigns, threads]
  )

  const funnel = useMemo(() => buildDeliveryFunnel(campaigns), [campaigns])
  const errores = useMemo(() => buildUltimosErrores(campaigns, threads), [campaigns, threads])
  const recientes = useMemo(
    () => buildUltimosMensajes(campaigns, threads),
    [campaigns, threads]
  )
  const puntos = useMemo(
    () => buildOperacionPoints(campaigns, threads, range),
    [campaigns, threads, range]
  )
  const hoy = puntos.at(-1)

  const connected = conexionStatus === "conectada" && Boolean(token)
  const tieneDemo = threads.some((t) => t.origin === "demo")

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">Planilla general</h1>
          <p className="mt-1 text-[0.8125rem] text-ink-400">
            Así va la operación de este equipo · datos locales de clientes, campañas y
            conversaciones
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button
            size="sm"
            variant="secondary"
            icon={<RefreshCw className="size-3.5" aria-hidden />}
            onClick={() => navigate("/app/sincronizacion")}
          >
            Sincronización · Local solamente
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {connected ? (
          <span className="stamp stamp--proceso stamp--container">
            <Wifi aria-hidden />
            Meta conectada{verifiedAt ? ` · ${hourMinute(verifiedAt)}` : ""}
          </span>
        ) : (
          <span className="stamp stamp--pendiente stamp--container">
            <Wifi aria-hidden />
            Meta sin conexión
          </span>
        )}
        <span className="stamp stamp--fecha stamp--container">
          <HardDrive aria-hidden />
          Local solamente
        </span>
        {tieneDemo && (
          <span className="stamp stamp--pendiente stamp--container">
            <Sparkles aria-hidden />
            Demo excluida de las cifras
          </span>
        )}
        {hoy && hoy.enviados + hoy.errores > 0 && (
          <>
            <span className="stamp stamp--proceso stamp--container">
              <Send aria-hidden />
              Hoy {formatNumber(hoy.enviados)} enviados
            </span>
            {hoy.errores > 0 && (
              <span className="stamp stamp--fallido stamp--container">
                <TriangleAlert aria-hidden />
                {formatNumber(hoy.errores)} {hoy.errores === 1 ? "error" : "errores"}
              </span>
            )}
          </>
        )}
      </div>

      <ActiveCampaignPanel />

      <KpiStrip stats={stats} />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Panel
            title="Entrega de mensajes"
            action={
              <span className="stamp stamp--fecha stamp--container">
                <BarChart3 aria-hidden />
                Total {formatNumber(funnel.total)}
              </span>
            }
          >
            <EntregaDonut funnel={funnel} />
            <p
              role="note"
              className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-500"
            >
              Entregado y leído dependen de los webhooks de Meta (fase backend): sus tarjetas dicen
              «hasta confirmación por webhook» y los aceptados se muestran «en tránsito».
            </p>
          </Panel>
        </div>

        <div className="lg:col-span-3">
          <Panel
            title="Actividad reciente"
            action={
              <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Rango de días">
                {RANGES.map((days) => (
                  <button
                    key={days}
                    type="button"
                    role="tab"
                    aria-selected={range === days}
                    onClick={() => setRange(days)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                      range === days
                        ? "border-rule bg-base-750 text-ink-100"
                        : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
                    )}
                  >
                    {days} días
                  </button>
                ))}
              </div>
            }
          >
            <div key={range} className="chart-swap">
              <TendenciaOperacion points={puntos} />
            </div>
          </Panel>
        </div>
      </div>

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
                  {recientes.map((m) => (
                    <ProgressRow key={m.id} message={m} />
                  ))}
                  {recientes.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          label="Sin mensajes"
                          icon={MessageSquare}
                          className="py-12"
                          note="Los mensajes aparecen cuando una campaña ha sido despachada desde la Cola."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="lg:col-span-2">
          <RecentCampaigns />
          <LatestErrors errors={errores} />
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
        <Button
          variant="primary"
          icon={<ExternalLink className="size-4" aria-hidden />}
          onClick={() => navigate("/app/campanas")}
        >
          Ir a campañas
        </Button>
      </div>

      <p role="note" className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-600">
        Cifras locales de este equipo. Las tarjetas con «hasta confirmación por webhook» se
        completan cuando llegue la confirmación de Meta (fase backend). Las conversaciones de muestra
        (demo) se excluyen de todas las métricas; un mensaje solo se cuenta como entregado con
        confirmación de origen.
      </p>
    </div>
  )
}