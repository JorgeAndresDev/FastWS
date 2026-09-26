/**
 * Utilidades de exportación CSV compartidas por Reportes y Auditoría.
 *
 * El delimitador es `;` y el salto de línea CRLF (lo que Excel en español
 * espera), así que la celda se entrecomilla si contiene `"`, `;`, CR o LF.
 */

/** Caracteres que abren una fórmula en Excel/Sheets/LibreOffice. */
const FORMULA_INICIO = /^[=+\-@\t\r]/

/**
 * Neutraliza la inyección de fórmulas: una celda que empieza por `=`, `+`, `-`,
 * `@` (o tab/CR) se ejecutaría al abrir el archivo. Se le antepone una comilla
 * simple, que Excel interpreta como texto.
 */
export function neutralizeFormula(value: string): string {
  return FORMULA_INICIO.test(value) ? `'${value}` : value
}

/** Entrecomilla y dobla las comillas dobles cuando el delimitador lo exige. */
export function escapeCell(value: string): string {
  const safe = neutralizeFormula(value)
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

/** Une filas en un CSV con cabecera, `;` y CRLF. */
export function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((cells) => cells.map(escapeCell).join(";")).join("\r\n")
}
