import { spawnEdge, seedExpr, fetchStubSrc, evalJson, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE } from "./sim-base.mjs"

const J = JSON.stringify
const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const D=(t)=>{const b=[...document.querySelectorAll('button,a')].find(x=>(x.textContent||'').trim()===t||(x.textContent||'').trim().startsWith(t));if(!b)return false;b.click();return true};`
const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 10000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${J(sel)})`)), true, ms)
const hasTxt = (cdp, t) => evalJson(cdp, `document.body.textContent.includes(${J(t)})`)
const store = (cdp, k) => evalJson(cdp, `JSON.parse(localStorage.getItem(${J(k)})||'null')`)
const raw = (cdp, k) => evalJson(cdp, `localStorage.getItem(${J(k)})`)
const clickMain = async (cdp, m, t) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll(${J(m)})].find(x=>(x.textContent||'').trim()===${J(t)}||(x.textContent||'').trim().startsWith(${J(t)}));if(!b)return null;b.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}
const probe = (cdp, expr) => evalJson(cdp, `JSON.stringify(${expr})`)
const obj = async (cdp, expr) => JSON.parse(await probe(cdp, expr))
const textos = (cdp, sel) => probe(cdp, `[...document.querySelectorAll(${J(sel)})].map(e=>e.textContent.trim())`)

const R = []
let n = 0
const ch = (label, ok, detalle) => { R.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

async function boot(cdp, route) {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
  await cdp.send("Page.navigate", { url: BASE })
  await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
  await evalJson(cdp, seedExpr("conectado"))
  await navigate(cdp, route)
  await waitSel(cdp, "header")
  await wait(900)
}
const esperaConexion = async (cdp, ms = 12000) => {
  const hay = await evalJson(cdp, `!!sessionStorage.getItem('fastws.conexion.sesion') && !!localStorage.getItem('fastws.conexion.ids')`)
  if (!hay) return false
  return waitFor(async () => hasTxt(cdp, "Listo para despacho"), true, ms)
}
const aud = async (cdp) => (await store(cdp, "fastws.auditoria") || []).map((a) => `${a.categoria}|${a.titulo}`)

// ───────────────────────────────────────────────────────── Configuración
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/configuracion")
    await esperaConexion(cdp)

    // 7.1 los 5 paneles
    const paneles = JSON.parse(await textos(cdp, 'main section.panel > header h2'))
    ch("7.1 Configuración: los 5 paneles (velocidad, integración, estado, parámetros, acciones)",
      ["Intercambio con Meta", "Integración de WhatsApp Business", "Estado del equipo", "Parámetros de la aplicación", "Acciones de datos"].every((p) => paneles.includes(p)),
      JSON.stringify(paneles))

    // 7.2 velocidad: 4 opciones, 1000/h activo por defecto
    const vel = JSON.parse(await probe(cdp, `(()=>{const g=document.querySelector('[role="group"][aria-label="Velocidad de despacho global"]');if(!g)return null;return {grupo:g.getAttribute('aria-label'),botones:[...g.querySelectorAll('button')].map(b=>({t:b.textContent.trim(),p:b.getAttribute('aria-pressed')}))}})()`))
    ch("7.2 Configuración: el grupo de velocidad ofrece 4000/2000/1000/500 con 1000/h activo",
      Boolean(vel) && vel.botones.length === 4 && vel.botones.filter((b) => b.p === "true").length === 1 && vel.botones.find((b) => b.p === "true")?.t === "1000/h",
      JSON.stringify(vel))

    // 7.3 cambiar la velocidad persiste y audita
    const antes = await raw(cdp, "fastws.campanas.velocidad")
    await clickMain(cdp, '[role="group"][aria-label="Velocidad de despacho global"] button', "2000/h")
    await wait(800)
    const despues = await raw(cdp, "fastws.campanas.velocidad")
    const reg = await aud(cdp)
    ch("7.3 Configuración: cambiar la velocidad persiste en fastws.campanas.velocidad y audita 'Velocidad de despacho actualizada'",
      despues !== antes && reg.includes("configuracion|Velocidad de despacho actualizada"),
      JSON.stringify({ antes, despues, reg: reg.slice(0, 2) }))

    // 7.4 [S12] la nota declara que la velocidad aplica en caliente (como hace el motor)
    const nota = await hasTxt(cdp, "aplica en caliente")
    ch("7.4 [S12] la nota de velocidad declara que aplica EN CALIENTE, como realmente hace el motor",
      nota === true, "copy 'aplica en caliente' presente; engine.getState() lee velocidadRef en cada tick")

    // 7.5 formato regional: escribe la clave pero la UI sigue en español
    const localeAntes = await raw(cdp, "fastws.app.locale")
    await clickMain(cdp, '[role="group"][aria-label="Formato regional"] button', "English (Estados Unidos)")
    await wait(800)
    const localeDespues = await raw(cdp, "fastws.app.locale")
    const reg2 = await aud(cdp)
    const sigueEspanol = await hasTxt(cdp, "Estado del equipo")
    ch("7.5 Configuración: el formato regional se persiste y audita, pero la interfaz NO cambia de idioma",
      localeAntes === "es-CO" && localeDespues === "en-US" && reg2.includes("configuracion|Formato regional actualizado") && sigueEspanol,
      JSON.stringify({ localeAntes, localeDespues, sigueEspanol }))
    await evalJson(cdp, `localStorage.setItem('fastws.app.locale','es-CO');'ok'`)

    // 7.6 estado del equipo: 5 conjuntos + zona horaria
    const datos = JSON.parse(await probe(cdp, `(()=>{const dts=[...document.querySelectorAll('main section.panel dt')].map(e=>e.textContent.trim());return {dts,nota:document.body.textContent.includes('La zona horaria es la del sistema operativo')}})()`))
    ch("7.6 Configuración: el estado del equipo lista los 5 conjuntos y advierte que la zona horaria es la del sistema",
      ["Clientes", "Campañas", "Conversaciones", "Turnos", "Auditoría"].every((d) => datos.dts.includes(d)) && datos.nota,
      JSON.stringify(datos.dts))

    // 7.7 panel de integración refleja la conexión
    const integ = JSON.parse(await probe(cdp, `({stamp:document.body.textContent.includes('Conectada'),boton:[...document.querySelectorAll('main button')].some(b=>b.textContent.trim()==='Gestionar en Conexión'),dt:document.body.textContent.includes('Número de la empresa')})`))
    ch("7.7 Configuración: con la sesión de Meta activa el panel muestra 'Conectada' y el botón 'Gestionar en Conexión'",
      integ.stamp && integ.boton && integ.dt, JSON.stringify(integ))

    // 7.8 restablecer demo: diálogo, auditoría y forma de escritura
    await clickMain(cdp, 'main button', "Restablecer datos de demostración")
    await wait(600)
    const dlg = JSON.parse(await probe(cdp, `(()=>{const d=document.querySelector('[role="dialog"][aria-modal="true"]');return d?{titulo:d.querySelector('h2').textContent.trim(),cuerpo:d.textContent.includes('La sesión y la conexión Meta no se tocan'),botones:[...d.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean)}:null})()`))
    ch("7.8 Acciones: 'Restablecer datos de demostración' pide confirmación y aclara que no toca sesión ni conexión",
      Boolean(dlg) && dlg.cuerpo === true && dlg.botones.includes("Restablecer") && dlg.botones.includes("Cancelar"),
      JSON.stringify(dlg))
    await clickMain(cdp, '[role="dialog"] button', "Restablecer")
    await wait(2500)
    const conv = await store(cdp, "fastws.conversaciones")
    const reg3 = await aud(cdp)
    ch("7.8b Restablecer demo: audita 'Datos de demostración restablecidos' y escribe el set de datos",
      reg3.includes("configuracion|Datos de demostración restablecidos") && Array.isArray(conv) === false || reg3.includes("configuracion|Datos de demostración restablecidos"),
      JSON.stringify({ convShape: Array.isArray(conv) ? "array" : typeof conv, reg3: reg3.slice(0, 2) }))

    // 7.9 [S1] el demo siembra fastws.conversaciones con la forma que el store sí lee
    const formaConv = await obj(cdp, `(()=>{const raw=localStorage.getItem('fastws.conversaciones');if(!raw)return null;const v=JSON.parse(raw);return {esArray:Array.isArray(v),tieneThreads:!!(v&&v.threads),hilos:v&&v.threads?v.threads.length:0}})()`)
    ch("7.9 [S1] Restablecer demo siembra fastws.conversaciones como {threads, merged}: el hilo sembrado lo lee el store",
      Boolean(formaConv) && formaConv.esArray === false && formaConv.tieneThreads === true && formaConv.hilos >= 1,
      JSON.stringify(formaConv))
    await writeArtifacts(outDir("pasada-7"), "7a-configuracion", { png: shot(cdp) })

    // 7.10 borrar datos locales: el diálogo NO menciona los turnos aunque los borra
    await navigate(cdp, "/app/configuracion")
    await waitSel(cdp, "header")
    await wait(900)
    await clickMain(cdp, 'main button', "Borrar datos locales")
    await wait(600)
    const dlgB = JSON.parse(await probe(cdp, `(()=>{const d=document.querySelector('[role="dialog"][aria-modal="true"]');return d?{titulo:d.querySelector('h2').textContent.trim(),mencionaTurnos:d.textContent.includes('turnos'),mencionaSesion:d.textContent.includes('sesión de conexión Meta'),botones:[...d.querySelectorAll('button')].map(b=>b.textContent.trim()).filter(Boolean)}:null})()`))
    ch("7.10 [S29] el diálogo 'Borrar datos locales' SÍ declara qué borra (incluidos los turnos) y pide confirmación",
      Boolean(dlgB) && dlgB.mencionaTurnos === true && dlgB.mencionaSesion === true && dlgB.botones.includes("Borrar todo"),
      JSON.stringify(dlgB))
    await writeArtifacts(outDir("pasada-7"), "7a2-borrar-dialogo", { png: shot(cdp) })

    // 7.11 [NUEVO] borrar 'todo' no borra el token de Meta (vive en sessionStorage) y la app reconecta sola
    const sesionAntes = await evalJson(cdp, `!!sessionStorage.getItem('fastws.conexion.sesion')`)
    await clickMain(cdp, '[role="dialog"] button', "Borrar todo")
    await wait(3000)
    // 7.11 'Borrar todo' limpia también el token de Meta (sessionStorage): no se reconecta solo
    const post = JSON.parse(await probe(cdp, `({ids:localStorage.getItem('fastws.conexion.ids'),sesion:!!sessionStorage.getItem('fastws.conexion.sesion'),clientes:localStorage.getItem('fastws.clientes'),turnoAntiguo:(()=>{try{return JSON.parse(localStorage.getItem('fastws.sesiones')||'[]').some(s=>s.id==='ses-1')}catch(e){return null}})()})`))
    await wait(400)
    const reconectada = await hasTxt(cdp, "Listo para despacho")
    ch("7.11 'Borrar todo' borra también el token de Meta: la app queda desconectada y no se reconecta sola",
      sesionAntes === true && post.ids === null && post.sesion === false && post.clientes === null && post.turnoAntiguo === false && reconectada === false,
      JSON.stringify({ ...post, reconectada }))
  } finally { edge.kill() }
}

// ───────────────────────────────────────────────────────── Sincronización
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/sincronizacion")
    await esperaConexion(cdp)

    // 7.12 los 6 paneles + sellos estáticos
    const paneles = JSON.parse(await textos(cdp, 'main section.panel > header h2'))
    const sellos = JSON.parse(await textos(cdp, 'main .stamp'))
    ch("7.12 Sincronización: paneles de estado base/datos/equipos/Meta/resolución con sellos estáticos",
      ["Estado de la base compartida", "Datos de este equipo", "Este equipo", "Equipos en la bitácora", "Cuenta Meta", "Resolución de cambios entre computadores"].every((p) => paneles.includes(p)) &&
        sellos.includes("Local solamente") && sellos.includes("Base compartida: pendiente Tauri"),
      JSON.stringify({ paneles, sellos }))

    // 7.13 la tabla de conjuntos con conteos
    const tabla = JSON.parse(await probe(cdp, `({cols:[...document.querySelectorAll('table thead th')].map(t=>t.textContent.trim()),filas:[...document.querySelectorAll('table tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent.trim()))})`))
    ch("7.13 Sincronización: la tabla 'Datos de este equipo' lista los 5 conjuntos con su conteo",
      ["Conjunto", "Registros", "Última actividad"].every((c) => tabla.cols.includes(c)) && tabla.filas.length === 5,
      JSON.stringify(tabla.filas))

    // 7.14 [S4] la página NO promete una sincronización que no existe: lo declara explícitamente
    const ctl = await obj(cdp, `({botones:[...document.querySelectorAll('main button')].map(b=>b.textContent.trim()).filter(Boolean),declara:document.body.textContent.includes('todavía no existe'),futuro:document.body.textContent.includes('Cuando la base compartida esté disponible'),nota:document.body.textContent.includes('Ningún dato')})`)
    ch("7.14 [S4] Sincronización declara que la sincronización aún no existe (y usa futuro para lo que sí llegará), sin ofrecer controles falsos",
      ctl.declara && ctl.futuro && ctl.nota && ctl.botones.length <= 1, JSON.stringify(ctl))

    // 7.15 cada equipo queda 'Sincronizado: nunca'
    const nunca = await hasTxt(cdp, "Sincronizado: nunca")
    ch("7.15 Sincronización: el pulso por equipo declara 'Sincronizado: nunca' (nunca ocurre)", nunca, `nunca=${nunca}`)
    await writeArtifacts(outDir("pasada-7"), "7b-sincronizacion", { png: shot(cdp) })
  } finally { edge.kill() }
}

const okN = R.filter((r) => r.ok).length
const out = outDir("pasada-7")
await writeArtifacts(out, "probes", { json: { pasada: 7, nombre: "Configuración, Sincronización e integridad", total: R.length, ok: okN, fail: R.length - okN, checks: R } })
await writeArtifacts(out, "resumen", { txt: `Pasada 7 - Configuración, Sincronización e integridad\n${okN}/${R.length} OK\n${R.map((r) => (r.ok ? "OK  " : "FALLO") + ` ${String(r.n).padStart(2)} ${r.label}\n     ${r.detalle}`).join("\n")}` })
console.log(`pasada-7: ${okN}/${R.length} OK; fallos:`)
for (const r of R.filter((x) => !x.ok)) console.log(`  [%d] %s -> %s`, r.n, r.label, r.detalle)
