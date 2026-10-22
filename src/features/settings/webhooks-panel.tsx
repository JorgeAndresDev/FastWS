import { useEffect, useState } from "react"
import { Link2, Link2Off, RefreshCw, ShieldCheck, TriangleAlert, Webhook } from "lucide-react"
import { sileo } from "sileo"

import { Button, FormField, Input, Panel } from "@/components/ui"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { registrarAuditoria } from "@/lib/audit-log"
import { leerSecreto } from "@/lib/secrets"
import {
  WEBHOOKS_TOKEN_LABEL,
  descargarEventos,
  errorDeWebhook,
  guardarConfigWebhooks,
  leerConfigWebhooks,
  leerErrorSync,
  leerEstadoSync,
  leerUrlConfigurada,
  limpiarConfigWebhooks,
  type WebhookErrorState,
  type WebhookSyncState,
} from "@/lib/webhooks"

type Estado = "sin-configurar" | "configurado" | "probando" | "conectado" | "error"

function fecha(value: string) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
}

export function WebhooksPanel() {
  const [url, setUrl] = useState("")
  const [token, setToken] = useState("")
  const [hayToken, setHayToken] = useState(false)
  const [estado, setEstado] = useState<Estado>("sin-configurar")
  const [mensaje, setMensaje] = useState("")
  const [ultimo, setUltimo] = useState<WebhookSyncState | null>(null)
  const [errorSync, setErrorSync] = useState<WebhookErrorState | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [probando, setProbando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)

  useEffect(() => {
    let vivo = true
    void (async () => {
      const guardado = await leerSecreto(WEBHOOKS_TOKEN_LABEL)
      if (!vivo) return
      const configurada = leerUrlConfigurada()
      setUrl(configurada)
      setHayToken(Boolean(guardado))
      setUltimo(leerEstadoSync())
      const error = leerErrorSync()
      setErrorSync(error)
      setEstado(error ? "error" : configurada && guardado ? "configurado" : "sin-configurar")
    })()
    return () => {
      vivo = false
    }
  }, [])

  const auditar = (titulo: string, detalle: string) => {
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    registrarAuditoria({
      categoria: "configuracion",
      titulo,
      detalle,
      entidad: "webhooks",
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} — ${device.code}`,
    })
  }

  const avisarCambio = () => {
    window.dispatchEvent(new Event("fastws:webhooks-cambio"))
  }

  const guardar = async () => {
    setGuardando(true)
    setMensaje("")
    const resultado = await guardarConfigWebhooks(url, token)
    setGuardando(false)
    if (!resultado.ok) {
      setEstado("error")
      setMensaje(resultado.error)
      return
    }
    setUrl(resultado.url)
    setToken("")
    const guardado = await leerSecreto(WEBHOOKS_TOKEN_LABEL)
    setHayToken(Boolean(guardado))
    setEstado("configurado")
    setMensaje("Configuración guardada. La app consultará el Worker cada 15 segundos.")
    auditar("Webhooks configurados", resultado.url)
    avisarCambio()
    sileo.success({
      title: "Webhooks configurados",
      description: "Los estados y las respuestas se actualizarán desde el Worker.",
    })
  }

  const probar = async () => {
    setProbando(true)
    setMensaje("")
    const resultado = await guardarConfigWebhooks(url, token)
    if (!resultado.ok) {
      setProbando(false)
      setEstado("error")
      setMensaje(resultado.error)
      return
    }
    setUrl(resultado.url)
    setToken("")
    const config = await leerConfigWebhooks()
    if (!config) {
      setProbando(false)
      setEstado("error")
      setMensaje("No hay token guardado para probar la conexión.")
      return
    }
    setEstado("probando")
    try {
      const respuesta = await descargarEventos({ ...config, cursor: 0 })
      setEstado("conectado")
      setHayToken(true)
      setErrorSync(null)
      setMensaje(
        `Worker disponible. ${respuesta.eventos.length} evento(s) en la primera página.`
      )
      auditar("Webhooks probados", resultado.url)
      avisarCambio()
      sileo.success({
        title: "Worker disponible",
        description: "La URL y el token respondieron correctamente.",
      })
    } catch (error) {
      const texto = errorDeWebhook(error)
      setEstado("error")
      setMensaje(texto)
      sileo.error({ title: "No se pudo probar el Worker", description: texto })
    } finally {
      setProbando(false)
    }
  }

  const desconectar = async () => {
    await limpiarConfigWebhooks()
    setUrl("")
    setToken("")
    setHayToken(false)
    setEstado("sin-configurar")
    setMensaje("")
    setUltimo(null)
    setErrorSync(null)
    setConfirmar(false)
    auditar("Webhooks desconectados", "URL y token del Worker borrados de este equipo")
    avisarCambio()
    sileo.success({
      title: "Webhooks desconectados",
      description: "La app dejó de consultar el Worker de Meta.",
    })
  }

  const configurado = Boolean(url) && hayToken
  const stamp =
    estado === "error" || errorSync ? (
      <span className="stamp stamp--fallido stamp--container">
        <TriangleAlert aria-hidden />
        Con error
      </span>
    ) : estado === "conectado" ? (
      <span className="stamp stamp--entregado stamp--container">
        <ShieldCheck aria-hidden />
        Conectado
      </span>
    ) : configurado ? (
      <span className="stamp stamp--proceso stamp--container">
        <Webhook aria-hidden />
        Configurado
      </span>
    ) : (
      <span className="stamp stamp--fecha stamp--container">
        <Link2Off aria-hidden />
        Sin configurar
      </span>
    )

  return (
    <Panel title="Webhooks de Meta" action={stamp}>
      <div className="flex flex-col gap-4 px-5 py-4">
        <p className="text-xs leading-relaxed text-ink-500">
          Meta entrega los estados entregado/leído y las respuestas al Worker. La app consulta ese
          Worker cada 15 segundos y actualiza las campañas y conversaciones locales. Sin esta
          configuración, esas cifras quedan como pendientes de confirmación.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          <FormField
            label="URL del Worker"
            htmlFor="webhooks-url"
            hint="La base, sin /events ni /webhook. Ejemplo: https://fastws-webhooks.tu-subdominio.workers.dev"
          >
            <Input
              id="webhooks-url"
              mono
              placeholder="https://fastws-webhooks.workers.dev"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>
          <FormField
            label="Token del escritorio"
            htmlFor="webhooks-token"
            hint={
              hayToken
                ? "Ya hay un token guardado. Déjalo vacío para conservarlo."
                : "El DESKTOP_TOKEN que configuraste como secreto del Worker."
            }
          >
            <Input
              id="webhooks-token"
              type="password"
              placeholder={hayToken ? "Token guardado" : "Bearer token"}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              autoComplete="new-password"
              spellCheck={false}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            id="webhooks-guardar"
            variant="primary"
            icon={<Link2 className="size-4" aria-hidden />}
            onClick={() => void guardar()}
            loading={guardando}
          >
            Guardar
          </Button>
          <Button
            id="webhooks-probar"
            variant="secondary"
            icon={<RefreshCw className="size-4" aria-hidden />}
            onClick={() => void probar()}
            loading={probando}
          >
            Probar conexión
          </Button>
          {confirmar ? (
            <>
              <Button
                id="webhooks-desconectar"
                variant="danger"
                icon={<Link2Off className="size-4" aria-hidden />}
                onClick={() => void desconectar()}
              >
                Sí, desconectar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmar(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              id="webhooks-desconectar"
              variant="ghost"
              icon={<Link2Off className="size-4" aria-hidden />}
              onClick={() => setConfirmar(true)}
            >
              Desconectar
            </Button>
          )}
        </div>

        {mensaje && (
          <p
            role={estado === "error" ? "alert" : "status"}
            className={
              estado === "error"
                ? "rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2 text-xs leading-relaxed text-fallido"
                : "rounded-md border border-rule-soft bg-base-750 px-3 py-2 text-xs leading-relaxed text-ink-300"
            }
          >
            {mensaje}
          </p>
        )}

        {errorSync && (
          <p role="alert" className="text-xs leading-relaxed text-fallido">
            Último error de consulta ({fecha(errorSync.at)}): {errorSync.message}
          </p>
        )}

        {ultimo && (
          <p className="text-xs text-ink-500">
            Última consulta correcta: {fecha(ultimo.at)} · {ultimo.eventos} evento(s).
          </p>
        )}

        <p role="note" className="border-t border-rule-soft pt-3 text-xs leading-relaxed text-ink-500">
          En Meta, la URL de devolución de llamada es{" "}
          <code className="font-mono text-ink-300">{url || "https://…"}/webhook</code> y el token de
          verificación es el <code className="font-mono text-ink-300">META_VERIFY_TOKEN</code> del
          Worker. El campo suscrito es <code className="font-mono text-ink-300">messages</code>.
        </p>
      </div>
    </Panel>
  )
}
