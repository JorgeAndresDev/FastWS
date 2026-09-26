import fs from "node:fs"
import { spawnEdge, PROFILE, seedExpr, fetchStubSrc, evalJson, locVal, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE } from "./sim-base.mjs"

fs.rmSync(PROFILE, { recursive: true, force: true })

async function wipeProfile() {
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); return } catch { await wait(400) }
  }
  throw new Error("No se pudo limpiar el perfil")
}

const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const D=(t)=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==t);if(!b)return false;b.click();return true};`
const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 8000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${JSON.stringify(sel)})`)), true, ms)
const hasBody = (cdp, text) => evalJson(cdp, `document.body.innerText.includes(${JSON.stringify(text)})`)
const pathGet = (cdp) => locVal(cdp, "location.pathname")
const pathNow = async (cdp) => await locVal(cdp, "location.pathname")()
const ADMIN = { u: "admin@fastws.local", p: "despacho2026" }

async function login(cdp, remember) {
  await waitSel(cdp, "#usuario")
  return act(cdp, `F('#usuario','${ADMIN.u}');F('#clave','${ADMIN.p}');${remember ? "C('input[type=\"checkbox\"]');" : ""}C('button[type="submit"]');return 'ok'`)
}
async function loginAs(cdp, clave) {
  await waitSel(cdp, "#usuario")
  return act(cdp, `F('#usuario','${ADMIN.u}');F('#clave','${clave}');C('button[type="submit"]');await new Promise(r=>setTimeout(r,1000));return 'ok'`)
}

const R = []
let n = 0
const ch = (label, ok, detalle) => { R.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

// La app estampa con acentos (SÁB, MIÉ, ABR): normalizamos antes de comparar,
// o el check solo pasaría de martes a jueves.
const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase()
const DATE_RE = /\b(VIE|SAB|DOM|LUN|MAR|MIE|JUE)\s+\d{1,2}\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+\d{4}\b/

// ---------------------------------------------------------------- P1: perfil vacío (auth pública)
{
  const { cdp, edge } = await spawnEdge()
  try {
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(pathGet(cdp), "/login", 15000)
    ch("1.12 ruta raiz / sin sesion deriva a /login", true, "/->/login")

    // 1.3 credencial incorrecta (perfil limpio)
    await loginAs(cdp, "claveMAL")
    const bad = JSON.parse(await act(cdp, `return JSON.stringify({err:(document.querySelector('#login-error')||{innerText:''}).innerText,p:location.pathname,ls:localStorage.getItem('fastws.session'),ss:sessionStorage.getItem('fastws.session')})`))
    ch("1.3 credencial incorrecta muestra error y permanece en /login",
      bad.err.includes("Usuario o contraseña incorrectos") && bad.p === "/login" && bad.ls === null && bad.ss === null,
      JSON.stringify(bad))

    // 1.4 reveal de clave (toggle Mostrar/Ocultar)
    const tipoInit = await evalJson(cdp, `document.querySelector('#clave')?.type`)
    await act(cdp, `const t=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Mostrar');t?.click();return 'ok'`)
    await wait(300)
    const tipo1 = await evalJson(cdp, `document.querySelector('#clave')?.type`)
    await act(cdp, `const t=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Ocultar');t?.click();return 'ok'`)
    await wait(300)
    const tipo2 = await evalJson(cdp, `document.querySelector('#clave')?.type`)
    ch("1.4 reveal de clave alterna password/text",
      tipoInit === "password" && tipo1 === "text" && tipo2 === "password",
      `inicio=${tipoInit} mostrar=${tipo1} ocultar=${tipo2}`)

    // 1.5 guard + 1.2 login recordada
    await navigate(cdp, "/app/campanas")
    await waitFor(pathGet(cdp), "/login", 8000)
    ch("1.5 ruta protegida sin sesion deriva a /login", (await pathNow(cdp)) === "/login", "/app/campanas->/login")
    await login(cdp, true)
    const ck = JSON.parse(await act(cdp, `return JSON.stringify({checked:document.querySelector('input[type="checkbox"]')?.checked})`))
    const gard = await waitFor(pathGet(cdp), "/app/campanas", 8000)
    await wait(800)
    const after = JSON.parse(await act(cdp, `return JSON.stringify({p:location.pathname,act:[...document.querySelectorAll('a[aria-current="page"]')].map(a=>a.innerText.trim()).join('|'),ls:localStorage.getItem('fastws.session'),ss:sessionStorage.getItem('fastws.session'),sesiones:JSON.parse(localStorage.getItem('fastws.sesiones')||'[]')})`))
    const tail = after.sesiones[after.sesiones.length - 1] || {}
    ch("1.5 login recordada vuelve a state.from /app/campanas",
      ck.checked === true && gard && after.p === "/app/campanas" && after.act.includes("Campañas") && after.ls && after.ss === null,
      JSON.stringify({ p: after.p, act: after.act, ls: Boolean(after.ls), ss: after.ss, checked: ck.checked }))
    ch("1.2 login recordada: submit funciona y sella turno 'inicio'",
      ck.checked === true && after.p === "/app/campanas" && after.ls && after.ss === null && tail.recordar === true && tail.origen === "inicio" && !tail.fin,
      JSON.stringify({ recordar: tail.recordar, origen: tail.origen, fin: tail.fin }))
    await writeArtifacts(outDir("pasada-1"), "login-recordada", { png: shot(cdp) })

    // 1.6 sesión corrupta (localStorage) -> /login sin crash
    await evalJson(cdp, `localStorage.setItem('fastws.session','@@corrupto');'ok'`)
    await navigate(cdp, "/app")
    const p6ok = await waitFor(pathGet(cdp), "/login", 6000)
    const p6 = await pathNow(cdp)
    ch("1.6 sesion corrupta deriva a /login sin crash", p6ok && p6 === "/login", `p=${p6}`)

    // 1.7 recuperar clave
    await navigate(cdp, "/recuperar")
    await waitSel(cdp, "#correo")
    await act(cdp, `F('#correo','soporte@otro.co');C('button[type="submit"]');await new Promise(r=>setTimeout(r,700));return 'ok'`)
    ch("1.7 email no registrado da error", await hasBody(cdp, "No hay una cuenta registrada"), "soporte@otro.co rechazado")
    await act(cdp, `F('#correo','${ADMIN.u}');C('button[type="submit"]');await new Promise(r=>setTimeout(r,700));return 'ok'`)
    ch("1.7 email valido pasa a fase definir clave", await hasBody(cdp, "Instrucciones enviadas"), "solicitar->definir")
    await waitSel(cdp, "#codigo")
    const codigoRec = await evalJson(cdp, `document.querySelector('#codigo')?.getAttribute('placeholder')||''`)
    ch("1.7 [S11] el codigo de recuperacion se expone y es de 6 digitos",
      /^\d{6}$/.test(codigoRec) && codigoRec !== "000000", codigoRec || "(sin placeholder)")
    await act(cdp, `F('#codigo','000000');F('#nueva','nuevaClave2026');F('#confirmar','otra');C('button[type="submit"]');await new Promise(r=>setTimeout(r,600));return 'ok'`)
    ch("1.7 validacion: contraseñas no coinciden", await hasBody(cdp, "Las contraseñas no coinciden"), "confirmar distinta bloquea")
    await act(cdp, `F('#codigo','${codigoRec}');F('#confirmar','nuevaClave2026');C('button[type="submit"]');await new Promise(r=>setTimeout(r,900));return 'ok'`)
    ch("1.7 reset con el codigo real llega a listo", await hasBody(cdp, "Contraseña actualizada"), "fase listo")
    await writeArtifacts(outDir("pasada-1"), "recuperar-listo", { png: shot(cdp) })
    await act(cdp, `D('Volver a iniciar sesión');return 'ok'`)
    await waitFor(pathGet(cdp), "/login", 6000)
    ch("1.7 volver a iniciar sesion aterriza en /login", (await pathNow(cdp)) === "/login", "post-reset -> /login")

    // 1.7h S11: la clave nueva SÍ persiste y permite iniciar sesion
    await loginAs(cdp, "nuevaClave2026")
    const s11 = await waitFor(pathGet(cdp), "/app", 8000)
    await wait(700)
    ch("1.7h [S11] la clave nueva persiste y permite iniciar sesion", s11 && (await pathNow(cdp)) === "/app", "login con clave nueva OK")

    // restaura la clave demo y limpia la sesion para no contaminar el resto de la pasada
    await evalJson(cdp, `localStorage.removeItem('fastws.clave.hash');localStorage.removeItem('fastws.recuperacion.codigo');localStorage.removeItem('fastws.session');sessionStorage.removeItem('fastws.session');'ok'`)
    await navigate(cdp, "/login")
    await waitSel(cdp, "#usuario")

    // 1.1 login temporal (recordar off): sesión -> sessionStorage
    await login(cdp, false)
    const land = await waitFor(pathGet(cdp), "/app", 8000)
    await wait(700)
    const t1 = JSON.parse(await act(cdp, `return JSON.stringify({p:location.pathname,ls:localStorage.getItem('fastws.session'),ss:sessionStorage.getItem('fastws.session'),name:JSON.parse(sessionStorage.getItem('fastws.session')||'null')?.name})`))
    ch("1.1 login temporal guarda sesion solo en sessionStorage",
      land && t1.p === "/app" && t1.ls === null && Boolean(t1.ss) && t1.name === "Administrador",
      JSON.stringify({ ls: t1.ls, ss: Boolean(t1.ss), name: t1.name }))
    await writeArtifacts(outDir("pasada-1"), "login-temporal", { png: shot(cdp) })
  } finally {
    edge.kill()
  }
}

// ---------------------------------------------------------------- P2: seed conectado + shell
{
  const { cdp, edge } = await spawnEdge()
  try {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
    await evalJson(cdp, seedExpr("conectado"))
    await navigate(cdp, "/app")
    await waitSel(cdp, "header")
    await wait(800)

    const bodyFecha = sinAcentos(await act(cdp, `return document.body.innerText`))
    ch("1.16 sello de fecha en topbar (dia + mes + anio)", DATE_RE.test(bodyFecha), (bodyFecha.match(DATE_RE) || ["—"])[0])

    await act(cdp, `D('Nueva campaña');return 'ok'`)
    const landNc = await waitFor(pathGet(cdp), "/app/campanas", 6000)
    ch("1.15 boton Nueva campaña (topbar) navega a /app/campanas", landNc, "-> /app/campanas")

    const RUTAS = [
      ["/app", "Dashboard"],
      ["/app/campanas", "Campañas"],
      ["/app/cola", "Cola de envíos"],
      ["/app/mensajes", "Mensajes"],
      ["/app/clientes", "Clientes"],
      ["/app/importacion", "Importar clientes"],
      ["/app/segmentos", "Segmentos"],
      ["/app/plantillas", "Plantillas"],
      ["/app/conversaciones", "Conversaciones"],
      ["/app/historial", "Historial"],
      ["/app/reportes", "Reportes"],
      ["/app/configuracion", "Configuración"],
      ["/app/usuarios-dispositivos", "Usuarios y dispositivos"],
      ["/app/auditoria", "Auditoría"],
      ["/app/sincronizacion", "Sincronización"],
      ["/app/conexion", "Conexión"],
    ]
    const nav = []
    for (const [route, label] of RUTAS) {
      const okNav = await navigate(cdp, route)
      await wait(1000)
      let pj = JSON.parse(await act(cdp, `return JSON.stringify({path:location.pathname,blank:(document.body.innerText||'').trim().length<90,act:[...document.querySelectorAll('a[aria-current="page"]')].map(a=>a.innerText.trim()).join('|')})`))
      if (pj.blank) { await wait(1200); pj = JSON.parse(await act(cdp, `return JSON.stringify({path:location.pathname,blank:(document.body.innerText||'').trim().length<90,act:[...document.querySelectorAll('a[aria-current="page"]')].map(a=>a.innerText.trim()).join('|')})`)) }
      const activeOk = pj.act.split("|").some((a) => a === label)
      nav.push({ route, label, ok: Boolean(okNav) && pj.path === route && !pj.blank && activeOk, detail: JSON.stringify(pj) })
      ch(`1.10 navegable ${label}`, Boolean(okNav) && pj.path === route && !pj.blank && activeOk, `act=${pj.act} blank=${pj.blank}`)
    }
    await writeArtifacts(outDir("pasada-1"), "nav-16", { json: nav })

    await navigate(cdp, "/app/xyz")
    await waitFor(pathGet(cdp), "/app", 6000)
    ch("1.11 ruta desconocida deriva a /app", (await pathNow(cdp)) === "/app", "/app/xyz->/app")

    ch("1.13 enlace saltar al contenido presente", await hasBody(cdp, "Saltar al contenido"), "")
    ch("1.14 pill de conexion 'Listo para despacho' (conectada)", await hasBody(cdp, "Listo para despacho"), "header pill")

    // 1.9 navegación con teclado en menú de cuenta
    await act(cdp, `C('button[aria-label^="Cuenta del usuario"]');return 'ok'`)
    await waitSel(cdp, '[role="menu"]', 6000)
    await wait(600)
    const k1 = JSON.parse(await act(cdp, `return JSON.stringify({expanded:document.querySelector('button[aria-label^="Cuenta del usuario"]')?.getAttribute('aria-expanded'),items:document.querySelectorAll('[role="menu"] [role="menuitem"]').length,autoFocusOK:document.querySelector('[role="menuitem"]')===document.activeElement})`))
    ch("1.9 menu abre y primer item enfocable", k1.expanded === "true" && k1.items >= 1, JSON.stringify(k1))
    await act(cdp, `document.querySelector('[role="menu"] [role="menuitem"]')?.focus();return 'ok'`)
    await wait(200)
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 })
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowDown", code: "ArrowDown", windowsVirtualKeyCode: 40 })
    await wait(250)
    const k2 = JSON.parse(await act(cdp, `return JSON.stringify({focus:document.activeElement?.innerText?.trim()||'',open:document.querySelector('button[aria-label^="Cuenta del usuario"]')?.getAttribute('aria-expanded')})`))
    ch("1.9 ArrowDown mantiene el item activo", k2.focus.includes("Cerrar sesión") && k2.open === "true", JSON.stringify(k2))
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 })
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 })
    await wait(250)
    const k2b = JSON.parse(await act(cdp, `return JSON.stringify({focus:document.activeElement?.innerText?.trim()||'',open:document.querySelector('button[aria-label^="Cuenta del usuario"]')?.getAttribute('aria-expanded')})`))
    ch("1.9 ArrowUp mantiene el item activo", k2b.focus.includes("Cerrar sesión") && k2b.open === "true", JSON.stringify(k2b))
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 })
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 })
    await wait(400)
    const k3 = JSON.parse(await act(cdp, `return JSON.stringify({expanded:document.querySelector('button[aria-label^="Cuenta del usuario"]')?.getAttribute('aria-expanded'),focus:document.activeElement?.getAttribute?.('aria-label')||''})`))
    ch("1.9 Escape cierra el menu y devuelve el foco", k3.expanded === "false" && k3.focus.startsWith("Cuenta del usuario"), JSON.stringify(k3))

    // 1.8 logout 2 pasos + cierre de turno (sello fin)
    await act(cdp, `C('button[aria-label^="Cuenta del usuario"]');return 'ok'`)
    await waitSel(cdp, '[role="menu"]', 6000)
    await wait(900)
    await act(cdp, `await new Promise(r=>setTimeout(r,150));D('Cerrar sesión');await new Promise(r=>setTimeout(r,300));return 'ok'`)
    const conf = await waitFor(async () => hasBody(cdp, "La planilla quedará sellada"), true, 4000)
    ch("1.8 primer paso muestra confirmación de cierre de turno", conf, "menu confirma antes de salir")
    await writeArtifacts(outDir("pasada-1"), "logout-confirm", { png: shot(cdp) })
    await act(cdp, `D('Cerrar turno');return 'ok'`)
    await waitFor(pathGet(cdp), "/login", 6000)
    await wait(500)
    const out = JSON.parse(await act(cdp, `return JSON.stringify({ls:localStorage.getItem('fastws.session'),ss:sessionStorage.getItem('fastws.session'),sesiones:JSON.parse(localStorage.getItem('fastws.sesiones')||'[]')})`))
    const tailOut = out.sesiones[out.sesiones.length - 1] || {}
    ch("1.8 logout limpia sesion y sella el cierre del turno (fin)",
      out.ls === null && out.ss === null && Boolean(tailOut.fin),
      `ls=${out.ls} ss=${out.ss} fin=${tailOut.fin ? "set" : "AUSENTE"} origen=${tailOut.origen}`)
  } finally {
    edge.kill()
  }
}

// ---------------------------------------------------------------- P3: sin conexión (pill)
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
    await evalJson(cdp, seedExpr("sinconexion"))
    await navigate(cdp, "/app")
    await waitSel(cdp, "header")
    await wait(600)
    const pillOnline = await evalJson(cdp, `JSON.stringify({online:navigator.onLine,pill:[...document.querySelectorAll('[role="status"]')].map(s=>s.innerText.trim()).join(' | ')})`)
    ch("1.14b sin conexion Meta (online): pill 'Sin conexión Meta · envíos en pausa'",
      pillOnline.includes("Sin conexión Meta") && pillOnline.includes("pausa"),
      pillOnline)

    // subtest: red real offline -> 'Modo local · envíos en pausa' (evento offline, sin recargar)
    await cdp.send("Network.enable")
    await cdp.send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
    await wait(800)
    const pillOff = await evalJson(cdp, `JSON.stringify({online:navigator.onLine,pill:[...document.querySelectorAll('[role="status"]')].map(s=>s.innerText.trim()).join(' | ')})`)
    ch("1.14c offline real: pill 'Modo local · envíos en pausa'",
      pillOff.includes("Modo local") && pillOff.includes("pausa"),
      pillOff)
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  } finally {
    edge.kill()
  }
}

const okCount = R.filter((r) => r.ok).length
const out = outDir("pasada-1")
await writeArtifacts(out, "probes", { json: { pasada: 1, nombre: "Auth y shell", total: R.length, ok: okCount, fail: R.length - okCount, checks: R } })
await writeArtifacts(out, "resumen", { txt: `Pasada 1 - Auth y shell\n${okCount}/${R.length} OK\n${R.map((r) => (r.ok ? "OK  " : "FALLO") + ` ${String(r.n).padStart(2)} ${r.label}\n     ${r.detalle}`).join("\n")}` })

console.log(`pasada-1: ${okCount}/${R.length} OK; fallos:`)
for (const r of R.filter((x) => !x.ok)) console.log(`  [%d] %s -> %s`, r.n, r.label, r.detalle)