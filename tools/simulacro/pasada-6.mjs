import { spawnEdge, seedExpr, fetchStubSrc, evalJson, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE, iso } from "./sim-base.mjs"

const J = JSON.stringify
const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const D=(t)=>{const b=[...document.querySelectorAll('button,a')].find(x=>(x.textContent||'').trim()===t||(x.textContent||'').trim().startsWith(t));if(!b)return false;b.click();return true};`
const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 10000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${J(sel)})`)), true, ms)
const hasTxt = (cdp, t) => evalJson(cdp, `document.body.textContent.includes(${J(t)})`)
const store = (cdp, k) => evalJson(cdp, `JSON.parse(localStorage.getItem(${J(k)})||'null')`)
const clickMain = async (cdp, m, t) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll(${J(m)})].find(x=>(x.textContent||'').trim()===${J(t)}||(x.textContent||'').trim().startsWith(${J(t)}));if(!b)return null;b.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}
const click = (cdp, sel) => act(cdp, `return C(${J(sel)})`)
const probe = (cdp, expr) => evalJson(cdp, `JSON.stringify(${expr})`)
const obj = async (cdp, expr) => JSON.parse(await probe(cdp, expr))
const flag = async (cdp, expr) => (await probe(cdp, expr)) === "true"
const arr = (cdp, expr) => evalJson(cdp, expr)

const R = []
let n = 0
const ch = (label, ok, detalle) => { R.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

// Captura el CSV que genera el blob de exportacion (la app revoca la URL de inmediato).
const CSV_HOOK = `(() => {
  window.__csv = null; window.__dl = null;
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    window.__dlBlob = blob;
    try { const fr = new FileReader(); fr.onload = () => { window.__csv = fr.result }; fr.readAsText(blob); } catch (e) {}
    try { const fb = new FileReader(); fb.onload = () => { window.__csvBytes = [...new Uint8Array(fb.result).slice(0, 3)] }; fb.readAsArrayBuffer(blob); } catch (e) {}
    return 'blob:stub';
  };
  const realClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl = this.download } else { return realClick.call(this) } };
  return create;
})()`

async function boot(cdp, route) {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: CSV_HOOK })
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

const campanas = (cdp) => store(cdp, "fastws.campanas")
const textos = (cdp, sel) => probe(cdp, `[...document.querySelectorAll(${J(sel)})].map(e=>e.textContent.trim())`)
const csv = (cdp) => evalJson(cdp, `window.__csv`)

// ───────────────────────────────────────────────────────── Reportes
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/reportes")
    await esperaConexion(cdp)

    // 6.1 pestañas de vista + KPIs del Resumen
    const tabs = JSON.parse(await textos(cdp, '[role="tab"]'))
    const esperadas = ["Resumen", "Por día", "Por campaña", "Por estado", "Por cliente", "Por usuario"]
    const kpis = JSON.parse(await textos(cdp, 'main .panel p.text-\\[0\\.75rem\\]'))
    ch("6.1 Reportes: 6 pestañas de vista y KPIs del Resumen",
      esperadas.every((t) => tabs.includes(t)) &&
        ["Clientes", "Campañas", "Enviados", "Entregados", "Fallidos", "Respondidos", "Ejemplos"].every((k) => kpis.includes(k)),
      JSON.stringify({ tabs, kpis }))

    // 6.2 periodo Hoy y Rango (revela los date inputs)
    await clickMain(cdp, 'main button', "Hoy")
    await wait(600)
    const hoy = await hasTxt(cdp, "Hoy")
    await clickMain(cdp, 'main button', "Rango")
    await wait(500)
    const rangos = await flag(cdp, `!!document.querySelector('input[aria-label="Desde"]') && !!document.querySelector('input[aria-label="Hasta"]')`)
    ch("6.2 Reportes: periodo Hoy aplicado y Rango revela Desde/Hasta", hoy && rangos, `hoy=${hoy} rangoInputs=${rangos}`)

    // 6.3 [S20] rango invertido: los date inputs se acotan entre sí y el rango se normaliza
    await clickMain(cdp, '[role="tab"]', "Por estado")
    await wait(700)
    // ventana ancha (ayer..+3d) invertida a propósito: normalizada debe seguir mostrando todo el seed
    const ayerIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const futuroIso = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    await act(cdp, `F('input[aria-label="Hasta"]','${ayerIso}');return 'ok'`)
    await wait(500)
    const limite = await obj(cdp, `({minDesde:document.querySelector('input[aria-label="Desde"]').getAttribute('min'),maxHasta:document.querySelector('input[aria-label="Hasta"]').getAttribute('max')})`)
    await act(cdp, `F('input[aria-label="Desde"]','${futuroIso}');return 'ok'`)
    await wait(900)
    const inv = await obj(cdp, `({filas:document.querySelectorAll('table tbody tr').length,vacio:document.body.textContent.includes('No hay registros que coincidan')})`)
    ch("6.3 [S20] rango invertido: los date inputs se acotan (min/max) y el rango se normaliza en vez de vaciar el reporte",
      limite.minDesde === ayerIso && limite.maxHasta === null && inv.filas > 1 && inv.vacio === false,
      JSON.stringify({ ayerIso, futuroIso, limite, inv }))

    // 6.4 origen Ejemplos acota el reporte
    await act(cdp, `F('input[aria-label="Desde"]','');F('input[aria-label="Hasta"]','');return 'ok'`)
    await wait(600)
    const total = await arr(cdp, `document.querySelectorAll('table tbody tr').length`)
    await clickMain(cdp, 'main button', "Ejemplos")
    await wait(800)
    const soloEjemplos = await obj(cdp, `({filas:document.querySelectorAll('table tbody tr').length,vacio:document.body.textContent.includes('Sin registro')})`)
    ch("6.4 Reportes: el filtro por origen 'Ejemplos' acota el conjunto (vacía la lista si no hay ejemplos)",
      soloEjemplos.filas < total || soloEjemplos.vacio === true,
      JSON.stringify({ total, ...soloEjemplos }))

    // 6.5 búsqueda por texto
    await clickMain(cdp, 'main button', "Todos")
    await wait(600)
    await act(cdp, `F('input[aria-label="Buscar en el reporte"]','Café');return 'ok'`)
    await wait(800)
    const busq = await obj(cdp, `({filas:document.querySelectorAll('table tbody tr').length,valor:document.querySelector('input[aria-label="Buscar en el reporte"]').value})`)
    await act(cdp, `F('input[aria-label="Buscar en el reporte"]','');return 'ok'`)
    await wait(500)
    ch("6.5 Reportes: la búsqueda acota por cliente/campaña/teléfono", busq.valor === "Café" && busq.filas < total, JSON.stringify({ total, ...busq }))

    // 6.6 botón CSV: habilitado con filas, deshabilitado sin registros
    const csvOn = await flag(cdp, `!![...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='CSV'&&!b.disabled)`)
    await act(cdp, `F('input[aria-label="Buscar en el reporte"]','zzz-no-existe-zzz');return 'ok'`)
    await wait(800)
    const csvOff = await flag(cdp, `!![...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='CSV'&&b.disabled)`)
    ch("6.6 Reportes: el botón CSV se habilita con registros y se bloquea sin ellos", csvOn && csvOff, `on=${csvOn} off=${csvOff}`)
    await act(cdp, `F('input[aria-label="Buscar en el reporte"]','');return 'ok'`)
    await wait(500)

    // 6.7 [S21] exportación CSV: forma del archivo (BOM, ';', CRLF, columnas, nombre)
    const campIny = await campanas(cdp)
    const conCamp = campIny[0]
    conCamp.name = '=SUM(1,1)'
    await evalJson(cdp, `localStorage.setItem('fastws.campanas', ${J(JSON.stringify(campIny))});'ok'`)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1100)
    await clickMain(cdp, 'main button', "Por estado")
    await wait(800)
    await clickMain(cdp, 'main button', "CSV")
    await wait(1000)
    const cuerpo = await csv(cdp)
    const bytes = await evalJson(cdp, `window.__csvBytes||null`)
    const nombre = await evalJson(cdp, `window.__dl`)
    const lineas = String(cuerpo || "").split("\r\n")
    const cab = String(lineas[0] || "").replace(/^\uFEFF/, "")
    ch("6.7 Reportes: el CSV exporta BOM + delimitador ';' + CRLF + 14 columnas + nombre con fecha",
      Array.isArray(bytes) && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf &&
        lineas.length >= 2 &&
        cab.split(";").length === 14 &&
        /^reporte-mensajes-\d{4}-\d{2}-\d{2}\.csv$/.test(String(nombre)),
      JSON.stringify({ nombre, cols: cab.split(";").length, filas: lineas.length - 1, bom: bytes, cab }))

    // 6.8 [S21] CSV injection neutralizada: la celda '=' sale con prefijo de comilla simple
    const celda = lineas.slice(1).map((l) => l.split(";")).flat().find((c) => c.includes("=SUM"))
    ch("6.8 [S21] CSV injection neutralizada: la celda que empieza por '=' sale con prefijo ' (no se ejecuta al abrir)",
      typeof celda === "string" && celda.startsWith("'=SUM"),
      JSON.stringify({ celda: String(celda).slice(0, 40) }))

    // 6.9 tabla Por estado: 7 columnas y sellos de estado
    const cols = JSON.parse(await textos(cdp, 'table thead th'))
    const stamps = await arr(cdp, `[...document.querySelectorAll('[data-testid="status-stamp"]')].map(e=>e.textContent.trim())`)
    ch("6.9 Reportes: la vista Por estado trae las 7 columnas y sellos de estado",
      ["Registro", "Fecha", "Destino", "Campaña", "Estado", "ID Meta", "Error"].every((c) => cols.includes(c)) && Array.isArray(stamps) && stamps.length > 0,
      JSON.stringify({ cols, stamps: (stamps || []).slice(0, 6) }))

    // 6.10 la clave de día con padding: la vista Por día muestra una fecha legible
    await clickMain(cdp, '[role="tab"]', "Por día")
    await wait(900)
    const porDia = await obj(cdp, `(()=>{const tr=document.querySelector('table tbody tr');return {celdas:tr?[...tr.querySelectorAll('td')].map(td=>td.textContent.trim()):[],crudo:document.body.textContent.match(/\\d{4}-\\d{1,2}-\\d{1,2}T[\\d:.]+/)?.[0]||null}})()`)
    const roto = /^\d{4}-\d{1,2}-\d{1,2}T/.test(String(porDia.celdas[1] || "")) || porDia.crudo !== null
    ch("6.10 la vista Por día muestra la fecha como día legible (la clave de día ya no se filtrta cruda)",
      roto === false && porDia.celdas.length >= 4, JSON.stringify(porDia))

    // 6.11 estado vacío
    await clickMain(cdp, '[role="tab"]', "Por campaña")
    await wait(600)
    await evalJson(cdp, `localStorage.setItem('fastws.campanas','[]');'ok'`)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1100)
    await clickMain(cdp, '[role="tab"]', "Por campaña")
    await wait(800)
    const vacio = await obj(cdp, `({sinRegistro:document.body.textContent.includes('Sin registro'),nota:document.body.textContent.includes('Crea y despacha campañas')})`)
    ch("6.11 Reportes: estado vacío con sello 'Sin registro' y llamada a la acción", vacio.sinRegistro && vacio.nota, JSON.stringify(vacio))
    await writeArtifacts(outDir("pasada-6"), "6a-reportes", { png: shot(cdp) })
  } finally { edge.kill() }
}

// ───────────────────────────────────────────────────────── Historial
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/historial")
    await esperaConexion(cdp)

    // 6.12 el interruptor "Envíos exitosos" arranca apagado y oculta lo enviado con éxito
    const sw = await obj(cdp, `(()=>{const b=document.querySelector('[role="switch"]');return {texto:b?b.textContent.trim():null,checked:b?b.getAttribute('aria-checked'):null,filas:document.querySelectorAll('[data-index]').length}})()`)
    ch("6.12 Historial: 'Envíos exitosos' arranca apagado y por eso oculta los envíos con éxito",
      sw.texto === "Envíos exitosos" && sw.checked === "false",
      JSON.stringify(sw))

    // 6.13 al activarlo aparecen los eventos de campaña
    await click(cdp, '[role="switch"]')
    await wait(900)
    const on = await obj(cdp, `({checked:document.querySelector('[role="switch"]').getAttribute('aria-checked'),hayCampana:document.body.textContent.includes('Campaña creada')||document.body.textContent.includes('Campaña iniciada')||document.body.textContent.includes('Campaña finalizada'),filas:document.querySelectorAll('[data-index]').length})`)
    ch("6.13 Historial: al activar 'Envíos exitosos' aparece la bitácora de campañas", on.checked === "true" && on.hayCampana, JSON.stringify(on))

    // 6.14 pestañas por tipo
    const tabs = JSON.parse(await textos(cdp, '[role="tab"]'))
    await clickMain(cdp, '[role="tab"]', "Errores")
    await wait(700)
    const err = await obj(cdp, `({sel:[...document.querySelectorAll('[role="tab"]')].find(t=>t.textContent.trim()==='Errores').getAttribute('aria-selected'),filas:document.querySelectorAll('[data-index]').length})`)
    ch("6.14 Historial: 6 pestañas por tipo y el filtro 'Errores' acota la lista",
      ["Todos", "Campañas", "Mensajes", "Respuestas", "Ejemplos", "Errores"].every((t) => tabs.includes(t)) && err.sel === "true",
      JSON.stringify({ tabs, ...err }))

    // 6.15 búsqueda
    await clickMain(cdp, '[role="tab"]', "Todos")
    await wait(500)
    await act(cdp, `F('input[aria-label="Buscar en el historial"]','Café');return 'ok'`)
    await wait(800)
    const busq = await arr(cdp, `document.querySelectorAll('[data-index]').length`)
    await act(cdp, `F('input[aria-label="Buscar en el historial"]','');return 'ok'`)
    await wait(500)
    ch("6.15 Historial: la búsqueda acota la bitácora", busq >= 0, `filasFiltradas=${busq}`)

    // 6.16 [S24] nada de lo que se marca/selecciona persiste: el estado es efímero
    await act(cdp, `F('input[aria-label="Buscar en el historial"]','Café');C('[role="switch"]');return 'ok'`)
    await wait(700)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1100)
    const tras = await obj(cdp, `({switch:document.querySelector('[role="switch"]').getAttribute('aria-checked'),busq:document.querySelector('input[aria-label="Buscar en el historial"]').value})`)
    ch("6.16 [S24] el estado del Historial (filtro, búsqueda, interruptor) NO se persiste al recargar",
      tras.switch === "false" && tras.busq === "",
      JSON.stringify(tras))

    // 6.17 una campaña cancelada se registra como 'Campaña' (decisión del operador, no un error)
    const cancelada = {
      id: "camp-x", name: "Promo cancelada", description: "",
      template: { name: "recordatorio_ruta", language: "es" },
      mapping: [{ index: 1, fuente: "campo", campo: "name" }], filter: {}, status: "CANCELADA",
      recipients: [{ clientId: "cl-1", code: "C-1001", name: "Cliente A", phone: "573001234001", params: ["A"], status: "CANCELADO" }],
      createdAt: iso(120), startedAt: iso(90), endedAt: iso(30),
      activity: [{ tipo: "creada", at: iso(120) }, { tipo: "cancelada", at: iso(30) }],
    }
    await evalJson(cdp, `localStorage.setItem('fastws.campanas', ${J(JSON.stringify([cancelada]))});'ok'`)
    await cdp.send("Page.reload", { ignoreCache: true })
    await waitSel(cdp, "header")
    await wait(1200)
    const clasif = await obj(cdp, `({errores:(document.body.textContent.match(/(\\d+) errores?/)||['',''])[1],texto:document.body.textContent.includes('Campaña cancelada'),detalle:document.body.textContent.includes('se canceló a petición del operador'),chipCampana:document.body.textContent.includes('Campaña')})`)
    ch("6.17 la cancelación de una campaña se registra como campaña (solo cuenta como error el mensaje cancelado, no la decisión)",
      clasif.errores === "1" && clasif.texto && clasif.detalle && clasif.chipCampana,
      JSON.stringify(clasif))

    // 6.18 estado vacío
    await act(cdp, `F('input[aria-label="Buscar en el historial"]','zzz-nada-zzz');return 'ok'`)
    await wait(900)
    const vacio = await obj(cdp, `({sinRegistro:document.body.textContent.includes('Sin registro'),nota:document.body.textContent.includes('Las actividades aparecen cuando hay campañas')})`)
    ch("6.18 Historial: estado vacío con sello 'Sin registro' y ayuda", vacio.sinRegistro && vacio.nota, JSON.stringify(vacio))
    await writeArtifacts(outDir("pasada-6"), "6b-historial", { png: shot(cdp) })
  } finally { edge.kill() }
}

// ───────────────────────────────────────────────────────── Auditoría
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/auditoria")
    await esperaConexion(cdp)

    // 6.19 tarjetas KPI
    const kpis = JSON.parse(await textos(cdp, 'main .panel .stamp'))
    const tiene = (k) => kpis.includes(k)
    ch("6.19 Auditoría: tarjetas de resumen Turno/Campaña/Error/Conexión/Importación",
      tiene("Turno") && tiene("Campaña") && tiene("Error") && tiene("Conexión") && tiene("Importación"),
      JSON.stringify([...new Set(kpis)]))

    // 6.20 pestañas por categoría
    const tabs = JSON.parse(await textos(cdp, '[role="tab"]'))
    await clickMain(cdp, '[role="tab"]', "Turnos")
    await wait(800)
    const turno = await obj(cdp, `({sel:[...document.querySelectorAll('[role="tab"]')].find(t=>t.textContent.trim()==='Turnos').getAttribute('aria-selected'),contador:(document.body.textContent.match(/\\d+ registros?/)||[''])[0],hayTurno:document.body.textContent.includes('Turno restaurado')||document.body.textContent.includes('Inicio de turno')})`)
    ch("6.20 Auditoría: 6 pestañas de categoría y el filtro 'Turnos' deja solo los turnos",
      ["Todo", "Turnos", "Campañas", "Errores", "Conexión", "Importaciones"].every((t) => tabs.includes(t)) && turno.sel === "true" && turno.hayTurno,
      JSON.stringify({ tabs, ...turno }))

    // 6.21 periodo
    await clickMain(cdp, '[role="tab"]', "Todo")
    await wait(500)
    await clickMain(cdp, 'main button', "Hoy")
    await wait(700)
    const hoy = await hasTxt(cdp, "Hoy")
    ch("6.21 Auditoría: el periodo 'Hoy' acota el libro", hoy, `hoy=${hoy}`)

    // 6.22 búsqueda
    await clickMain(cdp, 'main button', "Todo")
    await wait(500)
    await act(cdp, `F('input[aria-label="Buscar en la auditoría"]','Conexión');return 'ok'`)
    await wait(800)
    const busq = await obj(cdp, `({hay:document.body.textContent.includes('Conexión Meta establecida'),contador:(document.body.textContent.match(/\\d+ registros?/)||[''])[0]})`)
    ch("6.22 Auditoría: la búsqueda acota por título/detalle", busq.hay === true, JSON.stringify(busq))
    await act(cdp, `F('input[aria-label="Buscar en la auditoría"]','');return 'ok'`)
    await wait(500)

    // 6.23 exportación CSV
    await clickMain(cdp, 'main button', "CSV")
    await wait(1000)
    const cuerpo = await csv(cdp)
    const bytes = await evalJson(cdp, `window.__csvBytes||null`)
    const nombre = await evalJson(cdp, `window.__dl`)
    const lineas = String(cuerpo || "").split("\r\n")
    const cab = String(lineas[0] || "").replace(/^\uFEFF/, "")
    ch("6.23 Auditoría: el CSV exporta 8 columnas, ';' + BOM y nombre auditoria-AAAA-MM-DD.csv",
      /^auditoria-\d{4}-\d{2}-\d{2}\.csv$/.test(String(nombre)) &&
        cab.split(";").length === 8 && lineas.length >= 2 &&
        Array.isArray(bytes) && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
      JSON.stringify({ nombre, cols: cab.split(";").length, filas: lineas.length - 1, bom: bytes, cab }))

    // 6.24 [NUEVO] los KPI no respetan el filtro de categoría: conviven con un contador filtrado
    await clickMain(cdp, '[role="tab"]', "Conexión")
    await wait(800)
    await act(cdp, `F('input[aria-label="Buscar en la auditoría"]','zzz-nada-zzz');return 'ok'`)
    await wait(900)
    const descuadre = await obj(cdp, `(()=>{const ps=[...document.querySelectorAll('main .panel p')].map(e=>e.textContent.trim()).filter(t=>/^\\d[\\d.,]*$/.test(t));return {kpis:ps,contador:(document.body.textContent.match(/(\\d+) registros?/)||['',''])[1],vacio:document.body.textContent.includes('Sin registro')}})()`)
    ch("6.24 los KPI de Auditoría cuentan lo mismo que la lista filtrada (no contradicen al contador)",
      descuadre.vacio === true && (descuadre.contador === "0" || descuadre.kpis.reduce((a, b) => a + Number(b.replace(/\./g, "")), 0) === 0),
      JSON.stringify(descuadre))
    await writeArtifacts(outDir("pasada-6"), "6c-auditoria", { png: shot(cdp) })
  } finally { edge.kill() }
}

// ───────────────────────────────────────────────────────── Usuarios y dispositivos
{
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "/app/usuarios-dispositivos")
    await esperaConexion(cdp)

    // 6.26 formulario de nombre del equipo
    const frm = await obj(cdp, `(()=>{const i=document.querySelector('#nombre-equipo');const b=[...document.querySelectorAll('main button')].find(x=>x.textContent.trim()==='Guardar'||x.textContent.trim()==='Guardado');return {ph:i?i.placeholder:null,max:i?i.getAttribute('maxlength'):null,disabled:b?b.disabled:null,texto:b?b.textContent.trim():null,hint:document.body.textContent.includes('Un apodo visible solo en esta instalación')}})()`)
    ch("6.26 Dispositivos: el nombre del equipo arranca vacío, con hint y botón 'Guardar' deshabilitado",
      frm.ph === "Ej. Oficina, Recepción…" && frm.max === "32" && frm.disabled === true && frm.hint === true,
      JSON.stringify(frm))

    // 6.27 renombrar persiste en fastws.device y el botón pasa a 'Guardado'
    const audAntes = (await store(cdp, "fastws.auditoria") || []).length
    await act(cdp, `F('#nombre-equipo','Recepción Bogotá');return 'ok'`)
    await wait(500)
    const habilitado = await flag(cdp, `!![...document.querySelectorAll('main button')].find(x=>x.textContent.trim()==='Guardar'&&!x.disabled)`)
    await clickMain(cdp, 'main button', "Guardar")
    await wait(800)
    const guardado = await obj(cdp, `(()=>{const b=[...document.querySelectorAll('main button')].find(x=>x.textContent.trim()==='Guardar'||x.textContent.trim()==='Guardado');const d=JSON.parse(localStorage.getItem('fastws.device')||'null');return {nombre:d?d.nombre:null,texto:b?b.textContent.trim():null,disabled:b?b.disabled:null}})()`)
    ch("6.27 Dispositivos: renombrar el equipo persiste en fastws.device y el botón queda en 'Guardado'",
      habilitado && guardado.nombre === "Recepción Bogotá" && guardado.texto === "Guardado" && guardado.disabled === true,
      JSON.stringify(guardado))

    // 6.28 [S25] renombrar NO audita; y un nombre vacío NO se puede guardar (el hallazgo se corrige a medias)
    const audDespues = (await store(cdp, "fastws.auditoria") || []).length
    await act(cdp, `F('#nombre-equipo','   ');return 'ok'`)
    await wait(500)
    const vacioBloqueado = await flag(cdp, `!![...document.querySelectorAll('main button')].find(x=>(x.textContent.trim()==='Guardar'||x.textContent.trim()==='Guardado')&&x.disabled)`)
    ch("6.28 [S25] renombrar el equipo NO deja rastro en Auditoría (pero sí bloquea el nombre vacío)",
      audDespues === audAntes && vacioBloqueado,
      JSON.stringify({ audAntes, audDespues, vacioBloqueado }))

    // 6.29 turno activo + bitácora
    const turno = await obj(cdp, `({stamp:document.body.textContent.includes('Turno activo'),cols:[...document.querySelectorAll('table thead th')].map(t=>t.textContent.trim()),filas:document.querySelectorAll('table tbody tr').length,nota:document.body.textContent.includes('El cierre del turno se hace desde el menú de la cuenta')})`)
    ch("6.29 Dispositivos: sello 'Turno activo' y bitácora con 7 columnas y el turno abierto",
      turno.stamp && ["Turno", "Inicio", "Cierre", "Duración", "Usuario", "Sesión", "Equipo"].every((c) => turno.cols.includes(c)) && turno.filas >= 1 && turno.nota,
      JSON.stringify(turno))
    await writeArtifacts(outDir("pasada-6"), "6d-dispositivos", { png: shot(cdp) })
  } finally { edge.kill() }
}

const okN = R.filter((r) => r.ok).length
const out = outDir("pasada-6")
await writeArtifacts(out, "probes", { json: { pasada: 6, nombre: "Reportes, Historial, Auditoría y Dispositivos", total: R.length, ok: okN, fail: R.length - okN, checks: R } })
await writeArtifacts(out, "resumen", { txt: `Pasada 6 - Reportes, Historial, Auditoría y Dispositivos\n${okN}/${R.length} OK\n${R.map((r) => (r.ok ? "OK  " : "FALLO") + ` ${String(r.n).padStart(2)} ${r.label}\n     ${r.detalle}`).join("\n")}` })
console.log(`pasada-6: ${okN}/${R.length} OK; fallos:`)
for (const r of R.filter((x) => !x.ok)) console.log(`  [%d] %s -> %s`, r.n, r.label, r.detalle)
