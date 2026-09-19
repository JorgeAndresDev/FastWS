import { Link2 } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function ConnectionPage() {
  return (
    <ModulePage
      icon={Link2}
      title="Conexión"
      description="Estado de la integración con Meta, del webhook y de los servicios externos, con indicación clara de conectividad."
      segment="Segmento UI-11"
    />
  )
}