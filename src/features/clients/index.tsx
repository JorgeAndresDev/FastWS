import { Users } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function ClientsPage() {
  return (
    <ModulePage
      icon={Users}
      title="Clientes"
      description="Registro, edición, búsqueda y filtros de la base de clientes, con historial de mensajes y respuestas por cliente."
      segment="Segmento UI-3"
    />
  )
}