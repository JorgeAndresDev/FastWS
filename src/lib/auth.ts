/**
 * Hash de contraseñas con PBKDF2-HMAC-SHA256 (WebCrypto).
 *
 * Por qué PBKDF2 y no SHA-256: `sha256` está bien para verificar integridad,
 * pero una contraseña hasheada con un solo paso de SHA-256 se puede romper a
 * miles de millones de intentos por segundo con una tarjeta gráfica. PBKDF2 con
 * 100 000 iteraciones y una sal por usuario lo vuelve impráctico.
 *
 * Formato guardado: `pbkdf2$<iteraciones>$<sal en base64>$<hash en base64>`.
 * La sal viaja con el hash a propósito: así dos usuarios con la misma contraseña
 * no comparten hash, y verificar no necesita saber nada aparte de la contraseña.
 *
 * Va en JS y no en Rust porque el simulacro corre en un navegador sin Tauri,
 * y WebCrypto ya trae PBKDF2 sin añadir dependencias.
 */

const ITERACIONES = 100_000
const LONGITUD_SAL = 16
const LONGITUD_HASH = 32

function aBase64(bytes: Uint8Array): string {
  let binario = ""
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

function aleatorio(longitud: number): Uint8Array {
  const bytes = new Uint8Array(longitud)
  crypto.getRandomValues(bytes)
  return bytes
}

/** Hash de una contraseña con una sal nueva. Devuelve el formato completo. */
export async function hashPassword(password: string): Promise<string> {
  const sal = aleatorio(LONGITUD_SAL)
  const hash = await derivar(password, sal, ITERACIONES)
  return `pbkdf2$${ITERACIONES}$${aBase64(sal)}$${aBase64(hash)}`
}

async function derivar(password: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: sal as BufferSource, iterations: iteraciones },
    material,
    LONGITUD_HASH * 8,
  )
  return new Uint8Array(bits)
}

/**
 * Verifica una contraseña contra un hash guardado. Devuelve `false` (y no una
 * excepción) si el formato no es el esperado: un hash viejo o corrupto no debe
 * tirar la pantalla de login.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const partes = stored.split("$")
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false
  const iteraciones = Number(partes[1])
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) return false
  try {
    const sal = deBase64(partes[2])
    const esperado = deBase64(partes[3])
    const obtenido = await derivar(password, sal, iteraciones)
    if (obtenido.length !== esperado.length) return false
    // Comparación en tiempo constante: si se sale en cuanto un byte difiere, un
    // atacante puede medir cuánto tardó y deducir el hash byte a byte.
    let diferencia = 0
    for (let i = 0; i < obtenido.length; i += 1) {
      diferencia |= obtenido[i] ^ esperado[i]
    }
    return diferencia === 0
  } catch {
    return false
  }
}

/** Cumplemínimos de la política de contraseña de la app. */
export function validarPassword(password: string): string | null {
  if (password.length < 10) return "La contraseña debe tener al menos 10 caracteres."
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password))
    return "La contraseña debe combinar mayúsculas y minúsculas."
  if (!/\d/.test(password)) return "La contraseña debe incluir al menos un número."
  return null
}