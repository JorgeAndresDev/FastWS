import type {
  AuditEntry,
  Campaign,
  Client,
  Conversation,
  DashboardStats,
  OutboundMessage,
  Segment,
  WaTemplate,
} from "@/types"

export const clients: Client[] = [
  { id: "c_01", name: "María Rodríguez", phone: "3105550123", document: "CC 52.384.110", company: "Comercializadora Andes", city: "Bogotá", zone: "Chapinero", clientType: "Frecuente", status: "activo", valid: true, createdAt: "2026-08-12" },
  { id: "c_02", name: "Carlos Gómez", phone: "3158447290", document: "CC 79.881.224", company: "Café La Estrella", city: "Medellín", zone: "El Poblado", clientType: "Mayorista", status: "activo", valid: true, createdAt: "2026-06-03" },
  { id: "c_03", name: "Ana Pérez Salazar", phone: "3001123456", document: "CC 1.120.456.009", company: "Distribuciones El Sol", city: "Cali", zone: "San Fernando", clientType: "Frecuente", status: "activo", valid: true, createdAt: "2026-07-21" },
  { id: "c_04", name: "Jorge Andrés Marín", phone: "3156738921", document: "CC 1.098.521.301", company: "Ferretería Méndez y Cía", city: "Bogotá", zone: "Kennedy", clientType: "Mayorista", status: "activo", valid: true, createdAt: "2026-05-17" },
  { id: "c_05", name: "Laura Cifuentes", phone: "3204556678", document: "CC 1.036.778.452", company: "Textiles del Valle SAS", city: "Cali", zone: "Gabriela", clientType: "Ocasional", status: "inactivo", valid: true, createdAt: "2026-02-09" },
  { id: "c_06", name: "Pedro Ramírez", phone: "3105560012", document: "CC 80.445.210", company: "Santana Autopartes", city: "Barranquilla", zone: "Norte", clientType: "Frecuente", status: "activo", valid: true, createdAt: "2026-08-01" },
  { id: "c_07", name: "Sofía Herrera", phone: "3002298834", document: "CC 1.021.378.665", company: "Estética D'Luna", city: "Medellín", zone: "Laureles", clientType: "Ocasional", status: "activo", valid: false, createdAt: "2026-03-28" },
  { id: "c_08", name: "Miguel Vanegas", phone: "3160087712", document: "CC 1.131.092.448", company: "Taller Autocentro", city: "Bucaramanga", zone: "Cabecera", clientType: "Frecuente", status: "activo", valid: true, createdAt: "2026-04-14" },
]

export const segments: Segment[] = [
  { id: "s_01", name: "Clientes de Bogotá", description: "Todos los clientes registrados en Bogotá", members: 1240 },
  { id: "s_02", name: "Reactivación +60 días", description: "Sin compra o respuesta desde hace más de 60 días", members: 486 },
  { id: "s_03", name: "Alta frecuencia", description: "Clientes mayoristas y frecuentes", members: 920 },
  { id: "s_04", name: "Selección manual — Promo septiembre", description: "Listado armado a mano para la campaña del mes", members: 214 },
]

export const templates: WaTemplate[] = [
  {
    id: "t_01",
    metaName: "pedido_en_transito",
    language: "Español (CO)",
    category: "Envío / logística",
    status: "APROBADA",
    body: "Hola {{1}}, tu pedido {{2}} va en camino y llega el {{3}}. Cualquier novedad, responde este mensaje.",
    variables: [
      { index: 1, label: "Nombre del cliente" },
      { index: 2, label: "Número de pedido" },
      { index: 3, label: "Fecha estimada de entrega" },
    ],
  },
  {
    id: "t_02",
    metaName: "promo_nuevo_lanzamiento",
    language: "Español (CO)",
    category: "Promocional",
    status: "APROBADA",
    body: "Hola {{1}}, tenemos información importante sobre nuestro nuevo lanzamiento {{2}}. Válido solo esta semana.",
    variables: [
      { index: 1, label: "Nombre del cliente" },
      { index: 2, label: "Nombre del producto o campaña" },
    ],
  },
  {
    id: "t_03",
    metaName: "actualizacion_datos",
    language: "Español (CO)",
    category: "Utilidad",
    status: "APROBADA",
    body: "Hola {{1}}, necesitamos confirmar tus datos de facturación. Responde {{2}} si están vigentes.",
    variables: [
      { index: 1, label: "Nombre del cliente" },
      { index: 2, label: "Opción de confirmación" },
    ],
  },
  {
    id: "t_04",
    metaName: "recordatorio_pago",
    language: "Español (CO)",
    category: "Utilidad",
    status: "PENDIENTE",
    body: "Hola {{1}}, recuerda que tu factura {{2}} vence el {{3}}.",
    variables: [
      { index: 1, label: "Nombre del cliente" },
      { index: 2, label: "Número de factura" },
      { index: 3, label: "Fecha de vencimiento" },
    ],
  },
]

export const campaigns: Campaign[] = [
  {
    id: "cp_01",
    name: "Promoción septiembre",
    description: "Nuevo lanzamiento para mayoristas activos de Bogotá y Medellín.",
    template: "promo_nuevo_lanzamiento",
    status: "EN_PROCESO",
    total: 4000,
    pendiente: 1550,
    procesando: 320,
    entregado: 675,
    leido: 1305,
    fallido: 150,
    startedAt: "2026-09-14T08:00:00",
  },
  {
    id: "cp_02",
    name: "Bienvenida clientes nuevos",
    description: "Mensaje automático de bienvenida al alta de clientes.",
    template: "actualizacion_datos",
    status: "FINALIZADA",
    total: 820,
    pendiente: 0,
    procesando: 0,
    entregado: 268,
    leido: 512,
    fallido: 40,
    startedAt: "2026-09-08T09:30:00",
  },
  {
    id: "cp_03",
    name: "Actualización de datos",
    description: "Confirmación de datos de facturación a clientes inactivos.",
    template: "actualizacion_datos",
    status: "PAUSADA",
    total: 1200,
    pendiente: 780,
    procesando: 0,
    entregado: 361,
    leido: 59,
    fallido: 0,
    startedAt: "2026-09-10T14:00:00",
  },
  {
    id: "cp_04",
    name: "Descuento de temporada",
    description: "Campaña programada para la primera semana de octubre.",
    template: "promo_nuevo_lanzamiento",
    status: "PROGRAMADA",
    total: 2400,
    pendiente: 2400,
    procesando: 0,
    entregado: 0,
    leido: 0,
    fallido: 0,
  },
]

export const recentMessages: OutboundMessage[] = [
  { id: "m_01", client: "María Rodríguez", phone: "3105550123", campaign: "Promoción septiembre", status: "LEIDO", metaId: "wamid.HBgNMzEwNTU1MDEyMxUC...", sentAt: "07:42:11" },
  { id: "m_02", client: "Carlos Gómez", phone: "3158447290", campaign: "Promoción septiembre", status: "ENTREGADO", metaId: "wamid.HBgNMzE1ODQ0NzI5MBUC...", sentAt: "07:42:14" },
  { id: "m_03", client: "Ana Pérez Salazar", phone: "3001123456", campaign: "Promoción septiembre", status: "PROCESO", metaId: "wamid.HBgNMzAwMTEyMzQ1Nhc=", sentAt: "07:42:16" },
  { id: "m_04", client: "Jorge Andrés Marín", phone: "3156738921", campaign: "Promoción septiembre", status: "FALLIDO", errorCode: "131026", errorMessage: "No fue posible entregar el mensaje al número indicado.", metaId: "wamid.HBgNMzE1NjczODkyMRUC...", sentAt: "07:42:18" },
  { id: "m_05", client: "Pedro Ramírez", phone: "3105560012", campaign: "Promoción septiembre", status: "PENDIENTE", sentAt: "—" },
  { id: "m_06", client: "Miguel Vanegas", phone: "3160087712", campaign: "Promoción septiembre", status: "LEIDO", metaId: "wamid.HBgNMzE2MDA4NzcxMhUC...", sentAt: "07:42:20" },
  { id: "m_07", client: "Laura Cifuentes", phone: "3204556678", campaign: "Bienvenida clientes nuevos", status: "ENTREGADO", metaId: "wamid.HBgNMzIwNDU1NjY3OBl...", sentAt: "09:12:03" },
  { id: "m_08", client: "Sofía Herrera", phone: "3002298834", campaign: "Actualización de datos", status: "FALLIDO", errorCode: "131047", errorMessage: "El número no está registrado en WhatsApp.", sentAt: "14:08:52" },
]

export const conversations: Conversation[] = [
  { id: "cv_01", client: "María Rodríguez", phone: "3105550123", lastMessage: "Hola, quiero más información sobre el pedido 8841.", direction: "entrante", status: "respondida", lastAt: "07:45" },
  { id: "cv_02", client: "Carlos Gómez", phone: "3158447290", lastMessage: "¿La promo aplica a mayoristas?", direction: "entrante", status: "pendiente", lastAt: "07:50" },
  { id: "cv_03", client: "Ana Pérez Salazar", phone: "3001123456", lastMessage: "Todo perfecto, gracias.", direction: "entrante", status: "respondida", lastAt: "08:02" },
  { id: "cv_04", client: "Pedro Ramírez", phone: "3105560012", lastMessage: "Qué pena responder tarde, sí estoy interesado.", direction: "entrante", status: "respondida", lastAt: "08:31" },
  { id: "cv_05", client: "Miguel Vanegas", phone: "3160087712", lastMessage: "¿Pueden enviar a otra dirección?", direction: "entrante", status: "con_error", lastAt: "09:12" },
]

export const auditEntries: AuditEntry[] = [
  { id: "a_01", user: "Administrador", device: "PC-01", action: "Inició campaña", entity: "Promoción septiembre", date: "14/09/2026 08:00" },
  { id: "a_02", user: "Administrador", device: "PC-01", action: "Pausó campaña", entity: "Actualización de datos", date: "10/09/2026 16:40" },
  { id: "a_03", user: "Administrador", device: "PC-01", action: "Importó clientes", entity: "clientes_corte_agosto.xlsx", date: "02/09/2026 11:15" },
  { id: "a_04", user: "Administrador", device: "PC-02", action: "Inició sesión", entity: "Sesión web", date: "16/09/2026 07:30" },
]

export const stats: DashboardStats = {
  clientsValid: 3482,
  clientsInvalid: 214,
  campaignsTotal: 24,
  campaignsActive: 1,
  sent: 24510,
  delivered: 20186,
  read: 15170,
  failed: 892,
  responded: 2318,
  notResponded: 22192,
  deliveryRate: 82.4,
  readRate: 61.9,
  responseRate: 9.5,
}

export const currentUser = {
  name: "Administrador",
  email: "admin@fastws.local",
  role: "Operativo",
  device: "PC-01 · Oficina",
  wabaId: "1007XXXXX",
  phoneNumberId: "1XXXXXXXXX",
}