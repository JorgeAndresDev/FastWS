import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
export const PORT = 9230
export const PROFILE = "C:\\Users\\jlele\\AppData\\Local\\Temp\\opencode\\edge-sim"
export const OUT = fileURLToPath(new URL("./artifacts/", import.meta.url))
export const BASE = "http://localhost:5173"

export function iso(minAgo) {
  const d = new Date(Date.now() - minAgo * 60000)
  return d.toISOString()
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function getJson(url) {
  try {
    const res = await fetch(url)
    if (res.ok) return await res.json()
  } catch {}
  return null
}

export async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    const list = await getJson(`http://127.0.0.1:${PORT}/json/list`)
    if (Array.isArray(list)) {
      const page = list.find((t) => t.type === "page")
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    }
    await wait(500)
  }
  throw new Error("No hay target CDP")
}

export class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.listeners = new Map()
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(JSON.stringify(msg.error)))
        else resolve(msg.result)
      } else if (msg.method && this.listeners.has(msg.method)) {
        for (const h of this.listeners.get(msg.method)) h(msg.params)
      }
    })
  }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((res, rej) => {
      ws.addEventListener("open", res)
      ws.addEventListener("error", () => rej(new Error("ws error")))
    })
    return new CDP(ws)
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }
  on(method, cb) {
    if (!this.listeners.has(method)) this.listeners.set(method, [])
    this.listeners.get(method).push(cb)
  }
  off(method, cb) {
    const a = this.listeners.get(method)
    if (a) {
      const i = a.indexOf(cb)
      if (i >= 0) a.splice(i, 1)
    }
  }
}

export function locVal(cdp, expr) {
  return async () => {
    const r = await cdp.send("Runtime.evaluate", { expression: `(() => ${expr})()`, returnByValue: true })
    return r.result?.value ?? null
  }
}

export async function waitFor(getter, expected, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const val = await getter()
    if (val === expected) return true
    await wait(300)
  }
  return false
}

export async function evalJson(cdp, expr) {
  const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(`evalJson: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`)
  return r.result?.value ?? null
}

export function mkSeed(scenario = "conectado") {
  const connected = scenario !== "sinconexion"
  const device = { id: "PC-01", code: "FW-SIM1", platform: "Windows" }
  const sesiones = [
    {
      id: "ses-1",
      origen: "inicio",
      usuario: "Administrador",
      email: "admin@fastws.local",
      rol: "Operativo",
      recordar: true,
      equipo: device.code,
      plataforma: device.platform,
      inicio: iso(40),
    },
  ]
  const clientes = [
    { id: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", phones: ["573001234001"], company: "La Roca", city: "Manizales", zone: "Norte", clientType: "NORMAL", status: "activo", valid: true, createdAt: iso(1440) },
    { id: "cl-2", code: "C-1002", name: "Mini Mercado Villa", phone: "573021234002", phones: ["573021234002"], company: "Villa", city: "Dosquebradas", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: iso(1440) },
    { id: "cl-3", code: "C-1003", name: "Heladería Polo", phone: "573131234004", phones: ["573131234004"], company: "Polo", city: "Armenia", zone: "Sur", clientType: "CASHLESS", status: "activo", valid: true, createdAt: iso(45) },
    { id: "cl-4", code: "C-1004", name: "Sin teléfono válido", phone: "000", phones: ["000"], company: "—", city: "—", zone: "—", clientType: "NORMAL", status: "inactivo", valid: false, createdAt: iso(1440) },
  ]
  const campanaEnProceso = {
    id: "camp-1",
    name: "Despacho nocturno · Ruta Norte",
    description: "Recordatorio de ruta al norte.",
    template: { name: "recordatorio_ruta", language: "es" },
    mapping: [{ variable: "{{1}}", fuente: "campo", campo: "name" }],
    filter: { zone: "Norte" },
    status: "EN_PROCESO",
    recipients: [
      { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573001234001", params: ["Café La Roca"], status: "ENTREGADO", metaId: "wamid-1", sentAt: iso(20) },
      { clientId: "cl-2", code: "C-1002", name: "Mini Mercado Villa", phone: "573021234002", params: ["Mini Mercado Villa"], status: "PROCESO", metaId: "wamid-2", sentAt: iso(5) },
      { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573151234003", params: ["Café La Roca"], status: "PENDIENTE" },
      { clientId: "cl-2", code: "C-1002", name: "Mini Mercado Villa", phone: "573161234004", params: ["Mini Mercado Villa"], status: "PROCESO", metaId: "wamid-3", sentAt: iso(9) },
      { clientId: "cl-1", code: "C-1001", name: "Café La Roca", phone: "573171234005", params: ["Café La Roca"], status: "FALLIDO", errorCode: "131031", errorMessage: "Tiempo agotado.", sentAt: iso(80) },
    ],
    createdAt: iso(90),
    startedAt: iso(60),
    activity: [
      { tipo: "creada", at: iso(90) },
      { tipo: "iniciada", at: iso(60) },
    ],
  }
  const campanaBorrador = {
    id: "camp-2",
    name: "Promoción fin de semana",
    description: "",
    template: { name: "confirmacion_pedido", language: "es" },
    mapping: [{ variable: "{{1}}", fuente: "campo", campo: "orderState" }],
    filter: { city: "Armenia" },
    status: "BORRADOR",
    recipients: [
      { clientId: "cl-3", code: "C-1003", name: "Heladería Polo", phone: "573131234004", params: ["PENDIENTE"], status: "PENDIENTE" },
    ],
    createdAt: iso(10),
    activity: [{ tipo: "creada", at: iso(10) }],
  }
  const threads = [
    {
      id: "hilo-1",
      phone: "573131234004",
      clientId: "cl-3",
      lastMessage: "Gracias, ahí estaré a las 6.",
      lastAt: iso(15),
      status: "respondida",
      origin: "respuesta",
      messages: [
        { id: "m-1", phone: "573131234004", direction: "saliente", text: "recordatorio_ruta", status: "PROCESO", viaTemplate: true, sentAt: iso(80) },
        { id: "m-2", phone: "573131234004", direction: "entrante", text: "Gracias, ahí estaré a las 6.", status: "LEIDO", sentAt: iso(15) },
      ],
    },
    {
      id: "hilo-2",
      phone: "573001234001",
      clientId: "cl-1",
      lastMessage: "Recordatorio: ruta hoy 6 pm.",
      lastAt: iso(60),
      status: "pendiente",
      origin: "despacho",
      messages: [
        { id: "m-3", phone: "573001234001", direction: "saliente", text: "recordatorio_ruta", status: "ENTREGADO", viaTemplate: true, sentAt: iso(60) },
      ],
    },
    {
      id: "hilo-3",
      phone: "573021234002",
      clientId: "cl-2",
      lastMessage: "Fallo al enviar el recordatorio.",
      lastAt: iso(80),
      status: "con_error",
      origin: "despacho",
      messages: [
        { id: "m-4", phone: "573021234002", direction: "saliente", text: "recordatorio_ruta", status: "FALLIDO", viaTemplate: true, sentAt: iso(80), errorCode: "131031", errorMessage: "Tiempo agotado." },
      ],
    },
  ]
  const auditoria = [
    { id: "aud-1", at: iso(30), categoria: "conexion", titulo: "Conexión Meta establecida", detalle: "573100000000 · FastWS WABA", entidad: "573100000000", usuario: "Administrador", dispositivo: "PC-01 · FW-SIM1" },
    { id: "aud-2", at: iso(25), categoria: "importacion", titulo: "Clientes importados", detalle: "4 nuevos · 0 actualizados por Código", entidad: "madre.csv", usuario: "Administrador", dispositivo: "PC-01 · FW-SIM1" },
  ]

  const seed = {}
  seed["fastws.clientes"] = clientes
  seed["fastws.campanas"] = [campanaEnProceso, campanaBorrador]
  seed["fastws.campanas.velocidad"] = "1000/h"
  seed["fastws.conversaciones"] = { threads, merged: { "camp-1:5:EN_PROCESO:": "camp:1:4" } }
  seed["fastws.sesiones"] = sesiones
  seed["fastws.auditoria"] = auditoria
  seed["fastws.app.locale"] = "es-CO" // valor crudo (no JSON), igual que app-config
  seed["fastws.device"] = device
  seed["fastws.session"] = { name: "Administrador", email: "admin@fastws.local", role: "Operativo" }
  if (connected) {
    seed["fastws.conexion.ids"] = { phoneNumberId: "1234567890", wabaId: "9876543210" }
    // El token ya no viaja en la sesión de conexión: en escritorio vive
    // cifrado con DPAPI y en el navegador el fallback lo deja en
    // `fastws.meta-token`. El simulacro corre en navegador, así que siembra
    // esa clave; `fastws.conexion.meta` es el resto de la sesión y sí va a la
    // base.
    seed["fastws.meta-token"] = "EAAG-sim-token"
    seed["fastws.conexion.meta"] = { metaPhone: "573100000000", wabaName: "FastWS WABA", verifiedAt: iso(30) }
  }
  return seed
}

export function seedExpr(scenario = "conectado") {
  const seed = mkSeed(scenario)
  const lines = Object.entries(seed).map(([k, v]) => {
    const raw = k === "fastws.app.locale" ? v : JSON.stringify(k.endsWith(".velocidad") ? JSON.stringify(v) : v)
    // el token va al fallback efímero (sessionStorage); el resto, a la base
    const store = k === "fastws.meta-token" ? "sessionStorage" : "localStorage"
    return `  ${store}.setItem(${JSON.stringify(k)}, ${JSON.stringify(raw)});`
  })
  return `(() => {\n${lines.join("\n")}\n  return "seeded:" + Object.keys(localStorage).length;\n})()`
}

export function fetchStubSrc() {
  return `(() => {
  const real = window.fetch.bind(window);
  const HOST = "graph.facebook.com";
  const json = (o, status = 200) => Promise.resolve(new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } }));
  const noBody = (status) => Promise.resolve(new Response(null, { status }));
  const metaErr = (code, message, status) => json({ error: { message, code } }, status);
  window.__SIM = Object.assign({ mode: "ok", paging: "cursor" }, JSON.parse(sessionStorage.getItem("__sim") || "{}"));
  // Las tresNAMED reproducen lo que devuelve la cuenta real: parameter_format
  // "NAMED", ejemplos en body_text_named_params y cabeceras que sí llevan
  // variable. Las otras dos cubren los fallos que el stub anterior no veía:
  // una cabecera de texto fijo y placeholders {{}} sin nombre.
  const TEMPLATES = () => (window.__simTpl = window.__simTpl || [
    { id: "tpl-cnf", name: "confirmacion_demo", status: "APPROVED", category: "MARKETING", language: "es", parameter_format: "NAMED", components: [ { type: "HEADER", format: "TEXT", text: "Hola {{1}},", example: { header_text: ["Andres"] } }, { type: "BODY", text: "Tu pedido {{1}} va en camino.", example: { body_text: [["Pedido 1234"]] } }, { type: "FOOTER", text: "Gracias por comprar con nosotros." } ], quality_score: { score: "GREEN" }, last_updated_time: 1726000000 },
    { id: "tpl-rec", name: "recordatorio_ruta", status: "APPROVED", category: "UTILITY", language: "es", parameter_format: "NAMED", components: [ { type: "BODY", text: "Su ruta hoy a las {{1}}.", example: { body_text: [["6 pm"]] } } ], quality_score: { score: "YELLOW" }, last_updated_time: 1726000000 },
    { id: "tpl-pend", name: "pedido_listo_pickup", status: "PENDING", category: "UTILITY", language: "es", parameter_format: "NAMED", components: [ { type: "BODY", text: "Tu pedido esta listo para recoger." } ], quality_score: null, last_updated_time: 1726000000 },
    // R1: NAMED con nombres reales. Sin parameter_name Meta responde
    // "Parameter name is missing or empty".
    { id: "tpl-named", name: "rmd_named", status: "APPROVED", category: "UTILITY", language: "es_CO", parameter_format: "NAMED", components: [ { type: "BODY", text: "Hola {{nombre}}, tu pedido del {{fecha}}.", example: { body_text_named_params: [ { param_name: "nombre", example: "Punto Frio" }, { param_name: "fecha", example: "23/03/2026" } ] } } ], quality_score: { score: "GREEN" }, last_updated_time: 1726000000 },
    // R2: cabecera de texto fijo, como hello_world. Mandarle un parámetro hace
    // que Meta rechace el envío entero.
    { id: "tpl-hw", name: "hello_world_sim", status: "APPROVED", category: "UTILITY", language: "en_US", parameter_format: "POSITIONAL", components: [ { type: "HEADER", format: "TEXT", text: "Hello World" }, { type: "BODY", text: "Welcome and congratulations." }, { type: "FOOTER", text: "WhatsApp Business Platform" } ], quality_score: { score: "GREEN" }, last_updated_time: 1726000000 },
    // R4: aprobada por Meta pero inejable, con {{}} sin nombre.
    { id: "tpl-vacia", name: "preventa_sin_nombre", status: "APPROVED", category: "UTILITY", language: "es_CO", parameter_format: "NAMED", components: [ { type: "BODY", text: "Buenos dias, {{}} su pedido llega el {{}}." } ], quality_score: null, last_updated_time: 1726000000 },
  ]);
  const EXTRA = { id: "tpl-extra", name: "encuesta_final", status: "APPROVED", category: "MARKETING", language: "es", components: [ { type: "BODY", text: "Cuentanos {{1}}.", example: { body_text: [["que tal tu pedido"]] } } ], quality_score: { score: "GREEN" }, last_updated_time: 1726000000 };
  window.fetch = (input, init) => {
    const url = String(input);
    if (!url.includes(HOST)) return real(input, init);
    const sim = window.__SIM || { mode: "ok" };
    const mode = sim.mode;
    if (mode === "network") return Promise.reject(new TypeError("Failed to fetch"));
    const method = ((init && init.method) || "GET").toUpperCase();
    if (url.includes("/messages")) {
      if (method === "POST") {
        try { window.__simBody = JSON.parse(init.body); } catch {}
        (window.__simLog = window.__simLog || []).push({ at: Date.now(), kind: mode });
        if (mode === "auth") return metaErr(190, "Session has expired", 401);
        if (mode === "rate") return metaErr(130429, "Rate limit hit, slowing down", 429);
        if (mode === "5xx") return metaErr(500, "Internal Server Error", 500);
        if (mode === "terminal") return metaErr(131031, "Message Undeliverable", 400);
        return json({ contacts: [{ wa_id: "573001234001" }], messages: [{ id: "wamid-sim-" + Date.now() + "-" + Math.floor(Math.random() * 1e4), message_status: "accepted" }] });
      }
      return json({});
    }
    if (url.includes("/message_templates")) {
      if (method === "POST") return json({ id: "tpl-sim-1", status: "PENDING", category: "MARKETING" });
      if (method === "DELETE") {
        (window.__simLog = window.__simLog || []).push({ at: Date.now(), kind: "delTpl", url: url.slice(0, 180) });
        if (mode === "5xx") return metaErr(500, "Internal Server Error", 500);
        const u = new URL(url);
        const tplName = u.searchParams.get("name") || "";
        if (Array.isArray(window.__simTpl) && tplName) {
          const i = window.__simTpl.findIndex((t) => t.name === tplName);
          if (i >= 0) window.__simTpl.splice(i, 1);
        }
        return noBody(204);
      }
      const after = new URL(url).searchParams.get("after");
      if (after) window.__simAfter = after;
      const pagingMode = sim.paging === "next-url";
      const data = after ? (pagingMode ? [] : [EXTRA]) : TEMPLATES();
      const paging = pagingMode
        ? { next: "https://graph.facebook.com/v21.0/" + (sim.waba || "9876543210") + "/message_templates?after=QVFv_NEXTURL" }
        : { cursors: { after: "QVFv_CURSOR" } };
      return json({ data, paging });
    }
    if (url.includes("/phone_numbers")) return json({ data: [{ id: "1234567890" }] });
    if (url.includes("fields=verified_name")) return json({ verified_name: "FastWS WABA", display_phone_number: sim.metaPhone || "573100000000", platform_type: "CLOUD_API", status: "CONNECTED" });
    if (url.includes("fields=name")) return json({ name: "FastWS WABA" });
    return real(input, init);
  };
  window.__stubActive = true;
})()`
}

/**
 * Cuántos píxeles desborda en horizontal el contenedor con scroll de una tabla.
 *
 * Se mide `scrollWidth - clientWidth` sobre el elemento que declara
 * `overflow-x: auto|scroll`, que es el que puede pintar la barra lateral. No se
 * mira el CSS: el síntoma que reportó el operador era una barra horizontal de
 * unos píxeles, y eso es lo que este check tiene que detectar.
 */
export function measureOverflow(cdp) {
  return evalJson(cdp, `(()=>{
    const malos=[...document.querySelectorAll('main *')].filter(el=>{
      const cs=getComputedStyle(el);
      return el.scrollWidth - el.clientWidth > 1 && (cs.overflowX==='auto'||cs.overflowX==='scroll');
    });
    return Math.max(0, ...malos.map(el=>el.scrollWidth - el.clientWidth));
  })()`)
}

/** Igual que `measureOverflow`, pero devuelve qué elementos desbordan y por qué. */
export function overflowDetail(cdp) {
  return evalJson(
    cdp,
    `JSON.stringify([...document.querySelectorAll('main *')].filter(el=>{
      const cs=getComputedStyle(el);
      return el.scrollWidth - el.clientWidth > 1 && (cs.overflowX==='auto'||cs.overflowX==='scroll');
    }).map(el=>({
      px: el.scrollWidth - el.clientWidth,
      sw: el.scrollWidth,
      cw: el.clientWidth,
      tag: el.tagName.toLowerCase(),
      clase: (el.className || '').toString().slice(0, 70)
    })).sort((a,b)=>b.px-a.px).slice(0,4))`
  )
}

export function dumpExpr() {
  return `(() => {
    const out = { localStorage: {}, sessionStorage: {} };
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("fastws."));
    for (const k of keys) { try { const raw = localStorage.getItem(k); out.localStorage[k] = raw.length > 400 ? raw.slice(0, 400) + "…" : raw; } catch {} }
    for (const k of Object.keys(sessionStorage).filter((k) => k.startsWith("fastws."))) { out.sessionStorage[k] = sessionStorage.getItem(k); }
    return JSON.stringify(out);
  })()`
}

export async function spawnEdge() {
  const edge = spawn(EDGE, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "about:blank",
  ], { stdio: "ignore" })
  try {
    const wsUrl = await waitForTarget()
    const cdp = await CDP.connect(wsUrl)
    await cdp.send("Page.enable")
    await cdp.send("Runtime.enable")
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
    return { cdp, edge }
  } catch (err) {
    edge.kill()
    throw err
  }
}

export function outDir(pasada) {
  const dir = path.join(OUT, pasada)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

export async function writeArtifacts(dir, label, { json: jsonObj, txt, png, dump }) {
  if (jsonObj !== undefined) fs.writeFileSync(path.join(dir, `${label}.json`), typeof jsonObj === "string" ? jsonObj : JSON.stringify(jsonObj, null, 2))
  if (txt !== undefined) fs.writeFileSync(path.join(dir, `${label}.txt`), txt)
  if (dump !== undefined) fs.writeFileSync(path.join(dir, `${label}.storage.json`), typeof dump === "string" ? dump : JSON.stringify(dump, null, 2))
  if (png !== undefined) {
    const shot = await png
    fs.writeFileSync(path.join(dir, `${label}.png`), Buffer.from(shot, "base64"))
  }
}

export async function shot(cdp) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" })
  return r.data
}

export async function bodyText(cdp) {
  const r = await cdp.send("Runtime.evaluate", { expression: "document.body ? document.body.innerText : ''", returnByValue: true })
  return r.result?.value ?? ""
}

export async function navigate(cdp, route, timeoutMs = 15000) {
  await cdp.send("Page.navigate", { url: BASE + route })
  return waitFor(locVal(cdp, "location.pathname"), route, timeoutMs)
}