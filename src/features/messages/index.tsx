import { MessageSquare } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function MessagesPage() {
  return (
    <ModulePage
      icon={MessageSquare}
      title="Seguimiento de mensajes"
      description="Estados individuales por mensaje, IDs de Meta, errores legibles y trazabilidad completa de cada envío."
      segment="Segmento UI-8"
    />
  )
}