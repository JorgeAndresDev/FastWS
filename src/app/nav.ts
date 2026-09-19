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
  shortcut?: string
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const entries: Array<[string, string, string, LucideIcon]> = [
  ["1", "/app", "Dashboard", LayoutDashboard],
  ["2", "/app/campanas", "Campañas", Send],
  ["3", "/app/cola", "Cola de envíos", ListOrdered],
  ["4", "/app/mensajes", "Mensajes", MessageSquare],
  ["5", "/app/clientes", "Clientes", Users],
  ["6", "/app/importacion", "Importar clientes", FileUp],
  ["7", "/app/segmentos", "Segmentos", Tags],
  ["8", "/app/plantillas", "Plantillas", LayoutTemplate],
  ["9", "/app/conversaciones", "Conversaciones", MessagesSquare],
  ["10", "/app/historial", "Historial", History],
  ["11", "/app/reportes", "Reportes", BarChart3],
  ["12", "/app/configuracion", "Configuración", Settings],
  ["13", "/app/usuarios-dispositivos", "Usuarios y dispositivos", MonitorSmartphone],
  ["14", "/app/auditoria", "Auditoría", ShieldCheck],
  ["15", "/app/sincronizacion", "Sincronización", RefreshCw],
  ["16", "/app/conexion", "Conexión", Link2],
]

const toItems = (slice: typeof entries): NavItem[] =>
  slice.map(([shortcut, path, label, icon]) => ({ path, label, icon, shortcut }))

export const navGroups: NavGroup[] = [
  { id: "operacion", label: "Operación", items: toItems(entries.slice(0, 4)) },
  { id: "clientes", label: "Clientes", items: toItems(entries.slice(4, 8)) },
  { id: "comunicacion", label: "Comunicación", items: toItems(entries.slice(8, 10)) },
  { id: "sistema", label: "Sistema", items: toItems(entries.slice(10)) },
]

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items)

export const shortcutMap = new Map(
  allNavItems
    .filter((i) => i.shortcut)
    .map((i) => [i.shortcut!, i.path])
)