const DEVICE_KEY = "fastws.device"

export interface DeviceIdentity {
  id: string
  code: string
  platform: string
  nombre?: string
}

function detectPlatform() {
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return "Windows"
  if (/Macintosh|Mac OS/i.test(ua)) return "macOS"
  if (/Linux/i.test(ua)) return "Linux"
  return "Desconocido"
}

function makeCode() {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `FW-${random}`
}

export function getDeviceIdentity(): DeviceIdentity {
  try {
    const raw = localStorage.getItem(DEVICE_KEY)
    if (raw) return JSON.parse(raw) as DeviceIdentity
  } catch {
    /* storage unavailable */
  }

  const device: DeviceIdentity = {
    id: "PC-01",
    code: makeCode(),
    platform: detectPlatform(),
  }

  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device))
  } catch {
    /* storage unavailable */
  }

  return device
}

export function setDeviceName(nombre: string): DeviceIdentity {
  const device = getDeviceIdentity()
  device.nombre = nombre.trim() || undefined
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device))
  } catch {
    /* storage unavailable */
  }
  return device
}
