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
  try {
    return parse(localStorage.getItem(SESSION_KEY)) ?? parse(sessionStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

export function writeSession(user: SessionUser, remember: boolean) {
  const target = remember ? localStorage : sessionStorage
  const stale = remember ? sessionStorage : localStorage
  try {
    stale.removeItem(SESSION_KEY)
    target.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    /* storage unavailable */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable */
  }
}
