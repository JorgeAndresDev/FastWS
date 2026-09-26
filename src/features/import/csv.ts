import * as XLSX from "xlsx"
import type { Client, ClientKind, OrderState } from "@/types"

export type ImportRowStatus = "valido" | "duplicado" | "invalido"

export interface ImportRow {
  line: number
  code: string
  name: string
  phone: string
  phones: string[]
  clientType: ClientKind
  orderState?: OrderState
  cancelReason?: string
  enRuta?: boolean
  horaInicial?: string
  horaFinal?: string
  city?: string
  status: ImportRowStatus
  reason: string
  client?: Client
}

const DAY_ISO = new Date().toISOString().slice(0, 10)

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

type Field =
  | "codigo"
  | "nombre"
  | "celular"
  | "telefonos"
  | "relefono"
  | "fono57"
  | "fono60"
  | "tipo"
  | "motivo"
  | "enruta"
  | "orderstate"
  | "horainicial"
  | "horafinal"
  | "ciudad"
  | "zona"

const HEADER_MAP: Record<string, Field> = {
  codigo: "codigo",
  cod: "codigo",
  cc: "codigo",
  cedula: "codigo",
  codigocliente: "codigo",
  nombre: "nombre",
  cliente: "nombre",
  razonsocial: "nombre",
  celular: "celular",
  numero: "celular",
  telefono: "celular",
  movil: "celular",
  telefonos: "telefonos",
  telefono2: "telefonos",
  otros: "telefonos",
  relefono: "relefono",
  telprincipal: "relefono",
  whatsapp: "fono57",
  internacional: "fono57",
  intl: "fono57",
  "57": "fono57",
  fijo: "fono60",
  "60": "fono60",
  tipo: "tipo",
  tipocliente: "tipo",
  iscashless: "tipo",
  escashless: "tipo",
  cashlee: "tipo",
  cashless: "tipo",
  motivo: "motivo",
  razon: "motivo",
  causa: "motivo",
  enruta: "enruta",
  ruta: "enruta",
  pedido: "orderstate",
  pedidostate: "orderstate",
  estadopedido: "orderstate",
  orderstate: "orderstate",
  estadoorder: "orderstate",
  horainicial: "horainicial",
  horadesde: "horainicial",
  inicio: "horainicial",
  horafinal: "horafinal",
  horahasta: "horafinal",
  fin: "horafinal",
  un: "ciudad",
  ciudad: "ciudad",
  zona: "zona",
  sector: "zona",
}

const cell = (v: unknown) => (v == null ? "" : String(v).trim())

const cleanDigits = (s: string) => {
  let d = s.replace(/\D/g, "")
  if (/^57\d{10}$/.test(d)) d = d.slice(2)
  return d
}

const cellPhone = (v: unknown) => cleanDigits(cell(v))

const cellPhones = (v: unknown) =>
  cell(v)
    .split(/[,;/\n|]+/)
    .map(cleanDigits)
    .filter((d) => d.length > 0)

const isMobile = (p: string) => /^3\d{9}$/.test(p)

const isYes = (v: string) => /^(si|sí|1|true|verdadero|x)$/i.test(v.trim())

function orderStateOf(v: string): OrderState | undefined {
  const s = v.trim().toLowerCase()
  if (s.includes("cancel")) return "CANCELADO"
  if (s.includes("pendient") || s.includes("proces") || s.includes("espera")) return "PENDIENTE"
  return undefined
}

function cashlessValue(v: string): boolean | undefined {
  const s = v.trim().toLowerCase()
  if (/^(si|sí|1|true|verdadero|cashlee|caslee|cashless)$/.test(s)) return true
  if (/^(no|0|false|falso|normal)$/.test(s)) return false
  return undefined
}

function toClock(v: unknown): string {
  if (v == null || v === "") return ""
  if (typeof v === "number" && v >= 0 && v <= 1) {
    const total = Math.round(v * 24 * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  }
  return String(v).trim()
}

function titleCase(v: string) {
  return v
    .toLowerCase()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase())
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

export interface ParseResult {
  rows: ImportRow[]
  valid: ImportRow[]
  duplicados: ImportRow[]
  invalidos: ImportRow[]
}

type SheetKind = "eta" | "cancelados" | "pendientes" | "cashless" | "baseclientes" | "generic"

function sheetKind(sheetName: string): SheetKind {
  const n = norm(sheetName)
  if (n.includes("eta")) return "eta"
  if (n.includes("cancelad")) return "cancelados"
  if (n.includes("pendient")) return "pendientes"
  if (n.includes("cashless")) return "cashless"
  if (n.includes("base") || n.includes("clientes")) return "baseclientes"
  return "generic"
}

interface Draft {
  code: string
  name: string
  celular: string
  fono57: string
  relefono: string
  extras: string[]
  cashless?: boolean
  orderState?: OrderState
  cancelReason?: string
  enRuta?: boolean
  horaInicial?: string
  horaFinal?: string
  city?: string
  zone?: string
  line: number
}

function buildRows(sheets: { name: string; matrix: string[][] }[], existing: Client[]) {
  const existingCodes = new Set(existing.map((c) => c.code))
  const drafts = new Map<string, Draft>()
  const orphans: Draft[] = []
  let processedAny = false

  for (const { name: sheetName, matrix } of sheets) {
    if (matrix.length < 2) continue

    const kind = sheetKind(sheetName)
    const headers = matrix[0].map((h) => norm(h ?? ""))
    const cols = new Map<Field, number>()
    headers.forEach((h, idx) => {
      const field = HEADER_MAP[h]
      if (field && !cols.has(field)) cols.set(field, idx)
    })

    const has = (f: Field) => cols.has(f)
    if (!has("codigo") || !has("nombre")) continue
    processedAny = true

    const get = (row: string[], f: Field) => (cols.has(f) ? cell(row[cols.get(f)!]) : "")

    for (let i = 1; i < matrix.length; i++) {
      const row = matrix[i]
      const code = get(row, "codigo")
      const name = get(row, "nombre")
      if (!code && !name) continue

      const make = (): Draft => ({
        code,
        name: "",
        celular: "",
        fono57: "",
        relefono: "",
        extras: [],
        line: i + 1,
      })

      const draft = code ? drafts.get(code) ?? make() : make()
      if (code && !drafts.has(code)) drafts.set(code, draft)

      if (!draft.name && name) draft.name = name
      if (!draft.celular) draft.celular = cellPhone(get(row, "celular"))
      if (!draft.fono57) draft.fono57 = cellPhone(get(row, "fono57"))
      if (!draft.relefono) draft.relefono = cellPhone(get(row, "relefono"))
      if (!draft.city) draft.city = get(row, "ciudad")
      if (!draft.zone) draft.zone = get(row, "zona")
      if (!draft.horaInicial) draft.horaInicial = toClock(get(row, "horainicial"))
      if (!draft.horaFinal) draft.horaFinal = toClock(get(row, "horafinal"))

      const cashV = cashlessValue(get(row, "tipo"))
      if (cashV === true) draft.cashless = true
      else if (cashV === false && draft.cashless !== true) draft.cashless = false

      if (kind === "cancelados") {
        draft.orderState = "CANCELADO"
        if (!draft.cancelReason) draft.cancelReason = get(row, "motivo")
        const enRuta = get(row, "enruta")
        if (enRuta) draft.enRuta = isYes(enRuta)
      } else if (kind === "pendientes" && draft.orderState !== "CANCELADO") {
        draft.orderState = "PENDIENTE"
      } else if (kind === "cashless") {
        draft.cashless = true
      } else if (kind === "baseclientes") {
        draft.extras.push(...cellPhones(get(row, "telefonos")))
      } else {
        const state = orderStateOf(get(row, "orderstate"))
        if (state && !draft.orderState) draft.orderState = state
        if (!draft.cancelReason) draft.cancelReason = get(row, "motivo") || undefined
        const enRuta = get(row, "enruta")
        if (enRuta) draft.enRuta = isYes(enRuta)
        draft.extras.push(...cellPhones(get(row, "telefonos")))
      }

      if (!code) orphans.push(draft)
    }
  }

  if (!processedAny) {
    throw new Error(
      'Falta la columna obligatoria "Código" o "Nombre" en la hoja; usa estilos ETA, PENDIENTES, CANCELADOS o BASES.'
    )
  }

  const rows: ImportRow[] = []
  const indexes = new Map<string, number>()

  const emit = (draft: Draft) => {
    const cands: string[] = []
    const push = (p: string) => {
      if (p && !cands.includes(p)) cands.push(p)
    }
    push(draft.fono57)
    push(draft.celular)
    push(draft.relefono)
    draft.extras.forEach(push)

    const phone = cands.find(isMobile) ?? cands[0] ?? ""
    const phones = cands.filter((p) => p !== phone)
    const name = titleCase(draft.name) || draft.name
    const clientType: ClientKind = draft.cashless ? "CASHLESS" : "NORMAL"

    let status: ImportRowStatus = "valido"
    let reason = ""
    let client: Client | undefined

    if (!draft.code) {
      status = "invalido"
      reason = "falta el código"
    } else if (!name) {
      status = "invalido"
      reason = "nombre vacío"
    } else if (!isMobile(phone)) {
      status = "invalido"
      reason = `número inválido (${phone || "vacío"}): se requiere un móvil de 10 dígitos que empiece con 3`
    } else if (existingCodes.has(draft.code)) {
      status = "duplicado"
      reason = "código ya registrado (se actualizará)"
    }

    if (status !== "invalido" && draft.code) {
      const key = `c_${draft.code}_${Date.now()}`
      const n = indexes.get(key) ?? 0
      indexes.set(key, n + 1)
      client = {
        id: `${key}_${n}`,
        code: draft.code,
        name,
        phone,
        phones,
        company: "—",
        city: draft.city || "—",
        zone: draft.zone || "—",
        clientType,
        status: "activo",
        valid: isMobile(phone),
        horaInicial: draft.horaInicial || undefined,
        horaFinal: draft.horaFinal || undefined,
        orderState: draft.orderState,
        cancelReason: draft.cancelReason || undefined,
        enRuta: draft.enRuta,
        createdAt: DAY_ISO,
      }
    }

    rows.push({
      line: draft.line,
      code: draft.code,
      name,
      phone,
      phones,
      clientType,
      orderState: draft.orderState,
      cancelReason: draft.cancelReason,
      enRuta: draft.enRuta,
      horaInicial: draft.horaInicial,
      horaFinal: draft.horaFinal,
      city: draft.city,
      status,
      reason,
      client,
    })
  }

  ;[...drafts.values()].sort((a, b) => a.line - b.line).forEach(emit)
  orphans.forEach(emit)

  if (rows.length === 0) {
    throw new Error("El archivo no contiene filas de clientes.")
  }

  return {
    rows,
    valid: rows.filter((r) => r.status === "valido"),
    duplicados: rows.filter((r) => r.status === "duplicado"),
    invalidos: rows.filter((r) => r.status === "invalido"),
  }
}

export function parseClientCsv(text: string, existing: Client[]): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "")
  const matrix = lines.map(splitCsvLine)
  return buildRows([{ name: "CSV", matrix }], existing)
}

export function parseClientXlsx(bytes: ArrayBuffer, existing: Client[]): ParseResult {
  const wb = XLSX.read(bytes, { type: "array" })
  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    const matrix = ws
      ? (XLSX.utils.sheet_to_json<string[]>(ws, {
          header: 1,
          defval: "",
          raw: true,
          blankrows: false,
        }) as unknown[][]).map((row) => row.map(cell))
      : []
    return { name, matrix }
  })
  if (sheets.length === 0) {
    throw new Error("El libro no contiene ninguna hoja con datos.")
  }
  return buildRows(sheets, existing)
}