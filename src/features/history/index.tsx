import { useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Eye, EyeOff, History, ScrollText, Search } from "lucide-react"

import { EmptyState, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn } from "@/lib/utils"

import type { HistoryEvent, HistoryEventType } from "@/types"

import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { buildHistory } from "./history-events"
import { EventChip } from "./history-status"

const label = "text-xs font-bold uppercase tracking-[0.14em]"

const FILTERS: Array<{ value: "" | HistoryEventType; label: string }> = [
  { value: "", label: "Todos" },
  { value: "campana", label: "Campañas" },
  { value: "mensaje", label: "Mensajes" },
  { value: "respuesta", label: "Respuestas" },
  { value: "ejemplo", label: "Ejemplos" },
  { value: "error", label: "Errores" },
]

type FlatItem =
  | { kind: "day"; key: string; label: string }
  | { kind: "event"; event: HistoryEvent }

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

function hourMinute(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString("es-CO", { hour12: false, hour: "2-digit", minute: "2-digit" })
}

function shortId(id?: string, max = 26) {
  if (!id) return ""
  return id.length > max ? `${id.slice(0, max)}…` : id
}

export function HistoryPage() {
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()
  const [tipo, setTipo] = useState<"" | HistoryEventType>("")
  const [query, setQuery] = useState("")
  const [success, setSuccess] = useState(false)

  const events = useMemo(
    () => buildHistory(campaigns, threads, { success }),
    [campaigns, threads, success]
  )

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!tipo && !normalized) return events
    return events.filter((event) => {
      if (tipo && event.tipo !== tipo) return false
      if (!normalized) return true
      const haystack = [event.titulo, event.detalle, event.codigoError ?? ""]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [events, tipo, query])

  const flat = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = []
    let lastKey: string | null = null
    for (const event of visible) {
      const key = dayKey(event.at)
      if (key !== lastKey) {
        out.push({ kind: "day", key, label: dayLabel(event.at) })
        lastKey = key
      }
      out.push({ kind: "event", event })
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

  const errores = events.filter((e) => e.tipo === "error").length

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <History className="size-4" aria-hidden />
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Historial</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Bitácora de actividades: ciclo de vida de campañas, mensajes, respuestas y errores, para
          reconstruir qué ocurrió y cuándo.
        </p>
      </header>

      <Panel
        title="Bitácora"
        action={
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Buscar en el historial"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-8 w-64 rounded-md border border-rule bg-base-800 pl-8 pr-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60"
              />
            </div>
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {flat.length} registros · {errores} errores
            </span>
          </div>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-4 py-3">
          <div role="tablist" aria-label="Filtrar por tipo" className="flex flex-wrap items-center gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                role="tab"
                type="button"
                aria-selected={tipo === option.value}
                onClick={() => setTipo(option.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                  tipo === option.value
                    ? "border-rule bg-base-750 text-ink-100"
                    : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={success}
            onClick={() => setSuccess((value) => !value)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
              success
                ? "border-rule bg-base-750 text-ink-100"
                : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
            )}
          >
            {success ? (
              <Eye className="size-3.5" aria-hidden />
            ) : (
              <EyeOff className="size-3.5" aria-hidden />
            )}
            Envíos exitosos
          </button>
        </div>

        <div ref={scrollRef} className="max-h-[calc(100vh-14rem)] overflow-y-auto">
          {flat.length > 0 ? (
            <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const item = flat[vi.index]
                return (
                  <div
                    key={item.kind === "day" ? item.key : item.event.id}
                    data-index={vi.index}
                    ref={virtualizer.measureElement}
                    className={cn(
                      "absolute left-0 top-0 w-full border-b border-rule-soft",
                      item.kind === "day" ? "bg-base-850" : "transition-colors hover:bg-base-800/45"
                    )}
                    style={{ transform: `translateY(${vi.start}px)` }}
                  >
                    {item.kind === "day" ? (
                      <div className="px-5 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] capitalize text-ink-400">
                        {item.label}
                      </div>
                    ) : (
                      <EventRow event={item.event} />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              label="Sin registro"
              icon={ScrollText}
              note="Las actividades aparecen cuando hay campañas creadas, mensajes procesados o respuestas. Ajusta los filtros o activa “Envíos exitosos”."
            />
          )}
        </div>
      </Panel>
    </div>
  )
}

function EventRow({ event }: { event: HistoryEvent }) {
  return (
    <div className="grid items-start gap-x-3 gap-y-0.5 px-5 py-2.5 sm:grid-cols-[4rem_8rem_1fr_auto]">
      <span className="hidden font-mono text-[0.75rem] tabular-nums text-ink-500 sm:block">
        {hourMinute(event.at)}
      </span>
      <EventChip tipo={event.tipo} />
      <div className="min-w-0 sm:col-span-1">
        <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold text-ink-100">
          {event.titulo}
          <span className="font-mono text-[0.75rem] font-normal text-ink-600 sm:hidden">
            {hourMinute(event.at)}
          </span>
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">{event.detalle}</p>
      </div>
      <div className="text-left sm:text-right">
        {event.codigoError && (
          <span className="font-mono text-xs font-semibold text-fallido">
            {event.codigoError}
          </span>
        )}
        {event.wamid && (
          <span className="block max-w-[16rem] truncate font-mono text-[0.75rem] text-ink-600" title={event.wamid}>
            {shortId(event.wamid)}
          </span>
        )}
      </div>
    </div>
  )
}