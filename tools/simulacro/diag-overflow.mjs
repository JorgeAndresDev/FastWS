/**
 * Mide el desborde horizontal real de las tablas con scroll en varias rutas y
 * anchos de ventana. Es la forma de comprobar el aviso del operador (la barra
 * lateral de unos píxeles) sin fiarse del CSS: se mide `scrollWidth` contra
 * `clientWidth` del contenedor que puede pintar la barra.
 *
 *   node tools/simulacro/diag-overflow.mjs
 */
import { spawnEdge, fetchStubSrc, evalJson, waitFor, wait, outDir, writeArtifacts, BASE, iso } from "./sim-base.mjs"

const RUTAS = [
  { ruta: "/app/plantillas", ancho: 1440 },
  { ruta: "/app/plantillas", ancho: 1150 },
  { ruta: "/app/clientes", ancho: 1440 },
  { ruta: "/app/clientes", ancho: 1150 },
  { ruta: "/app/campanas", ancho: 1440 },
  { ruta: "/app/mensajes", ancho: 1440 },
  { ruta: "/app/dispositivos", ancho: 1440 },
  { ruta: "/app/segmentos", ancho: 1440 },
  { ruta: "/app/reportes", ancho: 1440 },
]

function seed() {
  const ahora = iso(10)
  const clientes = Array.from({ length: 40 }, (_, i) => ({
    id: `cl-${i}`,
    code: `C-${1000 + i}`,
    name: `Cliente de Prueba Numero ${i} Con Nombre Largo`,
    phone: `30012340${(10 + i).toString()}`,
    phones: [`30012340${(10 + i).toString()}`],
    company: `Empresa Industrial del Norte S.A.S. ${i}`,
    city: "Manizales",
    zone: "Norte",
    clientType: i % 2 ? "CASHLESS" : "NORMAL",
    status: "activo",
    valid: i % 5 !== 0,
    createdAt: ahora,
  }))
  const lines = [
    `  localStorage.setItem("fastws.clientes", ${JSON.stringify(JSON.stringify(clientes))});`,
    `  localStorage.setItem("fastws.conexion.ids", ${JSON.stringify(
      JSON.stringify({ phoneNumberId: "1234567890", wabaId: "9876543210" })
    )});`,
    `  localStorage.setItem("fastws.conexion.meta", ${JSON.stringify(
      JSON.stringify({ metaPhone: "573100000000", wabaName: "FastWS WABA", verifiedAt: ahora })
    )});`,
    `  sessionStorage.setItem("fastws.meta-token", "EAAG-sim-token");`,
    `  localStorage.setItem("fastws.session", ${JSON.stringify(
      JSON.stringify({ name: "Administrador", email: "admin@fastws.local", role: "Operativo" })
    )});`,
    `  localStorage.setItem("fastws.sesiones", "[]");`,
    `  localStorage.setItem("fastws.campanas", "[]");`,
    `  localStorage.setItem("fastws.conversaciones", ${JSON.stringify(
      JSON.stringify({ threads: [], merged: {} })
    )});`,
    `  localStorage.setItem("fastws.auditoria", "[]");`,
    `  return "ok";`,
  ]
  return `(() => {
    Object.keys(localStorage).filter(k=>k.startsWith('fastws.')).forEach(k=>localStorage.removeItem(k));
${lines.join("\n")}
  })()`
}

const MEDIR = `JSON.stringify((()=>{
  const cajas=[...document.querySelectorAll('main *')].filter(el=>{
    const cs=getComputedStyle(el);
    return el.scrollWidth - el.clientWidth > 1 && (cs.overflowX==='auto'||cs.overflowX==='scroll');
  }).map(el=>({
    overflow: el.scrollWidth - el.clientWidth,
    tag: el.tagName.toLowerCase(),
    clase: (el.className||'').toString().slice(0,60)
  }));
  const tablas=[...document.querySelectorAll('main [role="table"], main table')].map(t=>({
    sw: t.scrollWidth, cw: t.clientWidth
  }));
  return {overflow: cajas, maxOverflow: cajas.reduce((a,c)=>Math.max(a,c.overflow),0), tablas: tablas.length};
})())`

async function main() {
  const { cdp, edge } = await spawnEdge()
  const lineas = []
  try {
    await cdp.send("Page.enable", {})
    await cdp.send("Runtime.enable", {})
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: seed() })

    for (const { ruta, ancho } of RUTAS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: ancho,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      })
      await cdp.send("Page.navigate", { url: BASE + ruta })
      await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
      await wait(1600)
      const r = JSON.parse((await evalJson(cdp, MEDIR)) || "{}")
      const ok = (r.maxOverflow ?? 0) <= 1
      lineas.push(
        `${ok ? "OK   " : "FALLO"} ${ruta.padEnd(20)} ${String(ancho).padStart(5)}px  overflow=${r.maxOverflow ?? "?"}  tablas=${r.tablas ?? 0}`
      )
      if (!ok) {
        for (const c of r.overflow) lineas.push(`        ${c.overflow}px  ${c.tag}.${c.clase}`)
      }
    }
    console.log(lineas.join("\n"))
    const fallos = lineas.filter((l) => l.startsWith("FALLO")).length
    console.log(`\n${fallos === 0 ? "sin desbordes" : `${fallos} rutas con desborde`}`)
    await writeArtifacts(outDir("diag-overflow"), "resumen", { txt: lineas.join("\n") })
    process.exitCode = fallos === 0 ? 0 : 1
  } finally {
    await cdp.send("Browser.close", {}).catch(() => {})
    edge.kill()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})