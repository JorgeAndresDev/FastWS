import { afterEach, describe, expect, it, vi } from "vitest"

import { puedeAvanzarEstado } from "./message-status"
import {
  WEBHOOKS_TOKEN_LABEL,
  WEBHOOKS_URL_KEY,
  descargarEventos,
  estadoDeEvento,
  guardarConfigWebhooks,
  leerConfigWebhooks,
  limpiarConfigWebhooks,
  mapearEstado,
  mensajeDeEvento,
  normalizarUrl,
  type WebhookEvent,
} from "./webhooks"

function almacen(datos: Map<string, string>) {
  return {
    getItem: (key: string) => datos.get(key) ?? null,
    setItem: (key: string, value: string) => void datos.set(key, String(value)),
    removeItem: (key: string) => void datos.delete(key),
    key: (index: number) => Array.from(datos.keys())[index] ?? null,
    get length() {
      return datos.size
    },
  }
}

function stubNavegador() {
  const local = new Map<string, string>()
  const session = new Map<string, string>()
  vi.stubGlobal("window", {
    localStorage: almacen(local),
    sessionStorage: almacen(session),
  })
  return { local, session }
}

function evento(payload: Record<string, unknown>, type = "status"): WebhookEvent {
  return { id: 1, type, payload }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("webhooks: URL y configuración", () => {
  it("normaliza la URL base y descarta rutas de endpoint, credenciales y esquemas inseguros", () => {
    expect(normalizarUrl("https://fastws.workers.dev/")).toBe("https://fastws.workers.dev")
    expect(normalizarUrl("https://fastws.workers.dev/webhook?x=1")).toBe(
      "https://fastws.workers.dev"
    )
    expect(normalizarUrl("https://fastws.workers.dev/events")).toBe(
      "https://fastws.workers.dev"
    )
    expect(normalizarUrl("https://fastws.workers.dev/events/")).toBe(
      "https://fastws.workers.dev"
    )
    expect(normalizarUrl("https://fastws.workers.dev/webhook/")).toBe(
      "https://fastws.workers.dev"
    )
    expect(normalizarUrl("http://localhost:8787/health")).toBe("http://localhost:8787")
    expect(normalizarUrl("http://fastws.workers.dev")).toBeNull()
    expect(normalizarUrl("ftp://fastws.workers.dev")).toBeNull()
    expect(normalizarUrl("https://usuario:clave@fastws.workers.dev")).toBeNull()
    expect(normalizarUrl("   ")).toBeNull()
  })

  it("guarda URL y token, y los recupera con el cursor", async () => {
    const { local, session } = stubNavegador()
    const resultado = await guardarConfigWebhooks("https://fastws.workers.dev/", "token-largo")
    expect(resultado).toEqual({ ok: true, url: "https://fastws.workers.dev" })
    expect(JSON.parse(local.get(WEBHOOKS_URL_KEY) ?? "null")).toBe(
      "https://fastws.workers.dev"
    )
    expect(session.get(`fastws.secret.${WEBHOOKS_TOKEN_LABEL}`)).toBe("token-largo")
    expect(await leerConfigWebhooks()).toEqual({
      url: "https://fastws.workers.dev",
      token: "token-largo",
      cursor: 0,
    })
  })

  it("exige token y URL válida, y limpiar borra ambos", async () => {
    stubNavegador()
    expect((await guardarConfigWebhooks("", "token")).ok).toBe(false)
    expect((await guardarConfigWebhooks("https://fastws.workers.dev", "")).ok).toBe(false)

    await guardarConfigWebhooks("https://fastws.workers.dev", "token-largo")
    await limpiarConfigWebhooks()
    expect(await leerConfigWebhooks()).toBeNull()
  })
})

describe("webhooks: eventos de Meta", () => {
  it("mapea los estados de Meta a los estados de la app", () => {
    expect(mapearEstado("sent")).toBe("PROCESO")
    expect(mapearEstado("delivered")).toBe("ENTREGADO")
    expect(mapearEstado("read")).toBe("LEIDO")
    expect(mapearEstado("failed")).toBe("FALLIDO")
    expect(mapearEstado("deleted")).toBeNull()
  })

  it("extrae el wamid, el estado y el error accionable", () => {
    const resultado = estadoDeEvento(
      evento({
        id: "wamid.OUT-1",
        status: "failed",
        errors: [{ code: 131047, message: "Re-engagement message" }],
      })
    )
    expect(resultado).toEqual({
      metaId: "wamid.OUT-1",
      estado: "FALLIDO",
      errorCode: "131047",
      errorMessage: "Re-engagement message",
    })
    expect(estadoDeEvento(evento({ id: "wamid.OUT-1", status: "deleted" }))).toBeNull()
    expect(estadoDeEvento(evento({ status: "read" }))).toBeNull()
  })

  it("convierte un mensaje entrante en datos para el hilo", () => {
    expect(
      mensajeDeEvento(
        evento(
          {
            id: "wamid.IN-1",
            from: "573001234001",
            timestamp: 1729000000,
            text: "Hola",
            contact_name: "Ana Pérez",
          },
          "message"
        )
      )
    ).toEqual({
      wamid: "wamid.IN-1",
      phone: "573001234001",
      text: "Hola",
      sentAt: new Date(1729000000 * 1000).toISOString(),
      contactName: "Ana Pérez",
    })
  })

  it("no retrocede estados ni reabre fallos o cancelaciones", () => {
    expect(puedeAvanzarEstado("PROCESO", "ENTREGADO")).toBe(true)
    expect(puedeAvanzarEstado("ENTREGADO", "LEIDO")).toBe(true)
    expect(puedeAvanzarEstado("LEIDO", "ENTREGADO")).toBe(false)
    expect(puedeAvanzarEstado("LEIDO", "FALLIDO")).toBe(false)
    expect(puedeAvanzarEstado("FALLIDO", "ENTREGADO")).toBe(false)
    expect(puedeAvanzarEstado("CANCELADO", "LEIDO")).toBe(false)
    expect(puedeAvanzarEstado("ENTREGADO", "ENTREGADO")).toBe(false)
  })
})

describe("webhooks: consulta al Worker", () => {
  it("envía el cursor y el Bearer, y devuelve los eventos", async () => {
    let solicitada = ""
    let cabeceras: HeadersInit | undefined
    const fetchFalso = (async (input: RequestInfo | URL, init?: RequestInit) => {
      solicitada = String(input)
      cabeceras = init?.headers
      return new Response(
        JSON.stringify({
          events: [{ id: 7, type: "status", payload: { id: "wamid.1", status: "read" } }],
          cursor: 7,
          has_more: false,
        }),
        { status: 200 }
      )
    }) as typeof fetch

    const resultado = await descargarEventos(
      { url: "https://fastws.workers.dev", token: "token", cursor: 3 },
      fetchFalso
    )
    expect(solicitada).toContain("after=3")
    expect(solicitada).toContain("limit=200")
    expect((cabeceras as Record<string, string>).Authorization).toBe("Bearer token")
    expect(resultado.eventos).toHaveLength(1)
    expect(resultado.cursor).toBe(7)
    expect(resultado.hasMore).toBe(false)
  })

  it("corta la consulta si el Worker no responde", async () => {
    vi.useFakeTimers()
    const colgado = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError"))
        )
      })) as typeof fetch

    const promesa = expect(
      descargarEventos(
        { url: "https://fastws.workers.dev", token: "token", cursor: 0 },
        colgado
      )
    ).rejects.toThrow("no respondió a tiempo")
    await vi.advanceTimersByTimeAsync(15_000)
    await promesa
  })

  it("explica el rechazo del token y las respuestas inesperadas", async () => {
    const noAutorizado = (async () =>
      new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 })) as typeof fetch
    await expect(
      descargarEventos({ url: "https://fastws.workers.dev", token: "malo", cursor: 0 }, noAutorizado)
    ).rejects.toThrow("rechazó el token")

    const raro = (async () =>
      new Response(JSON.stringify({ events: "nope" }), { status: 200 })) as typeof fetch
    await expect(
      descargarEventos({ url: "https://fastws.workers.dev", token: "token", cursor: 0 }, raro)
    ).rejects.toThrow("respuesta inesperada")
  })
})
