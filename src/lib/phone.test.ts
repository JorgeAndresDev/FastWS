import { describe, expect, it } from "vitest"

import { isMobileColombian, toWhatsAppNumber } from "./phone"

describe("isMobileColombian", () => {
  it("acepta un móvil de 10 dígitos que empieza por 3", () => {
    expect(isMobileColombian("3001234567")).toBe(true)
    expect(isMobileColombian("3123456789")).toBe(true)
  })

  it("tolera espacios y signos en el formato local", () => {
    expect(isMobileColombian("+57 300 123 4567")).toBe(true)
    expect(isMobileColombian("(300) 123-4567")).toBe(true)
  })

  it("rechaza fijos, cortos y el '000' que usan los clientes sin teléfono", () => {
    expect(isMobileColombian("6041234567")).toBe(false)
    expect(isMobileColombian("300123456")).toBe(false)
    expect(isMobileColombian("000")).toBe(false)
    expect(isMobileColombian("")).toBe(false)
  })
})

describe("toWhatsAppNumber", () => {
  it("antepone 57 a un número local", () => {
    expect(toWhatsAppNumber("3001234567")).toBe("573001234567")
  })

  it("no duplica el 57 si ya viene prefijado", () => {
    expect(toWhatsAppNumber("573001234567")).toBe("573001234567")
  })

  it("normaliza el número de la empresa como lo devuelve Meta", () => {
    // La API entrega "+57 310 397 1042".
    expect(toWhatsAppNumber("+57 310 397 1042")).toBe("573103971042")
  })

  it("descarta cualquier carácter que no sea dígito", () => {
    expect(toWhatsAppNumber("(604) 123-45.67")).toBe("576041234567")
  })
})
