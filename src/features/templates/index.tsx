import { LayoutTemplate } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function TemplatesPage() {
  return (
    <ModulePage
      icon={LayoutTemplate}
      title="Plantillas"
      description="Consulta de plantillas aprobadas en Meta, su idioma, cuerpo y el mapeo de variables dinámicas para cada envío."
      segment="Segmento UI-6"
    />
  )
}