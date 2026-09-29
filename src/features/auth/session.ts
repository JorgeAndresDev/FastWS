import {
  clearDurable,
  clearEphemeral,
  readDurable,
  readEphemeral,
  writeDurable,
  writeEphemeral,
} from "@/lib/db/session-scope"

export interface SessionUser {
  name: string
  email: string
  role: string
}

const SESSION_KEY = "fastws.session"

function parse(raw: string | null): SessionUser | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function readSession(): SessionUser | null {
  return parse(readDurable(SESSION_KEY)) ?? parse(readEphemeral(SESSION_KEY))
}

/**
 * "Recordar" es lo unico que cambia de alcance: la sesion temporal muere con la
 * ventana, la recordada se queda en la base. Escribir en una implica borrar la
 * otra, que es como funcionaba cuando ambas eran localStorage/sessionStorage.
 */
export function writeSession(user: SessionUser, remember: boolean) {
  const raw = JSON.stringify(user)
  if (remember) {
    writeDurable(SESSION_KEY, raw)
    clearEphemeral(SESSION_KEY)
  } else {
    writeEphemeral(SESSION_KEY, raw)
    clearDurable(SESSION_KEY)
  }
}

export type SessionKind = "recordada" | "temporal" | null

export function sessionKind(): SessionKind {
  if (readDurable(SESSION_KEY)) return "recordada"
  if (readEphemeral(SESSION_KEY)) return "temporal"
  return null
}

export function clearSession() {
  clearDurable(SESSION_KEY)
  clearEphemeral(SESSION_KEY)
}
