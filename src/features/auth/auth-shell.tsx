import type { ReactNode } from "react"
import { ShieldCheck, Wifi, WifiOff } from "lucide-react"

import { formatDateStamp } from "@/app/date-stamp"
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

const stepTone: Record<TurnStep["tone"], string> = {
  hecho: "border-entregado/30 bg-entregado/10 text-entregado",
  activo: "border-brand-500/40 bg-brand-500/10 text-brand-400",
  pendiente: "border-rule bg-base-800 text-ink-500",
}

const stepStampTone: Record<NonNullable<TurnStep["stamp"]>["tone"], string> = {
  entregado: "stamp--entregado",
  proceso: "stamp--proceso",
  pendiente: "stamp--pendiente",
}

interface AuthShellProps {
  steps: TurnStep[]
  title: string
  intro: string
  device: DeviceIdentity
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ steps, title, intro, device, children, footer }: AuthShellProps) {
  const online = useOnline()

  return (
    <div className="grid min-h-screen bg-base-950 lg:grid-cols-[minmax(320px,2fr)_3fr]">
      <aside className="flex flex-col justify-between border-b border-rule-soft bg-base-900 px-6 py-6 lg:border-b-0 lg:border-r lg:px-8 lg:py-8">
        <div>
          <Wordmark descriptor="Planilla de despacho" />

          <time
            className="stamp stamp--fecha mt-8 inline-flex"
            dateTime={new Date().toISOString()}
            suppressHydrationWarning
          >
            {formatDateStamp()}
          </time>

          <p className="mt-6 text-lg font-bold tracking-tight text-ink-100">Bitácora de turno</p>
          <p className="mt-1 max-w-xs text-[0.8125rem] leading-relaxed text-ink-400">
            Cada entrada se anota en la planilla. El turno queda sellado a su nombre hasta el
            cierre.
          </p>

          <ol className="mt-6" aria-label="Entradas del turno">
            {steps.map((step, index) => (
              <li key={step.index} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-[0.6875rem] top-6 w-px bg-rule-soft"
                  />
                )}
                <span
                  className={cn(
                    "relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border font-mono text-[0.6875rem]",
                    stepTone[step.tone]
                  )}
                >
                  {step.index}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-semibold text-ink-100">{step.label}</p>
                  {step.detail && (
                    <p className={cn("mt-0.5 text-xs text-ink-500", step.monoDetail && "font-mono")}>
                      {step.detail}
                    </p>
                  )}
                  {step.stamp && (
                    <span className={cn("stamp mt-1.5", stepStampTone[step.stamp.tone])}>
                      {step.stamp.label}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-rule-soft pt-4">
          <span className="stamp stamp--proceso">
            <ShieldCheck aria-hidden />
            {device.id}
          </span>
          {online ? (
            <span className="stamp stamp--entregado">
              <Wifi aria-hidden />
              Conectado
            </span>
          ) : (
            <span className="stamp stamp--fallido">
              <WifiOff aria-hidden />
              Sin conexión
            </span>
          )}
        </div>
      </aside>

      <div className="flex flex-col justify-center px-6 py-10 lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-ink-100">{title}</h1>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-400">{intro}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 border-t border-rule-soft pt-4">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
