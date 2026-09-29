import { readDurable, writeDurable } from "@/lib/db/session-scope"

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
  const raw = readDurable(DEVICE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as DeviceIdentity
    } catch {
      /* dato corrupto: se regenera abajo */
    }
  }

  const device: DeviceIdentity = {
    id: "PC-01",
    code: makeCode(),
    platform: detectPlatform(),
  }

  writeDurable(DEVICE_KEY, JSON.stringify(device))

  return device
}

export function setDeviceName(nombre: string): DeviceIdentity {
  const device = getDeviceIdentity()
  device.nombre = nombre.trim() || undefined
  writeDurable(DEVICE_KEY, JSON.stringify(device))
  return device
}
