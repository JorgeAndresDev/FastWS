import { MonitorSmartphone } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export { AuditPage } from "./audit"

export function DevicesPage() {
  return (
    <ModulePage
      icon={MonitorSmartphone}
      title="Usuarios y dispositivos"
      description="Identificación de los computadores autorizados y gestión de las sesiones de cada usuario."
      segment="Segmento UI-11"
    />
  )
}