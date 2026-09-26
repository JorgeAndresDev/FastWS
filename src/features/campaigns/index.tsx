import { useState } from "react"
import { Plus, Send, X } from "lucide-react"

import { Button, DispatchBar, Panel, StatusStamp } from "@/components/ui"
import { formatDateShort, formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import type { Campaign } from "@/types"

import { campaignCounts, campaignSegments, deliveryProgress } from "./campaign-segments"
import { CampaignChip } from "./campaign-status"
import { useCampaigns } from "./campaigns-store"
import { CampaignWizard } from "./wizard"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Destinos", "Progreso", "Despacho", "Estado"]

const label = "text-xs font-bold uppercase tracking-[0.14em]"

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const counts = campaignCounts(campaign)
  const segments = campaignSegments(campaign)
  const shown = segments.filter((s) => s.count > 0)
  const { sellados, total, pct } = deliveryProgress(campaign, counts)

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

      {/* ── Progreso ── */}
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
    </tr>
  )
}

export function CampaignsPage() {
  const { campaigns } = useCampaigns()
  const [wizardOpen, setWizardOpen] = useState(false)

  const totals = campaigns.reduce(
    (acc, campaign) => {
      const counts = campaignCounts(campaign)
      acc.total += counts.total
      acc.procesando += counts.procesando
      acc.fallido += counts.fallido
      return acc
    },
    { total: 0, procesando: 0, fallido: 0 }
  )

  const active = campaigns.filter((c) => c.status === "EN_PROCESO").length

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Send className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro·{" "}
            <time
              dateTime={new Date().toISOString()}
              suppressHydrationWarning
              className="text-ink-400"
            >
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Campañas</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Planilla de campañas de despacho masivo: destinos, plantilla, estado y progreso de cada
          despacho.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Panel
          title="Planilla de campañas"
          action={
            <div className="flex items-center gap-3">
              <span className={`tabular-nums ${label} text-ink-500`}>
                {campaigns.length} campañas · {formatNumber(totals.total)} destinatarios ·{" "}
                {formatNumber(active)} en curso
              </span>
              <Button
                size="sm"
                variant="primary"
                icon={wizardOpen ? <X className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                onClick={() => setWizardOpen((value) => !value)}
              >
                {wizardOpen ? "Cancelar" : "Nueva campaña"}
              </Button>
            </div>
          }
        >
          <div className="max-h-[36rem] overflow-x-auto overflow-y-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-rule-soft bg-base-850 shadow-[0_1px_0_color-mix(in_oklab,var(--color-rule-soft)_60%,transparent)]">
                  {["Campaña", "Inicio", "Destinos", "Progreso", "Despacho", "Estado"].map((h) => (
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
                  <CampaignRow key={c.id} campaign={c} />
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <span className="stamp stamp--fecha stamp--container">Sin campañas</span>
                        <p className="max-w-sm text-xs leading-relaxed text-ink-500">
                          Crea tu primera campaña con una plantilla aprobada y un segmento de
                          clientes. El despacho se inicia desde la Cola.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {wizardOpen && (
          <Panel
            title="Nueva campaña"
            action={
              <span className={cn(label, "text-ink-500")}>Se guarda en borrador</span>
            }
          >
            <CampaignWizard onClose={() => setWizardOpen(false)} />
          </Panel>
        )}
      </div>
    </div>
  )
}