import type { HistoryEventType } from "@/types"

import {
  CalendarPlus,
  MessageSquareText,
  Reply,
  Sparkles,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"

export const eventLabel: Record<HistoryEventType, string> = {
  campana: "Campaña",
  mensaje: "Mensaje",
  respuesta: "Respuesta",
  ejemplo: "Ejemplo",
  error: "Error",
}

const eventTone: Record<HistoryEventType, string> = {
  campana: "stamp--indigo",
  mensaje: "stamp--sky",
  respuesta: "stamp--teal",
  ejemplo: "stamp--fuchsia",
  error: "stamp--fallido",
}

const eventIcon: Record<HistoryEventType, typeof CalendarPlus> = {
  campana: CalendarPlus,
  mensaje: MessageSquareText,
  respuesta: Reply,
  ejemplo: Sparkles,
  error: TriangleAlert,
}

export function EventChip({ tipo }: { tipo: HistoryEventType }) {
  const Icon = eventIcon[tipo]
  return (
    <span className={cn("stamp", eventTone[tipo])}>
      <Icon aria-hidden />
      {eventLabel[tipo]}
    </span>
  )
}