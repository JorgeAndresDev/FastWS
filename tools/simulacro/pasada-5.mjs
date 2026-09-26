import { spawnEdge, fetchStubSrc, evalJson, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE, iso, bodyText } from "./sim-base.mjs"

const J = JSON.stringify

const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const SEL=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('change',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const SIM=(o)=>{const merged=Object.assign({mode:'ok',paging:'cursor'},window.__SIM||{},o);window.__SIM=merged;try{sessionStorage.setItem('__sim',JSON.stringify(merged))}catch(e){}return 'ok'};`

const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 10000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${J(sel)})`)), true, ms)
const hasBody = (cdp, text) => evalJson(cdp, `document.body.innerText.includes(${J(text)})`)
const hasTxt = (cdp, text) => evalJson(cdp, `document.body.textContent.includes(${J(text)})`)
const waitToast = async (cdp, t, ms = 9000) => {
  try {
    await waitFor(async () => await hasTxt(cdp, t), true, ms)
    return true
  } catch {
    return false
  }
}
const hasStamp = (cdp, kw) => evalJson(cdp, `!![...document.querySelectorAll('[data-testid="status-stamp"]')].find(el=>(el.getAttribute('aria-label')||'').toLowerCase().includes(${J(kw)})||(el.textContent||'').toLowerCase().includes(${J(kw)}))`)
const rowsN = async (cdp) => evalJson(cdp, `(()=>{const gs=[...document.querySelectorAll('[role="table"] [role="rowgroup"]')];if(gs.length){const last=gs[gs.length-1];return last.querySelectorAll('[role="row"]').length}return Math.max(0,document.querySelectorAll('[role="table"] [role="row"]').length-1)})()`)
const store = (cdp, k) => evalJson(cdp, `JSON.parse(localStorage.getItem(${J(k)})||'null')`)
const rowsIn = (cdp, sel) => evalJson(cdp, `document.querySelectorAll(${J(sel)}).length`)
const probe = (cdp, expr) => evalJson(cdp, `JSON.stringify(${expr})`)

const clickMain = async (cdp, m, t) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll(${J(m)})].find(x=>(x.textContent||'').trim()===${J(t)}||(x.textContent||'').trim().startsWith(${J(t)}));if(!b)return null;b.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}

const clickRowAction = async (cdp, needle, btn) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll('[role="row"]')].find(r=>r.innerText.includes(${J(needle)}));if(!b)return null;const x=[...b.querySelectorAll('button')].find(y=>(y.textContent||'').trim()===${J(btn)});if(!x)return null;x.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}

const clickRow = async (cdp, needle) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll('[role="row"]')].find(r=>r.innerText.includes(${J(needle)}));if(!b)return null;b.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}

const clickLi = async (cdp, needle) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll('main ul[role="list"] li')].find(r=>r.innerText.includes(${J(needle)}));if(!b)return null;const x=b.querySelector('button');if(!x)return null;x.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}

function seedP5() {
  const seed = {}
  seed["fastws.clientes"] = [
    { id: "cl-1", code: "C-0001", name: "Cafe La Roca", phone: "3001234001", phones: ["3001234001"], company: "La Roca", city: "Manizales", zone: "Norte", clientType: "NORMAL", status: "activo", valid: true, createdAt: iso(1440) },
    { id: "cl-2", code: "C-0002", name: "Mini Mercado Villa", phone: "3021234002", phones: ["3021234002"], company: "Villa", city: "Dosquebradas", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: iso(1440) },
    { id: "cl-3", code: "C-0003", name: "Heladeria Polo", phone: "3131234004", phones: ["3131234004"], company: "Polo", city: "Armenia", zone: "Sur", clientType: "CASHLESS", status: "activo", valid: true, createdAt: iso(45) },
    { id: "cl-4", code: "C-0004", name: "Panaderia Berta", phone: "3001234007", phones: ["3001234007"], company: "Berta", city: "Pereira", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: iso(30) },
  ]
  const campA = {
    id: "camp-a", name: "Mixta Demostrativa", description: "Campana A",
    template: { name: "confirmacion_demo", language: "es" },
    mapping: [{ index: 1, fuente: "campo", campo: "name" }],
    filter: {}, status: "FINALIZADA",
    recipients: [
      { clientId: "cl-1", code: "C-0001", name: "Cliente A", phone: "573009900001", params: ["Cliente A"], status: "PROCESO", metaId: "wamid-a1", sentAt: iso(30) },
      { clientId: "cl-1", code: "C-0001", name: "Cliente B", phone: "573009900002", params: ["Cliente B"], status: "FALLIDO", errorCode: "131031", errorMessage: "Tiempo agotado.", sentAt: iso(70) },
      { clientId: "cl-1", code: "C-0001", name: "Cliente C", phone: "573009900003", params: ["Cliente C"], status: "CANCELADO", sentAt: iso(10) },
    ],
    createdAt: iso(90), startedAt: iso(80), endedAt: iso(20),
    activity: [{ tipo: "creada", at: iso(90) }, { tipo: "iniciada", at: iso(80) }, { tipo: "finalizada", at: iso(20) }],
  }
  const campB = {
    id: "camp-b", name: "Mixta Demostrativa", description: "Campana B (mismo nombre)",
    template: { name: "confirmacion_demo", language: "es" },
    mapping: [{ index: 1, fuente: "campo", campo: "name" }],
    filter: {}, status: "FINALIZADA",
    recipients: [
      { clientId: "cl-1", code: "C-0001", name: "Cliente D", phone: "573009900004", params: ["Cliente D"], status: "PROCESO", metaId: "wamid-b1", sentAt: iso(25) },
      { clientId: "cl-1", code: "C-0001", name: "Cliente E", phone: "573009900005", params: ["Cliente E"], status: "LEIDO", metaId: "wamid-leido1", sentAt: iso(15) },
      { clientId: "cl-1", code: "C-0001", name: "Cliente F", phone: "573009900006", params: ["Cliente F"], status: "ENTREGADO", metaId: "wamid-ent1", sentAt: iso(16) },
    ],
    createdAt: iso(60), startedAt: iso(70), endedAt: iso(10),
    activity: [{ tipo: "creada", at: iso(60) }, { tipo: "iniciada", at: iso(70) }, { tipo: "finalizada", at: iso(10) }],
  }
  const campC = {
    id: "camp-c", name: "Clientes sin telefono valido", description: "",
    template: { name: "recordatorio_ruta", language: "es" },
    mapping: [{ index: 1, fuente: "campo", campo: "name" }],
    filter: {}, status: "BORRADOR",
    recipients: [
      { clientId: "cl-1", code: "C-0001", name: "Cliente G", phone: "573001234001", params: ["Cliente G"], status: "PENDIENTE" },
    ],
    createdAt: iso(5), activity: [{ tipo: "creada", at: iso(5) }],
  }
  seed["fastws.campanas"] = [campA, campB, campC]
  seed["fastws.campanas.velocidad"] = "1000/h"
  seed["fastws.conversaciones"] = { threads: [], merged: {} }
  seed["fastws.sesiones"] = [{ id: "ses-1", origen: "inicio", usuario: "Administrador", email: "admin@fastws.local", rol: "Operativo", recordar: true, equipo: "FW-SIM1", plataforma: "Windows", inicio: iso(40) }]
  seed["fastws.auditoria"] = [
    { id: "aud-0", at: iso(30), categoria: "conexion", titulo: "Conexion Meta establecida", detalle: "573100000000 · FastWS WABA", entidad: "573100000000", usuario: "Administrador", dispositivo: "PC-01 · FW-SIM1" },
  ]
  seed["fastws.app.locale"] = "es-CO"
  seed["fastws.device"] = { id: "PC-01", code: "FW-SIM1", platform: "Windows" }
  seed["fastws.session"] = { name: "Administrador", email: "admin@fastws.local", role: "Operativo" }
  seed["fastws.conexion.ids"] = { phoneNumberId: "1234567890", wabaId: "9876543210" }
  seed["fastws.conexion.sesion"] = { token: "EAAG-sim-token", metaPhone: "573100000000", wabaName: "FastWS WABA", verifiedAt: iso(30) }
  return seed
}

function seedExprP5() {
  const seed = seedP5()
  const lines = Object.entries(seed).map(([k, v]) => {
    const raw = k === "fastws.app.locale" ? v : JSON.stringify(k.endsWith(".velocidad") ? JSON.stringify(v) : v)
    const store = k === "fastws.conexion.sesion" ? "sessionStorage" : "localStorage"
    return `  ${store}.setItem(${J(k)}, ${J(raw)});`
  })
  return `(() => {\n${lines.join("\n")}\n  return "seeded:" + Object.keys(localStorage).length;\n})()`
}

async function resetAll(cdp) {
  await act(cdp, `Object.keys(localStorage).filter(k=>k.startsWith('fastws.')).forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem('__sim');return 'ok'`)
  await evalJson(cdp, seedExprP5())
  await act(cdp, `localStorage.removeItem('fastws.conexion.sesion');sessionStorage.removeItem('fastws.conexion.sesion');return 'ok'`)
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: `(()=>{window.__simLog=[];window.__simBody=null;window.__simAfter=null;window.__SIM=Object.assign({mode:'ok',paging:'cursor'},JSON.parse(sessionStorage.getItem('__sim')||'{}'))})()` })
}

async function boot(cdp) {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
  await cdp.send("Page.navigate", { url: BASE })
  await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
  await resetAll(cdp)
  await reload(cdp)
}

async function reload(cdp) {
  await cdp.send("Page.reload", { ignoreCache: true })
  await waitSel(cdp, "header", 15000)
  await wait(900)
}

async function go(cdp, route) {
  await navigate(cdp, route)
  await waitSel(cdp, "header")
  await wait(500)
}

const R_ = []
let n = 0
const ch = (label, ok, detalle) => { R_.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

async function main() {
  const { cdp } = await spawnEdge()
  const dir = outDir("pasada-5")
  await wait(600)
  await cdp.send("Page.enable")
  await cdp.send("Runtime.enable")
  await boot(cdp)

  // ── 5.1 muro sin conexion ──────────────────────────────────────────────
  await go(cdp, "/app/plantillas")
  const ok51 = (await hasBody(cdp, "Muestra la \u00faltima sincronizaci\u00f3n guardada en este equipo")) && (await hasBody(cdp, "Ir a Conexi\u00f3n"))
  ch("5.1 Plantillas sin conexion: muestra la cache local + CTA 'Ir a Conexi\u00f3n'", ok51, "")
  writeArtifacts(dir, "5a-sinconexion", { png: shot(cdp), dump: null })

  // restore connection
  await act(cdp, `sessionStorage.setItem('fastws.conexion.sesion', JSON.stringify(${J(seedP5()["fastws.conexion.sesion"])}));return 'ok'`)
  await reload(cdp)
  await go(cdp, "/app/plantillas")
  const rows52 = await waitFor(async () => (await rowsN(cdp)) === 3, true, 12000)
  ch("5.2 sincroniza al cargar: 3 plantillas de Meta (2 aprobadas + 1 pendiente)", rows52, `rows=${await rowsN(cdp)}`)
  writeArtifacts(dir, "5x-diag", {
    txt: JSON.stringify({
      sim: await evalJson(cdp, `window.__SIM||null`),
      simLog: await evalJson(cdp, `window.__simLog||[]`),
      simAfter: await evalJson(cdp, `window.__simAfter||null`),
      rows: await evalJson(cdp, `JSON.stringify((()=>{const gs=[...document.querySelectorAll('[role="table"] [role="rowgroup"]')];const last=gs[gs.length-1];return last?[...last.querySelectorAll('[role="row"]')].map(r=>r.innerText.split("\\n").slice(0,2).join(' | ')):[]})())`),
      bodyHead: (await bodyText(cdp)).slice(0, 300),
    }, null, 2),
  })

  // sync error mapeado
  await act(cdp, `SIM({mode:'network'});return 'ok'`)
  await clickMain(cdp, 'main button', "Sincronizar")
  const ok52b = await waitToast(cdp, "No se pudieron cargar las plantillas")
  ch("5.2b error de red al sincronizar mapeado a toast", ok52b, "")
  await act(cdp, `SIM({mode:'ok'});return 'ok'`)

  // ── 5.3 filtrar ────────────────────────────────────────────────────────
  await act(cdp, `F('input[aria-label="Filtrar plantillas por nombre"]','confirmacion');return 'ok'`)
  const ok53 = await waitFor(async () => (await rowsN(cdp)) === 1, true, 8000)
  const rows53 = await rowsN(cdp)
  ch("5.3 filtro por nombre deja 1 de 3", ok53 && rows53 === 1, `rows=${rows53}`)
  await act(cdp, `F('input[aria-label="Filtrar plantillas por nombre"]','');return 'ok'`)
  await waitFor(async () => (await rowsN(cdp)) === 3, true, 8000)

  // ── 5.4 paging ─────────────────────────────────────────────────────────
  await waitFor(async () => await hasBody(cdp, "Cargar m\u00e1s plantillas"), true, 8000)
  await clickMain(cdp, 'main button', "Cargar m\u00e1s plantillas")
  await wait(1200)
  const rows54a = await rowsN(cdp)
  ch("5.4a paginacion con cursor: al cargar mas se anexan filas", rows54a === 4, `rows=${rows54a}`)

  await act(cdp, `SIM({paging:'next-url'});return 'ok'`)
  await reload(cdp)
  await go(cdp, "/app/plantillas")
  await waitFor(async () => (await rowsN(cdp)) === 3, true, 12000)
  await waitFor(async () => await hasBody(cdp, "Cargar m\u00e1s plantillas"), true, 8000)
  await clickMain(cdp, 'main button', "Cargar m\u00e1s plantillas")
  await wait(1000)
  const afterVal = await evalJson(cdp, `window.__simAfter||''`)
  const ok54b = afterVal === "QVFv_NEXTURL"
  ch("5.4b Meta devuelve next (URL) y la app env\u00eda solo el cursor extra\u00eddido", ok54b, `after=${String(afterVal).slice(0, 80)}...`)
  writeArtifacts(dir, "5b-paging", { png: shot(cdp), dump: null })
  await act(cdp, `SIM({paging:'cursor'});return 'ok'`)
  await reload(cdp)
  await go(cdp, "/app/plantillas")
  await waitFor(async () => (await rowsN(cdp)) === 3, true, 12000)

  // ── 5.5 crear valida ───────────────────────────────────────────────────
  const auditBefore = await store(cdp, "fastws.auditoria").then((a) => (Array.isArray(a) ? a.length : 0))
  await clickMain(cdp, 'main button', "Nueva plantilla")
  await waitSel(cdp, "#plantilla-nombre")
  await act(cdp, `F('#plantilla-nombre','saludo_hola_demo');return 'ok'`)
  await act(cdp, `F('#plantilla-cuerpo','Hola {{1}}, bienvenido a FastWS.');return 'ok'`)
  await wait(500)
  await act(cdp, `F('#plantilla-ejemplo-1','Andres');return 'ok'`)
  await act(cdp, `C('#plantilla-cuerpo')||true;return 'ok'`)
  await wait(300)
  await clickMain(cdp, 'main button', "Crear plantilla")
  const ok55 = await waitToast(cdp, "Plantilla enviada a revisi")
  const auditAfter = await store(cdp, "fastws.auditoria").then((a) => (Array.isArray(a) ? a.length : 0))
  ch("5.5 crear plantilla MARKETING con ejemplo: toast de revision", ok55, "")
  ch("5.5b crear audita la plantilla (+1 entradas)", auditAfter === auditBefore + 1, `audit ${auditBefore}->${auditAfter}`)
  await clickMain(cdp, 'main button', "Cancelar")
  await wait(400)

  // ── 5.6 cabecera/pie con {{n}} y cuerpo vacio ─────────────────────────
  await clickMain(cdp, 'main button', "Nueva plantilla")
  await waitSel(cdp, "#plantilla-nombre")
  await act(cdp, `F('#plantilla-nombre','prueba_huecos');return 'ok'`)
  await act(cdp, `F('#plantilla-cabecera','Hola {{1}}, bienvenido');return 'ok'`)
  await act(cdp, `F('#plantilla-pie','Gracias {{2}}');return 'ok'`)
  await clickMain(cdp, 'main button', "Crear plantilla")
  await wait(700)
  const ok56body = await hasBody(cdp, "Escribe el cuerpo")
  const ok56head = await hasBody(cdp, "La cabecera no admite variables")
  const ok56foot = await hasBody(cdp, "El pie no admite variables")
  ch("5.6 cabecera/pie con {{n}} y cuerpo vacio: reporta los 3 errores", ok56body && ok56head && ok56foot, `body=${ok56body} head=${ok56head} foot=${ok56foot}`)
  await clickMain(cdp, 'main button', "Cancelar")
  await wait(400)

  // ── 5.7 variables no consecutivas ──────────────────────────────────────
  await clickMain(cdp, 'main button', "Nueva plantilla")
  await waitSel(cdp, "#plantilla-nombre")
  await act(cdp, `F('#plantilla-nombre','salto_variable');return 'ok'`)
  await act(cdp, `F('#plantilla-cuerpo','Hola {{1}} y saludos {{3}}.');return 'ok'`)
  await clickMain(cdp, 'main button', "Crear plantilla")
  await wait(700)
  const ok57 = await hasBody(cdp, "deben ser consecutivas")
  ch("5.7 S10 variables no consecutivas {{1}} {{3}} bloquean", ok57, "")
  await clickMain(cdp, 'main button', "Cancelar")
  await wait(400)

  // ── 5.8 probar desde la lista (sin headerParams) ───────────────────────
  await act(cdp, `SIM({mode:'ok'});return 'ok'`)
  await clickRowAction(cdp, "confirmacion_demo", "Probar")
  await wait(400)
  const ok58toast = await waitToast(cdp, "Mensaje de prueba enviado")
  const body58 = await evalJson(cdp, `JSON.stringify(window.__simBody||null)`)
  const parsed58 = body58 ? JSON.parse(body58) : null
  const to58 = parsed58 && parsed58.to
  const comps58 = parsed58 && parsed58.template && parsed58.template.components ? parsed58.template.components : []
  const hasHeader58 = comps58.some((c) => c.type === "header")
  const bodyParams58 = (comps58.find((c) => c.type === "body") || {}).parameters || []
  ch("5.8 probar desde lista envia al numero de empresa", to58 === "573100000000", `to=${to58}`)
  ch("5.8b la prueba desde lista envia headerParams de la cabecera {{1}}", ok58toast && hasHeader58 && bodyParams58.length === 1, `hasHeader=${hasHeader58} bodyParams=${bodyParams58.length}`)
  writeArtifacts(dir, "5c-probar-lista", { json: parsed58, png: shot(cdp), dump: null })

  // ── 5.9 eliminar ok y con fallo ────────────────────────────────────────
  const row59 = await clickRow(cdp, "pedido_listo_pickup")
  await wait(700)
  const del59 = await clickMain(cdp, 'main button', "Eliminar")
  await wait(500)
  const si59 = await clickMain(cdp, 'main button', "S\u00ed, eliminar")
  await wait(1200)
  const ok59del = await waitToast(cdp, "Plantilla eliminada")
  const delLog = await evalJson(cdp, `(window.__simLog||[]).filter(e=>e.kind==='delTpl').length`)
  const aud59b = await store(cdp, "fastws.auditoria").then((a) => (Array.isArray(a) ? a.map((x) => x.titulo) : []))
  ch("5.9 eliminar inline confirma, borra en Meta y audita 'Plantilla eliminada'", row59 === "ok" && del59 === "ok" && si59 === "ok" && ok59del && delLog > 0 && aud59b.includes("Plantilla eliminada"), `delLog=${delLog} audit=${aud59b[0]}`)
  await wait(900)
  const sync59 = await clickMain(cdp, 'main button', "Sincronizar")
  const ok59b = await waitFor(async () => (await rowsN(cdp)) === 2, true, 10000)
  const rows59 = await rowsN(cdp)
  ch("5.9b tras eliminar OK: al re-sincronizar quedan 2 en Meta", sync59 === "ok" && ok59b && rows59 === 2, `sync=${sync59} rows=${rows59}`)

  await act(cdp, `SIM({mode:'5xx'});return 'ok'`)
  const row59c = await clickRow(cdp, "confirmacion_demo")
  await wait(700)
  const del59c = await clickMain(cdp, 'main button', "Eliminar")
  await wait(500)
  const si59c = await clickMain(cdp, 'main button', "S\u00ed, eliminar")
  const ok59err = await waitToast(cdp, "No se pudo eliminar la plantilla")
  await wait(900)
  const detalleSigue = await evalJson(cdp, `document.body.innerText.toLowerCase().includes('detalle de la plantilla')`)
  const confGone = !(await hasBody(cdp, "Eliminar esta plantilla"))
  const rows59after = await rowsN(cdp)
  ch("5.9c fallo en DELETE: toast de error y la plantilla sigue en la lista", row59c === "ok" && del59c === "ok" && si59c === "ok" && ok59err && rows59after === 2, `si=${si59c} rows=${rows59after}`)
  ch("5.9d fallo en DELETE: toast de error, confirmacion cerrada y detalle permanece abierto (no se audita un borrado fallido)", ok59err && confGone && detalleSigue, `detalle=${detalleSigue} confirmBotonGone=${confGone}`)
  writeArtifacts(dir, "5d-eliminar-fallo", { png: shot(cdp), dump: null })
  await act(cdp, `SIM({mode:'ok'});return 'ok'`)

  // ── 5.10 se cachean y persisten al recargar ────────────────────────────
  await reload(cdp)
  await go(cdp, "/app/plantillas")
  const rows510 = await waitFor(async () => (await rowsN(cdp)) === 3, true, 12000)
  const cacheRaw = await evalJson(cdp, `localStorage.getItem('fastws.plantillas')`)
  let cacheLen = 0
  try { cacheLen = JSON.parse(cacheRaw || "[]").length } catch {}
  ch("5.10 plantillas cacheadas en fastws.plantillas y reaparecen por red", cacheLen >= 2 && rows510, `cacheLen=${cacheLen} reloadRows=${rows510}`)

  // ── Conversaciones ─────────────────────────────────────────────────────
  await go(cdp, "/app/conversaciones")
  const threadPhones = async () => await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('main ul[role="list"] li span')].map(s=>s.textContent.trim()))`)
  const liN = async () => await rowsIn(cdp, 'main ul[role="list"] li')

  await waitFor(async () => (await liN()) === 6, true, 10000)
  const t5_12 = await threadPhones()
  ch("5.12 reescanear: hilos derivados de envios PROCESO/FALLIDO/CANCELADO/LEIDO/ENTREGADO", (await liN()) === 6 && JSON.parse(t5_12).some((p) => p.includes("3009900001")) && JSON.parse(t5_12).some((p) => p.includes("3009900002")), `phones=${t5_12}`)

  await clickMain(cdp, 'main button', "Reescanear envios")
  await wait(800)
  const liN2 = await liN()
  const tCancel = await hasBody(cdp, "cancelado por el operador")
  ch("5.12b reescanear idempotente (sin duplicados)", liN2 === 6, `threads=${liN2}`)
  ch("5.12c hilo CANCELADO muestra motivo", tCancel, "")
  writeArtifacts(dir, "5e-conversaciones", { png: shot(cdp), dump: null })

  // 5.22 los entregados/leidos SI propagan a hilos
  const thPh = JSON.parse(t5_12)
  ch("5.22 LEIDO/ENTREGADO de campana se reflejan en los hilos", thPh.some((p) => p.includes("3009900005")) && thPh.some((p) => p.includes("3009900006")), `phones=${t5_12}`)

  // 5.11 busqueda + filtros
  await act(cdp, `F('input[role="searchbox"]','3009900004');return 'ok'`)
  const okSearch = await waitFor(liN, 1, 8000)
  const liSearch = await liN()
  ch("5.11a busqueda por telefono filtra a 1 hilo", okSearch && liSearch === 1, `hilos=${liSearch}`)
  await act(cdp, `F('input[role="searchbox"]','');return 'ok'`)
  await waitFor(async () => (await liN()) === 6, true, 8000)
  const tabErr = await clickMain(cdp, '[role="tab"]', "Con error")
  const okErr = await waitFor(liN, 1, 8000)
  const liErr = await liN()
  ch("5.11b filtro 'Con error' deja solo el hilo FALLIDO", tabErr === "ok" && okErr && liErr === 1, `hilos=${liErr}`)
  await clickMain(cdp, '[role="tab"]', "Todas")
  await waitFor(async () => (await liN()) === 6, true, 8000)
  const tabResp = await clickMain(cdp, '[role="tab"]', "Respondidas")
  const okResp = await waitFor(liN, 0, 8000)
  const liResp = await liN()
  ch("5.11c filtro 'Respondidas' sin demos: 0 hilos (vacio correcto)", tabResp === "ok" && okResp && liResp === 0, `hilos=${liResp}`)
  await clickMain(cdp, '[role="tab"]', "Todas")
  await waitFor(async () => (await liN()) === 6, true, 8000)

  // 5.13 sembrar demo
  const sembrar = await clickMain(cdp, 'main button', "Poblar con datos de ejemplo")
  const okDemoToast = await waitToast(cdp, "Datos de ejemplo")
  const okDemoN = await waitFor(liN, 9, 10000)
  const liDemo = await liN()
  const okDemoBtn = await hasBody(cdp, "Limpiar demo")
  ch("5.13 sembrar demo agrega 3 hilos demo y activa 'Limpiar demo'", sembrar === "ok" && okDemoN && liDemo === 9 && okDemoBtn && okDemoToast, `threads=${liDemo}`)
  writeArtifacts(dir, "5f-demo", { png: shot(cdp), dump: null })

  // 5.14 limpiar demo pide confirmación y luego quita los hilos demo
  const abrir = await clickMain(cdp, 'main button', "Limpiar demo")
  await wait(600)
  const conf = JSON.parse(await probe(cdp, `(()=>{const d=document.querySelector('[role="dialog"][aria-modal="true"]');return d?{titulo:d.querySelector('h2').textContent.trim().toLowerCase(),conteo:/\\d+ hilos?/.test(d.textContent),aviso:d.textContent.includes('No hay deshacer'),botones:[...d.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean)}:null})()`))
  const okDialogo = abrir === "ok" && Boolean(conf) && conf.titulo === "limpiar datos de ejemplo" && conf.conteo && conf.aviso && conf.botones.includes("Sí, limpiar")
  const cancelar = await clickMain(cdp, '[role="dialog"] button', "Volver")
  await wait(500)
  const sigue = await waitFor(async () => (await liN()) === 9, true, 4000)
  await clickMain(cdp, 'main button', "Limpiar demo")
  await wait(500)
  const limpiar = await clickMain(cdp, '[role="dialog"] button', "Sí, limpiar")
  const okLimpiar = await waitToast(cdp, "Demo eliminada")
  const okLimpiarN = await waitFor(liN, 6, 10000)
  const liNoDemo = await liN()
  ch("5.14 limpiar demo pide confirmación (con conteo y aviso de que no hay deshacer) y luego quita los hilos demo",
    okDialogo && cancelar === "ok" && sigue && limpiar === "ok" && okLimpiarN && liNoDemo === 6 && okLimpiar,
    JSON.stringify({ conf, cancelar, sigue, limpiar, threads: liNoDemo }))

  // 5.15 responder texto ok
  await clickLi(cdp, "3009900001")
  await wait(1000)
  await act(cdp, `return JSON.stringify((()=>{const t=[...document.querySelectorAll('main textarea')].find(x=>(x.placeholder||'').includes('Escribe la respuesta'));if(!t)return 'no-textarea';const p=HTMLTextAreaElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(t,'Hola desde simulacro');t.dispatchEvent(new Event('input',{bubbles:true}));return t.value})())`)
  await wait(400)
  await clickMain(cdp, 'main button', "Enviar")
  await wait(1000)
  const ok515b = await waitToast(cdp, "Respuesta enviada")
  const respBody = await evalJson(cdp, `JSON.stringify(window.__simBody||null)`)
  const parsedR = respBody ? JSON.parse(respBody) : null
  const ok515 = await hasBody(cdp, "Hola desde simulacro")
  const tareaCleared = await evalJson(cdp, `[...document.querySelectorAll('main textarea')].map(t=>t.value).join('')`)
  const stProceso = await hasStamp(cdp, "proceso")
  ch("5.15 responder texto: POST con body correcto", ok515 && parsedR && parsedR.text && parsedR.text.body === "Hola desde simulacro", `body=${String(parsedR && parsedR.text && parsedR.text.body)}`)
  ch("5.15b mensaje sale PROCESO con wamid + textarea limpio", ok515b && stProceso && tareaCleared === "", `cleared="${tareaCleared}"`)

  // 5.16 responder texto fallo (terminal) -> textarea se limpia igual
  await act(cdp, `SIM({mode:'5xx'});return 'ok'`)
  await act(cdp, `return JSON.stringify((()=>{const t=[...document.querySelectorAll('main textarea')].find(x=>(x.placeholder||'').includes('Escribe la respuesta'));if(!t)return 'no-textarea:'+JSON.stringify([...document.querySelectorAll('main textarea')].map(x=>x.placeholder));const p=HTMLTextAreaElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(t,'Adios simulacro');t.dispatchEvent(new Event('input',{bubbles:true}));return t.value})())`)
  await wait(250)
  await clickMain(cdp, 'main button', "Enviar")
  const ok516err = await waitToast(cdp, "Meta rechaz")
  const tareaAfterFail = await evalJson(cdp, `[...document.querySelectorAll('main textarea')].map(t=>t.value).join('')`)
  const ok516 = (await hasBody(cdp, "Adios simulacro")) && (await hasStamp(cdp, "fallido"))
  ch("5.16 fallo terminal: mensaje FALLIDO con codigo", ok516 && ok516err, "")
  ch("5.16b el textarea conserva el texto que Meta rechazo (no se pierde al fallar)", tareaAfterFail !== "", `texto="${tareaAfterFail}"`)
  writeArtifacts(dir, "5g-fallo-respuesta", { png: shot(cdp), dump: null })
  await act(cdp, `SIM({mode:'ok'});return 'ok'`)

  // 5.17 responder plantilla -> text = solo nombre; sin headerParams
  const tabTpl = await clickMain(cdp, '[role="tab"]', "Responder con plantilla")
  await wait(700)
  const selTpl = await act(cdp, `return SEL('select[aria-label="Plantilla aprobada"]','tpl-cnf')`)
  await wait(500)
  const okVarIn = await waitSel(cdp, 'main input[placeholder*="Valor para"]', 8000)
  await act(cdp, `return JSON.stringify((()=>{const i=[...document.querySelectorAll('main input[placeholder]')].find(x=>(x.placeholder||'').includes('Valor para'));if(!i)return 'no-input:'+JSON.stringify([...document.querySelectorAll('main input[placeholder]')].map(x=>x.placeholder));const p=HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(i,'Pedido 1234');i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})())`)
  await wait(250)
  await clickMain(cdp, 'main button', "Enviar plantilla")
  await wait(1400)
  const body517 = await evalJson(cdp, `JSON.stringify(window.__simBody||null)`)
  const parsedT = body517 ? JSON.parse(body517) : null
  const compsT = parsedT && parsedT.template && parsedT.template.components ? parsedT.template.components : []
  const hasHeaderT = compsT.some((c) => c.type === "header")
  const bubbleTexts = await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('main p')].filter(d=>String(d.className).includes('whitespace-pre-wrap')&&String(d.className).includes('text-sm')).map(d=>d.textContent.trim()))`)
  const lastTxt = (JSON.parse(bubbleTexts).filter(Boolean).slice(-1)[0]) || ""
  ch("5.17 responder con plantilla: envia POST de plantilla", tabTpl === "ok" && selTpl === true && okVarIn && Boolean(parsedT) && parsedT.type === "template" && parsedT.template.name === "confirmacion_demo", `name=${String(parsedT && parsedT.template && parsedT.template.name)}`)
  ch("5.17b el texto persistido en el hilo incluye el valor de la variable (Pedido 1234)", lastTxt.includes("Pedido 1234"), `ultimoBubble=${lastTxt}`)
  ch("5.17c la respuesta plantilla envia headerParams de la cabecera {{1}}", hasHeaderT, `hasHeader=${hasHeaderT}`)
  writeArtifacts(dir, "5h-respuesta-plantilla", { png: shot(cdp), dump: null })

  // 5.18 las variables de la plantilla persisten al cambiar de modo
  const sel518 = await act(cdp, `return SEL('select[aria-label="Plantilla aprobada"]','tpl-cnf')`)
  await wait(600)
  const okVar518 = await waitSel(cdp, 'main input[placeholder*="Valor para"]', 8000)
  await act(cdp, `return JSON.stringify((()=>{const i=[...document.querySelectorAll('main input[placeholder]')].find(x=>(x.placeholder||'').includes('Valor para'));if(!i)return 'no-input';const p=HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(i,'Persistencia demo');i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})())`)
  await wait(300)
  await clickMain(cdp, '[role="tab"]', "Texto libre")
  await wait(500)
  await clickMain(cdp, '[role="tab"]', "Responder con plantilla")
  await wait(800)
  const varVal = await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('main input[placeholder]')].filter(x=>(x.placeholder||'').includes('Valor para')).map(i=>i.value))`)
  const varsArr = JSON.parse(varVal)
  ch("5.18 cambiar de modo conserva las variables escritas de la plantilla", sel518 === true && okVar518 && varsArr.length >= 1 && varsArr[0] === "Persistencia demo", `vals=${varVal}`)

  // 5.19 variables vacias -> error sin red
  const sendsBefore = await evalJson(cdp, `(window.__simLog||[]).length`)
  await act(cdp, `SEL('select[aria-label="Plantilla aprobada"]','tpl-rec');return 'ok'`)
  await wait(400)
  await clickMain(cdp, 'main button', "Enviar plantilla")
  await wait(700)
  const ok519 = await hasBody(cdp, "Completa las variables de la plantilla")
  const sendsAfter = await evalJson(cdp, `(window.__simLog||[]).length`)
  ch("5.19 variables vacias: error en pantalla sin llamar a Meta", ok519 && sendsAfter === sendsBefore, `error=${ok519} sends ${sendsBefore}->${sendsAfter}`)

  // ── Mensajes ───────────────────────────────────────────────────────────
  await go(cdp, "/app/mensajes")
  const optClones = await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('#mensajes-campana option')].filter(o=>o.textContent&&o.textContent.includes('Mixta Demostrativa')).map(o=>o.value))`)
  ch("5.20 campana en el filtro: opciones deduplicadas por nombre (1)", JSON.parse(optClones).length === 1, `opts=${optClones}`)
  const obj = JSON.parse(await evalJson(cdp, `JSON.stringify((()=>{const o=[...document.querySelectorAll('#mensajes-campana option')].find(x=>x.textContent&&x.textContent.includes('Mixta Demostrativa'));if(!o)return null;const s=document.querySelector('#mensajes-campana');s.value=o.value;s.dispatchEvent(new Event('change',{bubbles:true}));return {v:o.value}})())`))
  if (obj) await waitFor(async () => await hasTxt(cdp, "con error"), true, 5000)
  const ok521tabla = await hasBody(cdp, "Cancelado")
  const dbLabel = await evalJson(cdp, `document.querySelector('[role="img"][aria-label]')?document.querySelector('[role="img"][aria-label]').getAttribute('aria-label'):''`)
  const ok521bar = dbLabel.includes("cancelados")
  const ok521err = await hasTxt(cdp, "con error")
  ch("5.21 mensaje CANCELADO en tabla y el resumen del despacho lo incluye", ok521tabla && ok521bar && ok521err, `tabla=${ok521tabla} barLabel="${dbLabel}" error=${ok521err}`)
  writeArtifacts(dir, "5i-mensajes", { png: shot(cdp), dump: null })

  // 5.13b sin clientes validos
  await go(cdp, "/app/conversaciones")
  await act(cdp, `localStorage.setItem('fastws.clientes',JSON.stringify([]));return 'ok'`)
  const hadDemo = await hasBody(cdp, "Limpiar demo")
  await (hadDemo ? clickMain(cdp, 'main button', "Limpiar demo") : null)
  await wait(600)
  await act(cdp, `localStorage.setItem('fastws.conversaciones',JSON.stringify({threads:[],merged:{}}));return 'ok'`)
  await reload(cdp)
  await go(cdp, "/app/conversaciones")
  await wait(600)
  await clickMain(cdp, 'main button', "Poblar con datos de ejemplo")
  const ok513b = await waitToast(cdp, "Sin clientes de ejemplo")
  ch("5.13b sin clientes validos: toast de error (no envia)", ok513b, "")

  writeArtifacts(dir, "resumen", { json: R_, txt: R_.map((r) => `${r.n}. ${r.ok ? "OK" : "FAIL"} ${r.label} :: ${r.detalle}`).join("\n") })

  await cdp.send("Browser.close", {})
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  writeArtifacts(outDir("pasada-5"), "resumen-ERROR", { txt: "ERROR: " + String(err && err.stack || err) })
  process.exit(1)
})