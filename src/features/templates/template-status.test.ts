import { describe, expect, it } from "vitest"

import type { WaTemplate } from "@/types"

import {
  buildTemplateBodyParams,
  buildTemplateHeaderParams,
  countUnnamedPlaceholders,
  detectVariables,
} from "./template-status"

function plantilla(components: WaTemplate["components"]): WaTemplate {
  return {
    id: "1",
    name: "plantilla",
    language: "es_CO",
    category: "UTILITY",
    status: "APPROVED",
    qualityScore: null,
    updatedAt: null,
    components,
  }
}

describe("detectVariables", () => {
  it("reconoce variables numéricas y nombradas, en orden de aparición", () => {
    const variables = detectVariables("Hola {{nombre}}, tu pedido del {{fecha}} llega el {{2}}")
    expect(variables.map((v) => v.key)).toEqual(["nombre", "fecha", "2"])
    expect(variables[0]).toMatchObject({ index: null, numeric: false, label: "nombre" })
    expect(variables[2]).toMatchObject({ index: 2, numeric: true, label: "Variable 2" })
  })

  it("no cuenta como variable un {{}} sin nombre", () => {
    expect(detectVariables("Buen día {{}} y su pedido {{}}")).toEqual([])
  })
})

describe("countUnnamedPlaceholders", () => {
  it("cuenta los {{}} que no se pueden rellenar", () => {
    // Plantillas reales APPROVED que nacieron así: Meta las aprobó sin nombre.
    expect(countUnnamedPlaceholders("Hola {{}} y el día {{}}")).toBe(2)
    expect(countUnnamedPlaceholders("Hola {{nombre}} el día {{1}}")).toBe(0)
    expect(countUnnamedPlaceholders("Sin variables")).toBe(0)
  })
})

describe("buildTemplateBodyParams", () => {
  it("devuelve los valores con su nombre en una plantilla NAMED", () => {
    const params = buildTemplateBodyParams(
      plantilla([
        {
          type: "BODY",
          text: "Hola {{nombre}}, tu pedido del {{fecha}}",
          example: {
            body_text_named_params: [
              { param_name: "nombre", example: "Punto Frio" },
              { param_name: "fecha", example: "23/03/2026" },
            ],
          },
        },
      ])
    )
    expect(params).toEqual([
      { parameterName: "nombre", text: "Punto Frio" },
      { parameterName: "fecha", text: "23/03/2026" },
    ])
  })

  it("rellena con Ejemplo N cuando la plantilla numérica no trae ejemplos", () => {
    const params = buildTemplateBodyParams(
      plantilla([{ type: "BODY", text: "Hola {{1}}, pide el {{2}}" }])
    )
    expect(params).toEqual(["Ejemplo 1", "Ejemplo 2"])
  })

  it("devuelve undefined si el cuerpo no tiene variables", () => {
    expect(
      buildTemplateBodyParams(plantilla([{ type: "BODY", text: "Texto fijo" }]))
    ).toBeUndefined()
  })
})

describe("buildTemplateHeaderParams", () => {
  it("no inventa parámetros para una cabecera de texto fijo", () => {
    // "Hello World" no lleva variables: mandarle un parámetro hace que Meta
    // rechace el envío entero.
    expect(
      buildTemplateHeaderParams(
        plantilla([
          { type: "HEADER", format: "TEXT", text: "Hello World" },
          { type: "BODY", text: "Bienvenido" },
        ])
      )
    ).toBeUndefined()
  })

  it("sí manda parámetros cuando la cabecera tiene variables", () => {
    expect(
      buildTemplateHeaderParams(
        plantilla([
          { type: "HEADER", format: "TEXT", text: "Factura {{1}}", example: { header_text: ["Factura 12"] } },
        ])
      )
    ).toEqual(["Factura 12"])
  })

  it("devuelve undefined si no hay cabecera", () => {
    expect(buildTemplateHeaderParams(plantilla([{ type: "BODY", text: "Hola" }]))).toBeUndefined()
  })
})