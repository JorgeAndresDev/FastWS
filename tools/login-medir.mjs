/**
 * Mide las posiciones reales de la marca y la tarjeta en el login.
 *   node tools\login-medir.mjs
 */
import { mkdirSync } from "node:fs"

import {
  BASE,
  fetchStubSrc,
  locVal,
  outDir,
  seedExpr,
  spawnEdge,
  wait,
  waitFor,
} from "./simulacro/sim-base.mjs"

const dir = outDir("login-medir")
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

    const medir = async (sel) =>
      (
        await cdp.send("Runtime.evaluate", {
          expression: `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return JSON.stringify({x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), cx: Math.round(r.x + r.width/2)}); })()`,
          returnByValue: true,
        })
      ).result.value

    const vw = (
      await cdp.send("Runtime.evaluate", {
        expression: "JSON.stringify({vw: window.innerWidth})",
        returnByValue: true,
      })
    ).result.value

    console.log("viewport:", vw)
    console.log("grid:   ", await medir(".auth-grid"))
    console.log("marca:  ", await medir(".auth-brand"))
    console.log("tarjeta:", await medir(".auth-card"))
  } finally {
    await cdp.send("Browser.close", {}).catch(() => {})
    edge.kill()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
