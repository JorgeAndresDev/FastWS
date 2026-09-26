import { useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Pencil, Plus, Search, Trash2, Users, X } from "lucide-react"
import { sileo } from "sileo"

import type { Client, OrderState } from "@/types"

import { Button, FormField, Input, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"
import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"

import { clientTotals } from "./clients-segments"
import { ClientChip, type ClientType } from "./clients-status"
import { useClients, type ClientDraft } from "./clients-store"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"

const rightCols = ["Código", "Teléfono", "Ventana", "Pedido", "Tipo"]

function PedidoStamp({ state, reason }: { state?: OrderState; reason?: string }) {
  if (!state) {
    return <span className="text-[0.75rem] text-ink-600">Sin pedido</span>
  }
  const tone = state === "CANCELADO" ? "stamp--cancelado" : "stamp--pendiente"
  return (
    <div className="flex flex-col items-end gap-1">
      <span className={cn("stamp", tone)}>{state}</span>
      {state === "CANCELADO" && reason ? (
        <span className="max-w-[12rem] truncate text-right text-[0.75rem] text-ink-500">
          {reason}
        </span>
      ) : null}
    </div>
  )
}

const CLIENTS_TEMPLATE = "minmax(16rem, 1fr) 9rem 9rem 8rem 10rem 8rem"

function ClientRowCells({ client }: { client: Client }) {
  const ventana =
    client.horaInicial && client.horaFinal ? `${client.horaInicial}–${client.horaFinal}` : "—"

  return (
    <>
      <div role="cell" className="min-w-0 px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{client.name}</p>
        <p className="mt-0.5 truncate text-[0.75rem] text-ink-500">{client.company}</p>
      </div>
      <div role="cell" className="overflow-hidden px-4 py-3 font-mono text-[0.75rem] text-ink-500 text-ellipsis">
        {client.code}
      </div>
      <div role="cell" className="min-w-0 px-4 py-3">
        <p className="font-mono text-[0.8125rem] text-ink-100">{client.phone}</p>
        <p className="mt-0.5 text-[0.75rem] text-ink-500">{client.city}</p>
      </div>
      <div role="cell" className="px-4 py-3 font-mono text-[0.75rem] text-ink-500">
        {ventana}
      </div>
      <div role="cell" className="min-w-0 px-4 py-3">
        <PedidoStamp state={client.orderState} reason={client.cancelReason} />
      </div>
      <div role="cell" className="px-4 py-3 text-right">
        <ClientChip clientType={client.clientType as ClientType} />
      </div>
    </>
  )
}

function ClientForm({
  initial,
  onSaved,
  onClose,
}: {
  initial?: Client
  onSaved: (draft: ClientDraft) => { ok: boolean; error?: string }
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ClientDraft>({
    code: initial?.code ?? "",
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company && initial.company !== "—" ? initial.company : "",
    city: initial?.city && initial.city !== "—" ? initial.city : "",
    zone: initial?.zone && initial.zone !== "—" ? initial.zone : "",
    clientType: initial?.clientType ?? "NORMAL",
  })
  const [error, setError] = useState<string | null>(null)

  const render = () => {
    const result = onSaved(draft)
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar el cliente.")
      return
    }
    sileo.success({
      title: initial ? "Cliente editado" : "Cliente registrado",
      description: `${draft.name} quedó en la planilla.`,
    })
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Código" htmlFor="cliente-codigo" error={error && !draft.code ? error : undefined}>
          <Input
            id="cliente-codigo"
            value={draft.code}
            onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            placeholder="C-1001"
            mono
            disabled={Boolean(initial)}
          />
        </FormField>
        <FormField label="Nombre / Razón social" htmlFor="cliente-nombre">
          <Input
            id="cliente-nombre"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Café La Roca"
          />
        </FormField>
        <FormField label="Teléfono (celular)" htmlFor="cliente-telefono">
          <Input
            id="cliente-telefono"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value.replace(/\D/g, "") })}
            placeholder="3001234001"
            mono
            inputMode="numeric"
          />
        </FormField>
        <FormField label="Empresa" htmlFor="cliente-empresa">
          <Input
            id="cliente-empresa"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
            placeholder="—"
          />
        </FormField>
        <FormField label="Ciudad" htmlFor="cliente-ciudad">
          <Input
            id="cliente-ciudad"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            placeholder="Bogotá"
          />
        </FormField>
        <FormField label="Zona" htmlFor="cliente-zona">
          <Input
            id="cliente-zona"
            value={draft.zone}
            onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
            placeholder="Centro"
          />
        </FormField>
      </div>
      <FormField label="Tipo" htmlFor="cliente-tipo">
        <select
          id="cliente-tipo"
          value={draft.clientType}
          onChange={(e) => setDraft({ ...draft, clientType: e.target.value as Client["clientType"] })}
          className="h-10 w-full rounded-md border border-rule bg-base-800 px-3 text-[0.8125rem] text-ink-100"
        >
          <option value="NORMAL">Normal (contado)</option>
          <option value="CASHLESS">Cashless (transferencia)</option>
        </select>
      </FormField>

      {error && (
        <p role="alert" className="text-xs text-fallido">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-rule-soft pt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={render}>
          {initial ? "Guardar cambios" : "Registrar cliente"}
        </Button>
      </div>
    </div>
  )
}

export function ClientsPage() {
  const { clients, registrarCliente, actualizarCliente, eliminarCliente } = useClients()
  const [query, setQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"" | Client["clientType"]>("")
  const [editing, setEditing] = useState<Client | "nuevo" | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<Client | null>(null)
  const totals = clientTotals(clients)
  const scrollRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((client) => {
      if (typeFilter && client.clientType !== typeFilter) return false
      if (!q) return true
      const haystack = [
        client.name,
        client.code,
        client.company,
        client.city,
        client.zone,
        client.phone,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [clients, query, typeFilter])

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 12,
  })
  const cols = [...rightCols, "Acciones"]

  const auditar = (titulo: string, detalle: string) => {
    const device = getDeviceIdentity()
    const session = readSession()
    registrarAuditoria({
      categoria: "clientes",
      titulo,
      detalle,
      entidad: detalle,
      usuario: session?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Users className="size-4" aria-hidden />
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Clientes</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Registro, edición, búsqueda y filtros de la base de clientes, con historial de mensajes y
          respuestas por cliente.
        </p>
      </header>

      {editing && (
        <Panel
          title={editing === "nuevo" ? "Registrar cliente" : `Editar · ${editing.name}`}
          action={
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-ink-500 transition-colors hover:bg-base-800 hover:text-ink-200"
            >
              <X className="size-3.5" aria-hidden />
              Cerrar
            </button>
          }
        >
          <ClientForm
            initial={editing === "nuevo" ? undefined : editing}
            onSaved={(draft) =>
              editing === "nuevo"
                ? (() => {
                    const r = registrarCliente(draft)
                    if (r.ok) auditar("Cliente registrado", `${draft.name} (${draft.code})`)
                    return r
                  })()
                : (() => {
                    const r = actualizarCliente(editing.id, draft)
                    if (r.ok) auditar("Cliente editado", `${draft.name} (${draft.code})`)
                    return r
                  })()
            }
            onClose={() => setEditing(null)}
          />
        </Panel>
      )}

      {confirmEliminar && (
        <Panel title="Eliminar cliente">
          <div className="flex flex-col gap-4 px-5 py-4">
            <p className="text-sm text-ink-200">
              ¿Eliminar a <span className="font-semibold">{confirmEliminar.name}</span> (
              {confirmEliminar.code}) del registro? Se quita también de segmentos y mensajes.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmEliminar(null)}>
                Volver
              </Button>
              <Button
                variant="danger"
                icon={<Trash2 className="size-4" aria-hidden />}
                autoFocus
                onClick={() => {
                  auditar("Cliente eliminado", `${confirmEliminar.name} (${confirmEliminar.code})`)
                  eliminarCliente(confirmEliminar.id)
                  setConfirmEliminar(null)
                  sileo.success({
                    title: "Cliente eliminado",
                    description: `${confirmEliminar.name} salió del registro.`,
                  })
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        title="Planilla del registro"
        action={
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular-nums text-xs text-ink-500">
              {formatNumber(clients.length)} clientes · {formatNumber(totals.valid)} válidos
            </span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
                aria-hidden
              />
              <Input
                type="search"
                aria-label="Buscar cliente"
                className="h-8 w-52 pl-9"
                placeholder="Buscar…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrar por tipo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "" | Client["clientType"])}
              className="h-8 rounded-md border border-rule bg-base-800 px-2 text-[0.75rem] text-ink-100"
            >
              <option value="">Todos los tipos</option>
              <option value="NORMAL">Normales</option>
              <option value="CASHLESS">Cashless</option>
            </select>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="size-3.5" aria-hidden />}
              onClick={() => setEditing("nuevo")}
            >
              Nuevo cliente
            </Button>
          </div>
        }
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="stamp stamp--fecha stamp--container">
              {clients.length === 0 ? "Sin clientes" : "Sin coincidencias"}
            </span>
            <p className="max-w-sm text-xs leading-relaxed text-ink-500">
              {clients.length === 0
                ? "El registro está vacío. Importa una base desde Importar clientes o registra el primero con «Nuevo cliente»."
                : "Ningún cliente coincide con la búsqueda o el filtro. Ajusta los criterios."}
            </p>
          </div>
        ) : (
          <div ref={scrollRef} className="max-h-[36rem] overflow-x-auto overflow-y-auto">
            <div role="table" className="min-w-[72rem]">
              <div
                role="rowgroup"
                className="sticky top-0 z-10 border-b border-rule-soft bg-base-850"
              >
                <div
                  role="row"
                  className="grid items-center"
                  style={{ gridTemplateColumns: CLIENTS_TEMPLATE }}
                >
                  {cols.map((h) => (
                    <div
                      key={h}
                      role="columnheader"
                      className={cn(
                        th,
                        h === "Teléfono" && "text-left",
                        (rightCols.includes(h) && h !== "Teléfono") && "text-right",
                        h === "Acciones" && "text-right"
                      )}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </div>
              <div
                role="rowgroup"
                className="relative"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {virtualizer.getVirtualItems().map((vi) => {
                  const client = visible[vi.index]
                  return (
                    <div
                      key={client.id}
                      role="row"
                      data-index={vi.index}
                      ref={virtualizer.measureElement}
                      className="absolute left-0 top-0 grid w-full border-b border-rule-soft transition-colors hover:bg-base-800/45"
                      style={{
                        gridTemplateColumns: CLIENTS_TEMPLATE,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      <ClientRowCells client={client} />
                      <div role="cell" className="flex items-center justify-end gap-1 px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Editar ${client.name}`}
                          icon={<Pencil className="size-3.5" aria-hidden />}
                          onClick={() => setEditing(client)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Eliminar ${client.name}`}
                          icon={<Trash2 className="size-3.5" aria-hidden />}
                          onClick={() => setConfirmEliminar(client)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
