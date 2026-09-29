import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Ban, Inbox, ListOrdered, Pause, Play, Settings, X } from "lucide-react"

import { Button, DispatchBar, EmptyState, Panel, StatusStamp } from "@/components/ui"
import { formatDateShort, formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import type { Campaign } from "@/types"

import { campaignCounts, campaignSegments, deliveryProgress } from "@/features/campaigns/campaign-segments"
import { CampaignChip } from "@/features/campaigns/campaign-status"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { queueTotals } from "./queue-segments"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Inicio", "Destinos", "Progreso", "Despacho", "Estado", "Control"]

const label = "text-xs font-bold uppercase tracking-[0.14em]"

interface QueueRowProps {
  campaign: Campaign
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}

function QueueRow({ campaign, onStart, onPause, onResume, onCancel }: QueueRowProps) {
  const counts = campaignCounts(campaign)
  const segments = campaignSegments(campaign)
  const shown = segments.filter((s) => s.count > 0)
  const { sellados, total, pct } = deliveryProgress(campaign, counts)

  const borrador = campaign.status === "BORRADOR"
  const despachando = campaign.status === "EN_PROCESO"
  const pausada = campaign.status === "PAUSADA" || campaign.status === "CON_ERROR"
  const cerrada = campaign.status === "FINALIZADA" || campaign.status === "CANCELADA"

  return (
    <tr className="border-b border-rule-soft transition-colors last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{campaign.name}</p>
        <p className="mt-0.5 truncate font-mono text-[0.75rem] text-ink-500">
          {campaign.template.name}
        </p>
      </td>
      <td className="px-4 py-3 font-mono text-[0.75rem] text-ink-500">
        {campaign.startedAt ? formatDateShort(campaign.startedAt) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-[0.8125rem] text-ink-100">
        {formatNumber(counts.total)}
      </td>

      {/* ── Progreso del lote ── */}
      <td className="px-4 py-3">
        <div className="min-w-44">
          <DispatchBar segments={segments} total={counts.total} size="sm" />
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="tabular-nums text-[0.8125rem] font-semibold text-ink-100">
              {pct}
              <span className="text-[0.75rem] font-normal text-ink-500"> %</span>
            </span>
            <span className="tabular-nums font-mono text-[0.75rem] text-ink-500">
              {formatNumber(sellados)}/{formatNumber(total)}
            </span>
          </div>
        </div>
      </td>

      {/* ── Despacho ── */}
      <td className="px-4 py-3 text-right">
        {shown.length > 0 ? (
          <div className="flex justify-end">
            <div className="flex flex-col gap-1.5">
              {shown.map((segment) => (
                <div key={segment.status} className="flex items-center justify-end gap-3">
                  <StatusStamp status={segment.status} />
                  <span className="min-w-[3.5rem] text-right tabular-nums font-mono text-xs text-ink-300">
                    {formatNumber(segment.count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-xs text-ink-600">—</span>
        )}
      </td>

      {/* ── Estado ── */}
      <td className="px-4 py-3 text-right">
        <CampaignChip status={campaign.status} />
      </td>

      {/* ── Control ── */}
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          {borrador ? (
            <Button size="sm" variant="primary" icon={<Play className="size-3.5" aria-hidden />} onClick={onStart}>
              Iniciar
            </Button>
          ) : despachando ? (
            <Button size="sm" variant="secondary" icon={<Pause className="size-3.5" aria-hidden />} onClick={onPause}>
              Pausar
            </Button>
          ) : pausada ? (
            <Button size="sm" variant="primary" icon={<Play className="size-3.5" aria-hidden />} onClick={onResume}>
              Reanudar
            </Button>
          ) : null}
          {!cerrada && !borrador && (
            <Button size="sm" variant="danger" icon={<Ban className="size-3.5" aria-hidden />} onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function QueuePage() {
  const navigate = useNavigate()
  const { campaigns, velocidad, iniciar, pausar, reanudar, cancelar } = useCampaigns()
  const [confirmStart, setConfirmStart] = useState<Campaign | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Campaign | null>(null)

  const totals = queueTotals(campaigns)

  const closeConfirm = () => setConfirmStart(null)
  const closeConfirmCancel = () => setConfirmCancel(null)
  const doStart = () => {
    if (confirmStart && iniciar(confirmStart.id)) setConfirmStart(null)
  }
  const doCancel = () => {
    if (confirmCancel) cancelar(confirmCancel.id)
    setConfirmCancel(null)
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <ListOrdered className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Despacho·{" "}
            <time
              dateTime={new Date().toISOString()}
              suppressHydrationWarning
              className="text-ink-400"
            >
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Cola de envíos</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Despacho por lotes de campaña: cada fila es el envío de una campaña, con su progreso y
          controles de inicio, pausa, reanudación y cancelación. La velocidad es global para el
          número: el límite de Meta se mide por teléfono.
        </p>
      </header>

      <Panel
        title="Planilla de la cola"
        action={
          <div className="flex items-center gap-3">
            <span className={cn(label, "text-ink-500")}>
              Velocidad · <span className="tabular-nums text-ink-100">{velocidad}</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              icon={<Settings className="size-4" aria-hidden />}
              onClick={() => navigate("/app/configuracion")}
            >
              Configuración
            </Button>
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {formatNumber(totals.despachando)} despachando · {formatNumber(totals.pausadas)}{" "}
              pausadas · {formatNumber(totals.enCola)} en cola
            </span>
          </div>
        }
      >
        <div className="max-h-[36rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-rule-soft bg-base-850 shadow-[0_1px_0_color-mix(in_oklab,var(--color-rule-soft)_60%,transparent)]">
                {["Campaña", ...rightCols].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(th, rightCols.includes(h) && "text-right")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <QueueRow
                  key={c.id}
                  campaign={c}
                  onStart={() => setConfirmStart(c)}
                  onPause={() => pausar(c.id)}
                  onResume={() => reanudar(c.id)}
                  onCancel={() => setConfirmCancel(c)}
                />
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      label="Cola vacía"
                      icon={Inbox}
                      note="Crea una campaña desde el módulo Campañas para que aparezca aquí y puedas iniciar su despacho."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {confirmStart && (
        <div
            className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-inicio-titulo"
          onKeyDown={(e) => e.key === "Escape" && closeConfirm()}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-inicio-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                Iniciar despacho
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cerrar"
                icon={<X className="size-3.5" aria-hidden />}
                onClick={closeConfirm}
              />
            </header>
            <div className="px-5 py-5">
              <p className="text-base font-semibold text-ink-100">{confirmStart.name}</p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-500">Destinatarios</dt>
                  <dd className="tabular-nums text-ink-100">
                    {formatNumber(campaignCounts(confirmStart).total)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-500">Velocidad</dt>
                  <dd className="tabular-nums text-ink-100">{velocidad}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-ink-500">Horario</dt>
                  <dd className="text-ink-100">Empieza ahora</dd>
                </div>
              </dl>
              <p className="mt-4 max-w-sm leading-relaxed text-xs text-ink-500">
                La campaña entra a la cola del número y comienza a enviar de inmediato hasta alcanzar
                la velocidad fijada. Podrás pausarla o reanudarla desde esta misma fila.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-4">
              <Button size="sm" variant="secondary" onClick={closeConfirm}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<Play className="size-3.5" aria-hidden />}
                onClick={doStart}
                autoFocus
              >
                Iniciar despacho
              </Button>
            </footer>
          </div>
        </div>
      )}
      {confirmCancel && (
        <div
            className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-cancelacion-titulo"
          onKeyDown={(e) => e.key === "Escape" && closeConfirmCancel()}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-cancelacion-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                Cancelar campaña
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cerrar"
                icon={<X className="size-3.5" aria-hidden />}
                onClick={closeConfirmCancel}
              />
            </header>
            <div className="px-5 py-5">
              <p className="text-base font-semibold text-ink-100">{confirmCancel.name}</p>
              <p className="mt-4 max-w-sm leading-relaxed text-xs text-ink-500">
                Se detiene el despacho y las filas pendientes quedan marcadas como canceladas en la
                planilla. Esta acción se registra en la bitácora de auditoría.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-4">
              <Button size="sm" variant="secondary" onClick={closeConfirmCancel}>
                Volver
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Ban className="size-3.5" aria-hidden />}
                onClick={doCancel}
                autoFocus
              >
                Cancelar campaña
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}