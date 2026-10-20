import type { SessionUser } from "./session"
import { hashPassword, verifyPassword } from "@/lib/auth"
import { readDurable, writeDurable } from "@/lib/db/session-scope"

/**
 * Usuarios de la app, guardados como un documento en el almacén de la sesión.
 *
 * Por qué un documento y no la tabla `users` del esquema: el simulacro corre en
 * un navegador sin Tauri, y toda la persistencia de la app pasa por este mismo
 * almacén. La tabla `users` existe para la migración relacional (Fase 4), que
 * moverá estas filas sin cambiar el contrato del repositorio.
 *
 * Lo que aquí se guarda es el **hash** PBKDF2, nunca la contraseña. Incluso así,
 * el hash es lo bastante valioso como para no dejarlo en claro: el documento
 * viaja como el resto de los datos de la app, y la contraseña en sí solo existe
 * dentro del proceso mientras se escribe.
 */

const USERS_KEY = "fastws.users"

export interface StoredUser {
  id: string
  email: string
  name: string
  role: string
  passwordHash: string
  createdAt: string
}

function parse(raw: string | null): StoredUser[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (u): u is StoredUser =>
        u != null &&
        typeof u === "object" &&
        typeof (u as StoredUser).id === "string" &&
        typeof (u as StoredUser).email === "string" &&
        typeof (u as StoredUser).passwordHash === "string"
    )
  } catch {
    return []
  }
}

export function listUsers(): StoredUser[] {
  return parse(readDurable(USERS_KEY))
}

function saveUsers(users: StoredUser[]) {
  writeDurable(USERS_KEY, JSON.stringify(users))
}

/** ¿Hay al menos un usuario? En el primer arranque no, y la app lo usa para
 *  mostrar la pantalla de alta en vez de la de login. */
export function hasUsers(): boolean {
  return listUsers().length > 0
}

export function findUserByEmail(email: string): StoredUser | null {
  const normalizado = email.trim().toLowerCase()
  return listUsers().find((u) => u.email === normalizado) ?? null
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role?: string
}): Promise<StoredUser> {
  const emailNormalizado = input.email.trim().toLowerCase()
  if (findUserByEmail(emailNormalizado)) {
    throw new Error("Ya hay un operador registrado con ese correo.")
  }
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email: emailNormalizado,
    name: input.name.trim(),
    role: input.role ?? "Operativo",
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
  }
  saveUsers([...listUsers(), user])
  return user
}

export async function verifyUser(email: string, password: string): Promise<StoredUser | null> {
  const user = findUserByEmail(email)
  if (!user) return null
  return (await verifyPassword(password, user.passwordHash)) ? user : null
}

export function toSessionUser(user: StoredUser): SessionUser {
  return { name: user.name, email: user.email, role: user.role }
}