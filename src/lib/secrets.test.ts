import { afterEach, describe, expect, it, vi } from "vitest"

import { borrarToken, guardarToken, leerToken, persiste } from "./secrets"

const TOKEN = "EAAG-token-de-prueba"

/**
 * El entorno de test es `node`, sin DOM. `secrets.ts` solo toca dos cosas de
 * `window`: `__TAURI_INTERNALS__` (para saber si hay Tauri) y `sessionStorage`
 * (el fallback del navegador). Con un stub mínimo se puede probar la rama del
 * navegador sin añadir jsdom como dependencia.
 */
function stubNavegador() {
  const datos = new Map<string, string>()
  const win = {
    sessionStorage: {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, String(v)),
      removeItem: (k: string) => void datos.delete(k),
    },
  }
  vi.stubGlobal("window", win)
  return datos
}

describe("secrets (fallback de navegador)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("guardar y leer hacen el viaje redondo", async () => {
    stubNavegador()
    await guardarToken(TOKEN)
    expect(await leerToken()).toBe(TOKEN)
  })

  it("guardar devuelve false en navegador: no hay almacén seguro", async () => {
    stubNavegador()
    // En el navegador no hay Tauri, así que el token solo vive en la sesión y la
    // UI no debe prometer que se va a recordar.
    expect(await guardarToken(TOKEN)).toBe(false)
    expect(persiste()).toBe(false)
  })

  it("leer devuelve null si no hay nada guardado", async () => {
    stubNavegador()
    expect(await leerToken()).toBeNull()
  })

  it("borrar deja el token fuera y es idempotente", async () => {
    const datos = stubNavegador()
    await guardarToken(TOKEN)
    await borrarToken()
    expect(await leerToken()).toBeNull()
    expect(datos.has("fastws.meta-token")).toBe(false)
    await borrarToken()
    expect(await leerToken()).toBeNull()
  })

  it("un token con caracteres raros sobrevive al viaje", async () => {
    stubNavegador()
    const raro = "tokén con ñ, tildes, emoji 🔐 y símbolos <>&\"'"
    await guardarToken(raro)
    expect(await leerToken()).toBe(raro)
  })

  it("sin window no rompe: leer devuelve null y guardar false", async () => {
    // En un entorno sin DOM (p. ej. un fallo de arranque) la guarda no debe
    // tirar la app por la ventana.
    vi.stubGlobal("window", undefined)
    expect(await leerToken()).toBeNull()
    expect(await guardarToken(TOKEN)).toBe(false)
  })
})