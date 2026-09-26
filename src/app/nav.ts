import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  FileUp,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  ListOrdered,
  MessageSquare,
  MessagesSquare,
  MonitorSmartphone,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react"

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const entries: Array<[string, string, LucideIcon]> = [
  ["/app", "Dashboard", LayoutDashboard],
  ["/app/campanas", "Campañas", Send],
  ["/app/cola", "Cola de envíos", ListOrdered],
  ["/app/mensajes", "Mensajes", MessageSquare],
  ["/app/clientes", "Clientes", Users],
  ["/app/importacion", "Importar clientes", FileUp],
  ["/app/segmentos", "Segmentos", Tags],
  ["/app/plantillas", "Plantillas", LayoutTemplate],
  ["/app/conversaciones", "Conversaciones", MessagesSquare],
  ["/app/historial", "Historial", History],
  ["/app/reportes", "Reportes", BarChart3],
  ["/app/configuracion", "Configuración", Settings],
  ["/app/usuarios-dispositivos", "Usuarios y dispositivos", MonitorSmartphone],
  ["/app/auditoria", "Auditoría", ShieldCheck],
  ["/app/sincronizacion", "Sincronización", RefreshCw],
  ["/app/conexion", "Conexión", Link2],
]

const toItems = (slice: typeof entries): NavItem[] =>
  slice.map(([path, label, icon]) => ({ path, label, icon }))

export const navGroups: NavGroup[] = [
  { id: "operacion", label: "Operación", items: toItems(entries.slice(0, 4)) },
  { id: "clientes", label: "Clientes", items: toItems(entries.slice(4, 8)) },
  { id: "comunicacion", label: "Comunicación", items: toItems(entries.slice(8, 10)) },
  { id: "sistema", label: "Sistema", items: toItems(entries.slice(10)) },
]