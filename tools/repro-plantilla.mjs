#!/usr/bin/env node
/**
 * Diagnóstico de plantillas contra la API REAL de Meta.
 *
 *   node tools/repro-plantilla.mjs              # solo lectura: vuelca plantillas
 *   node tools/repro-plantilla.mjs --enviar NOMBRE 573001234001
 *
 * Por defecto NO envía nada: solo lista y explica cada plantilla. El envío es
 * explícito (--enviar) y hace una sola petición, para comprobar un caso
 * concreto sin inundar el número.
 *
 * Usa las credenciales de .env sin imprimirlas nunca.
 */
import fs from "node:fs"
import path from "node:path"

const API = "https://graph.facebook.com/v21.0"

function readEnv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const env = { ...readEnv(path.resolve(process.cwd(), ".env")), ...process.env }
const REQUIRED = ["META_TOKEN", "META_WABA_ID", "META_PHONE_NUMBER_ID"]
const faltan = REQUIRED.filter((k) => !env[k])
if (faltan.length) {
  console.error("Faltan variables de entorno: " + faltan.join(", "))
  process.exit(1)
}

const token = env.META_TOKEN
const wabaId = env.META_WABA_ID
const phoneId = env.META_PHONE_NUMBER_ID
const headers = { Authorization: `Bearer ${token}` }

async function get(ruta) {
  const res = await fetch(`${API}/${ruta}`, { method: "GET", headers })
  return { status: res.status, body: await res.json().catch(() => ({})) }
}

/* ── Réplica de template-status.tsx + api.ts, para poder explicar cada caso ── */

const PATRON = /\{\{\s*(\d+|[a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
const PATRON_SIN_NOMBRE = /\{\{\s*\}\}/g

function variables(body) {
  return [...body.matchAll(PATRON)].map((m) => m[1])
}

function sinNombre(body) {
  return [...body.matchAll(PATRON_SIN_NOMBRE)].length
}

function cabecera(t) {
  return t.components.find((c) => c.type === "HEADER")
}

function cuerpo(t) {
  return t.components.find((c) => c.type === "BODY")
}

/**
 * `parameter_name` solo viaja si el nombre no es numérico: Meta rechaza la
 * clave en plantillas posicionales ({{1}}) y la exige en las nombradas.
 */
function parametro(text, name) {
  return name && !/^\d+$/.test(name)
    ? { type: "text", parameter_name: name, text }
    : { type: "text", text }
}

function construir(t) {
  const body = cuerpo(t)
  const head = cabecera(t)
  const textoBody = body?.text ?? ""
  const textoHead = head?.text ?? ""

  let bodyParams = []
  const named = body?.example?.body_text_named_params
  if (named && named.length > 0) {
    bodyParams = named.map((p) => parametro(p.example, p.param_name))
  } else if (variables(textoBody).length > 0) {
    const numeric = body?.example?.body_text?.[0] ?? []
    bodyParams = [...numeric].map((text) => parametro(text))
  }

  // La cabecera solo lleva parámetros si tiene variables; casi todas son texto
  // fijo y mandarle un parámetro hace que Meta rechace el envío entero.
  let headerParams = []
  if (textoHead && variables(textoHead).length > 0) {
    const ejemplo = head?.example?.header_text?.[0]
    headerParams = variables(textoHead).map((name, i) => parametro(ejemplo ?? `Ejemplo ${i + 1}`, name))
  }

  const components = []
  if (headerParams.length) components.push({ type: "header", parameters: headerParams })
  if (bodyParams.length) components.push({ type: "body", parameters: bodyParams })

  const template = { name: t.name, language: { code: t.language } }
  if (components.length) template.components = components
  return { template, bodyParams, headerParams }
}

/* ── Volcado explicativo ──────────────────────────────────────────────────── */

const plantillas = await get(`${encodeURIComponent(wabaId)}/message_templates?limit=100`)
const lista = plantillas.body?.data ?? []

console.log(`Plantillas en la cuenta: ${lista.length}\n`)
for (const t of lista) {
  const textoBody = cuerpo(t)?.text ?? ""
  const vars = variables(textoBody)
  const huerfanas = sinNombre(textoBody)
  const estado = t.status === "APPROVED" ? "enviable" : `no enviar (${t.status})`
  console.log(`== ${t.name} | ${t.language} | ${t.category} | ${estado}`)
  console.log(`   parameter_format=${t.parameter_format ?? "—"}`)
  console.log(`   variables=${JSON.stringify(vars)}`)
  if (huerfanas) {
    console.log(
      `   ⚠ ${huerfanas} placeholder(s) {{}} sin nombre: Meta lo aprobó pero no hay forma de\n` +
        "     llenarlos. La app bloquea el envío y pide recrearla."
    )
  }
  const { bodyParams, headerParams } = construir(t)
  console.log(`   bodyParams=${JSON.stringify(bodyParams)}`)
  console.log(`   headerParams=${JSON.stringify(headerParams)}`)
  console.log("")
}

/* ── Envío explícito y único ──────────────────────────────────────────────── */

const enviarIdx = process.argv.indexOf("--enviar")
if (enviarIdx === -1) {
  // Sin `process.exit`: cortarlo con el pool de sockets abierto revienta el
  // assert de libuv en Windows al cerrar el proceso.
  console.log("Solo lectura. Para un envío real y único: --enviar <plantilla> <numero>")
} else {
  await enviar(plantillas.body?.data ?? [], enviarIdx)
}

async function enviar(lista, idx) {
  const nombre = process.argv[idx + 1]
  const destino = process.argv[idx + 2]
  if (!nombre || !destino) {
    console.error("Uso: node tools/repro-plantilla.mjs --enviar <plantilla> <numero>")
    process.exitCode = 1
    return
  }

  const objetivo = lista.find((t) => t.name === nombre && t.status === "APPROVED")
  if (!objetivo) {
    console.error(`No hay una plantilla APPROVED llamada "${nombre}".`)
    process.exitCode = 1
    return
  }
  if (sinNombre(cuerpo(objetivo)?.text ?? "") > 0) {
    console.error(`"${nombre}" tiene placeholders {{}} sin nombre y no se puede enviar.`)
    process.exitCode = 1
    return
  }

  const { template } = construir(objetivo)
  console.log(`\nEnviando "${nombre}" a ${destino}…`)
  console.log(JSON.stringify(template, null, 2))

  const res = await fetch(`${API}/${encodeURIComponent(phoneId)}/messages`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: destino.replace(/\D/g, ""),
      type: "template",
      template,
    }),
  })
  const cuerpoRes = await res.json().catch(() => ({}))
  console.log(`\nHTTP ${res.status}`)
  if (!res.ok) {
    const e = cuerpoRes?.error ?? {}
    console.log(`  message:    ${e.message ?? "—"}`)
    console.log(`  code:       ${e.code ?? "—"}  subcode: ${e.error_subcode ?? "—"}`)
    console.log(`  error_data: ${JSON.stringify(e.error_data ?? {})}`)
  } else {
    console.log(`  OK wamid: ${cuerpoRes?.messages?.[0]?.id}`)
  }
}