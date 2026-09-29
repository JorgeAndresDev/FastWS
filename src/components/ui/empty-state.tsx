import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  /** Qué falta. Viaja como sello neutro, nunca como sello de estado. */
  label: string
  /** Icono que nombra lo que falta. Obligatorio a propósito: sin él el sello
   *  vuelve a ser una etiqueta suelta que no dice nada. */
  icon: LucideIcon
  note?: ReactNode
  className?: string
}

/**
 * Estado vacío de la planilla: un sello neutro con icono y la línea que explica
 * cómo se llena. El icono va en tinta apagada a propósito — un vacío no es un
 * estado ni una alarma, es un casillero todavía sin escribir.
 *
 * El sello neutral es `stamp--fecha stamp--container`; el texto y el icono se
 * visten de papel tenue sobre el carbón alzado, que es el tratamiento que
 * DESIGN.md reserva a las etiquetas informativas.
 */
export function EmptyState({ label, icon: Icon, note, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-14 text-center",
        className
      )}
    >
      <span className="stamp stamp--fecha stamp--container">
        <Icon aria-hidden />
        {label}
      </span>
      {note ? <p className="max-w-sm text-xs leading-relaxed text-ink-500">{note}</p> : null}
    </div>
  )
}
