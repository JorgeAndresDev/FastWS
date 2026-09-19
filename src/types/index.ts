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

export interface Client {
  id: string
  name: string
  phone: string
  document: string
  company: string
  city: string
  zone: string
  clientType: string
  status: "activo" | "inactivo"
  valid: boolean
  createdAt: string
}

export interface Segment {
  id: string
  name: string
  description: string
  members: number
}

export interface WaTemplate {
  id: string
  metaName: string
  language: string
  category: string
  status: "APROBADA" | "PENDIENTE" | "RECHAZADA"
  body: string
  variables: Array<{ index: number; label: string }>
}

export interface Campaign {
  id: string
  name: string
  description: string
  template: string
  status: CampaignStatus
  total: number
  pendiente: number
  procesando: number
  entregado: number
  leido: number
  fallido: number
  startedAt?: string
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

export interface Conversation {
  id: string
  client: string
  phone: string
  lastMessage: string
  direction: "entrante" | "saliente"
  status: "respondida" | "pendiente" | "con_error"
  lastAt: string
}

export interface AuditEntry {
  id: string
  user: string
  device: string
  action: string
  entity: string
  date: string
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