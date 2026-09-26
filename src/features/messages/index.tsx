import { useMemo, useState } from "react"
import { MessageSquare } from "lucide-react"

import { DispatchBar, Panel, StatusStamp } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import type { OutboundMessage } from "@/types"

import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { messageTotals } from "./messages-segments"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Hora", "ID Meta", "Error", "Estado"]

const label = "text-xs font-bold uppercase tracking-[0.14em]"

function shortId(id?: string, max = 30) {
  if (!id) return "—"
  return id.length > max ? `${id.slice(0, max)}…` : id
}

function formatTime(iso?: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("es-CO", { hour12: false })
}

function MessagesRow({ message }: { message: OutboundMessage }) {
  return (
    <tr className="border-b border-rule-soft transition-colors last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{message.client}</p>
        <p className="mt-0.5 truncate font-mono text-[0.75rem] text-ink-500">
          {message.campaign}
        </p>
      </td>
      <td className="px-4 py-3 font-mono text-[0.75rem] text-ink-500">{message.phone}</td>

      {/* ── Hora ── */}
      <td className="px-4 py-3 text-right tabular-nums font-mono text-[0.75rem] text-ink-500">
        {formatTime(message.sentAt)}
      </td>

      {/* ── ID Meta ── */}
      <td className="px-4 py-3">
        <span className="font-mono text-[0.75rem] text-ink-500" title={message.metaId}>
          {shortId(message.metaId)}
        </span>
      </td>

      {/* ── Error ── */}
      <td className="px-4 py-3">
        {message.status === "FALLIDO" ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.75rem] font-semibold text-fallido">
              {message.errorCode}
            </span>
            <span className="max-w-[16rem] truncate text-[0.75rem] text-fallido/80">
              {message.errorMessage}
            </span>
          </div>
        ) : (
          <span className="text-xs text-ink-600">—</span>
        )}
      </td>

      {/* ── Estado ── */}
      <td className="px-4 py-3 text-right">
        <StatusStamp status={message.status} />
      </td>
    </tr>
  )
}

export function MessagesPage() {
  const { campaigns } = useCampaigns()
  const [campaignFilter, setCampaignFilter] = useState("")

  const rows = useMemo<OutboundMessage[]>(
    () =>
      campaigns.flatMap((campaign) =>
        campaign.recipients.map((recipient, index) => ({
          id: `${campaign.id}-${index}`,
          client: recipient.name,
          phone: recipient.phone.replace(/^57/, ""),
          campaign: campaign.name,
          status: recipient.status,
          metaId: recipient.metaId,
          errorCode: recipient.errorCode,
          errorMessage: recipient.errorMessage,
          sentAt: recipient.sentAt ?? "",
        }))
      ),
    [campaigns]
  )

  const visible = useMemo(
    () =>
      campaignFilter
        ? rows.filter((message) => message.campaign === campaignFilter)
        : rows,
    [rows, campaignFilter]
  )

  const totals = messageTotals(visible)

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <MessageSquare className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning>
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Mensajes</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Estados individuales por mensaje, IDs de Meta, errores legibles y trazabilidad completa
          de cada envío.
        </p>
      </header>

      <Panel
        title="Planilla de mensajes"
        action={
          <div className="flex items-center gap-4">
            <div className="w-56">
              <DispatchBar segments={totals.shown} total={totals.total} size="sm" />
            </div>
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {formatNumber(totals.total)} mensajes · {formatNumber(totals.errores)} con error
            </span>
          </div>
        }
      >
        <div className="flex items-center gap-3 border-b border-rule-soft px-4 py-3">
          <label className={cn(label, "text-ink-500")} htmlFor="mensajes-campana">
            Campaña
          </label>
          <select
            id="mensajes-campana"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="h-8 rounded-md border border-rule bg-base-800 px-2 text-sm text-ink-100"
          >
            <option value="">Todas</option>
            {Array.from(new Map(campaigns.map((campaign) => [campaign.name, campaign])).values()).map(
              (campaign) => (
                <option key={campaign.id} value={campaign.name}>
                  {campaign.name}
                </option>
              )
            )}
          </select>
        </div>

        <div className="max-h-[36rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-soft">
                {["Destino", "Teléfono", ...rightCols].map((h) => (
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
              {visible.map((message) => (
                <MessagesRow key={message.id} message={message} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                      <span className="stamp stamp--fecha stamp--container">Sin mensajes</span>
                      <p className="max-w-sm text-xs leading-relaxed text-ink-500">
                        Los mensajes aparecen cuando una campaña ha sido despachada desde la Cola.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}