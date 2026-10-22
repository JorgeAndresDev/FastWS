import { useCallback, useEffect, useRef } from "react"
import { sileo } from "sileo"

import { useAuth } from "@/features/auth"
import { useCampaigns } from "@/features/campaigns/campaigns-store"
import { useConversations } from "@/features/conversations/conversations-store"
import { writeDurable } from "@/lib/db/session-scope"
import {
  WEBHOOKS_CURSOR_KEY,
  WEBHOOKS_INTERVALO_MS,
  descargarEventos,
  errorDeWebhook,
  estadoDeEvento,
  guardarErrorSync,
  guardarEstadoSync,
  leerConfigWebhooks,
  limpiarErrorSync,
  mensajeDeEvento,
} from "@/lib/webhooks"

export function WebhooksPoller() {
  const { user } = useAuth()
  const { aplicarEstadoMeta: aplicarEstadoCampania } = useCampaigns()
  const {
    aplicarEstadoMeta: aplicarEstadoConversacion,
    recibirMensaje,
  } = useConversations()
  const enVuelo = useRef(false)

  const tick = useCallback(async () => {
    if (enVuelo.current) return
    enVuelo.current = true
    try {
      const config = await leerConfigWebhooks()
      if (!config) {
        limpiarErrorSync()
        return
      }

      let cursor = config.cursor
      let total = 0
      let entrantes = 0
      for (let pagina = 0; pagina < 5; pagina += 1) {
        const resultado = await descargarEventos({ ...config, cursor })
        for (const evento of resultado.eventos) {
          if (evento.type === "status") {
            const estado = estadoDeEvento(evento)
            if (!estado) continue
            const error = { code: estado.errorCode, message: estado.errorMessage }
            aplicarEstadoCampania(estado.metaId, estado.estado, error)
            aplicarEstadoConversacion(estado.metaId, estado.estado, error)
          } else if (evento.type === "message") {
            const mensaje = mensajeDeEvento(evento)
            if (mensaje && recibirMensaje(mensaje)) entrantes += 1
          }
        }
        total += resultado.eventos.length
        cursor = resultado.cursor
        writeDurable(WEBHOOKS_CURSOR_KEY, JSON.stringify(cursor))
        if (!resultado.hasMore) break
      }

      guardarEstadoSync(total)
      limpiarErrorSync()
      if (entrantes > 0) {
        sileo.success({
          title: entrantes === 1 ? "Nuevo mensaje de WhatsApp" : `${entrantes} mensajes nuevos`,
          description:
            entrantes === 1
              ? "La conversación se actualizó con la entrada de Meta."
              : "Las conversaciones se actualizaron con las entradas de Meta.",
        })
      }
    } catch (error) {
      guardarErrorSync(errorDeWebhook(error))
    } finally {
      enVuelo.current = false
    }
  }, [aplicarEstadoCampania, aplicarEstadoConversacion, recibirMensaje])

  useEffect(() => {
    if (!user) return
    let vivo = true
    const ejecutar = () => {
      if (vivo) void tick()
    }
    ejecutar()
    const timer = window.setInterval(ejecutar, WEBHOOKS_INTERVALO_MS)
    window.addEventListener("fastws:webhooks-cambio", ejecutar)
    return () => {
      vivo = false
      window.clearInterval(timer)
      window.removeEventListener("fastws:webhooks-cambio", ejecutar)
    }
  }, [user, tick])

  return null
}
