import { createHmac } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  cabecerasCors,
  extraerEventos,
  firmaValida,
  igualSeguro,
  textoMensaje,
} from "./index.js"

const payload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-1",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "573000000000", phone_number_id: "pn-1" },
            contacts: [{ profile: { name: "Ana Pérez" }, wa_id: "573001234001" }],
            messages: [
              {
                from: "573001234001",
                id: "wamid.IN-1",
                timestamp: "1729000000",
                type: "text",
                text: { body: "Hola, ¿mi pedido va en ruta?" },
              },
            ],
            statuses: [
              {
                id: "wamid.OUT-1",
                status: "delivered",
                timestamp: "1729000001",
                recipient_id: "573001234001",
                conversation: { id: "conv-1" },
              },
            ],
          },
        },
      ],
    },
  ],
}

describe("webhooks: normalización de Meta", () => {
  it("extrae estados y mensajes con claves de deduplicación estables", () => {
    const eventos = extraerEventos(payload)
    expect(eventos).toHaveLength(2)
    expect(eventos[0]).toMatchObject({
      event_key: "wamid.OUT-1|status|delivered|1729000001",
      type: "status",
      wamid: "wamid.OUT-1",
      phone: "573001234001",
      status: "delivered",
      occurred_at: 1729000001,
    })
    expect(eventos[1]).toMatchObject({
      event_key: "message|wamid.IN-1",
      type: "message",
      wamid: "wamid.IN-1",
      phone: "573001234001",
      status: null,
      occurred_at: 1729000000,
      payload: {
        id: "wamid.IN-1",
        from: "573001234001",
        text: "Hola, ¿mi pedido va en ruta?",
        contact_name: "Ana Pérez",
      },
    })
  })

  it("ignora objetos que no son de WhatsApp Business", () => {
    expect(extraerEventos({ object: "page", entry: [] })).toEqual([])
    expect(extraerEventos(null)).toEqual([])
  })

  it("elige texto útil para mensajes sin texto plano", () => {
    expect(textoMensaje({ type: "image", image: { caption: "Factura" } })).toBe("Factura")
    expect(textoMensaje({ type: "button", button: { text: "Sí" } })).toBe("Sí")
    expect(textoMensaje({ type: "audio" })).toBe("[audio]")
    expect(textoMensaje({ type: "desconocido" })).toBe("[desconocido]")
  })
})

describe("webhooks: seguridad del Worker", () => {
  it("acepta la firma HMAC de Meta y rechaza cuerpo o firma alterados", async () => {
    const secreto = "app-secret-de-prueba"
    const cuerpo = JSON.stringify(payload)
    const firma = `sha256=${createHmac("sha256", secreto).update(cuerpo).digest("hex")}`

    expect(await firmaValida(cuerpo, firma, secreto)).toBe(true)
    expect(await firmaValida(`${cuerpo} `, firma, secreto)).toBe(false)
    expect(await firmaValida(cuerpo, firma.replace(/.$/, "0"), secreto)).toBe(false)
    expect(await firmaValida(cuerpo, firma, "")).toBe(false)
    expect(await firmaValida(cuerpo, "delivered", secreto)).toBe(false)
  })

  it("compara tokens sin filtrar la longitud por tiempo", async () => {
    expect(await igualSeguro("token", "token")).toBe(true)
    expect(await igualSeguro("token", "token-largo")).toBe(false)
    expect(await igualSeguro("", "")).toBe(true)
    expect(await igualSeguro(null, "")).toBe(false)
  })

  it("solo devuelve CORS para orígenes permitidos", () => {
    const permitido = new Request("https://worker.example/events", {
      headers: { Origin: "http://localhost:5173" },
    })
    expect(cabecerasCors(permitido, {})["Access-Control-Allow-Origin"]).toBe(
      "http://localhost:5173"
    )

    const ajeno = new Request("https://worker.example/events", {
      headers: { Origin: "https://sitio.example" },
    })
    expect(cabecerasCors(ajeno, {})).toEqual({})
  })
})
