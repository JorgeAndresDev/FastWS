import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Activity, Check, Clock3, ShieldCheck, Wifi, WifiOff } from "lucide-react"

import { Wordmark } from "@/app/wordmark"
import { cn } from "@/lib/utils"

import { useOnline } from "./use-online"
import type { DeviceIdentity } from "./device"

export interface TurnStep {
  index: number
  label: string
  detail?: string
  monoDetail?: boolean
  tone: "hecho" | "activo" | "pendiente"
  stamp?: { label: string; tone: "entregado" | "proceso" | "pendiente" }
}

// El sello de paso comparte el vocabulario de `StatusStamp`: Check, Activity y
// Clock3 cuentan lo mismo que Proceso, Entregado y Pendiente en la cola.
const stepStampIcon: Record<NonNullable<TurnStep["stamp"]>["tone"], LucideIcon> = {
  entregado: Check,
  proceso: Activity,
  pendiente: Clock3,
}

const stepTone: Record<TurnStep["tone"], string> = {
  hecho: "auth-turno__num--hecho",
  activo: "auth-turno__num--activo",
  pendiente: "auth-turno__num--pendiente",
}

const stepStampTone: Record<NonNullable<TurnStep["stamp"]>["tone"], string> = {
  entregado: "stamp--entregado",
  proceso: "stamp--proceso",
  pendiente: "stamp--pendiente",
}

interface AuthShellProps {
  steps: TurnStep[]
  device: DeviceIdentity
  title: string
  intro?: string
  footer?: ReactNode
  children: ReactNode
}

/**
 * Mundo de entrada: fondo azul claro con formas desenfocadas, contenedor azul
 * intenso y tarjeta de cristal. El panel declara sus propios tokens
 * (`.auth-panel` en index.css), asi que el Wordmark, los botones y los sellos
 * se leen bien sobre azul sin cambiar una sola clase.
 *
 * La bitácora de turno se conserva, pero como stepper horizontal dentro de la
 * tarjeta: entrar sigue siendo fichar la apertura del turno, no crear una
 * cuenta. Ver DESIGN.md §Themes y la excepción de la superficie de auth.
 */
export function AuthShell({ steps, device, title, intro, footer, children }: AuthShellProps) {
  const online = useOnline()

  return (
    <main className="auth-stage">
      <div className="auth-forma auth-forma--a" aria-hidden />
      <div className="auth-forma auth-forma--b" aria-hidden />
      <div className="auth-forma auth-forma--e" aria-hidden />

      <div className="auth-panel">
        {/* Dentro del panel, no detrás: con la tarjeta al centro, los flancos
            son el único sitio con aire donde las formas se ven. */}
        <div className="auth-forma auth-forma--f" aria-hidden />
        <div className="auth-forma auth-forma--g" aria-hidden />
        <div className="auth-forma auth-forma--d" aria-hidden />

        <div className="auth-card">
          <Wordmark className="justify-center" />

          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-ink-100">{title}</h1>
            {intro ? (
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-400">{intro}</p>
            ) : null}
          </header>

          <ol className="auth-turno" aria-label="Entradas del turno">
            {steps.map((step, index) => (
              <li key={step.index} className="auth-turno__paso">
                {index < steps.length - 1 ? (
                  <span className="auth-turno__rail" aria-hidden />
                ) : null}
                <span className={cn("auth-turno__num", stepTone[step.tone])} aria-hidden>
                  {step.index}
                </span>
                <div className="auth-turno__cuerpo">
                  <div className="auth-turno__fila">
                    <p className="auth-turno__etiqueta text-ink-100">{step.label}</p>
                    {step.stamp ? <StepStamp stamp={step.stamp} /> : null}
                  </div>
                  {step.detail ? (
                    <p
                      className={cn(
                        "auth-turno__detalle",
                        step.monoDetail && "font-mono"
                      )}
                    >
                      {step.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <div className="min-h-0 overflow-y-auto pr-0.5">{children}</div>

          {footer ? (
            <div className="border-t border-rule-soft pt-3.5 text-center">{footer}</div>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="stamp stamp--fecha stamp--container">
              <ShieldCheck aria-hidden />
              {device.id}
            </span>
            <span
              role="status"
              className="stamp stamp--fecha stamp--container"
            >
              {online ? <Wifi aria-hidden /> : <WifiOff aria-hidden />}
              {online ? "Listo para despacho" : "Modo local · envíos en pausa"}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}

function StepStamp({ stamp }: { stamp: NonNullable<TurnStep["stamp"]> }) {
  const Icon = stepStampIcon[stamp.tone]
  return (
    <span className={cn("stamp stamp--container", stepStampTone[stamp.tone])}>
      <Icon aria-hidden />
      {stamp.label}
    </span>
  )
}
