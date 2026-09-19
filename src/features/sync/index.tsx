import { RefreshCw } from "lucide-react"
import { ModulePage } from "@/app/module-page"

export function SyncPage() {
  return (
    <ModulePage
      icon={RefreshCw}
      title="Sincronización"
      description="Estado de la base compartida, última sincronización y resolución de cambios entre computadores autorizados."
      segment="Segmento UI-11"
    />
  )
}