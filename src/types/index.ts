export type MessageStatus =
  | "PROCESO"
  | "PENDIENTE"
  | "ENTREGADO"
  | "LEIDO"
  | "FALLIDO"
  | "CANCELADO"

export type CampaignStatus =
  | "BORRADOR"
  | "PROGRAMADA"
  | "EN_PROCESO"
  | "PAUSADA"
  | "FINALIZADA"
  | "CANCELADA"
  | "CON_ERROR"

export type ClientKind = "NORMAL" | "CASHLESS"

export type OrderState = "PENDIENTE" | "CANCELADO"

export interface Client {
  id: string
  code: string
  name: string
  phone: string
  phones: string[]
  company: string
  city: string
  zone: string
  clientType: ClientKind
  status: "activo" | "inactivo"
  valid: boolean
  horaInicial?: string
  horaFinal?: string
  orderState?: OrderState
  cancelReason?: string
  enRuta?: boolean
  createdAt: string
}

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION"

export type TemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "IN_APPEAL"
  | "PAUSED"
  | "DISABLED"
  | "UNKNOWN"

export type TemplateQuality = "GREEN" | "YELLOW" | "RED"

export interface WaTemplateButton {
  type: string
  text?: string
  url?: string
  phone_number?: string
}

export interface WaTemplateComponent {
  type: string
  format?: string
  text?: string
  example?: {
    body_text?: string[][]
    header_text?: string[]
    body_text_named_params?: Array<{ param_name: string; example: string }>
  }
  buttons?: WaTemplateButton[]
}

export interface WaTemplate {
  id: string
  name: string
  language: string
  category: string
  status: TemplateStatus
  qualityScore: TemplateQuality | null
  rejectedReason?: string
  updatedAt: number | null
  components: WaTemplateComponent[]
}

export type ClientFieldKey =
  | "name"
  | "code"
  | "company"
  | "city"
  | "zone"
  | "clientType"
  | "horaInicial"
  | "horaFinal"
  | "orderState"
  | "cancelReason"
  | "enRuta"

export interface CampaignVariableMapping {
  /** Clave de la variable: "1","2" para {{1}}; "nombre" para {{nombre}}. */
  key: string
  fuente: "campo" | "libre"
  campo?: ClientFieldKey
  texto?: string
}

export interface CampaignFilter {
  clientType?: ClientKind
  city?: string
  zone?: string
  orderState?: OrderState
  enRuta?: boolean
}

export type CampaignActivityType =
  | "creada"
  | "iniciada"
  | "pausada"
  | "reanudada"
  | "cancelada"
  | "finalizada"
  | "con_error"

export interface CampaignActivity {
  tipo: CampaignActivityType
  at: string
}

export interface CampaignDispatchInfo {
  usuario: string
  dispositivo: string
  at: string
}

export interface CampaignRecipient {
  clientId: string
  code: string
  name: string
  phone: string
  params: string[]
  status: MessageStatus
  metaId?: string
  errorCode?: string
  errorMessage?: string
  sentAt?: string
}

export interface Campaign {
  id: string
  name: string
  description: string
  template: { name: string; language: string }
  mapping: CampaignVariableMapping[]
  filter: CampaignFilter
  status: CampaignStatus
  recipients: CampaignRecipient[]
  createdAt: string
  startedAt?: string
  endedAt?: string
  dispatchedBy?: CampaignDispatchInfo
  activity: CampaignActivity[]
}

export interface OutboundMessage {
  id: string
  client: string
  phone: string
  campaign: string
  status: MessageStatus
  metaId?: string
  errorCode?: string
  errorMessage?: string
  sentAt: string
}

export type ConvoStatus = "respondida" | "pendiente" | "con_error"

export type ConvoOrigin = "campaña" | "respuesta" | "demo"

export interface ConversationMessage {
  id: string
  phone: string
  direction: "entrante" | "saliente"
  text: string
  status: MessageStatus
  metaId?: string
  errorCode?: string
  errorMessage?: string
  sentAt?: string
  viaTemplate?: boolean
}

export interface ConversationThread {
  id: string
  phone: string
  clientId?: string
  lastMessage: string
  lastAt: string
  status: ConvoStatus
  origin: ConvoOrigin
  messages: ConversationMessage[]
}

export type HistoryEventType =
  | "campana"
  | "mensaje"
  | "respuesta"
  | "ejemplo"
  | "error"

export interface HistoryEvent {
  id: string
  at: string
  tipo: HistoryEventType
  titulo: string
  detalle: string
  codigoError?: string
  wamid?: string
}

export type AuditCategory =
  | "turno"
  | "campana"
  | "plantilla"
  | "clientes"
  | "error"
  | "conexion"
  | "importacion"
  | "configuracion"

export interface AuditRecord {
  id: string
  at: string
  categoria: AuditCategory
  titulo: string
  detalle: string
  usuario?: string
  dispositivo?: string
  entidad?: string
  codigoError?: string
}

export interface DashboardStats {
  clientsValid: number
  clientsInvalid: number
  campaignsTotal: number
  campaignsActive: number
  sent: number
  delivered: number
  read: number
  failed: number
  responded: number
  notResponded: number
  deliveryRate: number
  readRate: number
  responseRate: number
}