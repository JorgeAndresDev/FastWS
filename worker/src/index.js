const RETENCION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_EVENTOS = 200
const LOTE_INSERCION = 50

const ORIGENES_POR_DEFECTO = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
]

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  })
}

export function cabecerasCors(request, env = {}) {
  const origin = request.headers.get("Origin")
  if (!origin) return {}
  const permitidos = (env.ALLOWED_ORIGINS ?? ORIGENES_POR_DEFECTO.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  if (!permitidos.includes(origin)) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Max-Age": "86400",
  }
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))
}

export async function igualSeguro(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)])
  let diferencia = 0
  for (let i = 0; i < ha.length; i++) diferencia |= ha[i] ^ hb[i]
  return diferencia === 0
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function firmaValida(cuerpo, firma, secreto) {
  if (!secreto || typeof firma !== "string" || !firma.startsWith("sha256=")) return false
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(cuerpo)))
  return igualSeguro(hex(mac), firma.slice(7))
}

function soloDigitos(value) {
  return String(value ?? "").replace(/\D/g, "")
}

export function textoMensaje(message) {
  if (typeof message?.text?.body === "string" && message.text.body) return message.text.body
  if (typeof message?.button?.text === "string" && message.button.text) return message.button.text
  if (typeof message?.interactive?.button_reply?.title === "string") {
    return message.interactive.button_reply.title
  }
  if (typeof message?.interactive?.list_reply?.title === "string") {
    return message.interactive.list_reply.title
  }
  if (typeof message?.image?.caption === "string" && message.image.caption) return message.image.caption
  if (typeof message?.video?.caption === "string" && message.video.caption) return message.video.caption
  if (typeof message?.document?.caption === "string" && message.document.caption) {
    return message.document.caption
  }
  const etiquetas = {
    image: "[imagen]",
    audio: "[audio]",
    video: "[video]",
    document: "[documento]",
    sticker: "[sticker]",
    contacts: "[contacto]",
    reaction: "[reacción]",
    location: "[ubicación]",
    order: "[pedido]",
    system: "[sistema]",
  }
  return etiquetas[message?.type] ?? `[${message?.type ?? "mensaje"}]`
}

export function extraerEventos(payload) {
  if (!payload || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) {
    return []
  }
  const eventos = []
  for (const entry of payload.entry) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {}
      for (const status of value.statuses ?? []) {
        const wamid = String(status?.id ?? "")
        const estado = String(status?.status ?? "")
        const timestamp = Number(status?.timestamp) || 0
        if (!wamid || !estado) continue
        eventos.push({
          event_key: `${wamid}|status|${estado}|${timestamp}`,
          type: "status",
          wamid,
          phone: soloDigitos(status?.recipient_id),
          status: estado,
          occurred_at: timestamp,
          payload: {
            id: wamid,
            status: estado,
            timestamp,
            recipient_id: status?.recipient_id ?? null,
            errors: Array.isArray(status?.errors)
              ? status.errors.map((error) => ({
                  code: error?.code ?? null,
                  title: error?.title ?? null,
                  message: error?.message ?? null,
                }))
              : [],
          },
        })
      }
      for (const message of value.messages ?? []) {
        const wamid = String(message?.id ?? "")
        if (!wamid) continue
        const timestamp = Number(message?.timestamp) || 0
        eventos.push({
          event_key: `message|${wamid}`,
          type: "message",
          wamid,
          phone: soloDigitos(message?.from),
          status: null,
          occurred_at: timestamp,
          payload: {
            id: wamid,
            from: message?.from ?? null,
            timestamp,
            type: message?.type ?? "desconocido",
            text: textoMensaje(message),
            contact_name: value?.contacts?.[0]?.profile?.name ?? null,
          },
        })
      }
    }
  }
  return eventos
}

async function insertarEventos(env, eventos) {
  if (eventos.length === 0) return 0
  const ahora = Date.now()
  for (let i = 0; i < eventos.length; i += LOTE_INSERCION) {
    const lote = eventos.slice(i, i + LOTE_INSERCION).map((evento) =>
      env.DB.prepare(
        "INSERT OR IGNORE INTO events (event_key, type, wamid, phone, status, occurred_at, payload, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        evento.event_key,
        evento.type,
        evento.wamid,
        evento.phone,
        evento.status,
        evento.occurred_at,
        JSON.stringify(evento.payload),
        ahora
      )
    )
    await env.DB.batch(lote)
  }
  try {
    await env.DB.prepare("DELETE FROM events WHERE received_at < ?").bind(ahora - RETENCION_MS).run()
  } catch {
    /* la retención no debe tumbar la recepción */
  }
  return eventos.length
}

async function listarEventos(env, after, limit) {
  const result = await env.DB.prepare(
    "SELECT id, type, payload, received_at FROM events WHERE id > ? ORDER BY id ASC LIMIT ?"
  )
    .bind(after, limit)
    .all()
  const eventos = (result.results ?? []).map((row) => {
    let payload = {}
    try {
      payload = JSON.parse(row.payload)
    } catch {
      /* payload corrupto: se entrega vacío para no bloquear el cursor */
    }
    return { id: Number(row.id), type: row.type, received_at: Number(row.received_at), payload }
  })
  return eventos
}

async function manejarWebhook(request, env, cors) {
  const url = new URL(request.url)
  if (request.method === "GET") {
    const modo = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token") ?? ""
    const challenge = url.searchParams.get("hub.challenge") ?? ""
    if (modo !== "subscribe" || !env.META_VERIFY_TOKEN) {
      return new Response("Forbidden", { status: 403 })
    }
    if (!(await igualSeguro(token, env.META_VERIFY_TOKEN))) {
      return new Response("Forbidden", { status: 403 })
    }
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    })
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors })
  }
  if (!env.META_APP_SECRET) {
    return json({ error: "META_APP_SECRET no configurado" }, 503)
  }

  const cuerpo = await request.text()
  const firma = request.headers.get("x-hub-signature-256")
  if (!(await firmaValida(cuerpo, firma, env.META_APP_SECRET))) {
    return new Response("Invalid signature", { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(cuerpo)
  } catch {
    return new Response("Bad JSON", { status: 400 })
  }

  try {
    await insertarEventos(env, extraerEventos(payload))
  } catch {
    return new Response("Error", { status: 500 })
  }
  return new Response("EVENT_RECEIVED", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  })
}

async function manejarEventos(request, env, cors) {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: cors })
  }
  if (!env.DESKTOP_TOKEN) {
    return json({ error: "DESKTOP_TOKEN no configurado" }, 503, cors)
  }
  const auth = request.headers.get("Authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  if (!(await igualSeguro(token, env.DESKTOP_TOKEN))) {
    return json({ error: "No autorizado" }, 401, cors)
  }

  const url = new URL(request.url)
  const after = Math.max(0, Math.floor(Number(url.searchParams.get("after")) || 0))
  const limit = Math.min(
    MAX_EVENTOS,
    Math.max(1, Math.floor(Number(url.searchParams.get("limit")) || 100))
  )

  try {
    const eventos = await listarEventos(env, after, limit)
    return json(
      {
        events: eventos,
        cursor: eventos.length > 0 ? eventos[eventos.length - 1].id : after,
        has_more: eventos.length === limit,
      },
      200,
      cors
    )
  } catch {
    return json({ error: "No se pudieron leer los eventos" }, 500, cors)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = cabecerasCors(request, env)

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors })
    }
    if (url.pathname === "/health") {
      return json({ ok: true, service: "fastws-webhooks" }, 200, cors)
    }
    if (url.pathname === "/webhook") {
      return manejarWebhook(request, env, cors)
    }
    if (url.pathname === "/events") {
      return manejarEventos(request, env, cors)
    }
    return new Response("Not Found", { status: 404, headers: cors })
  },
}
