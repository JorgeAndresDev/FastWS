import { useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Check, Copy, FileUp, TriangleAlert } from "lucide-react"
import { sileo } from "sileo"

import { Button, Panel } from "@/components/ui"
import { formatDateStamp } from "@/app/date-stamp"
import { cn, formatNumber } from "@/lib/utils"

import { useClients } from "@/features/clients/clients-store"
import { ClientChip } from "@/features/clients/clients-status"
import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { registrarAuditoria } from "@/lib/audit-log"
import { parseClientCsv, parseClientXlsx, type ImportRow, type ParseResult } from "./csv"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"
const rightCols = ["Código", "Teléfono", "Tipo", "Pedido", "Estado", "Motivo"]
const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."))
    reader.readAsText(file, "UTF-8")
  })
}

function ImportChip({ status }: { status: ImportRow["status"] }) {
  if (status === "valido") {
    return (
      <span className="stamp stamp--proceso">
        <Check aria-hidden />
        Válido
      </span>
    )
  }
  if (status === "duplicado") {
    return (
      <span className="stamp stamp--cancelado">
        <Copy aria-hidden />
        Duplicado
      </span>
    )
  }
  return (
    <span className="stamp stamp--fallido">
      <TriangleAlert aria-hidden />
      Inválido
    </span>
  )
}

const VALIDATION_TEMPLATE = "minmax(16rem, 1fr) 9rem 8.5rem 8rem 7rem 7.5rem minmax(12rem, 1fr)"

function ValidationRowCells({ row }: { row: ImportRow }) {
  const pedido = row.orderState ?? "—"
  return (
    <>
      <div role="cell" className="min-w-0 px-4 py-3">
        <p className="text-[0.8125rem] font-semibold text-ink-100">{row.name}</p>
        <p className="mt-0.5 font-mono text-[0.75rem] text-ink-600">línea {row.line}</p>
      </div>
      <div role="cell" className="overflow-hidden px-4 py-3 font-mono text-[0.75rem] text-ink-500 text-ellipsis">
        {row.code || "—"}
      </div>
      <div role="cell" className="min-w-0 px-4 py-3">
        <p className="font-mono text-[0.75rem] text-ink-500">{row.phone}</p>
        {row.phones.length > 0 && (
          <p className="mt-0.5 font-mono text-[0.75rem] text-ink-600">
            +{row.phones.length} tel.
          </p>
        )}
      </div>
      <div role="cell" className="px-4 py-3">
        <ClientChip clientType={row.clientType} />
      </div>
      <div role="cell" className="px-4 py-3 text-[0.75rem] font-semibold text-ink-400">
        {pedido}
      </div>
      <div role="cell" className="px-4 py-3 text-right">
        <ImportChip status={row.status} />
      </div>
      <div role="cell" className="min-w-0 overflow-hidden px-4 py-3 text-[0.75rem] text-ink-500 text-ellipsis">
        {row.reason || row.cancelReason || "—"}
      </div>
    </>
  )
}

function ValidationTable({ rows }: { rows: ImportRow[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 56,
    overscan: 12,
  })
  const cols = ["Nombre", ...rightCols]
  return (
    <div ref={scrollRef} className="max-h-[24rem] overflow-x-auto overflow-y-auto">
      <div role="table" className="min-w-[64rem]">
        <div
          role="rowgroup"
          className="sticky top-0 z-10 border-b border-rule-soft bg-base-850"
        >
          <div
            role="row"
            className="grid items-center"
            style={{ gridTemplateColumns: VALIDATION_TEMPLATE }}
          >
            {cols.map((h) => (
              <div
                key={h}
                role="columnheader"
                className={cn(th, rightCols.includes(h) && "text-right")}
              >
                {h}
              </div>
            ))}
          </div>
        </div>
        <div
          role="rowgroup"
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index]
            return (
              <div
                key={`${row.line}-${row.phone}`}
                role="row"
                data-index={vi.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 grid w-full border-b border-rule-soft transition-colors hover:bg-base-800/45"
                style={{
                  gridTemplateColumns: VALIDATION_TEMPLATE,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <ValidationRowCells row={row} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { clients, addClients } = useClients()
  const [fileName, setFileName] = useState<string | null>(null)
  const [parse, setParse] = useState<ParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  const isSpreadsheet = (name: string) => /\.(xlsx|xlsm?)$/i.test(name)

  const onFile = async (file: File) => {
    setFileName(file.name)
    setParse(null)
    setImported(false)
    try {
      const result = await sileo.promise(
        (async () => {
          if (isSpreadsheet(file.name)) {
            const bytes = await file.arrayBuffer()
            return parseClientXlsx(bytes, clients)
          }
          const text = await readFileText(file)
          return parseClientCsv(text, clients)
        })(),
        {
          loading: { title: "Leyendo archivo…", description: file.name },
          success: (result) => ({
            title: "Archivo leído",
            description: `${formatNumber(result.valid.length)} válidos · ${formatNumber(
              result.duplicados.length
            )} duplicados · ${formatNumber(result.invalidos.length)} inválidos`,
          }),
          error: (err) => ({
            title: "No se pudo leer el archivo",
            description: err instanceof Error ? err.message : "El archivo no cumple el formato esperado.",
          }),
        }
      )
      setParse(result)
    } catch {
      setParse(null)
    }
  }

  const onDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void onFile(f)
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current++
    setDragOver(true)
  }

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    dragDepth.current--
    if (dragDepth.current <= 0) setDragOver(false)
  }

  const confirmar = () => {
    if (!parse || (parse.valid.length === 0 && parse.duplicados.length === 0) || importing) return
    setImporting(true)
    const aImportar = [...parse.valid, ...parse.duplicados]
      .map((r) => r.client!)
      .filter((c) => c)
    sileo
      .promise(
        (async () => {
          await delay(250)
          return addClients(aImportar)
        })(),
        {
          loading: { title: `Importando ${formatNumber(aImportar.length)} clientes…` },
          success: (res) =>
            res.added === 0 && res.updated === 0
              ? {
                  title: "Plantilla al día",
                  description:
                    "Recorrido completado: ningún código tenía datos por actualizar.",
                }
              : {
                  title: "Clientes importados",
                  description: `${formatNumber(res.added)} nuevos · ${formatNumber(
                    res.updated
                  )} actualizados por Código.`,
                },
          error: (err) => ({
            title: "No se pudo importar",
            description: err instanceof Error ? err.message : "Ocurrió un error durante la importación.",
          }),
        }
      )
      .then((res) => {
        const device = getDeviceIdentity()
        const session = readSession()
        registrarAuditoria({
          categoria: "importacion",
          titulo: "Clientes importados",
          detalle: `${formatNumber(res.added)} nuevos · ${formatNumber(
            res.updated
          )} actualizados por Código.`,
          entidad: fileName ?? "—",
          usuario: session?.name ?? "Operador",
          dispositivo: `${device.id} · ${device.code}`,
        })
        setImported(true)
      })
      .finally(() => setImporting(false))
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <FileUp className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning>
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Importar clientes</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Asistente de importación desde el archivo Madre (Excel multihoja) o CSV: reconciliación
          por Código, validación de teléfonos, duplicados, resumen y confirmación. Arrastra tu
          archivo a la zona o selecciónalo con el botón.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {/* ── Paso 1 · Fichero ── */}
        <Panel title="1 · Fichero Excel (Madre) o CSV">
          <div
            role="button"
            tabIndex={0}
            aria-label="Arrastra un archivo CSV o Excel o selecciónalo"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                fileRef.current?.click()
              }
            }}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDrop={onDropFiles}
            className={cn(
              "mx-5 my-4 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200",
              dragOver
                ? "border-rule bg-base-750 ring-2 ring-rule"
                : "border-rule-soft bg-base-800/40 hover:border-ink-500 hover:bg-base-800/70"
            )}
          >
            <FileUp className={cn("size-8", dragOver ? "text-ink-200" : "text-ink-500")} aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-ink-200">
                {dragOver ? "¡Suelta el archivo aquí!" : "Arrastra y suelta tu archivo aquí"}
              </p>
              <p className="text-xs text-ink-500">
                <span className="font-mono">.csv</span> · <span className="font-mono">.xlsx</span>{" "}
                · <span className="font-mono">.xls</span> — o haz clic para seleccionarlo
              </p>
            </div>
            {fileName && (
              <span className={cn("tabular-nums text-xs", parse ? "text-ink-300" : "text-ink-500")}>
                {fileName}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-3 px-5 pb-5">
            <p className="text-xs text-ink-500">
              Archivo Madre: las hojas{" "}
              <span className="font-mono">ETA</span> (base de todos los clientes),{" "}
              <span className="font-mono">PENDIENTES</span> y{" "}
              <span className="font-mono">CANCELADOS</span> (estado del pedido) y las{" "}
              <span className="font-mono">BASES</span> (otros teléfonos y ciudad) se combinan por{" "}
              <span className="font-mono">Código</span>. Claves: Código, Nombre, Celular, Hora
              inicial/final, 57 (+57), IsCashless?, MOTIVO, En ruta?, Telefonos, UN. Tipo: Cashless
              o Normal.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onFile(f)
                  e.currentTarget.value = ""
                }}
              />
              <Button
                variant="secondary"
                icon={<FileUp className="size-4" aria-hidden />}
                onClick={() => fileRef.current?.click()}
              >
                {dragOver ? "Suelta el archivo aquí" : "Buscar archivo"}
              </Button>
            </div>
          </div>
        </Panel>

        {/* ── Paso 2 · Validación ── */}
        {parse && parse.rows.length > 0 && (
          <Panel
            title="2 · Validación (un cliente por Código)"
            action={
              <span className="tabular-nums text-xs text-ink-500">
                {formatNumber(parse.rows.length)} filas · {formatNumber(parse.valid.length)}{" "}
                válidas · {formatNumber(parse.duplicados.length)} duplicadas
              </span>
            }
          >
            <ValidationTable rows={parse.rows} />
          </Panel>
        )}

        {/* ── Paso 3 · Resumen y confirmación ── */}
        {parse &&
          (parse.valid.length > 0 || parse.duplicados.length > 0) && (
            <Panel title="3 · Resumen y confirmación">
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
                    {formatNumber(parse.valid.length + parse.duplicados.length)} clientes listos
                    para importar
                  </span>
                  <p className="text-xs text-ink-500">
                    {parse.duplicados.length > 0 &&
                      `${formatNumber(parse.duplicados.length)} duplicados se actualizarán por Código y `}
                    {formatNumber(parse.invalidos.length)} inválidos quedan fuera del registro.
                  </p>
                </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="primary"
                  icon={<FileUp className="size-4" aria-hidden />}
                  loading={importing}
                  disabled={imported}
                  onClick={confirmar}
                >
                  {imported
                    ? "Clientes importados"
                    : `Importar ${formatNumber(parse.valid.length + parse.duplicados.length)} clientes`}
                </Button>
                {imported && (
                  <span className="stamp stamp--entregado stamp--container">
                    <Check aria-hidden />
                    Confirmado
                  </span>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}