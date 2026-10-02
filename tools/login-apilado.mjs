/**
 * Captura el login en viewport angosto para verificar el apilado (<900px).
 *   node tools\login-apilado.mjs
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

const dir = outDir("login-apilado")
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

    // 800px de ancho: por debajo del corte de 56rem (896px), debe apilarse.
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })

    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: seedExpr("conectado") })
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(locVal(cdp, "location.origin"), "http://localhost:5173", 20000)
    await wait(1200)
    await cdp.send("Runtime.evaluate", {
      expression: `localStorage.setItem("fastws.session", JSON.stringify({name:"Administrador",email:"admin@fastws.local",role:"Operativo"}));`,
    })
    await cdp.send("Page.navigate", { url: `${BASE}/login` })
    await waitFor(locVal(cdp, "location.pathname"), "/login", 20000)
    await wait(1500)

    const gridCols = await cdp.send("Runtime.evaluate", {
      expression: `getComputedStyle(document.querySelector('.auth-grid')).gridTemplateColumns`,
      returnByValue: true,
    })
    console.log("gridTemplateColumns a 800px:", gridCols.result.value)

    const png = await shot(cdp)
    writeFileSync(`${dir}/login-800.png`, Buffer.from(png, "base64"))
    console.log("captura en", dir)
  } finally {
    await cdp.send("Browser.close", {}).catch(() => {})
    edge.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
