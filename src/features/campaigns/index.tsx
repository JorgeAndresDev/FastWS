import { Send } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function CampaignsPage() {
  return (
    <ModulePage
      icon={Send}
      title="Campañas"
      description="Crea y administra campañas de envío masivo: destinatarios, plantilla, variables, vista previa y confirmación."
      segment="Segmento UI-7"
    />
  )
}