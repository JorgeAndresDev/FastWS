import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { clearSession, readSession, writeSession, type SessionUser } from "./session"

export const DEMO_CREDENTIALS = {
  email: "admin@fastws.local",
  password: "despacho2026",
}

const MIN_DELAY = 600

function delay<T>(value: T, ms = MIN_DELAY) {
  return new Promise<T>((resolve) => window.setTimeout(() => resolve(value), ms))
}

interface AuthContextValue {
  user: SessionUser | null
  ready: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<void>
  signOut: () => void
  requestRecovery: (email: string) => Promise<void>
  resetPassword: (email: string, code: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUser(readSession())
    setReady(true)
  }, [])

  const signIn = useCallback(async (email: string, password: string, remember: boolean) => {
    await delay(null)
    const matches =
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email &&
      password === DEMO_CREDENTIALS.password
    if (!matches) {
      throw new Error("Usuario o contraseña incorrectos.")
    }
    const nextUser: SessionUser = {
      name: "Administrador",
      email: DEMO_CREDENTIALS.email,
      role: "Operativo",
    }
    writeSession(nextUser, remember)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const requestRecovery = useCallback(async (email: string) => {
    await delay(null)
    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email) {
      throw new Error("No hay una cuenta registrada con ese correo.")
    }
  }, [])

  const resetPassword = useCallback(async (email: string, code: string, password: string) => {
    await delay(null)
    if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email) {
      throw new Error("No hay una cuenta registrada con ese correo.")
    }
    if (code.trim() !== "000000") {
      throw new Error("El código de verificación no es válido.")
    }
    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.")
    }
  }, [])

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
