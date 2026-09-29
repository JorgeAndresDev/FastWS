import type { Campaign, Client, ConversationThread } from "@/types"

import { registrarAuditoria } from "@/lib/audit-log"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { getStore } from "@/lib/db"
import { clearEphemeral, writeDurable } from "@/lib/db/session-scope"

const KEYS = [
  "fastws.clientes",
  "fastws.campanas",
  "fastws.campanas.velocidad",
  "fastws.conversaciones",
  "fastws.sesiones",
  "fastws.conexion.ids",
  "fastws.conexion.sesion",
] as const

function iso(minAgo: number) {
  return new Date(Date.now() - minAgo * 60000).toISOString()
}

function actor() {
  const device = getDeviceIdentity()
  const sessionUser = readSession()
  return {
    usuario: sessionUser?.name ?? "Operador",
    dispositivo: `${device.id} · ${device.code}`,
  }
}

function clientes(): Client[] {
  const now = iso(0)
  return [
    { id: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", phones: ["573001234001"], company: "La Roca", city: "Manizales", zone: "Norte", clientType: "NORMAL", status: "activo", valid: true, createdAt: now },
    { id: "cl-2", code: "C-1002", name: "Mini Mercado Villa", phone: "573021234002", phones: ["573021234002"], company: "Villa", city: "Dosquebradas", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: now },
    { id: "cl-3", code: "C-1003", name: "Cementos del Café", phone: "573112345678", phones: ["573112345678"], company: "Cementos", city: "Armenia", zone: "Sur", clientType: "NORMAL", status: "activo", valid: true, createdAt: now },
    { id: "cl-4", code: "C-1004", name: "Sin teléfono válido", phone: "000", phones: ["000"], company: "—", city: "—", zone: "—", clientType: "NORMAL", status: "inactivo", valid: false, createdAt: now },
  ]
}

function campanas(): Campaign[] {
  return [
    {
      id: "camp-1",
      name: "Despacho nocturno · Ruta Norte",
      description: "Recordatorio de ruta a comercios del norte de Manizales.",
      template: { name: "recordatorio_ruta", language: "es_CO" },
      mapping: [{ index: 0, fuente: "campo", campo: "name" }],
      filter: { zone: "Norte" },
      status: "EN_PROCESO",
      recipients: [
        { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", params: [], status: "ENTREGADO", metaId: "wamid-1001", sentAt: iso(20) },
        { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", params: [], status: "PROCESO", metaId: "wamid-1002", sentAt: iso(10) },
        { clientId: "cl-2", code: "C-1002", name: "Mini Mercado Villa", phone: "573021234002", params: [], status: "PROCESO", metaId: "wamid-1003", sentAt: iso(5) },
        { clientId: "cl-3", code: "C-1003", name: "Cementos del Café", phone: "573112345678", params: [], status: "PENDIENTE" },
        { clientId: "cl-2", code: "C-1002", name: "Andrés Giraldo", phone: "573151234003", params: [], status: "FALLIDO", errorCode: "131031", errorMessage: "Tiempo agotado por el sistema de destino.", sentAt: iso(80) },
      ],
      createdAt: iso(90),
      startedAt: iso(60),
      dispatchedBy: { usuario: "Marlén Quintero", dispositivo: "PC-01 · Windows", at: iso(60) },
      activity: [{ tipo: "creada", at: iso(90) }, { tipo: "iniciada", at: iso(60) }],
    },
    {
      id: "camp-2",
      name: "Promoción lunes de combustibles",
      description: "Aviso de promoción a comercios clientes.",
      template: { name: "promo_combustible", language: "es_CO" },
      mapping: [{ index: 0, fuente: "campo", campo: "name" }],
      filter: {},
      status: "BORRADOR",
      recipients: [
        { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", params: ["Café La Roca"], status: "PENDIENTE" },
        { clientId: "cl-3", code: "C-1003", name: "Cementos del Café", phone: "573112345678", params: ["Cementos del Café"], status: "PENDIENTE" },
      ],
      createdAt: iso(30),
      activity: [{ tipo: "creada", at: iso(30) }],
    },
  ]
}

function hilo(): ConversationThread[] {
  return [
    {
      id: "hilo-1",
      phone: "573131234004",
      clientId: "cl-1",
      lastMessage: "Gracias, ahí estaré a las 6.",
      lastAt: iso(15),
      status: "respondida",
      origin: "respuesta",
      messages: [
        { id: "m-1", phone: "573131234004", direction: "saliente", text: "Hola Heladería Polo, recordamos su ruta de hoy a las 6 pm. — FastWS", status: "ENTREGADO", viaTemplate: true, sentAt: iso(80) },
        { id: "m-2", phone: "573131234004", direction: "entrante", text: "Gracias, ahí estaré a las 6.", status: "LEIDO", sentAt: iso(15) },
      ],
    },
  ]
}

export function restablecerDemo() {
  const ahora = new Date().toISOString()

  const set = (key: string, value: unknown) => {
    writeDurable(key, JSON.stringify(value))
  }

  set("fastws.clientes", clientes())
  set("fastws.campanas", campanas())
  set("fastws.campanas.velocidad", "1000/h")
  // El store espera {threads, merged}: sembrar un array plano perdía el hilo al recargar.
  set("fastws.conversaciones", { threads: hilo(), merged: {} })
  set("fastws.sesiones", [
    {
      id: "ses-demo",
      origen: "inicio",
      usuario: "Marlén Quintero",
      email: "marlen@fastws.co",
      rol: "Operativo",
      recordar: true,
      equipo: "PC-01",
      plataforma: "Windows",
      inicio: ahora,
    },
  ])

  registrarAuditoria({
    categoria: "configuracion",
    titulo: "Datos de demostración restablecidos",
    detalle: "Cliente de prueba, campañas, conversaciones y velocidad por defecto sembradas.",
    entidad: "demo",
    ...actor(),
  })
}

export function borrarDatosLocales() {
  const store = getStore()
  store.removeMany(KEYS)
  // La sesión de conexión vive en el alcance efímero: sin esto el token
  // sobrevivía al borrado y la app se reconectaba sola (la copia promete lo
  // contrario).
  clearEphemeral("fastws.conexion.sesion")

  registrarAuditoria({
    categoria: "configuracion",
    titulo: "Datos locales borrados",
    detalle: "Clientes, campañas, velocidad, conversaciones, turnos y conexión Meta de este equipo.",
    entidad: "local",
    ...actor(),
  })
}