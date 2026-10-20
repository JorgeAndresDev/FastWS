import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { codigoRecuperacion, sha256 } from "@/lib/crypto"
import { hashPassword, validarPassword } from "@/lib/auth"
import { clearSession, readSession, sessionKind, writeSession, type SessionUser } from "./session"
import { getDeviceIdentity } from "./device"
import { cerrarSesion, registrarSesion, tieneSesionAbierta } from "@/lib/session-log"
import { clearDurable, readDurable, writeDurable } from "@/lib/db/session-scope"
import {
  createUser,
  findUserByEmail,
  hasUsers,
  listUsers,
  toSessionUser,
  verifyUser,
} from "./users"

const MIN_DELAY = 600
const RECOVERY_KEY = "fastws.recuperacion.codigo"

function delay<T>(value: T, ms = MIN_DELAY) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms))
}

interface StoredRecovery {
  email: string
  hash: string
}

function leerRecovery(): StoredRecovery | null {
  const raw = readDurable(RECOVERY_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredRecovery>
      if (parsed && typeof parsed.email === "string" && typeof parsed.hash === "string") {
        return { email: parsed.email, hash: parsed.hash }
      }
    } catch {
      /* datos corruptos */
    }
  }
  return null
}

function borrarRecovery() {
  clearDurable(RECOVERY_KEY)
}

export interface AuthContextValue {
  user: SessionUser | null
  ready: boolean
  /** `true` cuando no hay ningún operador todavía: la app muestra el alta. */
  bootstrapNeeded: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => void
  createAdmin: (name: string, email: string, password: string) => Promise<void>
  requestRecovery: (email: string) => Promise<string>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)
  const [bootstrapNeeded, setBootstrapNeeded] = useState(false)

  useEffect(() => {
    let vivo = true
    void (async () => {
      // El alta va antes que la sesión: si no hay usuarios no tiene sentido
      // restaurar una, porque no habría con quién.
      const hayUsuarios = hasUsers()
      if (!vivo) return
      setBootstrapNeeded(!hayUsuarios)
      if (!hayUsuarios) {
        setReady(true)
        return
      }
      const restored = readSession()
      if (restored && vivo) {
        setUser(restored)
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
      if (vivo) setReady(true)
    })()
    return () => {
      vivo = false
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    await delay(null)
    const usuario = email.trim().toLowerCase()
    const encontrado = await verifyUser(usuario, password)
    if (!encontrado) {
      throw new Error("Usuario o contraseña incorrectos.")
    }
    const nextUser = toSessionUser(encontrado)
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

  const createAdmin = useCallback(async (name: string, email: string, password: string) => {
    await delay(null)
    const error = validarPassword(password)
    if (error) throw new Error(error)
    const creado = await createUser({ name, email, password, role: "Administrador" })
    const nextUser = toSessionUser(creado)
    writeSession(nextUser, true)
    setUser(nextUser)
    setBootstrapNeeded(false)
    const device = getDeviceIdentity()
    registrarSesion({
      usuario: nextUser.name,
      email: nextUser.email,
      rol: nextUser.role,
      recordar: true,
      equipo: device.code,
      plataforma: device.platform,
    })
  }, [])

  const requestRecovery = useCallback(async (email: string) => {
    await delay(null)
    const normalizado = email.trim().toLowerCase()
    if (!findUserByEmail(normalizado)) {
      throw new Error("No hay una cuenta registrada con ese correo.")
    }
    const codigo = codigoRecuperacion()
    const hash = await sha256(codigo)
    writeDurable(
      RECOVERY_KEY,
      JSON.stringify({ email: normalizado, hash } satisfies StoredRecovery)
    )
    return codigo
  }, [])

  const resetPassword = useCallback(
    async (email: string, code: string, password: string) => {
      await delay(null)
      const normalizado = email.trim().toLowerCase()
      const error = validarPassword(password)
      if (error) throw new Error(error)
      const recovery = leerRecovery()
      if (
        !recovery ||
        recovery.email !== normalizado ||
        (await sha256(code.trim())) !== recovery.hash
      ) {
        throw new Error("El código de verificación no es válido.")
      }
      const existente = findUserByEmail(normalizado)
      if (!existente) {
        throw new Error("No hay una cuenta registrada con ese correo.")
      }
      // La contraseña se vuelve a hashear con PBKDF2 y se guarda solo en
      // `fastws.users`; el SHA-256 viejo (`fastws.clave.hash`) ya no se usa.
      const nuevoHash = await hashPassword(password)
      writeDurable(
        "fastws.users",
        JSON.stringify(listUsers().map((u) => (u.email === normalizado ? { ...u, passwordHash: nuevoHash } : u)))
      )
      borrarRecovery()
    },
    []
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      bootstrapNeeded,
      signIn,
      signOut,
      createAdmin,
      requestRecovery,
      resetPassword,
    }),
    [user, ready, bootstrapNeeded, signIn, signOut, createAdmin, requestRecovery, resetPassword]
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