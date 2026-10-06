import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { graphError, readMetaError } from "@/lib/wsb/api"
import { registrarAuditoria } from "@/lib/audit-log"
import { borrarToken, guardarToken, leerToken } from "@/lib/secrets"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import {
  clearDurable,
  readDurable,
  writeDurable,
} from "@/lib/db/session-scope"

export type ConexionStatus = "sin-configurar" | "probando" | "conectada" | "error"

export interface ConexionErrorInfo {
  code?: string
  message: string
}

export interface ConexionIds {
  phoneNumberId: string
  wabaId: string
}

interface ConexionContextValue {
  ids: ConexionIds
  status: ConexionStatus
  metaPhone: string
  wabaName: string
  token: string
  lastError: ConexionErrorInfo | null
  verifiedAt?: string
  prueba: (token: string, ids?: ConexionIds, auditar?: boolean) => Promise<boolean>
  guardarIds: (ids: ConexionIds) => void
  desconectar: () => void
}

const ConexionContext = createContext<ConexionContextValue | null>(null)

const IDS_KEY = "fastws.conexion.ids"
const META_KEY = "fastws.conexion.meta"

/**
 * Lo que NO es secreto va a la base y sobrevive al cierre: el número, el nombre
 * de la cuenta y cuándo se verificó. Es lo que permite que la pantalla de
 * Conexión muestre la cuenta conectada sin tener el token delante.
 */
interface StoredMeta {
  metaPhone: string
  wabaName: string
  verifiedAt: string
}

function loadMeta(): StoredMeta | null {
  const raw = readDurable(META_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredMeta>
    if (typeof parsed.metaPhone === "string" && parsed.metaPhone) {
      return {
        metaPhone: parsed.metaPhone,
        wabaName: String(parsed.wabaName ?? ""),
        verifiedAt: String(parsed.verifiedAt ?? new Date().toISOString()),
      }
    }
  } catch {
    /* dato corrupto */
  }
  return null
}

function saveMeta(meta: StoredMeta) {
  writeDurable(META_KEY, JSON.stringify(meta))
}

function clearMeta() {
  clearDurable(META_KEY)
}

function loadIds(): ConexionIds {
  const raw = readDurable(IDS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ConexionIds>
      return {
        phoneNumberId: String(parsed.phoneNumberId ?? ""),
        wabaId: String(parsed.wabaId ?? ""),
      }
    } catch {
      /* dato corrupto */
    }
  }
  return { phoneNumberId: "", wabaId: "" }
}

export function ConexionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ConexionIds>(loadIds)
  const [meta, setMeta] = useState<StoredMeta | null>(loadMeta)
  const [status, setStatus] = useState<ConexionStatus>(() =>
    meta && ids.phoneNumberId && ids.wabaId ? "probando" : "sin-configurar"
  )
  const [metaPhone, setMetaPhone] = useState(meta?.metaPhone ?? "")
  const [wabaName, setWabaName] = useState(meta?.wabaName ?? "")
  const [token, setToken] = useState("")
  const [verifiedAt, setVerifiedAt] = useState<string | undefined>(meta?.verifiedAt)
  const [lastError, setLastError] = useState<ConexionErrorInfo | null>(null)
  const idsRef = useRef(ids)
  idsRef.current = ids
  const revalidadoRef = useRef(false)

  const guardarIds = useCallback((nuevos: ConexionIds) => {
    setIds(nuevos)
    writeDurable(IDS_KEY, JSON.stringify(nuevos))
  }, [])

  const prueba = useCallback(
    async (token: string, idsProporcionados?: ConexionIds, auditar = true) => {
      const { phoneNumberId, wabaId } = idsProporcionados ?? idsRef.current
      if (!token || !phoneNumberId || !wabaId) {
        setLastError({ message: "Completa los identificadores y el token de acceso." })
        setStatus("error")
        return false
      }

      setStatus("probando")
      setLastError(null)
      try {
        const phoneUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
          phoneNumberId
        )}?fields=verified_name,display_phone_number,platform_type,status`
        const phoneRes = await fetch(phoneUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!phoneRes.ok) throw await readMetaError(phoneRes)
        const phoneJson = (await phoneRes.json()) as {
          verified_name?: string
          display_phone_number?: string
          status?: string
        }

        const wabaUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
          wabaId
        )}?fields=name`
        const wabaRes = await fetch(wabaUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!wabaRes.ok) throw await readMetaError(wabaRes)
        const wabaJson = (await wabaRes.json()) as { name?: string }

        const numbersUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(
          wabaId
        )}/phone_numbers?fields=id`
        const numbersRes = await fetch(numbersUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
        let phoneIds: string[] = []
        if (numbersRes.ok) {
          const numbersJson = (await numbersRes.json()) as {
            data?: Array<{ id: string | number }>
          }
          phoneIds = (numbersJson.data ?? []).map((item) => String(item.id))
        }
        if (phoneIds.length > 0 && !phoneIds.includes(String(phoneNumberId))) {
          throw new Error(
            "El Phone Number ID ingresado no pertenece a la cuenta de WhatsApp Business (WABA) de la empresa dueña del token. Edítalo y vuelve a probar."
          )
        }

        setMetaPhone(String(phoneJson.display_phone_number ?? ""))
        setWabaName(String(wabaJson.name ?? ""))
        if (!phoneJson.display_phone_number) {
          throw new Error(
            "No se pudo confirmar el número de la empresa dueña del token. Verifica el Phone Number ID."
          )
        }
        setToken(token)
        const nuevaMeta: StoredMeta = {
          metaPhone: String(phoneJson.display_phone_number),
          wabaName: String(wabaJson.name ?? ""),
          verifiedAt: new Date().toISOString(),
        }
        // El token va al almacén seguro (cifrado con DPAPI en escritorio); el
        // resto de la sesión sí es dato normal y va a la base. Así la conexión
        // sobrevive al cierre de la ventana sin dejar el secreto en claro.
        await guardarToken(token)
        saveMeta(nuevaMeta)
        setMeta(nuevaMeta)
        setVerifiedAt(nuevaMeta.verifiedAt)
        setStatus("conectada")
        if (auditar) {
          const device = getDeviceIdentity()
          const sessionUser = readSession()
          registrarAuditoria({
            categoria: "conexion",
            titulo: "Conexión Meta establecida",
            detalle: `${String(phoneJson.display_phone_number)} · ${String(wabaJson.name ?? "")}`,
            entidad: String(phoneJson.display_phone_number),
            usuario: sessionUser?.name ?? "Operador",
            dispositivo: `${device.id} · ${device.code}`,
          })
        }
        return true
      } catch (err) {
        const clean = graphError(err)
        setMetaPhone("")
        setWabaName("")
        setLastError({ code: (clean as Error & { code?: string }).code, message: clean.message })
        setStatus("error")
        return false
      }
    },
    []
  )

  /**
 * El token se lee del almacén seguro (DPAPI en escritorio). Por eso la restauración
 * es asíncrona: el proveedor arranca en "probando" y, si no hay token guardado,
 * baja a "sin-configurar" sin pedir nada. Ese es el caso del navegador, donde el
 * token solo vive en la sesión.
 */
useEffect(() => {
  if (revalidadoRef.current) return
  if (!meta || !ids.phoneNumberId || !ids.wabaId) return
  revalidadoRef.current = true
  void (async () => {
    const guardado = await leerToken()
    if (!guardado) {
      setStatus("sin-configurar")
      return
    }
    setToken(guardado)
    // Se revalida contra Meta antes de dar la conexión por buena: un token
    // puede seguir en disco y haber caducado.
    await prueba(guardado, ids, false)
  })()
}, [ids, meta, prueba])

  const desconectar = useCallback(() => {
    setStatus("sin-configurar")
    setMetaPhone("")
    setWabaName("")
    setToken("")
    setVerifiedAt(undefined)
    setLastError(null)
    setMeta(null)
    setIds({ phoneNumberId: "", wabaId: "" })
    clearDurable(IDS_KEY)
    clearMeta()
    // El borrado del secreto no puede fallar en silencio: si el almacén seguro
    // no lo deja fuera, quedaría un token vivo en el equipo. `borrarToken`
    // limpia además el fallback del navegador.
    void borrarToken()
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    registrarAuditoria({
      categoria: "conexion",
      titulo: "Conexión Meta cerrada",
      detalle: "Token, sesión e identificadores borrados de este equipo.",
      usuario: sessionUser?.name ?? "Operador",
      dispositivo: `${device.id} · ${device.code}`,
    })
  }, [])

  const value = useMemo<ConexionContextValue>(
    () => ({
      ids,
      status,
      metaPhone,
      wabaName,
      token,
      lastError,
      verifiedAt,
      prueba,
      guardarIds,
      desconectar,
    }),
    [ids, status, metaPhone, wabaName, token, lastError, verifiedAt, prueba, guardarIds, desconectar]
  )

  return <ConexionContext.Provider value={value}>{children}</ConexionContext.Provider>
}

export function useConexion() {
  const context = useContext(ConexionContext)
  if (!context) {
    throw new Error("useConexion debe usarse dentro de ConexionProvider")
  }
  return context
}