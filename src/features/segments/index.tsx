import { Tags } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function SegmentsPage() {
  return (
    <ModulePage
      icon={Tags}
      title="Segmentos"
      description="Agrupa clientes por ciudad, zona, tipo, frecuencia o selección manual para envíos dirigidos."
      segment="Segmento UI-5"
    />
  )
}