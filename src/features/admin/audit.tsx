import { ShieldCheck } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function AuditPage() {
  return (
    <ModulePage
      icon={ShieldCheck}
      title="Auditoría"
      description="Registro de acciones importantes: inicios de sesión, importaciones, campañas, pausas y cambios de configuración."
      segment="Segmento UI-11"
    />
  )
}