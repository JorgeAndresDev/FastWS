import { History } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function HistoryPage() {
  return (
    <ModulePage
      icon={History}
      title="Historial"
      description="Registro completo de campañas, mensajes, clientes, respuestas y errores para reconstruir qué ocurrió y cuándo."
      segment="Segmento UI-10"
    />
  )
}