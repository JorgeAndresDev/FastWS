import { useState } from "react"
import type { FormEvent } from "react"
import {
  CircleAlert,
  CircleCheck,
  Link2,
  Link2Off,
  TriangleAlert,
  Wifi,
  X,
} from "lucide-react"
import { sileo } from "sileo"

import { Button, FormField, Input, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn } from "@/lib/utils"

import { useConexion } from "./conexion-store"

const digits = (v: string) => v.replace(/\D/g, "")

function EstadoDeConexion({ onRequestDesconectar }: { onRequestDesconectar: () => void }) {
  const { status, metaPhone, wabaName, ids, lastError, verifiedAt } = useConexion()

  if (status === "conectada") {
    return (
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="stamp stamp--entregado stamp--container">
            <Wifi aria-hidden />
            Listo para despacho
          </span>
          {verifiedAt && (
            <span className="text-xs text-ink-500">
              Verificada{" "}
              <time className="font-mono tabular-nums text-ink-400" dateTime={verifiedAt}>
                {new Date(verifiedAt).toLocaleTimeString("es-CO", { hour12: false })}
              </time>
            </span>
          )}
        </div>
        <dl className="grid gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              Número de la empresa (dueño del token)
            </dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{metaPhone}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              Cuenta de WhatsApp Business
            </dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">
              {wabaName || ids.wabaId}
            </dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-ink-500">
          La conexión queda activa y se revalida al recargar la app. Solo se borra si pulsas{" "}
          <span className="font-semibold text-ink-300">Desconectar</span>, y entonces también se
          quitan los identificadores de este equipo.
        </p>
        <div className="flex items-center gap-3 border-t border-rule-soft pt-4">
          <Button
            variant="danger"
            icon={<Link2Off className="size-4" aria-hidden />}
            onClick={onRequestDesconectar}
          >
            Desconectar
          </Button>
        </div>
      </div>
    )
  }

  if (status === "probando") {
    return (
      <div className="flex flex-col gap-4 px-5 py-4">
        <span className="stamp stamp--proceso stamp--container">
          <Link2 aria-hidden />
          Probando conexión…
        </span>
        <p className="text-xs leading-relaxed text-ink-500">
          Se verifica el token contra la WhatsApp Business API. Los identificadores no salen de este
          equipo.
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-4 px-5 py-4">
        <span className="stamp stamp--fallido stamp--container">
          <TriangleAlert aria-hidden />
          Sin conexión Meta
        </span>
        {lastError && (
          <div
            role="alert"
            className="flex flex-col gap-1.5 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2"
          >
            <p className="flex items-start gap-2 text-xs leading-relaxed text-fallido">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {lastError.message}
            </p>
            {lastError.code && (
              <p className="pl-[1.375rem] font-mono text-[0.75rem] text-fallido/80">
                código Meta {lastError.code}
              </p>
            )}
          </div>
        )}
        <p className="text-xs leading-relaxed text-ink-500">
          El envío queda en pausa (modo local) hasta restablecer la conexión. Revisa el token y los
          identificadores en el panel anterior.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <span className="stamp stamp--pendiente stamp--container">
        <Link2Off aria-hidden />
        Sin configurar
      </span>
      <p className="text-xs leading-relaxed text-ink-500">
        Ingresa las credenciales de la WhatsApp Business API y pulsa{" "}
        <span className="font-semibold text-ink-300">Probar conexión</span>. Hasta entonces el
        despacho permanece en pausa.
      </p>
    </div>
  )
}

export function ConnectionPage() {
  const { ids, guardarIds, prueba, status, desconectar } = useConexion()

  const [phoneNumberId, setPhoneNumberId] = useState(ids.phoneNumberId)
  const [wabaId, setWabaId] = useState(ids.wabaId)
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [confirmarDesconexion, setConfirmarDesconexion] = useState(false)
  const [errors, setErrors] = useState<{
    phoneNumberId?: string
    wabaId?: string
    token?: string
  }>({})

  const probing = status === "probando"

  const validate = () => {
    const e: typeof errors = {}
    if (!phoneNumberId) e.phoneNumberId = "Escribe el identificador del número de teléfono."
    else if (!/^\d+$/.test(phoneNumberId))
      e.phoneNumberId = "El identificador solo contiene dígitos."
    if (!wabaId) e.wabaId = "Escribe el identificador de la cuenta de WhatsApp Business."
    else if (!/^\d+$/.test(wabaId)) e.wabaId = "El identificador solo contiene dígitos."
    if (!token) e.token = "Pega el token de acceso para probar la conexión."
    return e
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return

    const idsLimpias = {
      phoneNumberId: digits(phoneNumberId),
      wabaId: digits(wabaId),
    }
    guardarIds(idsLimpias)

    const ok = await prueba(token.trim(), idsLimpias)
    if (ok) {
      setToken("")
      setShowToken(false)
      sileo.success({
        title: "Conexión establecida",
        description: "FastWS queda listo para despachar con la WhatsApp Business API.",
      })
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Link2 className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Sistema ·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning>
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Conexión</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Credenciales de la API oficial de Meta, prueba de conexión y estado del despacho. Los
          envíos salen únicamente desde un número de WhatsApp Business verificado.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Panel
          title="1 · Credenciales de Meta"
          action={
            <span className="tabular-nums text-xs text-ink-500">
              {ids.phoneNumberId ? "Identificadores guardados" : "Sin guardar"}
            </span>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4" noValidate>
            <FormField
              label="Identificador del número de teléfono"
              htmlFor="conexion-phoneid"
              hint="Phone Number ID: identifica el número de la empresa que firmará los envíos y debe pertenecer a la cuenta WABA ingresada."
              error={errors.phoneNumberId}
            >
              <Input
                id="conexion-phoneid"
                name="phoneNumberId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                mono
                spellCheck={false}
                value={phoneNumberId}
                onChange={(event) => setPhoneNumberId(digits(event.target.value))}
                placeholder="1249440798…"
                invalid={Boolean(errors.phoneNumberId)}
                aria-describedby={
                  errors.phoneNumberId ? "conexion-phoneid-error" : "conexion-phoneid-hint"
                }
                disabled={probing}
              />
            </FormField>

            <FormField
              label="Identificador de la cuenta WhatsApp Business"
              htmlFor="conexion-wabaid"
              hint="WABA ID, el identificador de la cuenta de WhatsApp Business."
              error={errors.wabaId}
            >
              <Input
                id="conexion-wabaid"
                name="wabaId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                mono
                spellCheck={false}
                value={wabaId}
                onChange={(event) => setWabaId(digits(event.target.value))}
                placeholder="9306282095…"
                invalid={Boolean(errors.wabaId)}
                aria-describedby={
                  errors.wabaId ? "conexion-wabaid-error" : "conexion-wabaid-hint"
                }
                disabled={probing}
              />
            </FormField>

            <FormField
              label="Token de acceso"
              htmlFor="conexion-token"
              hint="Se conserva solo para esta pestaña: al recargar la app se revalida; al cerrar la pestaña o pulsar «Desconectar» se borra. Nunca lo compartas."
              error={errors.token}
            >
              <div className="relative">
                <Input
                  id="conexion-token"
                  name="token"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  mono
                  spellCheck={false}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  invalid={Boolean(errors.token)}
                  aria-describedby={
                    errors.token ? "conexion-token-error" : "conexion-token-hint"
                  }
                  placeholder="EAAQ…"
                  className="pr-24"
                  disabled={probing}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-200"
                  aria-pressed={showToken}
                  aria-controls="conexion-token"
                >
                  {showToken ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </FormField>

            <div className="flex flex-col gap-3 border-t border-rule-soft pt-4">
              <div className="flex items-center gap-4">
                <Button
                  type="submit"
                  variant="primary"
                  icon={<Link2 className="size-4" aria-hidden />}
                  loading={probing}
                  className="min-w-48"
                >
                  {probing ? "Probando conexión…" : "Probar conexión"}
                </Button>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs",
                    status === "conectada" ? "text-entregado" : "text-ink-500"
                  )}
                >
                  <CircleCheck className="size-3.5" aria-hidden />
                  {status === "conectada" ? "Verificada ahora" : "Sin verificar en esta sesión"}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-ink-600">
                Los identificadores se conservan en este equipo para no re-escribirlos, y el token
                se revalida contra Meta en cada recarga de la app. «Desconectar» borra la sesión y
                los identificadores. La persistencia cifrada llega con el backend (Tauri).
              </p>
            </div>
          </form>
        </Panel>

        <Panel title="2 · Estado de la conexión">
          <EstadoDeConexion onRequestDesconectar={() => setConfirmarDesconexion(true)} />
        </Panel>
      </div>

      {confirmarDesconexion && (
        <div
          className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-desconexion-titulo"
          onKeyDown={(e) => e.key === "Escape" && setConfirmarDesconexion(false)}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-desconexion-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                Desconectar Meta
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cerrar"
                icon={<X className="size-3.5" aria-hidden />}
                onClick={() => setConfirmarDesconexion(false)}
              />
            </header>
            <div className="px-5 py-5">
              <p className="text-base font-semibold text-ink-100">
                Se borra la sesión de este equipo
              </p>
              <p className="mt-4 max-w-sm leading-relaxed text-xs text-ink-500">
                El token de acceso y los identificadores del número y de la cuenta WABA se quitan de
                este equipo. El despacho queda en pausa y deberás volver a conectarte.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-4">
              <Button size="sm" variant="secondary" onClick={() => setConfirmarDesconexion(false)}>
                Volver
              </Button>
              <Button
                size="sm"
                variant="danger"
                icon={<Link2Off className="size-3.5" aria-hidden />}
                onClick={() => {
                  desconectar()
                  setConfirmarDesconexion(false)
                }}
                autoFocus
              >
                Desconectar y borrar
              </Button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}