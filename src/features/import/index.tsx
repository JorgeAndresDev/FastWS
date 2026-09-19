import { FileUp } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function ImportPage() {
  return (
    <ModulePage
      icon={FileUp}
      title="Importar clientes"
      description="Asistente de importación desde Excel o CSV: validación de teléfonos, duplicados, resumen y confirmación."
      segment="Segmento UI-4"
    />
  )
}