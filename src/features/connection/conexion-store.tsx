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
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import {
  clearDurable,
  clearEphemeral,
  readDurable,
  readEphemeral,
  writeDurable,
  writeEphemeral,
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
const SESSION_KEY = "fastws.conexion.sesion"

interface StoredSession {
  token: string
  metaPhone: string
  wabaName: string
  verifiedAt: string
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

/**
 * El token es un secreto: vive en el alcance efimero, que en Tauri sigue siendo
 * el sessionStorage del webview y muere con la ventana. Los identificadores no
 * son secretos y van a la base. Mover el token al almacen seguro del sistema es
 * trabajo de la fase de credenciales.
 */
function loadSession(): StoredSession | null {
  const raw = readEphemeral(SESSION_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>
      if (parsed && typeof parsed.token === "string" && parsed.token.length > 0) {
        return {
          token: parsed.token,
          metaPhone: String(parsed.metaPhone ?? ""),
          wabaName: String(parsed.wabaName ?? ""),
          verifiedAt: String(parsed.verifiedAt ?? new Date().toISOString()),
        }
      }
    } catch {
      /* dato corrupto */
    }
  }
  return null
}

function saveSession(session: StoredSession) {
  writeEphemeral(SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  clearEphemeral(SESSION_KEY)
}

export function ConexionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ConexionIds>(loadIds)
  const [restored] = useState(loadSession)
  const [status, setStatus] = useState<ConexionStatus>(() =>
    restored && ids.phoneNumberId && ids.wabaId ? "probando" : "sin-configurar"
  )
  const [metaPhone, setMetaPhone] = useState(restored?.metaPhone ?? "")
  const [wabaName, setWabaName] = useState(restored?.wabaName ?? "")
  const [token, setToken] = useState(restored?.token ?? "")
  const [verifiedAt, setVerifiedAt] = useState<string | undefined>(restored?.verifiedAt)
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
        const session: StoredSession = {
          token,
          metaPhone: String(phoneJson.display_phone_number),
          wabaName: String(wabaJson.name ?? ""),
          verifiedAt: new Date().toISOString(),
        }
        saveSession(session)
        setVerifiedAt(session.verifiedAt)
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

  useEffect(() => {
    if (revalidadoRef.current) return
    if (!restored || !ids.phoneNumberId || !ids.wabaId) return
    revalidadoRef.current = true
    void prueba(restored.token, ids, false)
  }, [ids, prueba, restored])

  const desconectar = useCallback(() => {
    setStatus("sin-configurar")
    setMetaPhone("")
    setWabaName("")
    setToken("")
    setVerifiedAt(undefined)
    setLastError(null)
    setIds({ phoneNumberId: "", wabaId: "" })
    clearDurable(IDS_KEY)
    clearSession()
    const device = getDeviceIdentity()
    const sessionUser = readSession()
    registrarAuditoria({
      categoria: "conexion",
      titulo: "Conexión Meta cerrada",
      detalle: "Sesión e identificadores borrados de este equipo.",
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