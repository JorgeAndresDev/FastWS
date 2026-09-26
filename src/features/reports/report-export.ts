import type { ReportMessage } from "./report-records"
import { esAceptado, esFallido } from "./report-records"
import { hourMinute } from "./report-dates"

const tipoLabel: Record<ReportMessage["tipo"], string> = {
  mensaje: "Mensaje",
  respuesta: "Respuesta",
  ejemplo: "Ejemplo",
}

const COLS: Array<{ key: string; label: string }> = [
  { key: "tipo", label: "Registro" },
  { key: "fecha", label: "Fecha" },
  { key: "campana", label: "Campaña" },
  { key: "cliente", label: "Cliente" },
  { key: "telefono", label: "Teléfono" },
  { key: "estado", label: "Estado" },
  { key: "ok", label: "Exitoso" },
  { key: "viaTemplate", label: "Plantilla" },
  { key: "wamid", label: "ID Meta" },
  { key: "errorCode", label: "Código error" },
  { key: "errorMessage", label: "Detalle error" },
  { key: "usuario", label: "Usuario" },
  { key: "dispositivo", label: "Dispositivo" },
  { key: "texto", label: "Texto" },
]

function cell(row: ReportMessage, key: string): string {
  switch (key) {
    case "tipo":
      return tipoLabel[row.tipo]
    case "fecha":
      return `${row.fecha.slice(0, 10)} ${hourMinute(row.fecha)}`
    case "ok":
      return esAceptado(row) ? "Sí" : esFallido(row) ? "No" : ""
    case "viaTemplate":
      return row.viaTemplate ? "Sí" : row.tipo === "respuesta" ? "No" : ""
    default:
      return String((row as unknown as Record<string, unknown>)[key] ?? "")
  }
}

/**
 * Neutraliza la inyección de fórmulas: una celda que empieza por = + - @ (o tab/CR)
 * la ejecuta Excel/Sheets al abrirse. Se le antepone una comilla simple.
 */
function neutralizeFormula(value: string) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

function escapeCell(value: string) {
  const safe = neutralizeFormula(value)
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: ReportMessage[]): string {
  const header = COLS.map((column) => column.label).join(";")
  const lines = rows.map((row) =>
    COLS.map((column) => escapeCell(cell(row, column.key))).join(";")
  )
  return [header, ...lines].join("\r\n")
}

export function exportCsv(rows: ReportMessage[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `reporte-mensajes-${stamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function printReport() {
  window.print()
}