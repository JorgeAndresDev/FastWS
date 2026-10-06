import {
  BASE, PROFILE, spawnEdge, seedExpr, fetchStubSrc, outDir, writeArtifacts,
  bodyText, evalJson, dumpExpr, wait, locVal, waitFor, shot,
} from "./sim-base.mjs"
import fs from "node:fs"

fs.rmSync(PROFILE, { recursive: true, force: true })

const { cdp, edge } = await spawnEdge()
const dir = outDir("pasada-0")

const results = {}

try {
  await cdp.send("Page.navigate", { url: BASE })
  const okBase = await waitFor(locVal(cdp, "location.origin"), "http://localhost:5173", 20000)
  results.devServer = okBase

  const clean = JSON.parse(await evalJson(cdp, "JSON.stringify({ ls: Object.keys(localStorage).length, ss: sessionStorage.length, href: location.href })"))
  results.perfilLimpio = clean && clean.ls === 0 && clean.ss === 0
  await writeArtifacts(dir, "dev-server", { json: { ok: okBase, probe: clean } })

const seeded = await evalJson(cdp, seedExpr("conectado"))
  // S10: la sesion de conexion va a sessionStorage, asi que se cuentan ambos almacenes.
  // Con el token en la guarda de secretos (0.1) son 12: 10 en localStorage +
  // `fastws.conexion.meta` en la base + `fastws.meta-token` en sessionStorage.
  const seedCount = await evalJson(cdp, `Object.keys(localStorage).filter(k => k.startsWith('fastws.')).length + Object.keys(sessionStorage).filter(k => k.startsWith('fastws.')).length`)
  results.seed11 = seedCount === 12 && seeded.startsWith("seeded:")
  await writeArtifacts(dir, "seed-conectado", { json: { seedResponse: seeded, fastwsKeys: seedCount } })

  const baseline = await evalJson(cdp, dumpExpr())
  await writeArtifacts(dir, "baseline-11-claves", { dump: baseline })

  await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })

  await cdp.send("Page.navigate", { url: BASE + "/app" })
  await waitFor(locVal(cdp, "location.pathname"), "/app", 15000)
  await wait(1800)

  const stubCheck = await evalJson(cdp, `(async () => {
    const out = {};
    out.replaced = typeof window.__stubActive === "boolean" ? window.__stubActive : false;
    try {
      const r1 = await fetch("https://graph.facebook.com/v21.0/9876543210/message_templates?limit=50", { headers: {} });
      const j1 = await r1.json();
      out.templates = j1.data ? j1.data.length : -1;
      const r2 = await fetch("https://graph.facebook.com/v21.0/1234567890/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const j2 = await r2.json();
      out.sendWamid = (j2.messages && j2.messages[0]) ? j2.messages[0].id.slice(0, 14) : "-";
      window.__SIM = { mode: "rate" };
      const r3 = await fetch("https://graph.facebook.com/v21.0/1234567890/messages", { method: "POST", body: "{}" });
      out.rateCode = (await r3.json()).error.code;
      delete window.__SIM;
    } catch (e) { out.err = String(e); }
    return JSON.stringify(out);
  })()`,)
  const stub = JSON.parse(stubCheck)
  results.stubTemplates = stub.templates === 3
  results.stubSend = typeof stub.sendWamid === "string" && stub.sendWamid.startsWith("wamid")
  results.stubRate = stub.rateCode === 130429
  await writeArtifacts(dir, "fetch-stub", { json: stub })

  const appProbe = await evalJson(cdp, `JSON.stringify({
    url: location.pathname,
    pill: (document.body.innerText.match(/Listo para despacho|Modo local[^\\n]*/) || [null])[0],
    sesionActiva: document.body.innerText.includes("Administrador"),
  })`)
  const app = JSON.parse(appProbe)
  results.appConSeed = app.url === "/app" && !!app.pill && app.sesionActiva
  await writeArtifacts(dir, "app-con-seed", {
    json: app,
    txt: await bodyText(cdp),
    png: await shot(cdp),
  })

  const line = [
    `pasada-0: dev=${results.devServer} limpio=${results.perfilLimpio} seed11=${results.seed11}`,
    `stub: templates=${stub.templates} send=${stub.sendWamid || "-"} rate=${stub.rateCode} appConSeed=${results.appConSeed}`,
  ]
  for (const l of line) console.log(l)
  fs.writeFileSync(`${dir}\\resultado.json`, JSON.stringify(results, null, 2))
} finally {
  edge.kill()
}