import { describe, expect, it } from "vitest"

import {
  MODO_ENVIO_DEFAULT,
  motivoBloqueoEnvio,
  normalizarLista,
  parseModoEnvio,
  type GuardasEnvio,
} from "./envio"

const REAL: GuardasEnvio = { modo: "real", listaBlanca: [], desarrollo: false }
const ENSAYO: GuardasEnvio = { modo: "ensayo", listaBlanca: [], desarrollo: false }

describe("parseModoEnvio", () => {
  it("sin valor o con basura, ensayo", () => {
    expect(parseModoEnvio(null)).toBe(MODO_ENVIO_DEFAULT)
    expect(parseModoEnvio("")).toBe("ensayo")
    expect(parseModoEnvio("produccion")).toBe("ensayo")
  })

  it("acepta el valor crudo y el JSON con comillas", () => {
    expect(parseModoEnvio("real")).toBe("real")
    expect(parseModoEnvio('"real"')).toBe("real")
    expect(parseModoEnvio('"ensayo"')).toBe("ensayo")
  })
})

describe("normalizarLista", () => {
  it("normaliza a 57 + número, deduplica y descarta lo inválido", () => {
    expect(
      normalizarLista(["3001234567", "573001234567", " 300 123 4567 ", "000", "abc"])
    ).toEqual(["573001234567"])
  })
})

describe("motivoBloqueoEnvio", () => {
  it("modo ensayo bloquea cualquier destino", () => {
    const motivo = motivoBloqueoEnvio("573001234567", ENSAYO)
    expect(motivo).toContain("modo ensayo")
  })

  it("modo real sin lista deja pasar", () => {
    expect(motivoBloqueoEnvio("573001234567", REAL)).toBeNull()
  })

  it("en desarrollo con lista, solo pasan los números listados", () => {
    const guardas: GuardasEnvio = {
      modo: "real",
      listaBlanca: ["573001234567"],
      desarrollo: true,
    }
    expect(motivoBloqueoEnvio("573001234567", guardas)).toBeNull()
    expect(motivoBloqueoEnvio("3001234567", guardas)).toBeNull()
    expect(motivoBloqueoEnvio("573009999999", guardas)).toContain("lista blanca")
  })

  it("en producción la lista blanca no aplica", () => {
    const guardas: GuardasEnvio = {
      modo: "real",
      listaBlanca: ["573001234567"],
      desarrollo: false,
    }
    expect(motivoBloqueoEnvio("573009999999", guardas)).toBeNull()
  })
})
