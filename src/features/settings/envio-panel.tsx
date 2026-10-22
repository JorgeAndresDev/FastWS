import { useState } from "react"
import { FlaskConical, ShieldCheck, X } from "lucide-react"

import { Button, FormField, Panel } from "@/components/ui"
import { cn } from "@/lib/utils"
import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import {
  esDesarrollo,
  getListaBlanca,
  getModoEnvio,
  normalizarLista,
  setListaBlanca,
  setModoEnvio,
  type ModoEnvio,
} from "@/lib/envio"

const MODO_LABEL: Record<ModoEnvio, string> = {
  ensayo: "Ensayo",
  real: "Envío real",
}

const MODO_HINT: Record<ModoEnvio, string> = {
  ensayo:
    "Nada sale a Meta: la cola no inicia campañas, las respuestas de conversaciones y las pruebas de plantilla quedan bloqueadas. Es el modo seguro de fábrica.",
  real: "Los mensajes salen de verdad por WhatsApp. Cada inicio de campaña pide una confirmación explícita en la cola.",
}

export function EnvioPanel() {
  const [modo, setModoState] = useState<ModoEnvio>(getModoEnvio)
  const [confirmarReal, setConfirmarReal] = useState(false)
  const [lista, setLista] = useState(() => getListaBlanca().join("\n"))
  const [guardados, setGuardados] = useState(() => getListaBlanca().length)
  const desarrollo = esDesarrollo()

  const auditar = (titulo: string, detalle: string, entidad: string) => {
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    registrarAuditoria({
      categoria: "configuracion",
      titulo,
      detalle,
      entidad,
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
  }

  const aplicarModo = (next: ModoEnvio) => {
    if (next === modo) return
    const anterior = modo
    setModoEnvio(next)
    setModoState(next)
    setConfirmarReal(false)
    auditar("Modo de envío actualizado", `${MODO_LABEL[anterior]} → ${MODO_LABEL[next]}`, next)
  }

  const pedirModo = (next: ModoEnvio) => {
    if (next === modo) return
    if (next === "real") setConfirmarReal(true)
    else aplicarModo("ensayo")
  }

  const guardarLista = () => {
    const limpia = normalizarLista(lista.split(/[\s,;]+/).filter(Boolean))
    setListaBlanca(limpia)
    setLista(limpia.join("\n"))
    setGuardados(limpia.length)
    auditar(
      "Lista blanca de desarrollo actualizada",
      limpia.length > 0 ? `${limpia.length} número(s) permitido(s)` : "vacía: sin restricción por número",
      "envio.listaBlanca"
    )
  }

  const vaciarLista = () => {
    setListaBlanca([])
    setLista("")
    setGuardados(0)
    auditar(
      "Lista blanca de desarrollo vaciada",
      "sin restricción por número en desarrollo",
      "envio.listaBlanca"
    )
  }

  return (
    <Panel
      title="Guardas de envío"
      action={
        <span className="stamp stamp--fecha stamp--container">
          <ShieldCheck aria-hidden />
          {modo === "real" ? "Envío real" : "Modo ensayo"}
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
            Modo de envío
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de envío">
            {(["ensayo", "real"] as const).map((m) => {
              const active = m === modo
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  onClick={() => pedirModo(m)}
                  className={cn(
                    "h-9 rounded-md border px-3.5 text-[0.8125rem] font-semibold transition-colors",
                    active
                      ? "border-rule bg-base-750 text-ink-100"
                      : "border-rule bg-base-800 text-ink-300 hover:bg-base-750 hover:text-ink-100"
                  )}
                >
                  {MODO_LABEL[m]}
                </button>
              )
            })}
          </div>
          <span
            className={cn(
              "rounded-sm px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em]",
              modo === "real"
                ? "bg-brand-500/15 text-brand-300"
                : "bg-base-750 text-ink-400"
            )}
          >
            {modo === "real" ? "Activo" : "Bloqueado"}
          </span>
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          {MODO_HINT[modo]}
        </p>

        <div className="border-t border-rule-soft pt-4">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 text-ink-500">
            <FlaskConical className="size-3.5" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">
              Lista blanca de desarrollo
            </p>
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.12em]",
                desarrollo ? "bg-brand-500/15 text-brand-300" : "bg-base-750 text-ink-400"
              )}
            >
              {desarrollo ? "Se aplica" : "No aplica"}
            </span>
            {guardados > 0 && (
              <span className="font-mono text-[0.75rem] text-ink-400">
                {guardados} número{guardados === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <FormField
            label="Números de prueba"
            htmlFor="envio-lista-blanca"
            hint={
              desarrollo
                ? "Con la lista cargada, solo estos destinos salen a Meta desde esta compilación de desarrollo. Uno por línea o separados por coma; se normalizan a 57 + número."
                : "Esta lista solo se aplica en compilaciones de desarrollo. En la app instalada se ignora: el despacho de producción no depende de una preferencia local."
            }
          >
            <textarea
              id="envio-lista-blanca"
              value={lista}
              onChange={(event) => setLista(event.target.value)}
              rows={3}
              spellCheck={false}
              placeholder={"3001234567\n573001234567"}
              className="w-full resize-y rounded-md border border-rule bg-base-800 px-3 py-2 font-mono text-[0.8125rem] leading-relaxed text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60"
            />
          </FormField>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={guardarLista}>
              Guardar lista
            </Button>
            <Button size="sm" variant="ghost" onClick={vaciarLista} disabled={guardados === 0 && lista.trim() === ""}>
              Vaciar lista
            </Button>
          </div>
        </div>
      </div>

      {confirmarReal && (
        <div
          className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-modo-real-titulo"
          onKeyDown={(event) => event.key === "Escape" && setConfirmarReal(false)}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-modo-real-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                Activar envío real
              </h2>
              <Button
                size="sm"
                variant="ghost"
                aria-label="Cerrar"
                icon={<X className="size-3.5" aria-hidden />}
                onClick={() => setConfirmarReal(false)}
              />
            </header>
            <div className="px-5 py-5">
              <p className="max-w-sm leading-relaxed text-sm text-ink-300">
                Desde este momento la cola, las respuestas de conversaciones y las pruebas de
                plantilla pueden enviar mensajes reales por WhatsApp. Un mensaje enviado no se puede
                deshacer.
              </p>
              <p className="mt-3 max-w-sm leading-relaxed text-xs text-ink-500">
                Cada inicio de campaña seguirá pidiendo una confirmación explícita en la cola.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-rule-soft px-5 py-4">
              <Button size="sm" variant="secondary" onClick={() => setConfirmarReal(false)}>
                Cancelar
              </Button>
              <Button size="sm" variant="primary" onClick={() => aplicarModo("real")} autoFocus>
                Activar envío real
              </Button>
            </footer>
          </div>
        </div>
      )}
    </Panel>
  )
}
