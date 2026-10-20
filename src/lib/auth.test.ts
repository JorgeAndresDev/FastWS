import { describe, expect, it } from "vitest"

import { hashPassword, validarPassword, verifyPassword } from "./auth"

const CLAVE = "nuevaClave2026"

describe("hashPassword / verifyPassword", () => {
  it("el hash guardado tiene las cuatro partes del formato", async () => {
    const hash = await hashPassword(CLAVE)
    const partes = hash.split("$")
    // El separador entre sal y hash es obligatorio: sin él `verifyPassword`
    // descarta el hash y la clave nueva deja de servir (regresión S11).
    expect(partes).toHaveLength(4)
    expect(partes[0]).toBe("pbkdf2")
    expect(Number(partes[1])).toBe(100_000)
    expect(partes[2].length).toBeGreaterThan(0)
    expect(partes[3].length).toBeGreaterThan(0)
  })

  it("la clave correcta verifica y la incorrecta no", async () => {
    const hash = await hashPassword(CLAVE)
    expect(await verifyPassword(CLAVE, hash)).toBe(true)
    expect(await verifyPassword("otraClave2026", hash)).toBe(false)
    expect(await verifyPassword("", hash)).toBe(false)
  })

  it("dos hashes de la misma clave usan sales distintas", async () => {
    const [a, b] = await Promise.all([hashPassword(CLAVE), hashPassword(CLAVE)])
    expect(a).not.toBe(b)
    expect(await verifyPassword(CLAVE, a)).toBe(true)
    expect(await verifyPassword(CLAVE, b)).toBe(true)
  })

  it("un hash viejo, corrupto o truncado no lanza: devuelve false", async () => {
    const hash = await hashPassword(CLAVE)
    const [prefijo, iteraciones, sal, digest] = hash.split("$")
    expect(await verifyPassword(CLAVE, "")).toBe(false)
    expect(await verifyPassword(CLAVE, "sha256:abc")).toBe(false)
    // Formato de tres partes: el bug que rompía el login tras el reset.
    expect(await verifyPassword(CLAVE, `${prefijo}$${iteraciones}$${sal}${digest}`)).toBe(false)
    expect(await verifyPassword(CLAVE, `${prefijo}$0$${sal}$${digest}`)).toBe(false)
    expect(await verifyPassword(CLAVE, `${prefijo}$100000$@@@$@@@`)).toBe(false)
  })
})

describe("validarPassword", () => {
  it("acepta una clave con largo, mayúsculas, minúsculas y número", () => {
    expect(validarPassword(CLAVE)).toBeNull()
  })

  it("explica qué falta cuando la clave es débil", () => {
    expect(validarPassword("Corta1")).toContain("10 caracteres")
    expect(validarPassword("solominusculas1")).toContain("mayúsculas y minúsculas")
    expect(validarPassword("SinNumeros")).toContain("número")
  })
})
