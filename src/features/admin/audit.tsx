import { useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { CalendarClock, Download, Printer, Search, ShieldCheck } from "lucide-react"

import { Button, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"
import type { AuditCategory, AuditRecord } from "@/types"

import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { hourMinute } from "@/features/reports/report-dates"

import { buildAuditRecords, contarCategorias } from "./audit-events"
import { AuditChip, auditCategoryLabel } from "./audit-status"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em]"

type CategoryFilter = "" | AuditCategory

const CATEGORIES: Array<{ value: CategoryFilter; label: string }> = [
  { value: "", label: "Todo" },
  { value: "turno", label: "Turnos" },
  { value: "campana", label: "Campañas" },
  { value: "error", label: "Errores" },
  { value: "conexion", label: "Conexión" },
  { value: "importacion", label: "Importaciones" },
]

type PeriodKey = "todo" | "hoy" | "7d" | "30d" | "custom"

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: "todo", label: "Todo" },
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "custom", label: "Rango" },
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
      const [ini, fin] = desde && hasta && desde > hasta ? [hasta, desde] : [desde, hasta]
      return {
        desde: ini ? new Date(`${ini}T00:00:00`).toISOString() : undefined,
        hasta: fin ? new Date(`${fin}T23:59:59.999`).toISOString() : undefined,
      }
    }
  }
}

const CSV_COLS = [
  "Categoría",
  "Fecha",
  "Título",
  "Detalle",
  "Entidad",
  "Usuario",
  "Dispositivo",
  "Código error",
]

function csvCell(record: AuditRecord, index: number): string {
  switch (index) {
    case 0:
      return auditCategoryLabel[record.categoria]
    case 1:
      return `${record.at.slice(0, 10)} ${hourMinute(record.at)}`
    case 2:
      return record.titulo
    case 3:
      return record.detalle
    case 4:
      return record.entidad ?? ""
    case 5:
      return record.usuario ?? ""
    case 6:
      return record.dispositivo ?? ""
    default:
      return record.codigoError ?? ""
  }
}

/** Evita la inyección de fórmulas al abrir el CSV (= + - @). */
function escapeCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function exportCsv(records: AuditRecord[]) {
  const header = CSV_COLS.join(";")
  const lines = records.map((record) =>
    CSV_COLS.map((_, index) => escapeCell(csvCell(record, index))).join(";")
  )
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([`\uFEFF${[header, ...lines].join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `auditoria-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function KpiCard({
  categoria,
  count,
}: {
  categoria: AuditCategory
  count: number
}) {
  return (
    <div className="panel flex flex-col gap-2 px-4 py-3">
      <AuditChip categoria={categoria} />
      <p
        className={cn(
          "text-[1.375rem] font-bold tabular-nums tracking-tight",
          categoria === "error" ? "text-fallido" : "text-ink-100"
        )}
      >
        {formatNumber(count)}
      </p>
    </div>
  )
}

type FlatItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "record"; record: AuditRecord }

function dayKey(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "fecha-invalida"
  const mes = String(date.getMonth() + 1).padStart(2, "0")
  const dia = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mes}-${dia}`
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return "Hoy"
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ayer"
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function AuditRow({ record }: { record: AuditRecord }) {
  return (
    <div className="grid items-start gap-x-3 gap-y-0.5 px-5 py-2.5 sm:grid-cols-[4rem_9rem_1fr_auto]">
      <span className="hidden font-mono text-[0.75rem] tabular-nums text-ink-500 sm:block">
        {hourMinute(record.at)}
      </span>
      <AuditChip categoria={record.categoria} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold text-ink-100">
          {record.titulo}
          <span className="font-mono text-[0.75rem] font-normal text-ink-600 sm:hidden">
            {hourMinute(record.at)}
          </span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{record.detalle}</p>
      </div>
      <div className="text-left sm:text-right">
        {record.codigoError && (
          <span className="font-mono text-xs font-semibold text-fallido">
            {record.codigoError}
          </span>
        )}
        {record.entidad && (
          <span
            className="mt-0.5 block max-w-[16rem] truncate font-mono text-[0.75rem] text-ink-600"
            title={record.entidad}
          >
            {record.entidad}
          </span>
        )}
        {(record.usuario || record.dispositivo) && (
          <span className="block max-w-[16rem] truncate text-[0.75rem] text-ink-600">
            {[record.usuario, record.dispositivo].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
    </div>
  )
}

export function AuditPage() {
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()

  const [categoria, setCategoria] = useState<CategoryFilter>("")
  const [periodo, setPeriodo] = useState<PeriodKey>("todo")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [query, setQuery] = useState("")

  const registros = useMemo(
    () => buildAuditRecords(campaigns, threads),
    [campaigns, threads]
  )

  const { desde: desdeIso, hasta: hastaIso } = useMemo(
    () => rangeFor(periodo, desde, hasta),
    [periodo, desde, hasta]
  )

  const periodoRegistros = useMemo(
    () =>
      registros.filter((record) => {
        if (desdeIso && record.at < desdeIso) return false
        if (hastaIso && record.at > hastaIso) return false
        return true
      }),
    [registros, desdeIso, hastaIso]
  )

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return periodoRegistros.filter((record) => {
      if (categoria && record.categoria !== categoria) return false
      if (!normalized) return true
      const haystack = [
        record.titulo,
        record.detalle,
        record.entidad ?? "",
        record.usuario ?? "",
        record.dispositivo ?? "",
        record.codigoError ?? "",
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [periodoRegistros, categoria, query])

  // Los KPI cuentan lo mismo que la lista visible: si no, el resumen contradice al contador.
  const counts = useMemo(() => contarCategorias(visible), [visible])
  const operaciones = counts.conexion + counts.importacion

  const flat = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = []
    let lastKey: string | null = null
    for (const record of visible) {
      const key = dayKey(record.at)
      if (key !== lastKey) {
        out.push({ kind: "day", key, label: dayLabel(record.at) })
        lastKey = key
      }
      out.push({ kind: "record", record })
    }
    return out
  }, [visible])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (flat[index].kind === "day" ? 38 : 62),
    overscan: 12,
  })

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
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <ShieldCheck className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro ·{" "}
            <time
              dateTime={new Date().toISOString()}
              suppressHydrationWarning
              className="text-ink-400"
            >
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Auditoría</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-400">
          Registro de acciones importantes: turnos, campañas, conexión Meta, importaciones y
          errores, para reconstruir qué ocurrió, cuándo y quién.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard categoria="turno" count={counts.turno} />
        <KpiCard categoria="campana" count={counts.campana} />
        <KpiCard categoria="error" count={counts.error} />
        <KpiCard categoria="conexion" count={counts.conexion} />
        <KpiCard categoria="importacion" count={counts.importacion} />
      </div>

      <Panel
        title="Filtros"
        className="mt-4"
        action={
          <div className="flex items-center gap-3">
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {formatNumber(visible.length)} registros
            </span>
            <Button
              variant="secondary"
              icon={<Download className="size-4" aria-hidden />}
              onClick={() => exportCsv(visible)}
              disabled={visible.length === 0}
            >
              CSV
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="size-4" aria-hidden />}
              onClick={() => window.print()}
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
            <p className={cn(label, "mb-1.5 text-ink-500")}>Categoría</p>
            <div role="tablist" aria-label="Filtrar por categoría" className="flex flex-wrap items-center gap-2">
              {CATEGORIES.map((option) => (
                <button
                  key={option.value}
                  role="tab"
                  type="button"
                  aria-selected={categoria === option.value}
                  onClick={() => setCategoria(option.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                    categoria === option.value
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
                aria-label="Buscar en la auditoría"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título, detalle, usuario, equipo, error…"
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
        <span className="stamp stamp--fecha stamp--container">Turnos {formatNumber(counts.turno)}</span>
        <span className="stamp stamp--fecha stamp--container">Campañas {formatNumber(counts.campana)}</span>
        <span className="stamp stamp--fallido stamp--container">Errores {formatNumber(counts.error)}</span>
        <span className="stamp stamp--fecha stamp--container">Operaciones {formatNumber(operaciones)}</span>
      </div>

      <Panel title="Libro de auditoría" className="mt-4">
        <div ref={scrollRef} className="max-h-[calc(100vh-18rem)] overflow-y-auto">
          {flat.length > 0 ? (
            <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const item = flat[vi.index]
                return (
                  <div
                    key={item.kind === "day" ? item.key : item.record.id}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    className={cn(
                      "absolute left-0 top-0 w-full border-b border-rule-soft",
                      item.kind === "day"
                        ? "bg-base-850"
                        : "transition-colors hover:bg-base-800/45"
                    )}
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    {item.kind === "day" ? (
                      <div className="px-5 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] capitalize text-ink-400">
                        {item.label}
                      </div>
                    ) : (
                      <AuditRow record={item.record} />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <span className="stamp stamp--fecha stamp--container">Sin registro</span>
              <p className="max-w-sm text-xs leading-relaxed text-ink-500">
                El libro reúne los turnos que se abren en este equipo, la actividad de campañas,
                errores de Meta y las operaciones de conexión e importación. Ajusta el periodo, la
                categoría o la búsqueda.
              </p>
            </div>
          )}
        </div>
      </Panel>

      <p role="note" className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-600">
        Registro local a este equipo hasta el backend (Tauri). Los cambios de Configuración
        (velocidad, formato regional y acciones de datos) se registran con la categoría de
        configuración junto a conexiones e importaciones.
      </p>
    </div>
  )
}