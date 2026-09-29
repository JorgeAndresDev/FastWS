/**
 * Captura de tema claro/oscuro. Herramienta de inspección visual, no un check:
 * el simulacro no sabe de temas, así que el modo claro necesita ojo humano.
 *
 *   node tools/tema-captura.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs"

import {
  BASE,
  fetchStubSrc,
  navigate,
  outDir,
  seedExpr,
  shot,
  spawnEdge,
  wait,
  waitFor,
  locVal,
} from "./simulacro/sim-base.mjs"

const dir = outDir("tema")
mkdirSync(dir, { recursive: true })

async function main() {
  const { cdp, edge } = await spawnEdge()
  try {
    await cdp.send("Page.enable", {})
    await cdp.send("Runtime.enable", {})
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "https://graph.facebook.com/*" }] })
    const stub = fetchStubSrc()
    cdp.on("Fetch.requestPaused", async (ev) => {
      if (ev.request.url.includes("graph.facebook.com")) {
        await cdp.send("Fetch.fulfillRequest", {
          requestId: ev.requestId,
          responseCode: 200,
          responseHeaders: [{ name: "content-type", value: "application/json" }],
          body: Buffer.from(stub, "utf8").toString("base64"),
        })
      } else {
        await cdp.send("Fetch.continueRequest", { requestId: ev.requestId })
      }
    })

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: seedExpr("conectado") })
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(locVal(cdp, "location.origin"), "http://localhost:5173", 20000)
    await wait(1200)

    // Sesión recordada, para entrar directo a la app.
    await cdp.send("Runtime.evaluate", {
      expression: `localStorage.setItem("fastws.session", JSON.stringify({name:"Administrador",email:"admin@fastws.local",role:"Operativo"}));`,
    })
    await cdp.send("Page.navigate", { url: `${BASE}/app` })
    await waitFor(locVal(cdp, "location.pathname"), "/app", 20000)
    await wait(1500)

    const rutas = [
      ["dashboard", "/app"],
      ["clientes", "/app/clientes"],
      ["reportes", "/app/reportes"],
      ["configuracion", "/app/configuracion"],
      ["login", "/login"],
    ]

    for (const modo of ["oscuro", "claro"]) {
      await cdp.send("Runtime.evaluate", {
        expression: `localStorage.setItem("fastws.tema", JSON.stringify(${JSON.stringify(modo)}));`,
      })
      for (const [nombre, ruta] of rutas) {
        await navigate(cdp, ruta)
        await wait(1200)
        const png = await shot(cdp)
        writeFileSync(`${dir}/${modo}-${nombre}.png`, Buffer.from(png, "base64"))
        const leer = async (expr) =>
          (await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value
        console.log(
          `${modo}/${nombre}: data-theme=${await leer("document.documentElement.dataset.theme || '(nada)'")}` +
            ` body=${await leer("getComputedStyle(document.body).backgroundColor")}` +
            ` texto=${await leer("getComputedStyle(document.body).color")}`
        )
      }
    }
    console.log("capturas en", dir)
  } finally {
    await cdp.send("Browser.close", {}).catch(() => {})
    edge.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
