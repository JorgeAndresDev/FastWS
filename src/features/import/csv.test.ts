import { describe, expect, it } from "vitest"

import type { Client } from "@/types"

import { parseClientCsv } from "./csv"

const csv = (lineas: string[]) => lineas.join("\n")

const cliente = (over: Partial<Client> = {}): Client => ({
  id: "c1",
  code: "EXISTENTE",
  name: "Cliente Existente",
  phone: "3001111111",
  phones: ["3001111111"],
  company: "-",
  city: "",
  zone: "",
  clientType: "NORMAL",
  status: "activo",
  valid: true,
  createdAt: new Date().toISOString(),
  ...over,
})

describe("parseClientCsv — hoja genérica", () => {
  it("rechaza el archivo si falta Código o Nombre", () => {
    expect(() => parseClientCsv(csv(["Telefono", "3100000000"]), [])).toThrow(/Código.*Nombre/i)
  })

  it("acepta el móvil como teléfono principal", () => {
    const r = parseClientCsv(csv(["Código,Nombre,Celular", "C-1,Ana,3001234567"]), [])
    expect(r.valid).toHaveLength(1)
    expect(r.valid[0].phone).toBe("3001234567")
    expect(r.valid[0].name).toBe("Ana")
  })

  it("usa el móvil de la columna de extras cuando el principal es fijo", () => {
    const r = parseClientCsv(
      csv(["Código,Nombre,Celular,Telefonos", "C-2,Beto,6041234567,3112223344"]),
      []
    )
    expect(r.valid[0].phone).toBe("3112223344")
    expect(r.valid[0].phones).toEqual(["6041234567"])
  })

  it("marca inválido cuando no hay ningún móvil en ninguna columna", () => {
    const r = parseClientCsv(csv(["Código,Nombre,Celular", "C-3,Caro,6041234567"]), [])
    expect(r.invalidos).toHaveLength(1)
    expect(r.invalidos[0].reason).toMatch(/inválido/i)
  })

  it("solo toma la primera columna tipo teléfonos", () => {
    const r = parseClientCsv(
      csv(["Código,Nombre,Celular,Telefonos,Otros", "C-4,Dan,3001234567,3228880002,3139990003"]),
      []
    )
    expect(r.valid[0].phones).toEqual(["3228880002"])
  })
})

describe("parseClientCsv — duplicados", () => {
  it("detecta el código ya registrado y lo marca como actualización", () => {
    const r = parseClientCsv(csv(["Código,Nombre,Celular", "EXISTENTE,Ana,3001234567"]), [cliente()])
    expect(r.duplicados).toHaveLength(1)
    expect(r.duplicados[0].reason).toMatch(/ya registrado/i)
  })

  it("gana el primero cuando el mismo código se repite en un archivo", () => {
    const r = parseClientCsv(
      csv([
        "Código,Nombre,Celular",
        "D-1,Primer Duplicado,3001234567",
        "D-1,Segundo,3007654321",
      ]),
      []
    )
    expect(r.valid).toHaveLength(1)
    expect(r.valid[0].name).toBe("Primer Duplicado")
  })
})

describe("parseClientCsv — columnas de pedido y ruta", () => {
  it("mapea el estado del pedido y en-ruta desde la hoja genérica", () => {
    const r = parseClientCsv(
      csv([
        "Código,Nombre,Celular,Pedido,En Ruta",
        "C-5,Elena,3001234567,CANCELADO,SI",
      ]),
      []
    )
    expect(r.valid[0].orderState).toBe("CANCELADO")
    expect(r.valid[0].enRuta).toBe(true)
  })
})
