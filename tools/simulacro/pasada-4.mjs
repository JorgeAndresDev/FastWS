import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnEdge, PROFILE, seedExpr, fetchStubSrc, evalJson, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE } from "./sim-base.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const J = JSON.stringify

async function wipeProfile() {
  for (let i = 0; i < 10; i++) {
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); return } catch { await wait(400) }
  }
  throw new Error("No se pudo limpiar el perfil")
}

const F = `const F=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));return true};const SEL=(s,v)=>{const el=document.querySelector(s);if(!el)return false;const p=el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,'value').set.call(el,v);el.dispatchEvent(new Event('change',{bubbles:true}));return true};const C=(s)=>{const el=document.querySelector(s);if(!el)return false;el.click();return true};const MB=(t)=>{const b=[...document.querySelectorAll('main button,main a')].find(x=>(x.textContent||'').trim()==t);if(!b)return false;b.click();return true};const D=(t)=>{const b=[...document.querySelectorAll('button,a')].find(x=>(x.textContent||'').trim()==t||(x.textContent||'').trim().startsWith(t));if(!b)return false;b.click();return true};const ROW=(n)=>{const tr=[...document.querySelectorAll('tbody tr')].find(x=>x.innerText.includes(n));return tr?tr:null};const SETFILE=(b64,name,mime)=>{const bin=atob(b64);const u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const f=new File([u8],name,{type:mime});const dt=new DataTransfer();dt.items.add(f);const inp=document.querySelector('input[type=file]');if(!inp)return false;Object.defineProperty(inp,'files',{value:dt.files,configurable:true});inp.dispatchEvent(new Event('change',{bubbles:true}));return true};`
const act = (cdp, body) => evalJson(cdp, `(async()=>{${F}${body}})()`)
const waitSel = (cdp, sel, ms = 8000) => waitFor(async () => !!(await evalJson(cdp, `!!document.querySelector(${JSON.stringify(sel)})`)), true, ms)
const hasBody = (cdp, text) => evalJson(cdp, `document.body.innerText.includes(${J(text)})`)
const store = (cdp, k) => evalJson(cdp, `JSON.parse(localStorage.getItem(${J(k)})||'null')`)
const rowsByText = (cdp, needle) => evalJson(cdp, `JSON.stringify([...document.querySelectorAll('[role="table"] [role="row"]')].filter(r=>r.innerText.includes(${J(needle)})).length)`)
const clickMain = async (cdp, t) => {
  const v = await act(cdp, `return JSON.stringify((()=>{const b=[...document.querySelectorAll('main button')].find(x=>(x.textContent||'').trim()===${J(t)});if(!b)return null;b.click();return 'ok'})())`)
  return v && v[0] === '"' ? JSON.parse(v) : v
}

const R_ = []
let n = 0
const ch = (label, ok, detalle) => { R_.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

async function boot(cdp, seed = "conectado", route = "/app") {
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
  await cdp.send("Page.navigate", { url: BASE })
  await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
  await evalJson(cdp, seedExpr(seed))
  await navigate(cdp, route)
  await waitSel(cdp, "header")
}

const reseed = async (cdp, key, value) => {
  await evalJson(cdp, `localStorage.setItem(${J(key)},JSON.stringify(${J(value)}));'ok'`)
  await cdp.send("Page.reload", { ignoreCache: true })
  await waitSel(cdp, "header")
  await wait(800)
}

const setFile = async (cdp, name) => {
  const b64 = fs.readFileSync(path.join(__dirname, "fixtures", name)).toString("base64")
  const mime = /\.xlsx?$/i.test(name) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv"
  await act(cdp, `SETFILE(${J(b64)},${J(name)},${J(mime)});return 'ok'`)
  await wait(1600)
}

const CLIENTES10 = [
  { id: "c1", code: "C-1", name: "Cafe La Roca", phone: "3001234001", phones: ["3001234001"], company: "La Roca", city: "Manizales", zone: "Norte", clientType: "NORMAL", status: "activo", valid: true, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { id: "c2", code: "C-2", name: "Mini Mercado Villa", phone: "3021234002", phones: ["3021234002"], company: "Villa", city: "Dosquebradas", zone: "Centro", clientType: "CASHLESS", status: "activo", valid: true, createdAt: new Date(Date.now() - 86400000 * 40).toISOString() },
  { id: "c3", code: "C-3", name: "Heladeria Polo", phone: "3201234003", phones: ["3201234003"], company: "Polo", city: "Armenia", zone: "Sur", clientType: "NORMAL", status: "activo", valid: true, createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: "c4", code: "C-4", name: "Ferreteria Andina", phone: "3131234004", phones: ["3131234004"], company: "Andina", city: "Manizales", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "c5", code: "C-5", name: "Sin telefono", phone: "000", phones: ["000"], company: "-", city: "", zone: "", clientType: "NORMAL", status: "inactivo", valid: false, createdAt: new Date().toISOString() },
]

// ---------------------------------------------------------------- P4A: clientes read-only + vacio
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/clientes")
    await reseed(cdp, "fastws.clientes", CLIENTES10)

    const rows = Number(await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('[role="table"] [role="row"]')].length)`))
    const ctrl = Number(await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('[role="table"] button,[role="table"] a')].filter(x=>x.offsetParent!==null).length)`))
    ch("4.1 cliente: tabla virtualizada (1 encabezado + 5 filas) con Editar/Eliminar por fila", rows === 6 && ctrl === 10, `rows=${rows} controles=${ctrl}`)

    // 4.1b alta de cliente: formulario 'Nuevo cliente' persiste, audita y muestra la fila
    await clickMain(cdp, "Nuevo cliente")
    await waitSel(cdp, "#cliente-codigo")
    await act(cdp, `F('#cliente-codigo','C-6');F('#cliente-nombre','Bodega Sur');F('#cliente-telefono','3001234006');return 'ok'`)
    await clickMain(cdp, "Registrar cliente")
    await wait(900)
    const cliNuevo = JSON.parse(await evalJson(cdp, `JSON.stringify((JSON.parse(localStorage.getItem('fastws.clientes')||'[]').find(c=>c.code==='C-6'))||null)`))
    const audNuevo = await evalJson(cdp, `(JSON.parse(localStorage.getItem('fastws.auditoria')||'[]').map(a=>a.titulo))[0]||''`)
    const rowNuevo = Number(await rowsByText(cdp, "Bodega Sur"))
    ch("4.1b alta de cliente: Registro persiste (C-6 Bodega Sur), audita 'Cliente registrado' y muestra la fila",
      Boolean(cliNuevo && cliNuevo.name === "Bodega Sur" && cliNuevo.phone === "3001234006") && audNuevo === "Cliente registrado" && rowNuevo === 1,
      JSON.stringify({ cliente: cliNuevo && { name: cliNuevo.name, phone: cliNuevo.phone, code: cliNuevo.code }, audTop: audNuevo, filas: rowNuevo }))

    await reseed(cdp, "fastws.clientes", [])
    const rowsV = Number(await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('[role="table"] [role="row"]')].length)`))
    const vacio = await hasBody(cdp, "Sin clientes") || await hasBody(cdp, "No hay clientes")
    ch("4.2 cliente vacio: estado 'Sin clientes' y tabla sin filas", rowsV <= 1 && vacio, `rows=${rowsV} estadoVacio=${vacio}`)
    const png4a = await shot(cdp)
    await writeArtifacts(outDir("pasada-4"), "4a-vacio", { png: png4a })
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P4B: importacion CSV + XLSX
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/importacion")
    await reseed(cdp, "fastws.clientes", [])

    // 4.3 CSV valido (panel-based, no toasts)
    await setFile(cdp, "ok.csv")
    const p1 = JSON.parse(await evalJson(cdp, `JSON.stringify({titulo:document.body.innerText.toLowerCase().includes(${J("2 \u00b7 validaci\u00f3n (un cliente por c\u00f3digo)")}),filas:document.body.innerText.includes("5 filas"),validas:document.body.innerText.includes("4 v\u00e1lidas"),duplicadas:document.body.innerText.includes("0 duplicadas")})`))
    ch("4.3 CSV valido leido: paso 2 con conteos", p1.titulo && p1.filas && p1.validas && p1.duplicadas, JSON.stringify(p1))

    // 4.10 sin boton descartar
    const btns = await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('main button,main a')].map(x=>(x.textContent||'').trim()).filter(t=>/Descartar|Cancelar importaci/.test(t)))`)
    ch("4.10 sin boton Descartar/Cancelar importacion", JSON.parse(btns).length === 0, `match=${btns}`)

    // 4.7 doble codigo
    await setFile(cdp, "doble_codigo.csv")
    const p2 = JSON.parse(await evalJson(cdp, `JSON.stringify({filas:document.body.innerText.includes("1 filas"),validas:document.body.innerText.includes("1 v\u00e1lidas"),duplicadas:document.body.innerText.includes("0 duplicadas")})`))
    const ddRows = Number(await rowsByText(cdp, "DD-5001"))
    const ddName = await act(cdp, `return (()=>{const r=[...document.querySelectorAll('[role="table"] [role="row"]')].find(x=>x.innerText.includes('DD-5001'));return r?r.innerText.split(String.fromCharCode(10))[0]:''})()`)
    const conflict = await hasBody(cdp, "conflicto")
    ch("4.7 doble codigo: 1 fila, gana el primero, sin conflicto", p2.filas && p2.validas && ddRows === 1 && ddName.startsWith("Primer Duplicado") && !conflict, `p2=${JSON.stringify(p2)} rows=${ddRows} name=${JSON.stringify(ddName)}`)

    // 4.8 fijo en telefono + moviles en extras: toma el movil de extras
    await setFile(cdp, "fijo_movil.csv")
    const valRow = await act(cdp, `return JSON.stringify([...document.querySelectorAll('[role="table"] [role="row"]')].filter(r=>r.innerText.includes('FM-6001')).map(r=>({t:r.innerText,ok:r.innerText.includes('V\u00e1lido')})))`)
    const telMovil = await hasBody(cdp, "3112223344")
    ch("4.8 fijo en telefono + moviles en extras: valido con el movil 3112223344", valRow.includes('"ok":true') && telMovil, valRow)

    // 4.9 archivo sin columnas Codigo/Nombre
    await setFile(cdp, "sin_columnas.csv")
    const t3 = await evalJson(cdp, `JSON.stringify([...document.querySelectorAll('[data-sileo-toast]')].map(t=>(t.querySelector('[data-sileo-title]')?.textContent||'').trim()+' :: '+(t.querySelector('[data-sileo-description]')?.textContent||'').trim()))`)
    const errMsg = String(t3).includes("No se pudo leer el archivo") && String(t3).includes("Falta la columna obligatoria")
    const paso2v = await hasBody(cdp, "2 \u00b7 Validaci")
    ch("4.9 archivo sin Codigo/Nombre: error claro, sin paso 2", errMsg && !paso2v, String(t3))

    // volver a ok.csv e importar (necesario para 4.5/4.6)
    await setFile(cdp, "ok.csv")
    const click1 = await clickMain(cdp, "Importar 4 clientes")
    await wait(1500)
    const cli = await store(cdp, "fastws.clientes")
    const cliOk = Array.isArray(cli) && cli.length === 4 && ["NA-1001", "NA-1002", "NA-1003", "NA-1004"].every(c => cli.some(x => x.code === c))
    ch("4.3c confirmar importa: 4 nuevos (invalido fuera)", click1 === "ok" && cliOk, `click=${click1} n=${cli?.length} codes=${JSON.stringify(cli?.map(c => c.code))}`)

    // 4.11 auditoria
    const aud = await store(cdp, "fastws.auditoria")
    const ult = aud && aud.length ? aud[aud.length - 1] : null
    ch("4.11 auditoria: entrada Clientes importados en el registro", ult && ult.titulo === "Clientes importados" && String(ult.detalle).includes("4 nuevos"), JSON.stringify({ ultimo: ult && { titulo: ult.titulo, detalle: ult.detalle, entidad: ult.entidad } }))

    // 4.5 + 4.6 reimportar 100% duplicado
    await setFile(cdp, "reimporta.csv")
    const razonUpd = Number(await rowsByText(cdp, "c\u00f3digo ya registrado (se actualizar\u00e1)"))
    const paso3v = await evalJson(cdp, `document.body.innerText.toLowerCase().includes('3 \u00b7 resumen y confirmaci\u00f3n')`)
    const pasoSix = await hasBody(cdp, "Importar 4 clientes")
    ch("4.5 duplicado: razon 'se actualizara' en la fila", razonUpd >= 4, `razonCount=${razonUpd}`)
    ch("4.6 reimportar sin validos: paso 3 visible y ofrece 'Importar 4 clientes'", paso3v && pasoSix, `paso3=${paso3v} boton=${pasoSix}`)

    // 4.4 encabezados pedido/en-ruta/telefonos en hoja generica: se descartan
    await setFile(cdp, "extras.csv")
    const click2 = await clickMain(cdp, "Importar 1 clientes")
    await wait(1400)
    const cliE = await store(cdp, "fastws.clientes")
    const EA = cliE ? cliE.find(c => c.code === "EA-7001") : null
    const eaOk = EA && EA.orderState === "CANCELADO" && EA.enRuta === true && (EA.phones || []).length === 1
    ch("4.4 pedido/en-ruta/telefonos mapeados en CSV generico", click2 === "ok" && Boolean(eaOk), JSON.stringify({ click: click2, EA: EA && { orderState: EA.orderState, enRuta: EA.enRuta, phones: EA.phones } }))

    // 4.12 XLSX multipagina + merge
    await setFile(cdp, "madre.xlsx")
    const pX = JSON.parse(await evalJson(cdp, `JSON.stringify({validas:document.body.innerText.includes("3 v\u00e1lidas"),filas:document.body.innerText.includes("3 filas")})`))
    const click3 = await clickMain(cdp, "Importar 3 clientes")
    await wait(1400)
    const cliX = await store(cdp, "fastws.clientes")
    const ZZ = cliX ? cliX.find(c => c.code === "ZZ-9001") : null
    const EXok = cliX?.some(c => c.code === "EX-1001") && cliX?.some(c => c.code === "EX-1002")
    ch("4.12a XLSX multipagina: parsea hojas, aplica CANCELADO + moviles extra", pX.validas && click3 === "ok" && EXok && ZZ && ZZ.orderState === "CANCELADO" && (ZZ.phones || []).length === 2, JSON.stringify({ ZZ: ZZ && { orderState: ZZ.orderState, phones: ZZ.phones, enRuta: ZZ.enRuta }, click: click3 }))

    await setFile(cdp, "zz-reimport.csv")
    const click4 = await clickMain(cdp, "Importar 2 clientes")
    await wait(1400)
    const cliZ2 = await store(cdp, "fastws.clientes")
    const ZZ2 = cliZ2 ? cliZ2.find(c => c.code === "ZZ-9001") : null
    const zCleared = ZZ2 && (ZZ2.orderState === undefined || ZZ2.orderState === null) && ZZ2.enRuta === undefined
    ch("4.12b reimportar generico sobre ZZ-9001: merge limpia el pedido (sin zombi)", Boolean(zCleared), JSON.stringify({ click: click4, orderState: ZZ2 && ZZ2.orderState, enRuta: ZZ2 && ZZ2.enRuta }))
    const png4b = await shot(cdp)
    await writeArtifacts(outDir("pasada-4"), "4b-import", { png: png4b })
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- P4C: segmentos
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await boot(cdp, "conectado", "/app/segmentos")
    const mas = []
    for (let i = 1; i <= 60; i++) {
      mas.push({ id: `s${i}`, code: `S-${String(i).padStart(3, "0")}`, name: `Cliente #${String(i).padStart(2, "0")}`, phone: `3${String(100000000 + i)}`, phones: [`3${String(100000000 + i)}`], company: "-", city: "Manizales", zone: "Centro", clientType: "NORMAL", status: "activo", valid: true, createdAt: new Date().toISOString() })
    }
    mas.push({ id: "ancia", code: "S-ANCIA", name: "Cliente Ancia 45d", phone: "3012345999", phones: ["3012345999"], company: "-", city: "Pereira", zone: "Sur", clientType: "NORMAL", status: "activo", valid: true, createdAt: new Date(Date.now() - 86400000 * 45).toISOString() })
    await reseed(cdp, "fastws.clientes", mas)

    // 4.13 expandir segmento con >50 miembros (hueco esperado: viewClients sin segmentId siempre []
    const exp = await act(cdp, `return (()=>{const b=[...document.querySelectorAll('tbody tr td button')].find(x=>x.innerText.includes('V\u00e1lidos'));if(!b)return null;b.click();return 'clicked'})()`)
    await wait(700)
    const inner = JSON.parse(await evalJson(cdp, `JSON.stringify({rows:document.querySelectorAll('#seg-validez-validos tbody tr').length, vacio:document.body.innerText.includes('Este segmento no tiene clientes todav\u00eda.'), nota:document.body.innerText.includes('La lista se recorta a 50 filas')})`))
    ch("4.13 expandir 'Validos' (61 miembros) recorta a 50 filas con nota, sin vacio", exp === "clicked" && inner.rows === 50 && inner.nota && !inner.vacio, JSON.stringify({ exp, inner }))

    // evidencia: desplegable 'Válidos' (61) expandido pero vacío
    const png4c = await shot(cdp)
    await writeArtifacts(outDir("pasada-4"), "4c-segmentos-validos-expandido", { png: png4c })

    // 4.14 cliente 45 dias: sin grupo de antiguedad 31-60 (conteos del planilla)
    const age = JSON.parse(await act(cdp, `return JSON.stringify([...document.querySelectorAll('tbody tr td button')].filter(b=>(b.getAttribute('aria-controls')||'').startsWith('seg-antiguedad-')).map(b=>{const tds=b.closest('tr').querySelectorAll('td');return {name:(b.textContent||'').trim().slice(0,22),members:(tds[3]?.textContent||'').trim()}}))`))
    const nue = age.find(a => a.name.includes("Nuevos"))
    const inter = age.find(a => a.name.includes("Intermedios"))
    const rea = age.find(a => a.name.includes("Reactivaci\u00f3n"))
    ch("4.14 antiguedad: cliente 45 d en Intermedios(1), Nuevos(60), Reactivacion(0)", Boolean(nue && rea && inter && nue.members === "60" && rea.members === "0" && inter.members === "1"), JSON.stringify(age))
  } finally { edge.kill() }
}

// ---------------------------------------------------------------- resumen y artefactos
const dir = outDir("pasada-4")
const okN = R_.filter(r => r.ok).length
const txt = R_.map(r => `${r.n.toString().padStart(2, " ")}. ${r.ok ? "OK " : "FAIL"} ${r.label}\n     ${r.detalle}`).join("\n") + `\n---\n${okN}/${R_.length} OK`
await writeArtifacts(dir, "resumen", { txt, json: { total: R_.length, ok: okN, checks: R_ } })
console.log(txt)
console.log("\nArtifacts:", dir)