import type { LucideIcon } from "lucide-react"

import { Kbd } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"

interface ModulePageProps {
  icon: LucideIcon
  title: string
  description: string
  segment?: string
}

export function ModulePage({ icon: Icon, title, description, segment }: ModulePageProps) {
  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <Icon className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro ·{" "}
            <time
              dateTime={new Date().toISOString()}
              suppressHydrationWarning
              className="text-ink-400"
            >
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">{title}</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">{description}</p>
      </header>

      <div className="panel flex flex-1 flex-col items-center justify-center gap-4 px-8 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-lg border border-rule bg-base-800 text-ink-500">
          <Icon className="size-6" aria-hidden />
        </div>
        <div className="max-w-sm">
          <h2 className="text-sm font-bold text-ink-200">Módulo en construcción</h2>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-400">
            Este módulo se construye en el siguiente segmento de la ruta de interfaz de FastWS.
            Su mundo visual ya está definido y hereda el sistema de diseño del shell.
          </p>
        </div>
        {segment && (
          <span className="stamp stamp--fecha">{segment}</span>
        )}
        <p className="text-xs text-ink-600">
          Atajo por teclado: <Kbd>Alt</Kbd> + <Kbd>número</Kbd>
        </p>
      </div>
    </div>
  )
}