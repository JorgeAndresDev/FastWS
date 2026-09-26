import { useMemo, useState } from "react"
import { useEffect } from "react"
import { Check, MonitorSmartphone, Send, UserRound } from "lucide-react"

import { Button, FormField, Input, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { getDeviceIdentity, setDeviceName, useAuth } from "@/features/auth"
import { sessionKind } from "@/features/auth/session"
import { listarSesiones, type SesionRegistro } from "@/lib/session-log"
import { cn, formatNumber } from "@/lib/utils"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { CampaignChip } from "@/features/campaigns/campaign-status"
import { hourMinute, shortDay } from "@/features/reports/report-dates"

const label = "text-[0.75rem] font-bold uppercase tracking-[0.14em]"
const th = cn(label, "px-4 py-2 text-left text-ink-500")
const td = "px-4 py-2.5"

function durar(inicio: string, fin?: string) {
  const desde = new Date(inicio).getTime()
  const hasta = fin ? new Date(fin).getTime() : Date.now()
  const ms = Math.max(0, hasta - desde)
  const horas = Math.floor(ms / 3_600_000)
  const minutos = Math.floor((ms % 3_600_000) / 60_000)
  if (horas > 0) return `${horas} h ${minutos} min`
  return `${minutos} min`
}

function OrigenChip({ origen }: { origen: SesionRegistro["origen"] }) {
  return origen === "inicio" ? (
    <span className="stamp stamp--entregado">Inicio de turno</span>
  ) : (
    <span className="stamp stamp--fecha">Turno restaurado</span>
  )
}

function TipoSesionChip({ recordar }: { recordar: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 font-mono text-[0.75rem] font-semibold",
        recordar ? "border-rule bg-base-800 text-ink-300" : "border-rule-soft bg-base-800/40 text-ink-500"
      )}
    >
      {recordar ? "Recordada" : "Temporal"}
    </span>
  )
}

function EmptyState({ note }: { note: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="stamp stamp--fecha stamp--container">Sin registro</span>
      <p className="max-w-sm text-xs leading-relaxed text-ink-500">{note}</p>
    </div>
  )
}

function PanelEquipo() {
  const device = useMemo(() => getDeviceIdentity(), [])
  const [nombre, setNombre] = useState(device.nombre ?? "")
  const [guardado, setGuardado] = useState(false)
  const [guardadoNombre, setGuardadoNombre] = useState(device.nombre ?? "")

  const guardarNombre = () => {
    const limpio = nombre.trim()
    setDeviceName(limpio)
    setGuardadoNombre(limpio)
    setGuardado(true)
  }

  return (
    <Panel
      title="Este equipo"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <MonitorSmartphone aria-hidden />
          Registro local
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-2xl font-bold tracking-tight text-ink-100">{device.code}</p>
          <span className="rounded-md border border-rule bg-base-800 px-2 py-0.5 font-mono text-xs text-ink-400">
            {device.id}
          </span>
          <span className="rounded-md border border-rule bg-base-800 px-2 py-0.5 text-xs text-ink-400">
            {device.platform}
          </span>
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          Identidad generada la primera vez que se abrió la app y única para esta instalación.
        </p>
        <FormField
          label="Nombre del equipo"
          htmlFor="nombre-equipo"
          hint="Un apodo visible solo en esta instalación; se guarda en el equipo."
        >
          <div className="flex items-center gap-2">
            <Input
              id="nombre-equipo"
              value={nombre}
              onChange={(event) => {
                setNombre(event.target.value)
                setGuardado(false)
              }}
              placeholder="Ej. Oficina, Recepción…"
              maxLength={32}
              className="flex-1"
            />
            <Button
              size="sm"
              disabled={!nombre.trim() || nombre.trim() === guardadoNombre}
              onClick={guardarNombre}
              icon={<Check className="size-4" aria-hidden />}
            >
              {guardado && nombre.trim() === guardadoNombre ? "Guardado" : "Guardar"}
            </Button>
          </div>
        </FormField>
      </div>
    </Panel>
  )
}

function PanelTurno() {
  const { user } = useAuth()
  const turno = sessionKind()

  return (
    <Panel title="Turno de sesión">
      {user ? (
        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="stamp stamp--entregado stamp--container">
              <UserRound aria-hidden />
              Turno activo
            </span>
            {turno && <TipoSesionChip recordar={turno === "recordada"} />}
          </div>
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <dt className={cn(label, "text-ink-500")}>Usuario</dt>
              <dd className="text-[0.8125rem] font-semibold text-ink-100">{user.name}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className={cn(label, "text-ink-500")}>Rol</dt>
              <dd className="text-[0.8125rem] text-ink-300">{user.role}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className={cn(label, "text-ink-500")}>Correo</dt>
              <dd className="break-all font-mono text-[0.8125rem] text-ink-300">{user.email}</dd>
            </div>
          </div>
          <p role="note" className="border-t border-rule-soft pt-3 text-xs leading-relaxed text-ink-500">
            El cierre del turno se hace desde el menú de la cuenta y queda registrado en la
            bitácora.
          </p>
        </div>
      ) : (
        <EmptyState note="No hay un turno abierto. Inicia sesión para verlo aquí." />
      )}
    </Panel>
  )
}

function PanelBitacora() {
  const { user } = useAuth()
  const [registros, setRegistros] = useState<SesionRegistro[]>(listarSesiones)

  useEffect(() => {
    setRegistros(listarSesiones())
  }, [user])

  return (
    <Panel
      title="Bitácora de sesiones"
      action={
        <span className={cn(label, "tabular-nums text-ink-500")}>
          {formatNumber(registros.length)} turnos en este equipo
        </span>
      }
    >
      {registros.length > 0 ? (
        <div className="max-h-[30rem] overflow-x-auto overflow-y-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-rule-soft">
                {["Turno", "Inicio", "Cierre", "Duración", "Usuario", "Sesión", "Equipo"].map((h) => (
                  <th key={h} scope="col" className={cn(th, h === "Inicio" || h === "Cierre" || h === "Duración" ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-rule-soft last:border-0 hover:bg-base-800/45"
                >
                  <td className={td}>
                    <OrigenChip origen={r.origen} />
                  </td>
                  <td className={cn(td, "text-right font-mono text-[0.75rem] tabular-nums text-ink-100")}>
                    {formatFechita(r.inicio)}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {r.fin ? (
                      <span className="font-mono text-[0.75rem] tabular-nums text-ink-500">
                        {formatFechita(r.fin)}
                      </span>
                    ) : (
                      <span className="stamp stamp--proceso">Activa</span>
                    )}
                  </td>
                  <td className={cn(td, "text-right whitespace-nowrap text-xs tabular-nums text-ink-400")}>
                    {durar(r.inicio, r.fin)}
                  </td>
                  <td className={td}>
                    <p className="text-[0.8125rem] font-semibold text-ink-100">{r.usuario}</p>
                    <p className="text-xs text-ink-500">{r.rol}</p>
                  </td>
                  <td className={td}>
                    <TipoSesionChip recordar={r.recordar} />
                  </td>
                  <td className={cn(td, "text-xs text-ink-500")}>
                    {r.plataforma} <span className="text-ink-600">· {r.equipo}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState note="La bitácora empieza a registrar turnos con el próximo inicio de sesión." />
      )}
    </Panel>
  )
}

function formatFechita(iso: string) {
  const key = iso.slice(0, 10)
  return (
    <span className="block">
      {shortDay(key + "T12:00:00")}
      <span className="text-ink-600"> · {hourMinute(iso)}</span>
    </span>
  )
}

function PanelPulso() {
  const { campaigns } = useCampaigns()
  const device = useMemo(() => getDeviceIdentity(), [])

  const despachos = useMemo(
    () =>
      campaigns
        .filter((c) => c.dispatchedBy?.dispositivo.includes(device.code))
        .sort((a, b) => (b.dispatchedBy?.at ?? "").localeCompare(a.dispatchedBy?.at ?? "")),
    [campaigns, device.code]
  )

  const activas = despachos.filter((c) => c.status === "EN_PROCESO").length

  return (
    <Panel
      title="Pulso desde este equipo"
      action={
        <span className={cn(label, "tabular-nums text-ink-500")}>
          {formatNumber(despachos.length)} campañas
        </span>
      }
    >
      {despachos.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="stamp stamp--entregado stamp--container">
              <Send aria-hidden />
              {formatNumber(despachos.length)} despachadas desde {device.code}
            </span>
            <span className="stamp stamp--proceso stamp--container">{formatNumber(activas)} en proceso</span>
          </div>
          <ul className="divide-y divide-rule-soft">
            {despachos.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[0.8125rem] font-semibold text-ink-100">{c.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {c.dispatchedBy?.usuario}
                    {c.dispatchedBy?.at
                      ? ` · ${shortDay(c.dispatchedBy.at + "T12:00:00")} ${hourMinute(c.dispatchedBy.at)}`
                      : ""}
                  </p>
                </div>
                <CampaignChip status={c.status} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState note="Ninguna campaña despachada desde este equipo todavía. Cada inicio de despacho queda atribuido aquí." />
      )}
    </Panel>
  )
}

export function DevicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <MonitorSmartphone className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro ·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning className="text-ink-400">
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">
          Usuarios y dispositivos
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-400">
          Identidad del equipo actual y bitácora real de los turnos que se abren en esta
          instalación.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelEquipo />
        <PanelTurno />
      </div>

      <div className="mt-4 grid gap-4">
        <PanelBitacora />
        <PanelPulso />
      </div>

      <p role="note" className="mt-4 max-w-2xl text-xs leading-relaxed text-ink-600">
        La identidad y la bitácora son locales a este equipo: cada instalación es una isla hasta
        que el backend (Tauri) sincronice equipos, usuarios y auditoría. El módulo Auditoría
        consumirá este mismo registro cuando llegue.
      </p>
    </div>
  )
}