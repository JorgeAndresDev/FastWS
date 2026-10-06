import fs from "node:fs"
import { spawnEdge, PROFILE, seedExpr, fetchStubSrc, evalJson, waitFor, wait, navigate, shot, outDir, writeArtifacts, BASE } from "./sim-base.mjs"

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
const pill = (cdp) => evalJson(cdp, `[...document.querySelectorAll('[role="status"]')].map(s=>s.innerText.trim()).join(' | ')`)

const R = []
let n = 0
const ch = (label, ok, detalle) => { R.push({ n: ++n, label, ok: Boolean(ok), detalle }) }

const setMode = (cdp, m) => evalJson(cdp, `window.__SIM={mode:'${m}'};'ok'`)

// ---------------------------------------------------------------- P2: conexión Meta
{
  await wipeProfile()
  const { cdp, edge } = await spawnEdge()
  try {
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: fetchStubSrc() })
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `(() => {
        const base = window.fetch;
        window.__graphLog = [];
        window.fetch = function (input, init) {
          const u = String(input);
          if (u.includes("graph.facebook.com")) (window.__graphLog || (window.__graphLog = [])).push(u);
          return base.apply(this, arguments);
        };
      })()`,
    })
    await cdp.send("Page.navigate", { url: BASE })
    await waitFor(async () => (await evalJson(cdp, "location.origin")) === BASE, true, 15000)
    await evalJson(cdp, seedExpr("sinconexion"))
    await navigate(cdp, "/app/conexion")
    await waitSel(cdp, "#conexion-phoneid")
    await wait(500)
    ch("2.0 pagina conexion: estado inicial sin configurar", await hasBody(cdp, "Sin configurar"), "stamp panel 2")
    await writeArtifacts(outDir("pasada-2"), "inicial", { png: shot(cdp) })

    // 2.2 Probar sin token: la validación bloquea y NO escribe ids
    await act(cdp, `D('Probar conexión');await new Promise(r=>setTimeout(r,400));return 'ok'`)
    const v22 = JSON.parse(await act(cdp, `return JSON.stringify({err:(document.querySelector('[data-slot="conexion-token-error"]')||document.querySelector('#conexion-token-error')||{innerText:''}).innerText,ids:localStorage.getItem('fastws.conexion.ids')})`))
    ch("2.2 probar sin token: error inline y no escribe ids",
      v22.err.includes("Pega el token") && v22.ids === null,
      JSON.stringify(v22))

    // 2.1 guardar ids + 2.3 probar sin red + [N2] primer submit falla engañoso
    const audIni = await evalJson(cdp, `localStorage.getItem('fastws.auditoria')`)
    await act(cdp, `F('#conexion-phoneid','1234567890');F('#conexion-wabaid','9998887777');F('#conexion-token','EAAQ_SIMTOKEN');return 'ok'`)
    await wait(400)
    await setMode(cdp, "network")
    // [N2] primer submit: guardarIds + prueba(token, ids) en el mismo submit -> llega a red
    await act(cdp, `D('Probar conexión');await new Promise(r=>setTimeout(r,600));return 'ok'`)
    const vN2 = JSON.parse(await act(cdp, `return JSON.stringify({alert:(document.querySelector('[role="alert"]')||{innerText:''}).innerText,ids:localStorage.getItem('fastws.conexion.ids')})`))
    ch("2.3a [N2] primer submit con campos llenos llega a red y mapea el error real",
      vN2.alert.includes("No hay conexión con Meta") && vN2.ids !== null,
      JSON.stringify({ alert: vN2.alert, ids: vN2.ids !== null }))
    // segundo submit ya con idsRef actualizado: la red falla y se mapea a "No hay conexión con Meta"
    await act(cdp, `D('Probar conexión');await new Promise(r=>setTimeout(r,900));return 'ok'`)
    const v21b = JSON.parse(await act(cdp, `return JSON.stringify({ids:localStorage.getItem('fastws.conexion.ids'),badge:document.body.innerText.includes('Identificadores guardados'),stamp:document.body.innerText.includes('Sin conexión Meta'),alert:(document.querySelector('[role="alert"]')||{innerText:''}).innerText})`))
    ch("2.1 guardar ids via Probar: ids persistidos + badge",
      v21b.ids !== null && JSON.parse(v21b.ids).phoneNumberId === "1234567890" && v21b.badge,
      JSON.stringify({ ids: v21b.ids, badge: v21b.badge }))
    const audFin = await evalJson(cdp, `localStorage.getItem('fastws.auditoria')`)
    ch("2.3 probar sin red: estado error con alert mapeado, sin auditoria",
      v21b.stamp && v21b.alert.includes("No hay conexión con Meta") && audFin === audIni,
      JSON.stringify({ stamp: v21b.stamp, alert: v21b.alert.slice(0, 60), audEscrita: audFin !== audIni }))
    await writeArtifacts(outDir("pasada-2"), "error-red", { png: shot(cdp) })

    // 2.4 probar ok -> conectada + sesion + auditoria + toast
    await setMode(cdp, "ok")
    await act(cdp, `D('Probar conexión');await new Promise(r=>setTimeout(r,1100));return 'ok'`)
    const v24 = JSON.parse(await act(cdp, `return JSON.stringify({stamp:document.body.innerText.includes('Listo para despacho'),toast:document.body.innerText.includes('Conexión establecida'),token:sessionStorage.getItem('fastws.meta-token'),meta:localStorage.getItem('fastws.conexion.meta'),localToken:localStorage.getItem('fastws.meta-token'),aud:JSON.parse(localStorage.getItem('fastws.auditoria')||'[]').map(a=>a.titulo).slice(0,3)})`))
    ch("2.4 probar ok (stub): conectada + sesion + auditoria 'Conexión Meta establecida'",
      v24.stamp && v24.token !== null && v24.meta !== null && v24.aud.some((t) => t === "Conexión Meta establecida"),
      JSON.stringify({ stamp: v24.stamp, toast: v24.toast, audTop: v24.aud[0] }))
    // 2.5 el token va al almacen de secretos y NUNCA a localStorage. En
    // escritorio esa guarda es DPAPI (src-tauri/src/secrets.rs); aqui, sin
    // Tauri, el fallback del navegador lo deja en sessionStorage.
    ch("2.5 token fuera de localStorage (en la guarda de secretos)",
      v24.token === "EAAQ_SIMTOKEN" && v24.meta !== null && v24.meta.includes("573100000000") && v24.localToken === null,
      `token=${v24.token} meta=${v24.meta?.slice(0, 60)}`)
    await writeArtifacts(outDir("pasada-2"), "conectada", { png: shot(cdp) })

    // 2.8a pill conectada en /app
    await navigate(cdp, "/app")
    await waitSel(cdp, "header")
    await wait(600)
    const pillC = await pill(cdp)
    ch("2.8a pill 'Listo para despacho' al estar conectada", pillC.includes("Listo para despacho"), pillC)

    // 2.6 [S10] recargar -> revalida el token contra Meta y queda 'Listo para despacho'
    await navigate(cdp, "/app/conexion")
    await waitSel(cdp, "#conexion-phoneid")
    await waitFor(async () => hasBody(cdp, "Listo para despacho"), true, 8000)
    const gReqs = await evalJson(cdp, `(window.__graphLog||[]).length`)
    const v26 = JSON.parse(await act(cdp, `return JSON.stringify({stamp:document.body.innerText.includes('Listo para despacho')})`))
    ch("2.6 [S10] recarga: se revalida el token contra Meta (llamadas graph) y queda lista",
      v26.stamp && gReqs >= 1,
      JSON.stringify({ stamp: v26.stamp, llamadas: gReqs }))
    await writeArtifacts(outDir("pasada-2"), "recarga-optimista", { png: shot(cdp) })

    // 2.6b la conexion sobrevive a la recarga sin volver a escribir el token.
    // Eso es lo que reporto el operador: al reabrir la app habia que teclear el
    // token otra vez. En escritorio el token vive cifrado con DPAPI y se
    // revalida al arrancar; aqui el fallback de sessionStorage.
    await navigate(cdp, "/app/conexion")
    await waitSel(cdp, "#conexion-phoneid")
    await waitFor(async () => hasBody(cdp, "Listo para despacho"), true, 8000)
    const tokenVivo = await evalJson(cdp, `sessionStorage.getItem('fastws.meta-token')`)
    const sinFormPido = await evalJson(cdp, `!document.querySelector('#conexion-token') || document.querySelector('#conexion-token').value === ''`)
    ch("2.6b tras recargar: conexion lista sin volver a escribir el token",
      tokenVivo === "EAAQ_SIMTOKEN" && sinFormPido,
      `tokenVivo=${Boolean(tokenVivo)} tokenVacio=${sinFormPido}`)

    // 2.7 [S23] Desconectar exige confirmacion y borra sesion E ids, audita
    await act(cdp, `D('Desconectar');await new Promise(r=>setTimeout(r,200));return 'ok'`)
    await waitSel(cdp, '[role="dialog"][aria-modal="true"]')
    const confirmOpen = await evalJson(cdp, `document.body.innerText.toLowerCase().includes('desconectar meta')`)
    await act(cdp, `D('Desconectar y borrar');await new Promise(r=>setTimeout(r,400));return 'ok'`)
    await wait(400)
    const v27 = JSON.parse(await act(cdp, `return JSON.stringify({stamp:document.body.innerText.includes('Sin configurar'),ids:localStorage.getItem('fastws.conexion.ids'),meta:localStorage.getItem('fastws.conexion.meta'),token:sessionStorage.getItem('fastws.meta-token'),aud:JSON.parse(localStorage.getItem('fastws.auditoria')||'[]').map(a=>a.titulo).slice(0,3),modal:${JSON.stringify(confirmOpen)}})`))
    ch("2.7 [S23] desconectar: exige confirmacion, sin-configurar, borra token/meta/ids, audita",
      v27.stamp && v27.token === null && v27.meta === null && v27.ids === null && v27.aud.some((t) => t === "Conexión Meta cerrada") && v27.modal,
      JSON.stringify({ ids: v27.ids, token: v27.token, meta: v27.meta, audTop: v27.aud[0], modal: v27.modal }))
    await writeArtifacts(outDir("pasada-2"), "desconectada", { png: shot(cdp) })

    // 2.8b pill sin conexión tras desconectar
    await navigate(cdp, "/app")
    await waitSel(cdp, "header")
    await wait(600)
    const pillD = await pill(cdp)
    ch("2.8b pill 'Sin conexión Meta · envíos en pausa' tras desconectar", pillD.includes("Sin conexión Meta") && pillD.includes("pausa"), pillD)
  } finally {
    edge.kill()
  }
}

const okCount = R.filter((r) => r.ok).length
const out = outDir("pasada-2")
await writeArtifacts(out, "probes", { json: { pasada: 2, nombre: "Conexión Meta", total: R.length, ok: okCount, fail: R.length - okCount, checks: R } })
await writeArtifacts(out, "resumen", { txt: `Pasada 2 - Conexión Meta\n${okCount}/${R.length} OK\n${R.map((r) => (r.ok ? "OK  " : "FALLO") + ` ${String(r.n).padStart(2)} ${r.label}\n     ${r.detalle}`).join("\n")}` })

console.log(`pasada-2: ${okCount}/${R.length} OK; fallos:`)
for (const r of R.filter((x) => !x.ok)) console.log(`  [%d] %s -> %s`, r.n, r.label, r.detalle)