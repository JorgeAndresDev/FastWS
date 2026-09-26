#!/usr/bin/env node
/**
 * Smoke test contra la Meta WhatsApp Business Cloud API — SOLO LECTURA.
 *
 * Valida la capa de integración con credenciales reales sin enviar un solo
 * mensaje ni tocar la base de datos. Todo lo que hace son cinco llamadas GET,
 * las mismas que usa "Probar conexión" en la app, más la verificación de empresa
 * (que es lo que habilita el envío masivo).
 *
 * Uso:
 *   cp .env.example .env   # y rellena los tres valores
 *   npm run smoke:meta
 *
 * Salvaguardas:
 *   - Solo métodos GET (un POST futuro haría fallar el script).
 *   - Nunca imprime el token: solo su longitud y los últimos 4 caracteres.
 *   - Sale con código 1 si falta cualquier variable o si alguna llamada no es 200.
 */

import fs from "node:fs"
import path from "node:path"

const API = "https://graph.facebook.com/v21.0"
const REQUIRED = ["META_TOKEN", "META_WABA_ID", "META_PHONE_NUMBER_ID"]

/** Lee un .env sencillo (KEY=VALUE, admite comillas y comentarios). */
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

/** Nunca revela el secreto: solo deja ver su forma. */
function redact(value) {
  const s = String(value ?? "")
  if (!s) return "(vacío)"
  return `…${s.slice(-4)} (${s.length} caracteres)`
}

const env = { ...readEnv(path.resolve(process.cwd(), ".env")), ...process.env }
const faltan = REQUIRED.filter((k) => !env[k])
if (faltan.length) {
  console.error("Faltan variables de entorno: " + faltan.join(", "))
  console.error("Copia .env.example a .env y rellénalas con tus credenciales de Meta.")
  process.exit(1)
}

const token = env.META_TOKEN
const wabaId = env.META_WABA_ID
const phoneId = env.META_PHONE_NUMBER_ID

const resultados = []
let fallos = 0

/** Una llamada GET de solo lectura. Nunca lanza: registra el fallo y sigue. */
async function leer(ruta, etiqueta) {
  const url = `${API}/${ruta}`
  const headers = { Authorization: `Bearer ${token}` }
  if (process.env.SMOKE_DEBUG) console.error(`→ GET ${ruta}`)
  try {
    const res = await fetch(url, { method: "GET", headers })
    const cuerpo = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = cuerpo?.error ?? {}
      fallos++
      resultados.push({
        ok: false,
        etiqueta,
        detalle: `HTTP ${res.status}${err.code ? ` · Meta ${err.code}` : ""} — ${err.message ?? "sin mensaje"}`,
      })
      return null
    }
    resultados.push({ ok: true, etiqueta })
    return cuerpo
  } catch (e) {
    fallos++
    resultados.push({ ok: false, etiqueta, detalle: String(e?.message ?? e) })
    return null
  }
}

console.log("Meta WhatsApp Business Cloud API — validación de solo lectura\n")
console.log(`  WABA ID            : ${redact(wabaId)}`)
console.log(`  Phone Number ID    : ${redact(phoneId)}`)
console.log(`  Token              : ${redact(token)}`)
console.log(`  Versión de la API  : v21.0\n`)

// 1-3: la terna que exige la app para poder despachar
const telefono = await leer(
  `${encodeURIComponent(phoneId)}?fields=verified_name,display_phone_number,quality_rating,status`,
  "El token lee el número de teléfono"
)
const waba = await leer(
  `${encodeURIComponent(wabaId)}?fields=name,verification_status,message_template_namespace`,
  "El token lee la WABA"
)
const numeros = await leer(
  `${encodeURIComponent(wabaId)}/phone_numbers?fields=id,display_phone_number,verified_name`,
  "El token lista los números de la WABA"
)

// 4: inventario de plantillas (lo que la app necesita para poder enviar)
const plantillas = await leer(
  `${encodeURIComponent(wabaId)}/message_templates?limit=100`,
  "El token lista las plantillas"
)

// La verificación de la empresa es un campo del nodo WABA, no un sub-recurso.
const verif = waba?.verification_status ?? null

for (const r of resultados) {
  console.log(`  ${r.ok ? "OK   " : "FALLO"} ${r.etiqueta}${r.detalle ? "\n         " + r.detalle : ""}`)
}

console.log("\nDetalle\n")

const numero = telefono?.display_phone_number
console.log(`  Número de la empresa : ${numero ?? "—"}`)
console.log(`  Nombre verificado    : ${telefono?.verified_name ?? "—"}`)
console.log(`  Estado del número    : ${telefono?.status ?? "—"}`)
console.log(`  Calidad (rating)     : ${telefono?.quality_rating ?? "no informado por la API"}`)
console.log(`  WABA                 : ${waba?.name ?? "—"}`)

const idsNumeros = (numeros?.data ?? []).map((n) => String(n.id))
const pertenece = idsNumeros.includes(String(phoneId))
console.log(
  `  El número está en la WABA : ${pertenece ? "sí" : "NO — la app rechazará esta combinación"}`
)
if (!pertenece && idsNumeros.length) {
  console.log(`  Números en la WABA   : ${idsNumeros.join(", ")}`)
  fallos++
}

const porEstado = {}
for (const t of plantillas?.data ?? []) porEstado[t.status] = (porEstado[t.status] ?? 0) + 1
const aprobadas = porEstado.APPROVED ?? 0
console.log(`\n  Plantillas (${(plantillas?.data ?? []).length} en total):`)
if (Object.keys(porEstado).length === 0) {
  console.log("    — ninguna devuelta")
} else {
  for (const [estado, n] of Object.entries(porEstado)) {
    console.log(`    ${String(estado).padEnd(12)} ${n}`)
  }
}

console.log(`\n  Verificación de la empresa : ${verif ?? "no informada por la API"}`)
if (verif && verif !== "verified") {
  console.log("    ⚠ Sin verificación el envío masivo queda restringido por Meta.")
} else if (!verif) {
  console.log("    (Meta no expone este estado con este token; se confirma en el panel de empresa.)")
}

console.log("\nConclusión\n")
if (fallos === 0) {
  console.log(`  La capa de integración está lista: ${aprobadas} plantilla(s) APPROVED disponibles.`)
  if (aprobadas === 0) {
    console.log("  ⚠ Con 0 plantillas aprobadas solo puedes enviar dentro de la ventana de 24 h.")
  }
  process.exit(0)
} else {
  console.log(`  Hay ${fallos} problema(s) que resolver antes de pensar en producción.`)
  process.exit(1)
}
