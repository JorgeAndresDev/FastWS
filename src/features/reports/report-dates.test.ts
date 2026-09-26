import { describe, expect, it } from "vitest"

import { dayKey, fullDay, hourMinute, shortDay } from "./report-dates"

describe("dayKey", () => {
  it("rellena mes y día a dos dígitos para que la clave ordene bien", () => {
    // Sin relleno la clave era 2026-0-5 y no ordenaba ni reconstruía la fecha.
    expect(dayKey("2026-01-05T12:00:00.000Z")).toMatch(/^\d{4}-01-05$/)
    expect(dayKey("2026-11-03T12:00:00.000Z")).toMatch(/^\d{4}-11-03$/)
    expect(dayKey("2026-08-25T12:00:00.000Z")).toMatch(/^\d{4}-08-25$/)
  })

  it("devuelve una clave estable y ordenable para el mismo día", () => {
    const a = dayKey("2026-01-05T08:00:00.000Z")
    const b = dayKey("2026-01-05T20:00:00.000Z")
    expect(a).toBe(b)
    expect(a < dayKey("2026-01-06T08:00:00.000Z")).toBe(true)
  })

  it("agrupa las fechas inválidas en una clave propia en vez de NaN-NaN-NaN", () => {
    expect(dayKey("no-es-una-fecha")).toBe("fecha-invalida")
  })
})

describe("shortDay / fullDay", () => {
  it("devuelve un día corto legible, sin punto final", () => {
    expect(shortDay("2026-01-04T12:00:00.000Z")).toMatch(/^[A-ZÁ-Ú][a-zá-ú]{2}, \d{1,2} de [a-z]{3}$/)
  })

  it("devuelve el día largo en español", () => {
    expect(fullDay("2026-01-04T12:00:00.000Z")).toMatch(/4 de enero de 2026$/)
  })

  it("no filtra 'Invalid Date' cuando la fecha no existe", () => {
    expect(shortDay("basura")).toBe("basura")
    expect(fullDay("basura")).toBe("basura")
  })
})

describe("hourMinute", () => {
  it("devuelve HH:MM en 24 horas", () => {
    expect(hourMinute("2026-01-04T14:03:00.000Z")).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
  })

  it("degrada con elegancia ante una fecha inválida", () => {
    expect(hourMinute("basura")).toBe("basura")
  })
})
