import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Clock3,
  Database,
  HardDrive,
  Link2,
  MessagesSquare,
  MonitorSmartphone,
  RefreshCw,
  Send,
  ShieldCheck,
  UserRound,
  Users,
  Wifi,
} from "lucide-react"

import { Button, EmptyState, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import { useClients } from "@/features/clients/clients-store"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { useConexion } from "@/features/connection/conexion-store"
import { listarSesiones } from "@/lib/session-log"
import { listarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { hourMinute } from "@/features/reports/report-dates"

import { buildDatasetStates, haceCuando, type SyncDataset } from "./datasets"
import { RESOLUTION_RULES, SHARED_BASE_NOTE } from "./resolution"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em]"

const DATASET_ICON: Record<SyncDataset["id"], React.ComponentType<{ className?: string }>> = {
  clientes: Users,
  campanas: Send,
  conversaciones: MessagesSquare,
  turnos: UserRound,
  auditoria: ShieldCheck,
}

function PanelDatos({ datasets }: { datasets: SyncDataset[] }) {
  return (
    <Panel
      title="Datos de este equipo"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <HardDrive aria-hidden />
          Solo local
        </span>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-rule-soft">
              <th
                scope="col"
                className={cn(label, "px-5 py-2 text-left text-ink-500")}
              >
                Conjunto
              </th>
              <th
                scope="col"
                className={cn(label, "px-5 py-2 text-right text-ink-500")}
              >
                Registros
              </th>
              <th
                scope="col"
                className={cn(label, "px-5 py-2 text-right text-ink-500")}
              >
                Última actividad
              </th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset) => {
              const Icon = DATASET_ICON[dataset.id]
              return (
                <tr key={dataset.id} className="border-b border-rule-soft last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2.5 text-[0.8125rem] font-semibold text-ink-100">
                      <span className="grid size-7 place-items-center rounded-md border border-rule bg-base-800 text-ink-500">
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      {dataset.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-[0.8125rem] tabular-nums text-ink-100">
                    {formatNumber(dataset.count)}
                  </td>
                  <td className="px-5 py-3 text-right text-[0.8125rem] text-ink-400">
                    {dataset.lastActivity ?? <span className="text-ink-600">Sin datos</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p role="note" className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-500">
        "Última actividad" es un dato local real (la fecha más reciente entre los registros de cada
        conjunto), no confirmación de una sincronización con otro equipo.
      </p>
    </Panel>
  )
}

function PanelEsteEquipo() {
  const device = useMemo(() => getDeviceIdentity(), [])
  return (
    <Panel
      title="Este equipo"
      action={
        <span className="stamp stamp--pendiente stamp--container">
          <MonitorSmartphone aria-hidden />
          Sin base compartida
        </span>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-2xl font-bold tracking-tight text-ink-100">{device.code}</p>
          <span className="rounded-md border border-rule bg-base-800 px-2 py-0.5 font-mono text-xs text-ink-400">
            {device.id}
          </span>
          <span className="rounded-md border border-rule bg-base-800 px-2 py-0.5 text-xs text-ink-400">
            {device.platform}
          </span>
          {device.nombre && (
            <span className="rounded-md border border-rule bg-base-800 px-2 py-0.5 text-xs text-ink-300">
              {device.nombre}
            </span>
          )}
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          Identidad única de esta instalación. Cuando exista la base compartida, este equipo
          aparecerá en la lista de dispositivos autorizados con su última sincronización real.
        </p>
      </div>
    </Panel>
  )
}

interface EquipoInfo {
  equipo: string
  plataforma?: string
  registros: number
  lastActivity?: string
}

function PanelEquipos() {
  const sesiones = useMemo(listarSesiones, [])

  const equipos = useMemo<EquipoInfo[]>(() => {
    const byTeam = new Map<
      string,
      { equipo: string; plataforma?: string; registros: number; lastIso?: string }
    >()
    for (const sesion of sesiones) {
      const prev = byTeam.get(sesion.equipo)
      const iso = sesion.fin ?? sesion.inicio
      const lastIso = [prev?.lastIso, iso].filter(Boolean).sort().at(-1)
      byTeam.set(sesion.equipo, {
        equipo: sesion.equipo,
        plataforma: sesion.plataforma,
        registros: (prev?.registros ?? 0) + 1,
        lastIso,
      })
    }
    return [...byTeam.values()]
      .map(({ lastIso, ...rest }) => ({ ...rest, lastActivity: haceCuando(lastIso) }))
      .sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""))
  }, [sesiones])

  return (
    <Panel title="Equipos en la bitácora">
      {equipos.length > 0 ? (
        <div className="divide-y divide-rule-soft">
          {equipos.map((equipo) => (
            <div key={equipo.equipo} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div>
                <p className="text-[0.8125rem] font-semibold text-ink-100">{equipo.equipo}</p>
                {equipo.plataforma && (
                  <p className="text-[0.75rem] text-ink-500">{equipo.plataforma}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[0.75rem] text-ink-500">
                  {formatNumber(equipo.registros)}{" "}
                  {equipo.registros === 1 ? "turno" : "turnos"} · última actividad{" "}
                  {equipo.lastActivity ?? "—"}
                </p>
                <span className="stamp stamp--pendiente">
                  <Clock3 aria-hidden />
                  Sincronizado: nunca
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          label="Sin datos"
          icon={HardDrive}
          className="py-10"
          note="No hay turnos registrados aún. Los equipos aparecerán aquí cuando abran sesión."
        />
      )}
    </Panel>
  )
}

function PanelBaseCompartida() {
  return (
    <Panel
      title="Estado de la base compartida"
      action={
        <span className="stamp stamp--pendiente stamp--container">
          <Database aria-hidden />
          Local solamente
        </span>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-ink-300">
          Cada equipo guarda sus datos en este computador (almacenamiento local del navegador). La
          sincronización entre computadores autorizados todavía no existe: llega con el cliente de
          escritorio (Tauri) y una base compartida (Turso) en la fase de backend.
        </p>
        <p className="text-sm leading-relaxed text-ink-500">
          Cuando la base compartida esté disponible, aquí aparecerá la última sincronización real,
          los cambios pendientes por equipo y los conflictos resueltos.
        </p>
      </div>
    </Panel>
  )
}

function PanelResolucion() {
  return (
    <Panel title="Resolución de cambios entre computadores">
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        {RESOLUTION_RULES.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-col gap-1.5 rounded-lg border border-rule-soft bg-base-850 p-4"
          >
            <h3 className="text-[0.8125rem] font-bold text-ink-100">{rule.titulo}</h3>
            <p className="text-xs leading-relaxed text-ink-500">{rule.detalle}</p>
          </div>
        ))}
      </div>
      <p role="note" className="border-t border-rule-soft px-5 py-3 text-xs leading-relaxed text-ink-500">
        {SHARED_BASE_NOTE}
      </p>
    </Panel>
  )
}

function PanelCuentaMeta() {
  const navigate = useNavigate()
  const { status, token, wabaName, metaPhone, verifiedAt, ids } = useConexion()
  const connected = status === "conectada" && Boolean(token)

  return (
    <Panel
      title="Cuenta Meta"
      action={
        connected ? (
          <span className="stamp stamp--entregado stamp--container">
            <Wifi aria-hidden />
            Conectada
          </span>
        ) : (
          <span className="stamp stamp--pendiente stamp--container">
            <Wifi aria-hidden />
            Sin conexión
          </span>
        )
      }
    >
      {connected ? (
        <div className="grid gap-2 px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>WABA</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-200">{ids.wabaId}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Empresa</dt>
            <dd className="text-[0.8125rem] text-ink-200">{wabaName || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Número</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-200">{metaPhone || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Última verificación</dt>
            <dd className="text-[0.8125rem] text-ink-200">
              {verifiedAt ? `${hourMinute(verifiedAt)} · ${new Date(verifiedAt).toLocaleDateString("es-CO")}` : "—"}
            </dd>
          </div>
          <p role="note" className="border-t border-rule-soft pt-3 text-xs leading-relaxed text-ink-500">
            Las plantillas se sincronizan desde el módulo Plantillas con el token de sesión; aquí
            solo se refleja el estado de la cuenta.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <div className="grid size-12 place-items-center rounded-lg border border-rule bg-base-800 text-ink-500">
            <Link2 className="size-6" aria-hidden />
          </div>
          <div className="max-w-sm">
            <h2 className="text-sm font-bold text-ink-200">Conecta tu cuenta de WhatsApp Business</h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-400">
              Desde Conexión se guarda la sesión con Meta en este equipo y aquí se mostrará el
              estado remoto.
            </p>
          </div>
          <Button
            variant="primary"
            icon={<Link2 className="size-4" aria-hidden />}
            onClick={() => navigate("/app/conexion")}
          >
            Ir a Conexión
          </Button>
        </div>
      )}
    </Panel>
  )
}

export function SyncPage() {
  const { clients } = useClients()
  const { campaigns } = useCampaigns()
  const { threads } = useConversations()
  const { status: conexionStatus, verifiedAt } = useConexion()
  const connected = conexionStatus === "conectada"

  const datasets = useMemo(
    () =>
      buildDatasetStates({
        clientes: clients,
        campañas: campaigns,
        threads,
        sesiones: listarSesiones(),
        auditoria: listarAuditoria(),
      }),
    [clients, campaigns, threads]
  )

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <RefreshCw className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro ·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning className="text-ink-400">
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Sincronización</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-400">
          Estado de la base compartida, actividad de los datos locales y reglas de resolución de
          cambios entre computadores autorizados.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <span className="stamp stamp--pendiente stamp--container">
          <HardDrive aria-hidden />
          Local solamente
        </span>
        {connected ? (
          <span className="stamp stamp--entregado stamp--container">
            <Wifi aria-hidden />
            Meta conectada
            {verifiedAt ? ` · ${hourMinute(verifiedAt)}` : ""}
          </span>
        ) : (
          <span className="stamp stamp--pendiente stamp--container">
            <Wifi aria-hidden />
            Meta sin conexión
          </span>
        )}
        <span className="stamp stamp--fecha stamp--container">
          <Database aria-hidden />
          Base compartida: pendiente Tauri
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <PanelBaseCompartida />
        <PanelDatos datasets={datasets} />
        <div className="grid gap-4 lg:grid-cols-2">
          <PanelEsteEquipo />
          <PanelEquipos />
        </div>
        <PanelCuentaMeta />
        <PanelResolucion />
      </div>

      <p role="note" className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-600">
        Registro honesto del estado actual: la sincronización entre equipos es una decisión de
        producto pendiente (PRODUCT.md §69) y se activará con el backend Tauri + Turso. Ningún dato
        se marca como "sincronizado" mientras no exista confirmación de origen.
      </p>
    </div>
  )
}