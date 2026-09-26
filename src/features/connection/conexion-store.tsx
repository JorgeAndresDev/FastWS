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
  try {
    const raw = window.localStorage.getItem(IDS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ConexionIds>
      return {
        phoneNumberId: String(parsed.phoneNumberId ?? ""),
        wabaId: String(parsed.wabaId ?? ""),
      }
    }
  } catch {
    /* almacenamiento no disponible */
  }
  return { phoneNumberId: "", wabaId: "" }
}

function loadSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSession>
      if (parsed && typeof parsed.token === "string" && parsed.token.length > 0) {
        return {
          token: parsed.token,
          metaPhone: String(parsed.metaPhone ?? ""),
          wabaName: String(parsed.wabaName ?? ""),
          verifiedAt: String(parsed.verifiedAt ?? new Date().toISOString()),
        }
      }
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return null
}

function saveSession(session: StoredSession) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* almacenamiento no disponible */
  }
}

function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* almacenamiento no disponible */
  }
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
    try {
      window.localStorage.setItem(IDS_KEY, JSON.stringify(nuevos))
    } catch {
      /* almacenamiento no disponible */
    }
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
    try {
      window.localStorage.removeItem(IDS_KEY)
    } catch {
      /* almacenamiento no disponible */
    }
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