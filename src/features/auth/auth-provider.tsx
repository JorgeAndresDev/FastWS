import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { clearSession, readSession, sessionKind, writeSession, type SessionUser } from "./session"
import { getDeviceIdentity } from "./device"
import { codigoRecuperacion, sha256 } from "@/lib/crypto"
import { cerrarSesion, registrarSesion, tieneSesionAbierta } from "@/lib/session-log"

export const DEMO_CREDENTIALS = {
  email: "admin@fastws.local",
  password: "despacho2026",
}

const MIN_DELAY = 600
const RECOVERY_KEY = "fastws.recuperacion.codigo"
const CLAVE_KEY = "fastws.clave.hash"

function delay<T>(value: T, ms = MIN_DELAY) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms))
}

interface StoredRecovery {
  email: string
  hash: string
}

interface StoredClave {
  email: string
  hash: string
}

function leerRecovery(): StoredRecovery | null {
  try {
    const raw = window.localStorage.getItem(RECOVERY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredRecovery>
      if (parsed && typeof parsed.email === "string" && typeof parsed.hash === "string") {
        return { email: parsed.email, hash: parsed.hash }
      }
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return null
}

function leerClave(): StoredClave | null {
  try {
    const raw = window.localStorage.getItem(CLAVE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredClave>
      if (parsed && typeof parsed.email === "string" && typeof parsed.hash === "string") {
        return { email: parsed.email, hash: parsed.hash }
      }
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return null
}

function guardarClave(email: string, hash: string) {
  try {
    window.localStorage.setItem(CLAVE_KEY, JSON.stringify({ email, hash }))
  } catch {
    /* almacenamiento no disponible */
  }
}

function borrarRecovery() {
  try {
    window.localStorage.removeItem(RECOVERY_KEY)
  } catch {
    /* almacenamiento no disponible */
  }
}

interface AuthContextValue {
  user: SessionUser | null
  ready: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => void
  requestRecovery: (email: string) => Promise<string>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const restored = readSession()
    setUser(restored)
    if (restored) {
      const device = getDeviceIdentity()
      if (!tieneSesionAbierta(device.code, restored.name)) {
        registrarSesion({
          usuario: restored.name,
          email: restored.email,
          rol: restored.role,
          recordar: sessionKind() === "recordada",
          equipo: device.code,
          plataforma: device.platform,
          origen: "restaurada",
        })
      }
    }
    setReady(true)
  }, [])

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    await delay(null)
    const usuario = email.trim().toLowerCase()
    if (usuario !== DEMO_CREDENTIALS.email) {
      throw new Error("Usuario o contraseña incorrectos.")
    }
    const claveGuardada = leerClave()
    const claveOk =
      claveGuardada?.email === usuario
        ? (await sha256(password)) === claveGuardada.hash
        : password === DEMO_CREDENTIALS.password
    if (!claveOk) {
      throw new Error("Usuario o contraseña incorrectos.")
    }
    const nextUser: SessionUser = {
      name: "Administrador",
      email: DEMO_CREDENTIALS.email,
      role: "Operativo",
    }
    writeSession(nextUser, remember)
    setUser(nextUser)
    const device = getDeviceIdentity()
    registrarSesion({
      usuario: nextUser.name,
      email: nextUser.email,
      rol: nextUser.role,
      recordar: remember,
      equipo: device.code,
      plataforma: device.platform,
    })
  }, [])

  const signOut = useCallback(() => {
    const device = getDeviceIdentity()
    if (user) cerrarSesion(device.code, user.name)
    clearSession()
    setUser(null)
  }, [user])

  const requestRecovery = useCallback(async (email: string) => {
    await delay(null)
    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email) {
      throw new Error("No hay una cuenta registrada con ese correo.")
    }
    const codigo = codigoRecuperacion()
    const hash = await sha256(codigo)
    try {
      window.localStorage.setItem(
        RECOVERY_KEY,
        JSON.stringify({ email: DEMO_CREDENTIALS.email, hash } satisfies StoredRecovery)
      )
    } catch {
      /* almacenamiento no disponible */
    }
    return codigo
  }, [])

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      await delay(null)
      if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email) {
        throw new Error("No hay una cuenta registrada con ese correo.")
      }
      const recovery = leerRecovery()
      if (!recovery || recovery.email !== DEMO_CREDENTIALS.email || (await sha256(code.trim())) !== recovery.hash) {
        throw new Error("El código de verificación no es válido.")
      }
      if (password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.")
      }
      const hash = await sha256(password)
      guardarClave(recovery.email, hash)
      borrarRecovery()
    },
    []
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signOut, requestRecovery, resetPassword }),
    [user, ready, signIn, signOut, requestRecovery, resetPassword]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return context
}
