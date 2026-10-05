import { afterEach, describe, expect, it, vi } from "vitest"

import { sendTemplate } from "./api"

function responder(json: unknown) {
  return new Response(JSON.stringify(json), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function cuerpoPeticion(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]?.[1] as { body?: string } | undefined
  return JSON.parse(init?.body ?? "null")
}

describe("sendTemplate", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("omite `components` cuando la plantilla no lleva variables ni cabecera", async () => {
    // Meta rechaza un `components: []` con "invalid parameter". Una plantilla
    // sin variables debe ir sin el campo.
    const fetchMock = vi.fn(async () =>
      responder({ messages: [{ id: "wamid-1", message_status: "accepted" }] })
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "hello_world",
      languageCode: "es_CO",
    })

    expect(result.wamid).toBe("wamid-1")
    const body = cuerpoPeticion(fetchMock)
    expect(body.template).not.toHaveProperty("components")
    expect(body.template.name).toBe("hello_world")
  })

  it("incluye el componente de cuerpo cuando hay parámetros", async () => {
    const fetchMock = vi.fn(async () => responder({ messages: [{ id: "wamid-2" }] }))
    vi.stubGlobal("fetch", fetchMock)

    await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "recordatorio",
      languageCode: "es_CO",
      bodyParams: ["Ana"],
    })

    const body = cuerpoPeticion(fetchMock)
    expect(body.template.components).toEqual([
      { type: "body", parameters: [{ type: "text", text: "Ana" }] },
    ])
  })

  it("incluye cabecera y cuerpo cuando ambos llevan parámetros", async () => {
    const fetchMock = vi.fn(async () => responder({ messages: [{ id: "wamid-3" }] }))
    vi.stubGlobal("fetch", fetchMock)

    await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "con_cabecera",
      languageCode: "es_CO",
      headerParams: ["Factura 12"],
      bodyParams: ["Ana"],
    })

    const body = cuerpoPeticion(fetchMock)
    expect(body.template.components).toEqual([
      { type: "header", parameters: [{ type: "text", text: "Factura 12" }] },
      { type: "body", parameters: [{ type: "text", text: "Ana" }] },
    ])
  })

  it("añade `parameter_name` en las plantillas nombradas", async () => {
    // Sin `parameter_name`, Meta responde "Parameter name is missing or empty".
    const fetchMock = vi.fn(async () => responder({ messages: [{ id: "wamid-4" }] }))
    vi.stubGlobal("fetch", fetchMock)

    await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "rmd_mensajes",
      languageCode: "es_CO",
      bodyParams: [
        { parameterName: "nombre", text: "Punto Frio" },
        { parameterName: "fecha", text: "23/03/2026" },
      ],
    })

    const body = cuerpoPeticion(fetchMock)
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", parameter_name: "nombre", text: "Punto Frio" },
          { type: "text", parameter_name: "fecha", text: "23/03/2026" },
        ],
      },
    ])
  })

  it("omite `parameter_name` cuando la clave es un número ({{1}})", async () => {
    // En una plantilla posicional Meta rechaza la clave: "Unexpected key".
    const fetchMock = vi.fn(async () => responder({ messages: [{ id: "wamid-5" }] }))
    vi.stubGlobal("fetch", fetchMock)

    await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "recordatorio",
      languageCode: "es_CO",
      bodyParams: [
        { parameterName: "1", text: "Ana" },
        { parameterName: "2", text: "1234" },
      ],
    })

    const body = cuerpoPeticion(fetchMock)
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Ana" },
          { type: "text", text: "1234" },
        ],
      },
    ])
  })
})

describe("readMetaError", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("añade `error_data.details`, que es la parte accionable", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "(#100) Invalid parameter",
            code: 100,
            error_data: { details: "Parameter name is missing or empty" },
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const error = (await sendTemplate({
      phoneNumberId: "123",
      token: "t",
      to: "573001234567",
      templateName: "rmd_mensajes",
      languageCode: "es_CO",
      bodyParams: ["Punto Frio"],
    }).catch((err: Error) => err)) as Error & { code?: string }

    expect(error.message).toContain("Parameter name is missing or empty")
    expect(error.code).toBe("100")
  })
})
