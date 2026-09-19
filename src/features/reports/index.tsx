import { BarChart3 } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function ReportsPage() {
  return (
    <ModulePage
      icon={BarChart3}
      title="Reportes"
      description="Consulta de indicadores por fecha, campaña, estado, cliente y usuario, con exportación a Excel, CSV o PDF."
      segment="Segmento UI-10"
    />
  )
}