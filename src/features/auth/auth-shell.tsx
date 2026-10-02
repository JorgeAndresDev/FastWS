import type { ReactNode } from "react"
import { ShieldCheck, Wifi, WifiOff } from "lucide-react"

import { Wordmark } from "@/app/wordmark"

import { useOnline } from "./use-online"
import type { DeviceIdentity } from "./device"

interface AuthShellProps {
  device: DeviceIdentity
  title: string
  intro?: string
  footer?: ReactNode
  children: ReactNode
}

/**
 * Mundo de entrada en dos columnas: marca grande a la izquierda y formulario en
 * tarjeta de cristal a la derecha, sobre un fondo oscuro de marca coordinado con
 * el resto del sistema.
 *
 * La bitácora de paso ya no ocupa la pantalla; la trazabilidad de turno vive en
 * los sellos de dispositivo y conexión al pie. Ver DESIGN.md y el surface brief.
 *
 * `.auth-grid` declara sus propios tokens (los del tema oscuro), así que el
 * Wordmark, los botones, los Input y los sellos se leen bien sin cambiar una
 * sola clase. Es la excepción documentada al Flat-By-Tone y a la prohibición de
 * blur: el login es la puerta de entrada, no el sistema operativo de despacho,
 * y no sigue el conmutador de tema.
 */
export function AuthShell({ device, title, intro, footer, children }: AuthShellProps) {
  const online = useOnline()

  return (
    <main className="auth-stage">
      <div className="auth-forma auth-forma--a" aria-hidden />
      <div className="auth-forma auth-forma--b" aria-hidden />

      <div className="auth-grid">
        <div className="auth-brand">
          <Wordmark size="lg" />
          <p className="auth-brand__tagline">
            Despacho masivo de WhatsApp por la API oficial de Meta. La planilla de
            su equipo, del lado del operador.
          </p>
        </div>

        <div className="auth-card">
          <header>
            <h1 className="auth-card__titulo">{title}</h1>
            {intro ? <p className="auth-card__intro">{intro}</p> : null}
          </header>

          <div className="min-h-0 overflow-y-auto pr-0.5">{children}</div>

          {footer ? (
            <div className="border-t border-rule-soft pt-3.5 text-center">{footer}</div>
          ) : null}

          <div className="auth-card__pie">
            <span className="stamp stamp--fecha stamp--container">
              <ShieldCheck aria-hidden />
              {device.id}
            </span>
            <span role="status" className="stamp stamp--fecha stamp--container">
              {online ? <Wifi aria-hidden /> : <WifiOff aria-hidden />}
              {online ? "Listo para despacho" : "Modo local · envíos en pausa"}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
