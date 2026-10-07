import fs from "node:fs"
import { spawnEdge, PROFILE, seedExpr, fetchStubSrc, evalJson, locVal, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE } from "./sim-base.mjs"

fs.rmSync(PROFILE, { recursive: true, force: true })

async function wipeProfile() {
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); return } catch { await wait(400) }
  }
  throw new Error("No se pudo limpiar el perfil")
}

const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const SEL=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('change',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const MB=(t)=>{const b=[...document.querySelectorAll('main button,main a')].find(x=>(x.textContent||'').trim()==t);if(!b)return false;b.click();return true};const D=(t)=>{const b=[...document.querySelectorAll('button,a')].find(x=>(x.textContent||'').trim()==t||(x.textContent||'').trim().startsWith(t));if(!b)return false;b.click();return true};const ROW=(n)=>{const tr=[...document.querySelectorAll('tbody tr')].find(x=>x.innerText.includes(n));return tr?tr:null};`
const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 8000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${JSON.stringify(sel)})`)), true, ms)
const hasBody = (cdp, text) => evalJson(cdp, `document.body.innerText.includes(${JSON.stringify(text)})`)
const pathGet = (cdp) => locVal(cdp, "location.pathname")
const toasts = (cdp) => evalJson(cdp, `[...document.querySelectorAll('[data-sileo-toast]')].map(t=>(t.querySelector('[data-sileo-title]')?.textContent||'').trim()+' :: '+(t.querySelector('[data-sileo-description]')?.textContent||'').trim())`)
const camps = (cdp) => evalJson(cdp, `JSON.parse(localStorage.getItem('fastws.campanas')||'[]')`)

const R = []
let n = 0
const ch = (label, ok, detalle) => { R.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

// Tras una recarga el provider revalida el token (status probando -> conectada).
// Sin esta espera, `iniciar()` puede devolver false y la campaña queda en BORRADOR.
const esperaConexion = async (cdp, ms = 12000) => {
  const hay = await evalJson(cdp, `!!sessionStorage.getItem('fastws.meta-token') && !!localStorage.getItem('fastws.conexion.ids')`)
  if (!hay) return false
  return waitFor(async () => hasBody(cdp, "Listo para despacho"), true, ms)
}

// Campañas para el wizard (P3A2): ninguna en EN_PROCESO, porque el motor
// auto-arrancaría y su toast de "Campaña finalizada" se solaparía con las
// pruebas del wizard (3.7). 3.23 necesita una EN_PROCESO y vive en P3B, con su
// propio wipeProfile.
const CAMPANAS_WIZARD = [
  {
    id: "camp-1",
    name: "Despacho nocturno · Ruta Norte",
    description: "Recordatorio de ruta al norte.",
    template: { name: "recordatorio_ruta", language: "es" },
    mapping: [{ key: "1", fuente: "campo", campo: "name" }],
    filter: { zone: "Norte" },
    status: "BORRADOR",
    recipients: [],
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    activity: [{ tipo: "creada", at: new Date(Date.now() - 90 * 60000).toISOString() }],
  },
  {
    id: "camp-2",
    name: "Promoción fin de semana",
    description: "",
    template: { name: "confirmacion_pedido", language: "es" },
    mapping: [{ key: "1", fuente: "campo", campo: "orderState" }],
    filter: { city: "Armenia" },
    status: "BORRADOR",
    recipients: [],
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    activity: [{ tipo: "creada", at: new Date(Date.now() - 10 * 60000).toISOString() }],
  },
]

async function boot(cdp, seed = "conectado", route = "/app") {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
  await cdp.send("Page.navigate", { url: BASE })
  await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
  await evalJson(cdp, seedExpr(seed))
  await navigate(cdp, route)
  await waitSel(cdp, "header")
  await esperaConexion(cdp)
}

const setMode = (cdp, m) => evalJson(cdp, `window.__SIM={mode:'${m}'};'ok'`)
const seedRaw = (cdp, key, value) => evalJson(cdp, `localStorage.setItem(${JSON.stringify(key)},JSON.stringify(${JSON.stringify(value)}));'ok'`)
const reseed = async (cdp, key, value) => { await seedRaw(cdp, key, value); await cdp.send("Page.reload", { ignoreCache: true }); await waitSel(cdp, "header"); await wait(800); await esperaConexion(cdp) }

// clientes con teléfonos de 10 dígitos (requisito `^3\d{9}$` del wizard)
const CLIENTES10 = [
  { id: "c1", code: "C-1", name: "Café La Roca", phone: "3001234001", city: "Manizales", zone: "Norte", clientType: "NORMAL", status: "activo", valid: true, enRuta: true, orderState: "PENDIENTE", createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "c2", code: "C-2", name: "Mini Mercado Villa", phone: "3021234002", city: "Dosquebradas", zone: "Centro", clientType: "CASHLESS", status: "activo", valid: true, enRuta: false, orderState: "ENTREGADO", createdAt: new Date(Date.now() - 86400000 * 40).toISOString() },
  { id: "c3", code: "C-3", name: "Heladería Polo", phone: "3201234003", city: "Armenia", zone: "Sur", clientType: "NORMAL", status: "activo", valid: true, enRuta: true, createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: "c4", code: "C-4", name: "Ferretería Andina", phone: "3131234004", city: "Manizales", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, enRuta: false, orderState: "FALLIDO", createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "c5", code: "C-5", name: "Sin teléfono", phone: "000", city: "", zone: "", clientType: "NORMAL", status: "inactivo", valid: false, createdAt: new Date().toISOString() },
]

const TL = { name: "recordatorio_ruta", language: "es" }
const mkCamp = (id, name, recipients, extra = {}) => ({
  id, name, template: TL, filter: {}, status: "BORRADOR",
  mapping: [], recipients, activity: [],
  createdAt: new Date(Date.now() - 60000).toISOString(), ...extra,
})
const pend = (code, name, phone) => ({ code, name, phone, status: "PENDIENTE", params: [name] })
const proc = (code, name, phone) => ({ code, name, phone, status: "PROCESO", params: [name], metaId: "wamid-sim-prev", sentAt: new Date().toISOString() })
const entre = (code, name, phone) => ({ code, name, phone, status: "ENTREGADO", params: [name], metaId: "wamid-sim-ent", sentAt: new Date().toISOString() })

// ---------------------------------------------------------------- P3A: wizard (zona sin conexión)
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "sinconexion", "/app/campanas")
    await act(cdp, `MB('Nueva campaña');return 'ok'`)
    await wait(500)
    ch("3.2a zona sin conexion: mensaje 'Conecta tu cuenta de WhatsApp Business'",
      await hasBody(cdp, "Conecta tu cuenta de WhatsApp Business"),
      "wizard pide conexión")
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P3A2: wizard completo (seed conectado, clientes 10 díg)
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/campanas")
    // Sembrar clientes y campañas antes de una sola recarga: dos `reseed` serían
    // dos recargas y el wizard se vuelve lento hasta el timeout.
    await seedRaw(cdp, "fastws.clientes", CLIENTES10)
    await seedRaw(cdp, "fastws.campanas", CAMPANAS_WIZARD)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(800)
    await esperaConexion(cdp)
    await act(cdp, `MB('Nueva campaña');return 'ok'`)
    await wait(600)

    // 3.2 lista plantillas aprobadas (stub ok)
    const opts = JSON.parse(await act(cdp, `return JSON.stringify([...document.querySelectorAll('#campana-plantilla option')].map(o=>o.textContent.trim()))`))
    ch("3.2 wizard lista 2 plantillas APPROVED", opts.some((o) => o.startsWith("recordatorio_ruta")) && opts.some((o) => o.startsWith("confirmacion_demo")), JSON.stringify(opts))

    // 3.4 seleccionar plantilla resetea el mapeo a campo/name
    await act(cdp, `SEL('#campana-plantilla','tpl-cnf');return 'ok'`)
    await wait(400)
    const mapInit = JSON.parse(await act(cdp, `return JSON.stringify({f1:(document.querySelector('[aria-label="Fuente de la variable 1"]')||{}).value,c1:(document.querySelector('[aria-label="Campo para {{1}}"]')||{}).value})`))
    ch("3.4 al elegir plantilla el mapeo vuelve a campo/name", mapInit.f1 === "campo" && mapInit.c1 === "name", JSON.stringify(mapInit))

    // 3.6 preview {{n}} resuelve con el primer destinatario (label con CSS uppercase)
    const prev = await act(cdp, `return document.body.innerText.includes('CÓMO LO LEERÁ EL PRIMER DESTINATARIO')`)
    ch("3.6 preview 'Cómo lo leerá' presente", prev, "bloque preview")

    // 3.5 fuente libre vacía deshabilita Continuar
    await act(cdp, `SEL('[aria-label="Fuente de la variable 1"]','libre');return 'ok'`)
    await wait(300)
    const contBtn = await evalJson(cdp, `(()=>{const b=[...document.querySelectorAll('main button')].find(x=>(x.textContent||'').trim()==='Continuar');return JSON.stringify({disabled:b?b.disabled:null,title:b?b.title:''})})()`)
    ch("3.5 variable libre vacia deshabilita Continuar (con title)",
      JSON.parse(contBtn).disabled === true && JSON.parse(contBtn).title.includes("Completa el texto fijo"),
      contBtn)
    await act(cdp, `F('input[placeholder="Texto para {{1}}"]','Hola desde simulacro');return 'ok'`)
    await wait(300)
    const contBtn2 = await evalJson(cdp, `(()=>{const b=[...document.querySelectorAll('main button')].find(x=>(x.textContent||'').trim()==='Continuar');return JSON.stringify({disabled:b?b.disabled:null})})()`)
    ch("3.5b con texto fijo Continuar se habilita", JSON.parse(contBtn2).disabled === false, contBtn2)

    // 3.7 Probar en mi número (stub ok) -> toast con wamid
    await act(cdp, `D('Probar en mi número');await new Promise(r=>setTimeout(r,900));return 'ok'`)
    const tProbar = await toasts(cdp)
    ch("3.7 probar en mi número: toast exito con wamid", tProbar.some((t) => t.includes("Mensaje de prueba enviado") && t.includes("wamid")), JSON.stringify(tProbar))

    // Continuar -> paso 2
    await act(cdp, `D('Continuar');await new Promise(r=>setTimeout(r,400));return 'ok'`)
    await waitSel(cdp, "#campana-nombre")

    // 3.8 filtros + conteos (conteo del resumen del wizard)
    const countSel = `[...document.querySelectorAll('main p')].filter(p=>/^\\d+ destinatarios$/.test((p.textContent||'').trim())).map(p=>(p.textContent||'').trim())`
    await act(cdp, `SEL('#campana-tipo','CASHLESS');await new Promise(r=>setTimeout(r,300));return 'ok'`)
    const countCash = JSON.parse(await act(cdp, `return JSON.stringify(${countSel})`))
    await act(cdp, `SEL('#campana-tipo','');SEL('#campana-zona','Sur');await new Promise(r=>setTimeout(r,300));return 'ok'`)
    const countSur = JSON.parse(await act(cdp, `return JSON.stringify(${countSel})`))
    ch("3.8 filtros recalcular destinatarios (CASHLESS=1, zona Sur=1)",
      countCash.includes("1 destinatarios") && countSur.includes("1 destinatarios"),
      JSON.stringify({ cash: countCash, sur: countSur }))
    await writeArtifacts(outDir("pasada-3"), "wizard-filtros", { png: shot(cdp) })

    // 3.9 crear borrador
    await act(cdp, `F('#campana-nombre','Promo wizard simulacro');SEL('#campana-tipo','');SEL('#campana-zona','');await new Promise(r=>setTimeout(r,300));return 'ok'`)
    await act(cdp, `D('Crear campaña');await new Promise(r=>setTimeout(r,1200));return 'ok'`)
    const creada = (await camps(cdp)).some((c) => c.name === "Promo wizard simulacro" && c.status === "BORRADOR")
    const tCreada = await toasts(cdp)
    ch("3.9 crear BORRADOR persistido + toast 'Campaña creada'",
      creada && tCreada.some((t) => t.includes("Campaña creada")),
      JSON.stringify({ enStorage: creada, toast: tCreada.slice(0, 2) }))

    // 3.9b [S28] crear no reordena la planilla: las campañas que ya estaban
    // conservan su posición y la nueva se añade al final. `guardar` hacía
    // filter+append, que con una campaña existente la movía al final.
    const orden = await camps(cdp)
    const nombres = orden.map((c) => c.name)
    const semilla = ["Despacho nocturno · Ruta Norte", "Promoción fin de semana"]
    const ordenOk =
      nombres.length === 3 &&
      semilla.every((n, i) => nombres[i] === n) &&
      nombres[2] === "Promo wizard simulacro"
    ch("3.9b [S28] crear una campaña no reordena la planilla",
      ordenOk,
      JSON.stringify({ nombres }))

    // 3.10 segmento vacío -> Crear disabled + alert (zona Centro solo tiene c2,c4, ninguna en ruta)
    await act(cdp, `MB('Nueva campaña');await new Promise(r=>setTimeout(r,600));SEL('#campana-plantilla','tpl-cnf');await new Promise(r=>setTimeout(r,400));D('Continuar');await new Promise(r=>setTimeout(r,500));return 'ok'`)
    await waitSel(cdp, "#campana-nombre")
    await act(cdp, `SEL('#campana-zona','Centro');SEL('#campana-ruta','true');await new Promise(r=>setTimeout(r,400));return 'ok'`)
    await wait(300)
    const vacio = JSON.parse(await act(cdp, `return (()=>{const b=[...document.querySelectorAll('main button')].find(x=>(x.textContent||'').trim()==='Crear campaña');return JSON.stringify({disabled:b?b.disabled:null,alert:(document.querySelector('[role="alert"]')||{innerText:''}).innerText})})()`))
    ch("3.10 segmento 0 destinatarios: Crear disabled + alert",
      JSON.parse(JSON.stringify(vacio)).disabled === true && JSON.parse(JSON.stringify(vacio)).alert.length > 0,
      JSON.stringify(vacio))

    // 3.11 cancelar descarta sin confirmar
    await act(cdp, `D('Cancelar');await new Promise(r=>setTimeout(r,400));return 'ok'`)
    const casaCancel = await evalJson(cdp, `!document.body.innerText.includes('Nombre de la campaña')`)
    ch("3.11 Cancelar cierra el wizard y descarta", casaCancel, "wizard cerrado")
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P3B: planilla read-only + cola + motor
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/campanas")
    await reseed(cdp, "fastws.clientes", CLIENTES10)
    await wait(500)

    // 3.12 planilla read-only: filas sin botones, pct solo entregado+leido
    const planilla = JSON.parse(await act(cdp, `return JSON.stringify({filas:[...document.querySelectorAll('tbody tr')].length,btnFilas:[...document.querySelectorAll('tbody tr button')].length,pct:[...document.querySelectorAll('tbody tr')].map(tr=>(tr.innerText.match(/\\d+ %/)||[''])[0]).filter(Boolean)})`))
    ch("3.12 planilla read-only (sin botones por fila)", planilla.btnFilas === 0, JSON.stringify(planilla))

    // 3.13 chip velocidad read-only en la cola
    await navigate(cdp, "/app/cola")
    await waitSel(cdp, "header")
    await wait(900)
    const vela = JSON.parse(await act(cdp, `return JSON.stringify({txt:document.body.textContent.includes('Velocidad · 1000/h'),ctrls:document.querySelectorAll('main select, main input').length})`))
    ch("3.13 chip velocidad read-only (sin select/input)", vela.txt && vela.ctrls === 0, JSON.stringify(vela))

    // 3.14 botón Configuración navega
    await act(cdp, `(()=>{const b=[...document.querySelectorAll('main button')].find(x=>(x.textContent||'').trim()==='Configuración');b?.click();return 'ok'})()`)
    const landCfg = await waitFor(pathGet(cdp), "/app/configuracion", 6000)
    ch("3.14 boton Configuracion navega a /app/configuracion", landCfg, "-> /app/configuracion")
    await writeArtifacts(outDir("pasada-3"), "cola-velocidad", { png: shot(cdp) })

    // 3.23 auto-arranque al recargar (camp-1 EN_PROCESO del seed) -> FINALIZADA + toast
    const fin1 = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-1" && c.status === "FINALIZADA"), true, 25000, 1000)
    const tFin = await toasts(cdp)
    ch("3.23 auto-arranque camp-1 al cargar -> FINALIZADA + toast",
      fin1 && tFin.some((t) => t.includes("Campaña finalizada")),
      JSON.stringify({ finalizada: fin1, toast: tFin.filter((x) => x.includes("Campaña"))[0] || "" }))
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P3C: cola operaciones + motor ok/rate/cancel
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/cola")
    // quitar camp-1 para evitar auto-arranque; sembrar campañas controladas
    const c3 = mkCamp("camp-3", "Promo motor 3", [pend("c1", "Café La Roca", "573001234001"), pend("c2", "Mini Mercado Villa", "573021234002"), pend("c4", "Ferretería Andina", "573131234004")])
    await reseed(cdp, "fastws.campanas", [c3])
    await wait(600)

    // 3.16 iniciar desde BORRADOR -> EN_PROCESO + dispatchedBy + motor arranca
    await act(cdp, `const tr=ROW('Promo motor 3');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Iniciar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    await act(cdp, `D('Iniciar despacho');await new Promise(r=>setTimeout(r,700));return 'ok'`)
    const inProc = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-3" && c.status === "EN_PROCESO"), true, 6000, 300)
    const c3a = (await camps(cdp)).find((c) => c.id === "camp-3")
    ch("3.16 iniciar ok: EN_PROCESO + dispatchedBy + actividad iniciada",
      inProc && Boolean(c3a?.dispatchedBy?.usuario) && c3a?.dispatchedBy?.dispositivo && (c3a?.activity || []).some((a) => a.tipo === "iniciada"),
      JSON.stringify({ proc: inProc, disp: c3a?.dispatchedBy, act: (c3a?.activity || []).map((a) => a.tipo) }))

    // 3.17 motor -> FINALIZADA + toast + endedAt + activity finalizada
    const fin3 = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-3" && c.status === "FINALIZADA"), true, 40000, 1500)
    const c3b = (await camps(cdp)).find((c) => c.id === "camp-3")
    const tFin3 = await toasts(cdp)
    ch("3.17 motor completa: FINALIZADA + endedAt + actividad finalizada + toast",
      fin3 && Boolean(c3b?.endedAt) && (c3b?.activity || []).some((a) => a.tipo === "finalizada") && tFin3.some((t) => t.includes("Campaña finalizada")),
      JSON.stringify({ fin: fin3, ended: c3b?.endedAt, toast: tFin3.filter((x) => x.includes("Campaña"))[0] || "" }))
    await writeArtifacts(outDir("pasada-3"), "motor-finalizada", { png: shot(cdp) })

    // 3.20 pausar: EN_PROCESO -> PAUSADA; no envía mientras está pausada
    const c4 = mkCamp("camp-4", "Promo pausa", [pend("c1", "Café La Roca", "573001234001"), pend("c2", "Mini Mercado Villa", "573021234002"), pend("c3", "Heladería Polo", "573201234003"), pend("c4", "Ferretería Andina", "573131234004"), pend("c5", "Otro", "573131234005")], { template: { name: "recordatorio_ruta", language: "es" } })
    await reseed(cdp, "fastws.campanas", [c4])
    await act(cdp, `const tr=ROW('Promo pausa');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Iniciar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    await act(cdp, `D('Iniciar despacho');await new Promise(r=>setTimeout(r,600));return 'ok'`)
    await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-4" && c.status === "EN_PROCESO"), true, 6000, 300)
    await evalJson(cdp, `window.__simLog=[];'ok'`)
    await act(cdp, `const tr=ROW('Promo pausa');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Pausar')?.click();return 'ok'`)
    await wait(500)
    const tp = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-4" && c.status === "PAUSADA"), true, 6000, 300)
    await wait(5000)
    const sends = JSON.parse(await act(cdp, `return JSON.stringify((window.__simLog||[]).length)`))
    ch("3.20 pausar: PAUSADA + motor detenido (0 envíos nuevos en pausa)", tp && sends === 0, JSON.stringify({ pausada: tp, enviosEnPausa: sends }))

    // 3.21 reanudar -> EN_PROCESO y termina
    await act(cdp, `const tr=ROW('Promo pausa');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Reanudar')?.click();return 'ok'`)
    const reOk = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-4" && c.status === "EN_PROCESO"), true, 6000, 300)
    const fin4 = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-4" && c.status === "FINALIZADA"), true, 40000, 1500)
    ch("3.21 reanudar: EN_PROCESO y completa", reOk && fin4, JSON.stringify({ reanudada: reOk, final: fin4 }))

    // 3.22 cancelar: requiere confirmacion 'Cancelar campaña', PENDIENTE->CANCELADO, PROCESO intacto, audita
    const audAntes = await evalJson(cdp, `localStorage.getItem('fastws.auditoria')`)
    const c5 = mkCamp("camp-5", "Promo cancel", [pend("c1", "Café La Roca", "573001234001"), proc("c2", "Mini Mercado Villa", "573021234002"), entre("c3", "Heladería Polo", "573201234003")])
    await reseed(cdp, "fastws.campanas", [c5])
    await act(cdp, `const tr=ROW('Promo cancel');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Iniciar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    await act(cdp, `D('Iniciar despacho');await new Promise(r=>setTimeout(r,1400));return 'ok'`)
    await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-5" && c.status === "EN_PROCESO"), true, 6000, 300)
    await cdp.send("Network.enable")
    await act(cdp, `const tr=ROW('Promo cancel');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Cancelar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    const confirmCancel = await evalJson(cdp, `document.body.innerText.toLowerCase().includes('cancelar campa\u00f1a')`)
    await act(cdp, `D('Cancelar campaña');await new Promise(r=>setTimeout(r,700));return 'ok'`)
    const c5b = (await camps(cdp)).find((c) => c.id === "camp-5")
    const audDespues = await evalJson(cdp, `localStorage.getItem('fastws.auditoria')`)
    const r5 = c5b?.recipients || []
    const audNueva = JSON.parse(audDespues || "[]").map((a) => a.titulo)
    ch("3.22 cancelar: confirmacion, CANCELADA, PENDIENTE->CANCELADO, PROCESO intacto, audita 'Campaña cancelada'",
      confirmCancel &&
        c5b?.status === "CANCELADA" &&
        r5.filter((r) => r.status === "CANCELADO").length === 1 &&
        (c5b?.endedAt) &&
        r5.some((r) => r.code === "c2" && r.status === "PROCESO") &&
        audNueva.includes("Campaña cancelada") &&
        JSON.parse(audDespues || "[]").length > JSON.parse(audAntes || "[]").length,
      JSON.stringify({ status: c5b?.status, rec: r5.map((r) => r.status), confirm: confirmCancel, audTop: audNueva[0] }))

    // 3.15 iniciar sin conexión: modal se mantiene abierto, sigue BORRADOR (S13)
    await evalJson(cdp, `localStorage.removeItem('fastws.conexion.ids');localStorage.removeItem('fastws.conexion.meta');sessionStorage.removeItem('fastws.meta-token');'ok'`)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1200)
    await activatePage(cdp)
    const c6 = mkCamp("camp-6", "Promo sin token", [pend("c1", "Café La Roca", "573001234001")])
    await seedRaw(cdp, "fastws.campanas", [c6])
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1000)
    await act(cdp, `const tr=ROW('Promo sin token');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Iniciar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    await act(cdp, `D('Iniciar despacho');await new Promise(r=>setTimeout(r,800));return 'ok'`)
    const sinConex = JSON.parse(await act(cdp, `return JSON.stringify({modal:[...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].length,row:(()=>{const tr=ROW('Promo sin token');return tr?tr.innerText.includes('Borrador'):false})()})`))
    const tNoConex = await toasts(cdp)
    const c6b = (await camps(cdp)).find((c) => c.id === "camp-6")
    ch("3.15 iniciar sin conexion: toast 'Conecta tu cuenta primero', modal se MANTIENE, sigue BORRADOR",
      tNoConex.some((t) => t.includes("Conecta tu cuenta primero")) && sinConex.modal === 1 && c6b?.status === "BORRADOR" && !c6b?.dispatchedBy,
      JSON.stringify({ toast: tNoConex[0] || "", ...sinConex, status: c6b?.status }))
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P3D: backoff rate + CON_ERROR + no auto-reanuda
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/cola")
    const c7 = mkCamp("camp-7", "Promo rate", [pend("c1", "Café La Roca", "573001234001")])
    await reseed(cdp, "fastws.campanas", [c7])
    await setMode(cdp, "rate")

    await act(cdp, `const tr=ROW('Promo rate');[...(tr?tr.querySelectorAll('button'):[])].find(b=>(b.textContent||'').trim()==='Iniciar')?.click();return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    await act(cdp, `D('Iniciar despacho');return 'ok'`)
    await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-7" && c.status === "EN_PROCESO"), true, 6000, 300)

    // 3.18 backoff exponencial: lapsos entre reintentos crecen (2s,4s,...), sin FALLIDO prematuro
    await evalJson(cdp, `window.__simLog=[];'ok'`)
    for (let i = 0; i < 30; i++) {
      const cs = await camps(cdp)
      if (cs.some((c) => c.id === "camp-7" && (c.status === "CON_ERROR" || c.status === "FINALIZADA"))) break
      await wait(5000)
    }
    const log = JSON.parse(await act(cdp, `return JSON.stringify(window.__simLog||[])`))
    const times = log.map((e) => e.at)
    const gaps = times.slice(1).map((x, i) => (x - times[i]) / 1000)
    const c7s = (await camps(cdp)).find((c) => c.id === "camp-7")
    ch("3.18 retry backoff creciente (lapsos ~2s,4s,...) sin FALLIDO prematuro",
      gaps.length >= 3 &&
        gaps.every((g, i) => i === 0 || g > gaps[i - 1] * 0.6) &&
        c7s?.recipients.every((r) => r.status === "PENDIENTE"),
      JSON.stringify({ reintentos: gaps.map((g) => +g.toFixed(1)), status: c7s?.status }))

    // 3.19 5 errores consecutivos -> CON_ERROR + toast
    const conErr = await waitFor(async () => (await camps(cdp)).some((c) => c.id === "camp-7" && c.status === "CON_ERROR"), true, 90000, 2000)
    const c7c = (await camps(cdp)).find((c) => c.id === "camp-7")
    const tErr = await toasts(cdp)
    ch("3.19 5 retries -> CON_ERROR + toast 'Campaña pausada por error'",
      conErr && (c7c?.activity || []).some((a) => a.tipo === "con_error") && tErr.some((t) => t.includes("Campaña pausada por error")),
      JSON.stringify({ conErr, toast: tErr.filter((x) => x.includes("Campaña"))[0] || "" }))
    await writeArtifacts(outDir("pasada-3"), "motor-con-error", { png: shot(cdp) })

    // 3.24 CON_ERROR no reanuda sola al recargar (stub sigue rate)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await setMode(cdp, "rate")
    await wait(3000)
    const c7d = (await camps(cdp)).find((c) => c.id === "camp-7")
    ch("3.24 CON_ERROR no se auto-reanuda al recargar", c7d?.status === "CON_ERROR", JSON.stringify({ status: c7d?.status }))
  } finally { edge.kill() }
}

async function activatePage(cdp) {
  try { await cdp.send("Runtime.evaluate", { expression: "1" }) } catch {}
}

const okCount = R.filter((r) => r.ok).length
const out = outDir("pasada-3")
await writeArtifacts(out, "probes", { json: { pasada: 3, nombre: "Campañas, Cola y motor", total: R.length, ok: okCount, fail: R.length - okCount, checks: R } })
await writeArtifacts(out, "resumen", { txt: `Pasada 3 - Campañas, Cola y motor\n${okCount}/${R.length} OK\n${R.map((r) => (r.ok ? "OK  " : "FALLO") + ` ${String(r.n).padStart(2)} ${r.label}\n     ${r.detalle}`).join("\n")}` })

console.log(`pasada-3: ${okCount}/${R.length} OK; fallos:`)
for (const r of R.filter((x) => !x.ok)) console.log(`  [%d] %s -> %s`, r.n, r.label, r.detalle)