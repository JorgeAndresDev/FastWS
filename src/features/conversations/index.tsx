import { useEffect, useMemo, useState } from "react"
import { MessagesSquare, MousePointerClick, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react"

import { Button, EmptyState, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn } from "@/lib/utils"
import { graphError, listTemplates } from "@/lib/wsb/api"

import type { ConvoStatus, WaTemplate } from "@/types"

import { useClients } from "@/features/clients/clients-store"
import { useConexion } from "@/features/connection/conexion-store"
import { ConvoChip } from "./conversation-status"
import { conversationCounts } from "./conversation-segments"
import { useConversations } from "./conversations-store"
import { ThreadDetail } from "./thread-detail"

const label = "text-xs font-bold uppercase tracking-[0.14em]"

const FILTERS: Array<{ value: "" | ConvoStatus; label: string }> = [
  { value: "", label: "Todas" },
  { value: "respondida", label: "Respondidas" },
  { value: "pendiente", label: "Pendientes" },
  { value: "con_error", label: "Con error" },
]

function displayPhone(phone: string) {
  return phone.replace(/^57/, "")
}

function timeShort(iso?: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString("es-CO", { hour12: false, hour: "2-digit", minute: "2-digit" })
}

function shortText(text: string, max = 54) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function ConversationsPage() {
  const { threads, sembrarDemo, limpiarDemo, reescanearCampañas } = useConversations()
  const { clients } = useClients()
  const { token, ids } = useConexion()

  const [filter, setFilter] = useState<"" | ConvoStatus>("")
  const [query, setQuery] = useState("")
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
const [confirmarLimpiar, setConfirmarLimpiar] = useState(false)
  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !ids.wabaId) return
    let active = true
    setTemplatesError(null)
    listTemplates(ids.wabaId, token)
      .then((result) => {
        if (active) setTemplates(result.templates.filter((t) => t.status === "APPROVED"))
      })
      .catch((err) => {
        if (active) setTemplatesError(graphError(err).message)
      })
    return () => {
      active = false
    }
  }, [token, ids.wabaId])

  const counts = conversationCounts(threads)

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return threads.filter((thread) => {
      if (filter && thread.status !== filter) return false
      if (!normalized) return true
      const client = clients.find(
        (c) => `57${c.phone.replace(/\D/g, "")}` === thread.phone
      )
      const haystack = [client?.name ?? "", client?.code ?? "", client?.city ?? "", thread.phone]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [threads, filter, query, clients])

  useEffect(() => {
    if (!visible.some((t) => t.phone === selectedPhone)) {
      setSelectedPhone(visible[0]?.phone ?? null)
    }
  }, [visible, selectedPhone])

  const selected = threads.find((t) => t.phone === selectedPhone) ?? null

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <MessagesSquare className="size-4" aria-hidden />
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Conversaciones</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Bandeja de hilos por cliente: envíos de campañas, respuestas salientes y conversaciones
          de muestra. Responde con texto libre (ventana de 24 h) o con una plantilla aprobada.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_1fr]">
        <Panel
          title="Conversaciones"
          action={
            <span className={cn(label, "tabular-nums text-ink-500")}>
              {counts.total} hilos · {counts.respondidas} respondidas · {counts.pendientes}{" "}
              pendientes
            </span>
          }
        >
          <div className="flex flex-col gap-3 border-b border-rule-soft px-4 py-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <input
                type="search"
                role="searchbox"
                aria-label="Buscar conversación"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, código, ciudad o teléfono…"
                className="h-9 w-full rounded-md border border-rule bg-base-800 pl-8 pr-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60"
              />
            </div>
            <div role="tablist" aria-label="Filtrar por estado" className="flex flex-wrap items-center gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  role="tab"
                  type="button"
                  aria-selected={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors",
                    filter === option.value
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                icon={<RefreshCw className="size-3.5" aria-hidden />}
                onClick={reescanearCampañas}
              >
                Reescanear envíos
              </Button>
              {counts.demo > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-3.5" aria-hidden />}
                  onClick={() => setConfirmarLimpiar(true)}
                >
                  Limpiar demo
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Sparkles className="size-3.5" aria-hidden />}
                  onClick={sembrarDemo}
                >
                  Poblar con datos de ejemplo
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-[calc(100vh-13rem)] overflow-y-auto">
            {visible.length > 0 ? (
              <ul role="list" className="divide-y divide-rule-soft">
                {visible.map((thread) => {
                  const client = clients.find(
                    (c) => `57${c.phone.replace(/\D/g, "")}` === thread.phone
                  )
                  const name = client?.name ?? displayPhone(thread.phone)
                  const isSelected = selectedPhone === thread.phone
                  return (
                    <li key={thread.id} role="listitem">
                      <button
                        type="button"
                        onClick={() => setSelectedPhone(thread.phone)}
                        aria-pressed={isSelected}
                        className={cn(
                          "block w-full px-4 py-3 text-left transition-colors hover:bg-base-800/60",
                          isSelected && "bg-base-800/80"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[0.8125rem] font-semibold text-ink-100">
                            {name}
                          </p>
                          <ConvoChip status={thread.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-500">
                          {shortText(thread.lastMessage)}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[0.75rem] text-ink-500">
                          <span className="font-mono">{displayPhone(thread.phone)}</span>
                          <span className="tabular-nums">{timeShort(thread.lastAt)}</span>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <EmptyState
                label="Sin hilos"
                icon={MessagesSquare}
                note="Los hilos se llenan con los envíos reales de campañas y con tus respuestas. Para ejercitar el estado “respondida”, siembra datos de ejemplo."
              />
            )}
          </div>
        </Panel>

        {selected ? (
          <Panel className="lg:min-h-[calc(100vh-13rem)] overflow-hidden">
            <ThreadDetail thread={selected} templates={templates} templatesError={templatesError} />
          </Panel>
        ) : (
          <Panel className="lg:min-h-[calc(100vh-13rem)]">
            <EmptyState
              label="Selecciona un hilo"
              icon={MousePointerClick}
              className="py-20"
              note="Abre una conversación a la izquierda para ver el hilo y responder."
            />
          </Panel>
        )}
      </div>

      {confirmarLimpiar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-base-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-limpiar-titulo"
          onKeyDown={(e) => e.key === "Escape" && setConfirmarLimpiar(false)}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-limpiar-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                Limpiar datos de ejemplo
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cerrar"
                icon={<X className="size-3.5" aria-hidden />}
                onClick={() => setConfirmarLimpiar(false)}
              />
            </header>
            <div className="px-5 py-5">
              <p className="text-base font-semibold text-ink-100">
                Se borrarán {counts.demo} {counts.demo === 1 ? "hilo" : "hilos"} de demostración
              </p>
              <p className="mt-4 max-w-sm leading-relaxed text-xs text-ink-500">
                Se elimina el historial completo, incluidas las respuestas del operador dentro de
                esos hilos. Los envíos de campañas reales no se tocan. No hay deshacer.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-4">
              <Button size="sm" variant="secondary" onClick={() => setConfirmarLimpiar(false)}>
                Volver
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 className="size-3.5" aria-hidden />}
                onClick={() => {
                  limpiarDemo()
                  setConfirmarLimpiar(false)
                }}
                autoFocus
              >
                Sí, limpiar
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}