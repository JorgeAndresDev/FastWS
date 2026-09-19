import { ListOrdered } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function QueuePage() {
  return (
    <ModulePage
      icon={ListOrdered}
      title="Cola de envíos"
      description="Planilla de despacho en vivo: lotes, velocidad controlada, pausa, reanudación y cancelación de mensajes pendientes."
      segment="Segmento UI-8"
    />
  )
}