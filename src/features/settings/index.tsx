import { Settings } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function SettingsPage() {
  return (
    <ModulePage
      icon={Settings}
      title="Configuración"
      description="Parámetros de la aplicación, la integración de WhatsApp y los intervalos de procesamiento del sistema."
      segment="Segmento UI-11"
    />
  )
}