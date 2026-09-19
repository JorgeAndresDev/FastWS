import { MessagesSquare } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function ConversationsPage() {
  return (
    <ModulePage
      icon={MessagesSquare}
      title="Conversaciones"
      description="Detecta y revisa las respuestas de los clientes: hilo por cliente, búsqueda y filtros por estado."
      segment="Segmento UI-9"
    />
  )
}