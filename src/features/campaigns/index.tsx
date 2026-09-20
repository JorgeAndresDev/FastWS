import { Send } from "lucide-react"

import { DispatchBar, Panel, StatusStamp } from "@/components/ui"
import { formatDateShort, formatDateStamp } from "@/app/date-stamp"
import { campaigns } from "@/lib/mock/data"
import { cn, formatNumber } from "@/lib/utils"

import { campaignSegments } from "./campaign-segments"
import { CampaignChip } from "./campaign-status"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Destinos", "Despacho", "Estado"]

const label = "text-xs font-bold uppercase tracking-[0.14em]"

function CampaignRow({ campaign }: { campaign: (typeof campaigns)[number] }) {
  const segments = campaignSegments(campaign)
  const shown = segments.filter((s) => s.count > 0)
  const processed = campaign.total - campaign.pendiente
  const pct = campaign.total > 0 ? Math.round((processed / campaign.total) * 100) : 0

  return (
    <tr className="border-b border-rule-soft transition-colors last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{campaign.name}</p>
        <p className="mt-0.5 truncate font-mono text-[0.75rem] text-ink-500">{campaign.template}</p>
      </td>
      <td className="px-4 py-3 font-mono text-[0.75rem] text-ink-500">
        {campaign.startedAt ? formatDateShort(campaign.startedAt) : "—"}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-[0.8125rem] text-ink-100">
        {formatNumber(campaign.total)}
      </td>
      <td className="px-4 py-3">
        <div className="w-44">
          <DispatchBar segments={segments} total={campaign.total} />
          <p className="mt-1 text-right tabular-nums text-xs text-ink-500">{pct} %</p>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {shown.length > 0 ? (
          <div className="flex justify-end">
            <div className="flex max-w-60 flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
              {shown.map((s) => (
                <span key={s.status} className="inline-flex items-center gap-1">
                  <StatusStamp status={s.status} />
                  <span className="tabular-nums text-xs text-ink-400">{formatNumber(s.count)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-xs text-ink-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <CampaignChip status={campaign.status} />
      </td>
    </tr>
  )
}

export function CampaignsPage() {
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.total += c.total
      acc.entregado += c.entregado
      acc.leido += c.leido
      acc.fallido += c.fallido
      return acc
    },
    { total: 0, entregado: 0, leido: 0, fallido: 0 }
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

      <Panel
        title="Planilla de campañas"
        action={
          <span className={`tabular-nums ${label} text-ink-500`}>
            {campaigns.length} campañas · {formatNumber(totals.total)} destinatarios ·{" "}
            {formatNumber(active)} en curso
          </span>
        }
      >
        <div className="max-h-[36rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-soft">
                {["Campaña", "Inicio", "Destinos", "Planilla", "Despacho", "Estado"].map((h) => (
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
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}