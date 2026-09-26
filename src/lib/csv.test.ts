import { describe, expect, it } from "vitest"

import { escapeCell, neutralizeFormula, toCsv } from "./csv"

describe("neutralizeFormula", () => {
  it("antepone comilla simple a lo que abriría una fórmula", () => {
    for (const dangerous of ["=SUM(1,1)", "+1", "-1+1", "@A1", "\tx", "\rx"]) {
      expect(neutralizeFormula(dangerous).startsWith("'")).toBe(true)
    }
  })

  it("deja intacto el texto normal, aunque contenga espacios o signos dentro", () => {
    for (const safe of ["Cliente", "a = b", "total-2026", "user@local", "", "  "]) {
      expect(neutralizeFormula(safe)).toBe(safe)
    }
  })
})

describe("escapeCell", () => {
  it("entrecomilla cuando aparece el delimitador o un salto de línea", () => {
    expect(escapeCell("a;b")).toBe('"a;b"')
    expect(escapeCell("linea1\nlinea2")).toBe('"linea1\nlinea2"')
    expect(escapeCell("linea1\r\nlinea2")).toBe('"linea1\r\nlinea2"')
  })

  it("dubla las comillas dobles dentro de la celda", () => {
    expect(escapeCell('di "hola"')).toBe('"di ""hola"""')
  })

  it("neutraliza la fórmula y entrecomilla si además trae delimitador", () => {
    expect(escapeCell("=1;2")).toBe(`"'=1;2"`)
  })

  it("deja pasar texto limpio sin comillas", () => {
    expect(escapeCell("Café La Roca")).toBe("Café La Roca")
  })
})

describe("toCsv", () => {
  it("emite cabecera y filas con ';' y CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"], ["3", "4"]])
    expect(csv).toBe("A;B\r\n1;2\r\n3;4")
  })

  it("ninguna celda queda capaz de ejecutar una fórmula", () => {
    const csv = toCsv(["Cliente"], [["=cmd|'/C calc'!A0"], ["Ana"]])
    const filas = csv.split("\r\n").slice(1)
    // Sin delimitador ni comillas que forzar comillas: solo la comilla inicial.
    expect(filas[0]).toBe("'=cmd|'/C calc'!A0")
    expect(filas[1]).toBe("Ana")
  })
})
