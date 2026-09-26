import { useMemo, useState } from "react"
import {
  BarChart3,
  CalendarClock,
  Download,
  LayoutGrid,
  ListFilter,
  Printer,
  Search,
  Send,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react"

import { Button, DispatchBar, Panel, StatusStamp } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import type { CampaignStatus, ConversationThread } from "@/types"

import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { CampaignChip } from "@/features/campaigns/campaign-status"
import { campaignCounts } from "@/features/campaigns/campaign-segments"
import { useClients } from "@/features/clients/clients-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { conversationCounts } from "@/features/conversations/conversation-segments"
import { EventChip } from "@/features/history/history-status"

import { TendenciaChart } from "./report-charts"
import { exportCsv, printReport } from "./report-export"
import { dayLabel, hourMinute } from "./report-dates"
import {
  applyReportFilter,
  buildDayPoints,
  buildReportMessages,
  esAceptado,
  esFallido,
  statusCounts,
  type ReportMessage,
  type ReportOrigin,
} from "./report-records"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em]"

type TabKey = "resumen" | "dia" | "campana" | "estado" | "cliente" | "usuario"

const TABS: Array<{ key: TabKey; label: string; icon: typeof LayoutGrid }> = [
  { key: "resumen", label: "Resumen", icon: LayoutGrid },
  { key: "dia", label: "Por día", icon: TrendingUp },
  { key: "campana", label: "Por campaña", icon: Send },
  { key: "estado", label: "Por estado", icon: ListFilter },
  { key: "cliente", label: "Por cliente", icon: Users },
  { key: "usuario", label: "Por usuario", icon: UserRound },
]

type PeriodKey = "todo" | "hoy" | "7d" | "30d" | "custom"

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "todo", label: "Todo" },
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "custom", label: "Rango" },
]

const ORIGINS: Array<{ key: ReportOrigin; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "campana", label: "Campaña" },
  { key: "respuesta", label: "Respuestas" },
  { key: "demo", label: "Ejemplos" },
]

function rangeFor(
  periodo: PeriodKey,
  desde: string,
  hasta: string
): { desde?: string; hasta?: string } {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  switch (periodo) {
    case "todo":
      return {}
    case "hoy":
      return { desde: start.toISOString() }
    case "7d":
      start.setDate(start.getDate() - 6)
      return { desde: start.toISOString() }
    case "30d":
      start.setDate(start.getDate() - 29)
      return { desde: start.toISOString() }
    case "custom": {
      // Un rango invertido se invierte en vez de devolver un reporte vacío sin explicación.
      const [ini, fin] = desde && hasta && desde > hasta ? [hasta, desde] : [desde, hasta]
      return {
        desde: ini ? new Date(`${ini}T00:00:00`).toISOString() : undefined,
        hasta: fin ? new Date(`${fin}T23:59:59.999`).toISOString() : undefined,
      }
    }
  }
}

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
  const tone = detail?.tone ?? detailTone
  return (
    <div className="panel flex flex-col gap-2 px-4 py-3">
      <p className={cn(label, "text-ink-500")}>{labelText}</p>
      <p className="text-[1.375rem] font-bold tabular-nums tracking-tight text-ink-100">{value}</p>
      {detail && (
        <p
          className={cn(
            "text-xs tabular-nums",
            tone === "danger" ? "text-fallido" : "text-ink-500"
          )}
        >
          {detail.text}
        </p>
      )}
    </div>
  )
}

const th = cn(label, "px-4 py-2 text-left text-ink-500")
const td = "px-4 py-2.5"

function ResumenView({
  rows,
  threads,
}: {
  rows: ReportMessage[]
  threads: ConversationThread[]
}) {
  const { campaigns } = useCampaigns()
  const { clients } = useClients()

  const counts = statusCounts(rows.filter((r) => r.tipo !== "ejemplo"))
  const enviados = rows.filter((r) => r.tipo === "mensaje" && esAceptado(r)).length
  const fallidos = rows.filter((r) => esFallido(r)).length
  const respuestas = rows.filter((r) => r.tipo === "respuesta").length
  const ejemplos = rows.filter((r) => r.tipo === "ejemplo").length
  const reales = threads.filter((t) => t.origin !== "demo")
  const conv = conversationCounts(reales)

  const validos = clients.filter((c) => c.valid).length
  const invalidos = clients.length - validos

  const campañasPorEstado = useMemo(() => {
    const by: Record<CampaignStatus, number> & { total: number } = {
      BORRADOR: 0,
      PROGRAMADA: 0,
      EN_PROCESO: 0,
      PAUSADA: 0,
      FINALIZADA: 0,
      CANCELADA: 0,
      CON_ERROR: 0,
      total: campaigns.length,
    }
    for (const campaign of campaigns) by[campaign.status]++
    return by
  }, [campaigns])

  const activas = campañasPorEstado.EN_PROCESO

  const segments = [
    { status: "FALLIDO" as const, count: counts.FALLIDO },
    { status: "LEIDO" as const, count: counts.LEIDO },
    { status: "ENTREGADO" as const, count: counts.ENTREGADO },
    { status: "PROCESO" as const, count: counts.PROCESO },
    { status: "PENDIENTE" as const, count: counts.PENDIENTE },
    { status: "CANCELADO" as const, count: counts.CANCELADO },
  ].filter((segment) => segment.count > 0)

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          labelText="Clientes"
          value={formatNumber(validos)}
          detail={{ text: `${formatNumber(invalidos)} inválidos`, tone: "danger" }}
        />
        <KpiCard
          labelText="Campañas"
          value={formatNumber(campañasPorEstado.total)}
          detail={{ text: `${activas} en proceso` }}
        />
        <KpiCard labelText="Enviados" value={formatNumber(enviados)} detail={{ text: "aceptados por Meta" }} />
        <KpiCard
          labelText="Entregados"
          value={formatNumber(counts.ENTREGADO + counts.LEIDO)}
          detail={{ text: "0 hasta webhooks" }}
        />
        <KpiCard
          labelText="Fallidos"
          value={formatNumber(fallidos)}
          detail={{ text: "requieren revisión", tone: "danger" }}
        />
        <KpiCard
          labelText="Respondidos"
          value={formatNumber(respuestas)}
          detail={{ text: `${conv.respondidas} hilos marcados` }}
        />
        <KpiCard
          labelText="Ejemplos"
          value={formatNumber(ejemplos)}
          detail={{ text: "demo, sin contar" }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Campañas por estado">
          <div className="max-h-80 overflow-y-auto">
            {campaigns.length > 0 ? (
              <ul className="divide-y divide-rule-soft">
                {campaigns.map((campaign) => (
                  <li key={campaign.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8125rem] font-semibold text-ink-100">
                        {campaign.name}
                      </p>
                      <p className="truncate text-xs text-ink-500">
                        {formatNumber(campaignCounts(campaign).total)} destinatarios
                      </p>
                    </div>
                    <CampaignChip status={campaign.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-xs text-ink-500">
                Todavía no hay campañas. Créalas desde el módulo Campañas.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Mensajes por estado"
          action={
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {formatNumber(counts.PROCESO + counts.PENDIENTE + counts.ENTREGADO + counts.LEIDO + counts.FALLIDO + counts.CANCELADO)} envíos
            </span>
          }
        >
          <div className="px-5 py-4">
            <DispatchBar segments={segments} total={rows.length} />
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {segments.map((segment) => (
                <StatusStamp key={segment.status} status={segment.status} />
              ))}
            </div>
            {counts.ENTREGADO + counts.LEIDO === 0 && (
              <p role="note" className="mt-4 text-xs leading-relaxed text-ink-500">
                Los recibos de entrega y lectura llegarán con los webhooks de Meta (fase Tauri).
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Conversaciones">
          <ul className="divide-y divide-rule-soft">
            {[
              { label: "Respondidas", value: conv.respondidas, tone: "text-entregado" },
              { label: "Pendientes", value: conv.pendientes, tone: "text-ink-300" },
              { label: "Con error", value: conv.conError, tone: "text-fallido" },
              { label: "Hilos demo", value: threads.length - reales.length, tone: "text-ink-500" },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between px-5 py-2.5 text-[0.8125rem]"
              >
                <span className="text-ink-400">{row.label}</span>
                <span className={cn("font-semibold tabular-nums", row.tone)}>
                  {formatNumber(row.value)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function DiaView({ rows }: { rows: ReportMessage[] }) {
  const points = useMemo(() => buildDayPoints(rows), [rows])
  return (
    <Panel title="Tendencia diaria">
      {points.length > 0 ? (
        <div className="px-5 py-4">
          <TendenciaChart points={points} />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse"> 
              <thead>
                <tr className="border-b border-rule-soft">
                  {["Día", "Enviados", "Fallidos", "Respuestas"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className={cn(th, h !== "Día" && "text-right")}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.map((point) => (
                  <tr
                    key={point.key}
                    className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
                  >
                    <td className={td}>
                      <p className="text-[0.8125rem] font-semibold text-ink-100">{point.dia}</p>
                      <p className="text-xs capitalize text-ink-500">{dayLabelFor(point.key)}</p>
                    </td>
                    <td className={cn(td, "text-right tabular-nums text-entregado")}>
                      {formatNumber(point.enviados)}
                    </td>
                    <td className={cn(td, "text-right tabular-nums text-fallido")}>
                      {formatNumber(point.fallidos)}
                    </td>
                    <td className={cn(td, "text-right tabular-nums text-proceso")}>
                      {formatNumber(point.respuestas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState note="El registro diario aparece cuando hay envíos o respuestas en el periodo." />
      )}
    </Panel>
  )
}

function dayLabelFor(key: string) {
  return dayLabel(key.replace(/(^\d+)-(\d+)-(\d+)/, (_, y: string, m: string, d: string) => `${y}-${m}-${d}T12:00:00`))
}

function CampanaView({ rows }: { rows: ReportMessage[] }) {
  const { campaigns } = useCampaigns()

  const byCampaign = useMemo(() => {
    const map = new Map<
      string,
      { enviados: number; fallidos: number; respuestas: number; ultima?: string }
    >()
    for (const row of rows) {
      if (row.tipo === "ejemplo") continue
      const key = row.campanaId ?? "__sin"
      let acc = map.get(key)
      if (!acc) map.set(key, (acc = { enviados: 0, fallidos: 0, respuestas: 0 }))
      if (esFallido(row)) acc.fallidos++
      else if (esAceptado(row)) row.tipo === "respuesta" ? acc.respuestas++ : acc.enviados++
      if (!acc.ultima || row.fecha > acc.ultima) acc.ultima = row.fecha
    }
    return map
  }, [rows])

  return (
    <Panel
      title="Actividad por campaña"
      action={
        <span className={cn(label, "hidden text-ink-500 sm:inline")}>
          En el periodo seleccionado
        </span>
      }
    >
      <div className="max-h-[38rem] overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-soft">
              {["Campaña", "Estado", "Inicio", "Despachó", "Enviados", "Fallidos", "Respuestas", "% aceptado"].map(
                (h) => (
                  <th key={h} scope="col" className={cn(th, h !== "Campaña" && "text-right")}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const acc = byCampaign.get(campaign.id)
              const totals = campaignCounts(campaign)
              const considerados = (acc?.enviados ?? 0) + (acc?.fallidos ?? 0) + (acc?.respuestas ?? 0)
              const pct = considerados > 0 ? Math.round(((acc?.enviados ?? 0) / considerados) * 100) : 0
              return (
                <tr
                  key={campaign.id}
                  className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
                >
                  <td className={td}>
                    <p className="text-[0.8125rem] font-semibold text-ink-100">{campaign.name}</p>
                    <p className="text-xs text-ink-500">{campaign.template.name}</p>
                  </td>
                  <td className={td}><CampaignChip status={campaign.status} /></td>
                  <td className={cn(td, "font-mono text-[0.75rem] tabular-nums text-ink-500")}>
                    {campaign.startedAt ? hourMinute(campaign.startedAt) : "—"}
                  </td>
                  <td className={td}>
                    {campaign.dispatchedBy ? (
                      <p className="text-xs text-ink-500">
                        {campaign.dispatchedBy.usuario}
                        <span className="text-ink-600"> · {campaign.dispatchedBy.dispositivo}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-ink-600">Sin atribución</p>
                    )}
                  </td>
                  <td className={cn(td, "text-right tabular-nums text-ink-100")}>
                    {formatNumber(acc?.enviados ?? 0)}
                    <span className="block text-[0.75rem] text-ink-600">de {formatNumber(totals.total)}</span>
                  </td>
                  <td className={cn(td, "text-right tabular-nums text-fallido")}>
                    {formatNumber(acc?.fallidos ?? 0)}
                  </td>
                  <td className={cn(td, "text-right tabular-nums text-proceso")}>
                    {formatNumber(acc?.respuestas ?? 0)}
                  </td>
                  <td className={cn(td, "text-right tabular-nums text-ink-300")}>{pct} %</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <EmptyState note="Crea y despacha campañas desde el módulo Campañas para ver su actividad aquí." />
        )}
      </div>
    </Panel>
  )
}

function EstadoView({ rows }: { rows: ReportMessage[] }) {
  const both = rows.filter((r) => r.tipo !== "ejemplo")
  const counts = statusCounts(both)
  const segments = campaignSegmentsFromCounts(counts)
  const errores = both.filter(esFallido)

  return (
    <div className="grid gap-4">
      <Panel
        title="Distribución por estado"
        action={
          <span className={cn(label, "tabular-nums text-ink-500")}>
            {formatNumber(both.length)} registros · {formatNumber(counts.FALLIDO)} fallidos
          </span>
        }
      >
        <div className="px-5 py-4">
          <DispatchBar segments={segments} total={both.length} />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(counts).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-md border border-rule-soft bg-base-800/40 px-3 py-2"
              >
                <StatusStamp status={status as ReportMessage["estado"]} />
                <span className="tabular-nums text-sm font-semibold text-ink-100">
                  {formatNumber(count)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Detalle del periodo">
        <div className="max-h-[32rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-soft">
                {["Registro", "Fecha", "Destino", "Campaña", "Estado", "ID Meta", "Error"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(th, h !== "Registro" && "text-right")}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
                >
                  <td className={td}>
                    <RowKindTipo row={row} />
                  </td>
                  <td className={cn(td, "font-mono text-[0.75rem] tabular-nums text-ink-500")}>
                    {row.fecha.slice(0, 10)} {hourMinute(row.fecha)}
                  </td>
                  <td className={td}>
                    <p className="text-[0.8125rem] font-semibold text-ink-100">{row.cliente ?? "—"}</p>
                    <p className="font-mono text-xs text-ink-500">{row.telefono ?? ""}</p>
                  </td>
                  <td className={cn(td, "text-xs text-ink-500")}>{row.campana ?? "—"}</td>
                  <td className={cn(td, "text-right")}>
                    {row.tipo === "ejemplo" ? (
                      <EventChip tipo="ejemplo" />
                    ) : (
                      <StatusStamp status={row.estado} />
                    )}
                  </td>
                  <td className={cn(td, "font-mono text-[0.75rem] text-ink-500")}>
                    {row.wamid ? shortId(row.wamid) : "—"}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {row.errorCode ? (
                      <span className="font-mono text-xs font-semibold text-fallido">
                        {row.errorCode}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState note="No hay registros que coincidan con los filtros del periodo." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {errores.length > 0 && (
        <Panel title="Errores recientes">
          <ul className="divide-y divide-rule-soft">
            {errores.slice(0, 8).map((row) => (
              <li key={row.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.8125rem] font-semibold text-ink-100">
                    {row.cliente ?? row.telefono}
                  </p>
                  <span className="font-mono text-xs text-fallido">{row.errorCode}</span>
                </div>
                <p className="mt-0.5 text-[0.75rem] leading-relaxed text-ink-400">
                  {row.errorMessage}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{row.campana}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}

function ClienteView({ rows }: { rows: ReportMessage[] }) {
  const byClient = useMemo(() => {
    const map = new Map<
      string,
      {
        persona: string
        telefono: string
        mensajes: number
        ok: number
        fallidos: number
        respuestas: number
        campanas: Set<string>
        ultima: string
      }
    >()
    for (const row of rows) {
      if (row.tipo === "ejemplo") continue
      const persona = row.cliente ?? row.telefono ?? "Desconocido"
      const key = `${persona}::${row.telefono ?? ""}`
      let acc = map.get(key)
      if (!acc) {
        acc = {
          persona,
          telefono: row.telefono ?? "",
          mensajes: 0,
          ok: 0,
          fallidos: 0,
          respuestas: 0,
          campanas: new Set(),
          ultima: row.fecha,
        }
        map.set(key, acc)
      }
      if (row.tipo === "mensaje") {
        acc.mensajes++
        if (esFallido(row)) acc.fallidos++
        else if (esAceptado(row)) acc.ok++
      } else {
        acc.respuestas++
      }
      if (row.campana) acc.campanas.add(row.campana)
      if (row.fecha > acc.ultima) acc.ultima = row.fecha
    }
    return [...map.values()].sort((a, b) => b.mensajes + b.respuestas - (a.mensajes + a.respuestas))
  }, [rows])

  return (
    <Panel
      title="Actividad por cliente"
      action={
        <span className={cn(label, "tabular-nums text-ink-500")}>
          {formatNumber(byClient.length)} clientes
        </span>
      }
    >
      <div className="max-h-[38rem] overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-soft">
              {["Cliente", "Teléfono", "Envíos", "Aceptados", "Fallidos", "Respuestas", "Campañas", "Último"].map(
                (h) => (
                  <th key={h} scope="col" className={cn(th, h === "Cliente" && "pl-5")}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {byClient.map((row) => (
              <tr
                key={`${row.persona}::${row.telefono}`}
                className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
              >
                <td className={cn(td, "font-semibold text-ink-100")}>{row.persona}</td>
                <td className={cn(td, "font-mono text-[0.75rem] text-ink-500")}>
                  {row.telefono || "—"}
                </td>
                <td className={cn(td, "tabular-nums text-ink-100")}>{formatNumber(row.mensajes)}</td>
                <td className={cn(td, "tabular-nums text-entregado")}>{formatNumber(row.ok)}</td>
                <td className={cn(td, "tabular-nums text-fallido")}>{formatNumber(row.fallidos)}</td>
                <td className={cn(td, "tabular-nums text-proceso")}>{formatNumber(row.respuestas)}</td>
                <td className={cn(td, "tabular-nums text-ink-400")}>{formatNumber(row.campanas.size)}</td>
                <td className={cn(td, "font-mono text-[0.75rem] text-ink-500")}>
                  {row.ultima.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {byClient.length === 0 && (
          <EmptyState note="La actividad por cliente aparece cuando hay envíos en el periodo." />
        )}
      </div>
    </Panel>
  )
}

function UsuarioView({ rows, desde }: { rows: ReportMessage[]; desde?: string }) {
  const { campaigns } = useCampaigns()

  interface UserRow {
    usuario: string
    dispositivo: string
    mensajes: number
    ok: number
    fallidos: number
    respuestas: number
    campañas: number
    ultima?: string
  }

  const byUser = useMemo<UserRow[]>(() => {
    const map = new Map<string, UserRow>()
    for (const row of rows) {
      if (row.tipo === "ejemplo") continue
      const key = `${row.usuario ?? "Sin atribución"}::${row.dispositivo ?? ""}`
      let acc = map.get(key)
      if (!acc) {
        acc = {
          usuario: row.usuario ?? "Sin atribución",
          dispositivo: row.dispositivo ?? "",
          mensajes: 0,
          ok: 0,
          fallidos: 0,
          respuestas: 0,
          campañas: 0,
        }
        map.set(key, acc)
      }
      if (row.tipo === "mensaje") {
        acc.mensajes++
        if (esFallido(row)) acc.fallidos++
        else if (esAceptado(row)) acc.ok++
      } else {
        acc.respuestas++
      }
      if (!acc.ultima || row.fecha > acc.ultima) acc.ultima = row.fecha
    }
    for (const campaign of campaigns) {
      if (!campaign.dispatchedBy) continue
      if (desde && campaign.dispatchedBy.at < desde) continue
      const key = `${campaign.dispatchedBy.usuario}::${campaign.dispatchedBy.dispositivo}`
      let acc = map.get(key)
      if (!acc) {
        acc = {
          usuario: campaign.dispatchedBy.usuario,
          dispositivo: campaign.dispatchedBy.dispositivo,
          mensajes: 0,
          ok: 0,
          fallidos: 0,
          respuestas: 0,
          campañas: 0,
        }
        map.set(key, acc)
      }
      acc.campañas++
    }
    return [...map.values()].sort((a, b) => b.mensajes - a.mensajes)
  }, [rows, campaigns, desde])

  return (
    <Panel
      title="Actividad por usuario"
      action={
        <span className={cn(label, "tabular-nums text-ink-500")}>
          {formatNumber(byUser.length)} responsables
        </span>
      }
    >
      <div className="max-h-[38rem] overflow-x-auto overflow-y-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-soft">
              {["Usuario", "Dispositivo", "Campañas", "Envíos", "Aceptados", "Fallidos", "Respuestas", "Último"].map(
                (h) => (
                  <th key={h} scope="col" className={cn(th, h === "Usuario" && "pl-5")}>
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {byUser.map((row) => (
              <tr
                key={`${row.usuario}::${row.dispositivo}`}
                className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
              >
                <td className={cn(td, "font-semibold text-ink-100")}>{row.usuario}</td>
                <td className={cn(td, "font-mono text-[0.75rem] text-ink-500")}>
                  {row.dispositivo || "—"}
                </td>
                <td className={cn(td, "tabular-nums text-ink-100")}>{formatNumber(row.campañas)}</td>
                <td className={cn(td, "tabular-nums text-ink-100")}>{formatNumber(row.mensajes)}</td>
                <td className={cn(td, "tabular-nums text-entregado")}>{formatNumber(row.ok)}</td>
                <td className={cn(td, "tabular-nums text-fallido")}>{formatNumber(row.fallidos)}</td>
                <td className={cn(td, "tabular-nums text-proceso")}>{formatNumber(row.respuestas)}</td>
                <td className={cn(td, "font-mono text-[0.75rem] text-ink-500")}>
                  {row.ultima ? row.ultima.slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {byUser.length === 0 && (
          <EmptyState note="El registro por usuario aparece cuando hay campañas despachadas desde la Cola." />
        )}
      </div>
    </Panel>
  )
}

function RowKindTipo({ row }: { row: ReportMessage }) {
  if (row.tipo === "ejemplo") return <EventChip tipo="ejemplo" />
  if (row.tipo === "respuesta") return <EventChip tipo="respuesta" />
  return <EventChip tipo="mensaje" />
}

function campaignSegmentsFromCounts(counts: ReturnType<typeof statusCounts>) {
  return [
    { status: "FALLIDO" as const, count: counts.FALLIDO },
    { status: "LEIDO" as const, count: counts.LEIDO },
    { status: "ENTREGADO" as const, count: counts.ENTREGADO },
    { status: "PROCESO" as const, count: counts.PROCESO },
    { status: "PENDIENTE" as const, count: counts.PENDIENTE },
    { status: "CANCELADO" as const, count: counts.CANCELADO },
  ].filter((segment) => segment.count > 0)
}

function EmptyState({ note }: { note: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="stamp stamp--fecha stamp--container">Sin registro</span>
      <p className="max-w-sm text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  )
}

function shortId(id?: string, max = 30) {
  if (!id) return "—"
  return id.length > max ? `${id.slice(0, max)}…` : id
}

export function ReportsPage() {
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()

  const [tab, setTab] = useState<TabKey>("resumen")
  const [periodo, setPeriodo] = useState<PeriodKey>("todo")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [origen, setOrigen] = useState<ReportOrigin>("todos")
  const [query, setQuery] = useState("")

  const allRows = useMemo(() => buildReportMessages(campaigns, threads), [campaigns, threads])

  const { desde: desdeIso, hasta: hastaIso } = useMemo(
    () => rangeFor(periodo, desde, hasta),
    [periodo, desde, hasta]
  )

  const periodRows = useMemo(
    () => applyReportFilter(allRows, { desde: desdeIso, hasta: hastaIso, origen }),
    [allRows, desdeIso, hastaIso, origen]
  )

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return periodRows
    return periodRows.filter((row) => {
      const haystack = [
        row.cliente,
        row.campana,
        row.telefono,
        row.texto,
        row.usuario,
        row.dispositivo,
        row.errorCode,
        row.errorMessage,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [periodRows, query])

  const counts = statusCounts(visibleRows.filter((r) => r.tipo !== "ejemplo"))
  const totalEnPeriodo = periodRows.length

  const periodInfo =
    periodo === "todo"
      ? "Todo el tiempo"
      : periodo === "hoy"
        ? "Hoy"
        : periodo === "7d"
          ? "Últimos 7 días"
          : periodo === "30d"
            ? "Últimos 30 días"
            : "Rango personalizado"

  return (
    <div className="mx-auto max-w-7xl px-8 py-8 print:max-w-none print:px-4 print:py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <BarChart3 className="size-4" aria-hidden />
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Reportes</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-400">
          Indicadores calculados sobre las fuentes reales (campañas, mensajes y conversaciones).
          El periodo, el origen y la búsqueda acotan cada vista.
        </p>
      </header>

      <div role="tablist" aria-label="Vista del reporte" className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((option) => (
          <button
            key={option.key}
            role="tab"
            type="button"
            aria-selected={tab === option.key}
            onClick={() => setTab(option.key)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-1.5 text-[0.8125rem] font-semibold transition-colors",
              tab === option.key
                ? "border-rule bg-base-750 text-ink-100"
                : "border-rule-soft bg-base-800 text-ink-400 hover:text-ink-200"
            )}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
          </button>
        ))}
      </div>

      <Panel
        title="Filtros"
        action={
          <div className="flex items-center gap-3">
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {formatNumber(totalEnPeriodo)} registros en el periodo
            </span>
            <Button
              variant="secondary"
              icon={<Download className="size-4" aria-hidden />}
              onClick={() => exportCsv(visibleRows)}
              disabled={visibleRows.length === 0}
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="size-4" aria-hidden />}
              onClick={printReport}
            >
              Imprimir
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-3">
          <div>
            <p className={cn(label, "mb-1.5 text-ink-500")}>Periodo</p>
            <div className="flex flex-wrap items-center gap-2">
              {PERIODS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setPeriodo(option.key)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                    periodo === option.key
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {periodo === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Desde"
                    value={desde}
                    min={hasta || undefined}
                    onChange={(e) => setDesde(e.target.value)}
                    className="h-8 rounded-md border border-rule bg-base-800 px-2 text-sm text-ink-100"
                  />
                <span className="text-xs text-ink-500">a</span>
                  <input
                    type="date"
                    aria-label="Hasta"
                    value={hasta}
                    max={desde || undefined}
                    onChange={(e) => setHasta(e.target.value)}
                  className="h-8 rounded-md border border-rule bg-base-800 px-2 text-sm text-ink-100"
                />
              </div>
            )}
          </div>

          <div>
            <p className={cn(label, "mb-1.5 text-ink-500")}>Origen</p>
            <div className="flex items-center gap-2">
              {ORIGINS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setOrigen(option.key)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                    origen === option.key
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn(label, "mb-1.5 text-ink-500")}>Buscar</p>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Buscar en el reporte"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cliente, campaña, teléfono, error…"
                className="h-8 w-full rounded-md border border-rule bg-base-800 pl-8 pr-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60"
              />
            </div>
          </div>
        </div>
      </Panel>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="stamp stamp--fecha stamp--container">
          <CalendarClock aria-hidden />
          {periodInfo}
        </span>
        <span className="stamp stamp--fecha stamp--container">Enviados {formatNumber(counts.PROCESO + counts.ENTREGADO + counts.LEIDO)}</span>
        <span className="stamp stamp--fallido stamp--container">Fallidos {formatNumber(counts.FALLIDO)}</span>
        <span className="stamp stamp--fecha stamp--container">Respuestas</span>
      </div>

      <section className="mt-4">
        {tab === "resumen" && <ResumenView rows={visibleRows} threads={threads} />}
        {tab === "dia" && <DiaView rows={visibleRows} />}
        {tab === "campana" && <CampanaView rows={visibleRows} />}
        {tab === "estado" && <EstadoView rows={visibleRows} />}
        {tab === "cliente" && <ClienteView rows={visibleRows} />}
        {tab === "usuario" && <UsuarioView rows={visibleRows} desde={desdeIso} />}
      </section>
    </div>
  )
}