import { useState } from "react"
import { Activity, BadgeCheck, ChevronDown, Clock3, Map, MapPin, Tags, Truck, Users } from "lucide-react"

import { Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import type { Client } from "@/types"
import { useClients } from "@/features/clients/clients-store"
import { ClientChip, type ClientType } from "@/features/clients/clients-status"

import { segmentViews, viewClients, type SegmentView } from "./segmentos-data"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Cobertura", "Miembros"]

const kindIcon: Record<string, typeof MapPin> = {
  Ciudad: MapPin,
  Zona: Map,
  Tipo: Tags,
  Estado: Activity,
  Validez: BadgeCheck,
  Antigüedad: Clock3,
  Pedido: Truck,
}

const kindTone: Record<string, string> = {
  Ciudad: "stamp--sky",
  Zona: "stamp--indigo",
  Tipo: "stamp--fuchsia",
  Estado: "stamp--teal",
  Validez: "stamp--cyan",
  Antigüedad: "stamp--amber",
  Pedido: "stamp--pink",
}

function KindChip({ kind }: { kind: string }) {
  const Icon = kindIcon[kind] ?? Tags
  return (
    <span className={cn("stamp", kindTone[kind] ?? "stamp--fecha")}>
      <Icon aria-hidden />
      {kind}
    </span>
  )
}

const MAX_MEMBERS = 50

function MemberRow({ client }: { client: Client }) {
  return (
    <tr className="border-b border-rule-soft last:border-0 hover:bg-base-800/45">
      <td className="px-4 py-2.5">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{client.name}</p>
        <p className="mt-0.5 truncate text-[0.75rem] text-ink-500">{client.company}</p>
      </td>
      <td className="px-4 py-2.5 font-mono text-[0.75rem] text-ink-500">{client.phone}</td>
      <td className="px-4 py-2.5 text-[0.75rem] text-ink-500">
        {client.city}
        {client.zone && client.zone !== "—" ? ` · ${client.zone}` : ""}
      </td>
      <td className="px-4 py-2.5 text-right">
        <ClientChip clientType={client.clientType as ClientType} />
      </td>
    </tr>
  )
}

interface SegmentRowProps {
  view: SegmentView
  total: number
  expanded: boolean
  onToggle: () => void
  clients: Client[]
}

function SegmentRow({ view, total, expanded, onToggle, clients }: SegmentRowProps) {
  const members = viewClients([view], clients, view.id)
  const pct = total > 0 ? Math.round((view.members / total) * 100) : 0
  const shown = members.slice(0, MAX_MEMBERS)

  return (
    <>
      <tr
        className={cn(
          "border-b border-rule-soft transition-colors hover:bg-base-800/45",
          expanded && "bg-base-800/60"
        )}
      >
        <td className="px-4 py-3">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`seg-${view.id}`}
            onClick={onToggle}
            className="group flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex min-w-0 items-center gap-3">
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-4 shrink-0 text-ink-600 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] font-semibold text-ink-100">
                  {view.name}
                </span>
                <span className="mt-0.5 block truncate text-[0.75rem] text-ink-500">
                  {view.description}
                </span>
              </span>
            </span>
          </button>
        </td>
        <td className="px-4 py-3">
          <KindChip kind={view.kind} />
        </td>
        <td className="px-4 py-3 text-right">
          <span className="tabular-nums text-[0.8125rem] text-ink-100">
            {pct}
            <span className="text-[0.75rem] font-normal text-ink-500"> %</span>
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="tabular-nums text-[0.8125rem] font-semibold text-ink-100">
            {formatNumber(view.members)}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-base-850/60">
          <td colSpan={4} className="px-0 py-0">
            <div id={`seg-${view.id}`} className="border-b border-rule-soft">
              <div className="flex items-center gap-2 px-6 pt-3">
                <Users aria-hidden className="size-3.5 text-ink-500" />
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                  Miembros · {formatNumber(view.members)}
                </span>
              </div>
              {shown.length === 0 ? (
                <p className="px-6 py-4 text-[0.75rem] text-ink-600">
                  Este segmento no tiene clientes todavía.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto px-3 py-3">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-rule-soft">
                        {["Cliente", "Teléfono", "Ubicación", "Tipo"].map((h) => (
                          <th
                            key={h}
                            scope="col"
                            className={cn(th, h === "Tipo" && "text-right")}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((c) => (
                        <MemberRow key={c.id} client={c} />
                      ))}
                    </tbody>
                  </table>
                  {members.length > MAX_MEMBERS && (
                    <p className="px-2 pt-3 text-[0.75rem] text-ink-500">
                      …y {formatNumber(members.length - MAX_MEMBERS)} más. La lista se recorta a{" "}
                      {formatNumber(MAX_MEMBERS)} filas para este desplegable.
                    </p>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function SegmentsPage() {
  const { clients } = useClients()
  const views = segmentViews(clients)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Tags className="size-4" aria-hidden />
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Segmentos</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Agrupa clientes por ciudad, tipo (Cashless/Normal), estado del pedido, validez o
          antigüedad para envíos dirigidos. Los conteos se calculan en vivo desde la base importada.
        </p>
      </header>

      <Panel
        title="Planilla de segmentos"
        action={
          <span className="tabular-nums text-xs text-ink-500">
            {formatNumber(clients.length)} clientes · {formatNumber(views.length)} segmentos
          </span>
        }
      >
        <div className="max-h-[36rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-soft">
                {["Segmento", "Criterio", ...rightCols].map((h) => (
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
              {views.map((v) => (
                <SegmentRow
                  key={v.id}
                  view={v}
                  total={clients.length}
                  expanded={expandedId === v.id}
                  onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
                  clients={clients}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}