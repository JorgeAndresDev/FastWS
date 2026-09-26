import type { Client } from "@/types"

export interface SegmentView {
  id: string
  name: string
  kind: string
  description: string
  members: number
  clientIds: string[]
}

const DAY_MS = 86_400_000
const daysOld = (createdAt: string) => {
  const t = new Date(createdAt).getTime()
  return Number.isNaN(t) ? 0 : Math.floor((Date.now() - t) / DAY_MS)
}

const groupBy = (clients: Client[], pick: (c: Client) => string, kind: string, empty: string, prefix: string) => {
  const map = new Map<string, Client[]>()
  for (const c of clients) {
    const key = pick(c).trim() === "" || pick(c) === "—" ? empty : pick(c)
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }
  return [...map.entries()]
    .map(([key, list]) => ({ key, list }))
    .sort((a, b) => b.list.length - a.list.length || a.key.localeCompare(b.key))
    .map(({ key, list }) => ({
      id: `${prefix}-${key.toLowerCase().replace(/\s+/g, "-")}`,
      name: key,
      kind,
      description: `Todos los clientes con ${kind.toLowerCase()} "${key}".`,
      members: list.length,
      clientIds: list.map((c) => c.id),
    }))
}

export function segmentViews(clients: Client[]): SegmentView[] {
  const out: SegmentView[] = []

  out.push(...groupBy(clients, (c) => c.city, "Ciudad", "Sin ciudad", "ciudad"))

  out.push(...groupBy(clients, (c) => c.zone, "Zona", "Sin zona", "zona"))

  const byType = (t: "NORMAL" | "CASHLESS") => {
    const list = clients.filter((c) => c.clientType === t)
    return {
      id: `tipo-${t.toLowerCase()}`,
      name: labelType(t),
      kind: "Tipo",
      description: t === "CASHLESS"
        ? "Clientes que pagan solo por transferencia (cashless)."
        : "Clientes que pagan de contado (normales).",
      members: list.length,
      clientIds: list.map((c) => c.id),
    }
  }
  out.push(byType("NORMAL"), byType("CASHLESS"))

  const pendientes = clients.filter((c) => c.orderState === "PENDIENTE")
  out.push({
    id: "pedido-pendientes",
    name: "Pedido pendiente",
    kind: "Pedido",
    description: "Clientes con pedido pendiente de entrega.",
    members: pendientes.length,
    clientIds: pendientes.map((c) => c.id),
  })

  const cancelados = clients.filter((c) => c.orderState === "CANCELADO")
  out.push({
    id: "pedido-cancelados",
    name: "Pedido cancelado",
    kind: "Pedido",
    description: "Clientes con pedido cancelado (con motivo guardado).",
    members: cancelados.length,
    clientIds: cancelados.map((c) => c.id),
  })

  const enRuta = clients.filter((c) => c.enRuta)
  out.push({
    id: "pedido-en-ruta",
    name: "Pedido en ruta",
    kind: "Pedido",
    description: "Clientes cuyo pedido está en ruta de entrega.",
    members: enRuta.length,
    clientIds: enRuta.map((c) => c.id),
  })

  const activos = clients.filter((c) => c.status === "activo")
  out.push({
    id: "estado-activos",
    name: "Activos",
    kind: "Estado",
    description: "Clientes con estado activo en la base.",
    members: activos.length,
    clientIds: activos.map((c) => c.id),
  })

  const inactivos = clients.filter((c) => c.status === "inactivo")
  out.push({
    id: "estado-inactivos",
    name: "Inactivos",
    kind: "Estado",
    description: "Clientes con estado inactivo en la base.",
    members: inactivos.length,
    clientIds: inactivos.map((c) => c.id),
  })

  const validos = clients.filter((c) => c.valid)
  out.push({
    id: "validez-validos",
    name: "Válidos",
    kind: "Validez",
    description: "Clientes con teléfono válido para recibir envíos.",
    members: validos.length,
    clientIds: validos.map((c) => c.id),
  })

  const noValidos = clients.filter((c) => !c.valid)
  out.push({
    id: "validez-no-validos",
    name: "No válidos",
    kind: "Validez",
    description: "Clientes con teléfono no válido: fuera de los envíos.",
    members: noValidos.length,
    clientIds: noValidos.map((c) => c.id),
  })

  const nuevos = clients.filter((c) => daysOld(c.createdAt) <= 30)
  out.push({
    id: "antiguedad-nuevos",
    name: "Nuevos (últimos 30 días)",
    kind: "Antigüedad",
    description: "Clientes dados de alta en el último mes.",
    members: nuevos.length,
    clientIds: nuevos.map((c) => c.id),
  })

  const intermedios = clients.filter((c) => daysOld(c.createdAt) > 30 && daysOld(c.createdAt) <= 60)
  out.push({
    id: "antiguedad-intermedios",
    name: "Intermedios (31–60 días)",
    kind: "Antigüedad",
    description: "Clientes dados de alta entre uno y dos meses atrás.",
    members: intermedios.length,
    clientIds: intermedios.map((c) => c.id),
  })

  const reactivacion = clients.filter((c) => daysOld(c.createdAt) > 60)
  out.push({
    id: "antiguedad-reactivacion",
    name: "Reactivación (+60 días)",
    kind: "Antigüedad",
    description: "Clientes sin alta reciente; objetivo de reactivación.",
    members: reactivacion.length,
    clientIds: reactivacion.map((c) => c.id),
  })

  return out
}

export function viewClients(views: SegmentView[], clients: Client[], segmentId?: string): Client[] {
  if (!segmentId) return []
  const view = views.find((v) => v.id === segmentId)
  if (!view) return []
  const byId = new Map(clients.map((c) => [c.id, c]))
  return view.clientIds.map((id) => byId.get(id)).filter((c): c is Client => Boolean(c))
}

const labelType = (t: "NORMAL" | "CASHLESS") =>
  t === "CASHLESS" ? "Cashless" : "Normales"