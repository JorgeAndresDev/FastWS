import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Eye, LayoutTemplate, Link2, Plus, RefreshCw, Search, Send, TriangleAlert, Trash2, X } from "lucide-react"
import { sileo } from "sileo"

import { Button, FormField, Input, Panel } from "@/components/ui"
import { formatDateStamp, formatDateShort } from "@/app/date-stamp"
import { cn } from "@/lib/utils"

import { createTemplate, deleteTemplate, graphError, listTemplates, sendTemplate } from "@/lib/wsb/api"
import type { CreateTemplateInput, TemplateComponentInput } from "@/lib/wsb/api"
import type { TemplateCategory, WaTemplate } from "@/types"

import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { registrarAuditoria } from "@/lib/audit-log"
import { useConexion } from "@/features/connection/conexion-store"
import {
  categoryLabel,
  componentText,
  detectVariables,
  languageLabel,
  QualityBadge,
  TemplateStatusChip,
} from "./template-status"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"
const TEMPLATES_TEMPLATE = "minmax(16rem, 1fr) 9.5rem 8.5rem 9rem 9rem 10.5rem"
const LANGUAGES = ["es", "es_CO", "es_MX", "es_AR", "es_CL", "en", "en_US", "pt", "pt_BR", "fr"]
const CATEGORIES: TemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"]
const TEMPLATES_KEY = "fastws.plantillas"
const inputBase =
  "h-10 w-full rounded-md border bg-base-800 px-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60 focus-visible:outline-2 focus-visible:outline-offset-2"

function toWhatsAppNumber(display: string) {
  const digits = display.replace(/\D/g, "")
  return digits.startsWith("57") ? digits : `57${digits}`
}

function shortWamid(wamid: string) {
  return wamid.length > 40 ? `${wamid.slice(0, 37)}…` : wamid
}

function TemplateRowActions({
  template,
  onSelect,
  onTest,
}: {
  template: WaTemplate
  onSelect: () => void
  onTest: () => void
}) {
  const approved = template.status === "APPROVED"
  return (
    <div
      role="cell"
      className="flex items-center gap-2 px-4 py-3"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        size="sm"
        variant="primary"
        icon={<Send className="size-3.5" aria-hidden />}
        disabled={!approved}
        title={approved ? "Enviar a tu número de empresa" : "Solo aprobadas se pueden probar"}
        onClick={onTest}
      >
        Probar
      </Button>
      <Button size="sm" variant="ghost" icon={<Eye className="size-3.5" aria-hidden />} onClick={onSelect}>
        Ver
      </Button>
    </div>
  )
}

function TemplatesTable({
  templates,
  selectedId,
  onSelect,
  onTest,
}: {
  templates: WaTemplate[]
  selectedId: string | null
  onSelect: (template: WaTemplate) => void
  onTest: (template: WaTemplate) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: templates.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 60,
    overscan: 12,
  })
  const cols = ["Plantilla", "Estado", "Categoría", "Calidad", "Actualizado", "Acciones"]
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="stamp stamp--fecha stamp--container">Sin plantillas</span>
        <p className="max-w-sm text-xs leading-relaxed text-ink-500">
          No hay plantillas que coincidan con el filtro. Sincroniza de nuevo o crea una nueva
          plantilla para este número de WhatsApp Business.
        </p>
      </div>
    )
  }
  return (
    <div ref={scrollRef} className="max-h-[32rem] overflow-x-auto overflow-y-auto">
      <div role="table" className="min-w-[64rem]">
        <div role="rowgroup" className="sticky top-0 z-10 border-b border-rule-soft bg-base-850">
          <div
            role="row"
            className="grid items-center"
            style={{ gridTemplateColumns: TEMPLATES_TEMPLATE }}
          >
            {cols.map((header) => (
              <div key={header} role="columnheader" className={th}>
                {header}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup" className="relative" style={{ height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const template = templates[vi.index]
            const selected = template.id === selectedId
            const body = componentText(template, "BODY")
            const variables = detectVariables(body)
            return (
              <div
                key={template.id}
                role="row"
                data-index={vi.index}
                ref={virtualizer.measureElement}
                onClick={() => onSelect(template)}
                className={cn(
                  "absolute left-0 top-0 grid w-full cursor-pointer border-b border-rule-soft transition-colors hover:bg-base-800/45",
                  selected && "bg-base-800/70"
                )}
                style={{
                  gridTemplateColumns: TEMPLATES_TEMPLATE,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                <div role="cell" className="min-w-0 px-4 py-3">
                  <p className="truncate font-mono text-[0.8125rem] font-semibold text-ink-100">
                    {template.name}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-ink-600">
                    {variables.length > 0
                      ? `${variables.length} variable${variables.length === 1 ? "" : "s"} · `
                      : ""}
                    {languageLabel(template.language)}
                  </p>
                </div>
                <div role="cell" className="px-4 py-3">
                  <TemplateStatusChip status={template.status} />
                </div>
                <div role="cell" className="px-4 py-3 text-[0.8125rem] text-ink-300">
                  {categoryLabel[template.category] ?? template.category}
                </div>
                <div role="cell" className="px-4 py-3">
                  <QualityBadge quality={template.qualityScore} />
                </div>
                <div role="cell" className="px-4 py-3 tabular-nums text-[0.75rem] text-ink-500">
                  {template.updatedAt
                    ? formatDateShort(new Date(template.updatedAt * 1000).toISOString())
                    : "—"}
                </div>
                <TemplateRowActions
                  template={template}
                  onSelect={() => onSelect(template)}
                  onTest={() => onTest(template)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TemplateDetail({
  template,
  wabaId,
  phoneNumberId,
  token,
  to,
  onClose,
  onDeleted,
}: {
  template: WaTemplate
  wabaId: string
  phoneNumberId: string
  token: string
  to: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const body = componentText(template, "BODY")
  const header = componentText(template, "HEADER")
  const footer = componentText(template, "FOOTER")
  const variables = detectVariables(body)
  const approved = template.status === "APPROVED"

  const test = () => {
    setTesting(true)
    const bodyComponent = template.components.find((c) => c.type === "BODY")
    const headerComponent = template.components.find((c) => c.type === "HEADER")
    let bodyParams: string[] | undefined
    if (variables.length > 0) {
      bodyParams = bodyComponent?.example?.body_text?.[0]?.slice(0, variables.length) ?? []
      while (bodyParams.length < variables.length) {
        bodyParams.push(`Ejemplo ${bodyParams.length + 1}`)
      }
    }
    let headerParams: string[] | undefined
    if (header) {
      headerParams = headerComponent?.example?.header_text?.[0]
        ? [headerComponent.example.header_text[0]]
        : ["Cabecera de ejemplo"]
    }
    sileo
      .promise(
        (async () =>
          sendTemplate({
            phoneNumberId,
            token,
            to,
            templateName: template.name,
            languageCode: template.language,
            bodyParams,
            headerParams,
          }))(),
        {
          loading: { title: "Enviando mensaje de prueba…", description: template.name },
          success: (result) => ({
            title: "Mensaje de prueba enviado",
            description: `Meta aceptó el envío · ${shortWamid(result.wamid)}`,
          }),
          error: (err) => ({
            title: "No se pudo probar la plantilla",
            description: graphError(err).message,
          }),
        }
      )
      .finally(() => setTesting(false))
  }

  const remove = () => {
    setDeleting(true)
    sileo
      .promise(
        (async () => {
          await deleteTemplate(wabaId, token, {
            name: template.name,
            hsmId: template.id,
          })
        })(),
        {
          loading: { title: "Eliminando plantilla…", description: template.name },
          success: () => ({
            title: "Plantilla eliminada",
            description: `${template.name} fue borrada de la cuenta de WhatsApp Business.`,
          }),
          error: (err) => ({
            title: "No se pudo eliminar la plantilla",
            description: graphError(err).message,
          }),
        }
      )
      .then(() => {
        const device = getDeviceIdentity()
        const session = readSession()
        registrarAuditoria({
          categoria: "plantilla",
          titulo: "Plantilla eliminada",
          detalle: template.name,
          entidad: template.name,
          usuario: session?.name ?? "Operador",
          dispositivo: `${device.id} · ${device.code}`,
        })
        onDeleted()
      })
      .finally(() => {
        setDeleting(false)
        setConfirming(false)
      })
  }

  return (
    <Panel
      title="Detalle de la plantilla"
      action={
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-ink-500 transition-colors hover:bg-base-800 hover:text-ink-200"
        >
          <X className="size-3.5" aria-hidden />
          Cerrar
        </button>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-mono text-sm font-bold text-ink-100">{template.name}</h3>
          <TemplateStatusChip status={template.status} />
          <QualityBadge quality={template.qualityScore} />
          <span className="stamp stamp--fecha">{categoryLabel[template.category] ?? template.category}</span>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Idioma</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{template.language}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">ID en Meta</dt>
            <dd className="truncate font-mono text-[0.75rem] text-ink-400">{template.id}</dd>
          </div>
        </dl>

        {(header || body || footer) && (
          <div className="flex flex-col gap-3 rounded-lg border border-rule-soft bg-base-800/40 p-4">
            {header && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Cabecera</p>
                <p className="mt-1 text-sm text-ink-200">{header}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Cuerpo</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">{body}</p>
            </div>
            {footer && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">Pie</p>
                <p className="mt-1 text-sm text-ink-200">{footer}</p>
              </div>
            )}
          </div>
        )}

        {variables.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              Variables del cuerpo ({variables.length})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variables.map((variable) => (
                <span key={variable.index} className="stamp stamp--fecha stamp--container font-mono">
                  {`{{${variable.index}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {template.rejectedReason && (
          <div
            role="alert"
            className="flex flex-col gap-1.5 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2"
          >
            <p className="flex items-start gap-2 text-xs leading-relaxed text-fallido">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {template.rejectedReason}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-rule-soft pt-4">
          <Button
            variant="primary"
            icon={<Send className="size-4" aria-hidden />}
            loading={testing}
            disabled={!approved}
            title={approved ? "Enviar a tu número de empresa" : "Solo aprobadas se pueden probar"}
            onClick={test}
          >
            {approved ? "Enviar mensaje de prueba" : "Pendiente de aprobación"}
          </Button>

          {confirming ? (
            <div className="flex items-center gap-2 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2">
              <span className="text-xs font-semibold text-fallido">¿Eliminar esta plantilla?</span>
              <Button
                size="sm"
                variant="danger"
                loading={deleting}
                onClick={remove}
              >
                Sí, eliminar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              icon={<Trash2 className="size-4" aria-hidden />}
              onClick={() => setConfirming(true)}
            >
              Eliminar
            </Button>
          )}
        </div>
      </div>
    </Panel>
  )
}

function TemplateForm({
  wabaId,
  token,
  onCreated,
}: {
  wabaId: string
  token: string
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [language, setLanguage] = useState("es")
  const [category, setCategory] = useState<TemplateCategory>("MARKETING")
  const [body, setBody] = useState("")
  const [header, setHeader] = useState("")
  const [footer, setFooter] = useState("")
  const [examples, setExamples] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<{
    name?: string
    language?: string
    category?: string
    body?: string
    header?: string
    footer?: string
    examples?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  const variables = useMemo(() => detectVariables(body), [body])

  const setExample = (index: number, value: string) => {
    setExamples((prev) => ({ ...prev, [String(index)]: value }))
  }

  const reset = () => {
    setName("")
    setLanguage("es")
    setCategory("MARKETING")
    setBody("")
    setHeader("")
    setFooter("")
    setExamples({})
    setErrors({})
  }

  const validate = () => {
    const next: typeof errors = {}
    const namePattern = /^[a-z0-9_]{1,512}$/
    if (!name.trim()) next.name = "Escribe un nombre para la plantilla."
    else if (!namePattern.test(name.trim()))
      next.name = "Solo minúsculas, números y guiones bajos (snake_case), hasta 512 caracteres."
    if (!language) next.language = "Elige el idioma de la plantilla."
    if (!category) next.category = "Elige la categoría de la plantilla."
if (!body.trim()) {
      next.body = "Escribe el cuerpo con las variables {{1}}, {{2}}…"
    } else {
      const indices = variables.map((v) => v.index)
      const expected = indices.map((_, position) => position + 1)
      if (indices.length > 0 && JSON.stringify(indices) !== JSON.stringify(expected)) {
        next.body = "Las variables del cuerpo deben ser consecutivas: {{1}}, {{2}}, …"
      }
      if (category === "MARKETING" && variables.length > 0) {
        const empty = variables.filter((v) => !(examples[String(v.index)] ?? "").trim())
        if (empty.length > 0) {
          next.examples = `Completa un ejemplo para cada variable del cuerpo (${empty
            .map((v) => `{{${v.index}}}`)
            .join(", ")}).`
        }
      }
    }
    if (/\{\{\s*\d+\s*\}/.test(header)) next.header = "La cabecera no admite variables."
    if (/\{\{\s*\d+\s*\}/.test(footer)) next.footer = "El pie no admite variables."
    return next
  }

  const submit = () => {
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const components: TemplateComponentInput[] = []
    if (header.trim()) {
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: header.trim(),
        example: { header_text: [header.trim()] },
      })
    }
    const bodyExamples = variables.map((v) => (examples[String(v.index)] ?? "").trim() || `Ejemplo ${v.index}`)
    const bodyComponent: TemplateComponentInput = { type: "BODY", text: body.trim() }
    if (bodyExamples.length > 0) bodyComponent.example = { body_text: [bodyExamples] }
    components.push(bodyComponent)
    if (footer.trim()) components.push({ type: "FOOTER", text: footer.trim() })

    const payload: CreateTemplateInput = {
      name: name.trim(),
      language,
      category,
      components,
    }

    setSubmitting(true)
    sileo
      .promise(
        (async () => createTemplate(wabaId, token, payload))(),
        {
          loading: { title: "Creando plantilla…", description: payload.name },
          success: (result) => ({
            title: "Plantilla enviada a revisión",
            description:
              result.status === "APPROVED"
                ? "Meta la aprobó de inmediato."
                : "Meta la revisará antes de que pueda enviarse (estado: en revisión).",
          }),
          error: (err) => ({
            title: "No se pudo crear la plantilla",
            description: graphError(err).message,
          }),
        }
      )
      .then(() => {
        const device = getDeviceIdentity()
        const session = readSession()
        registrarAuditoria({
          categoria: "plantilla",
          titulo: "Plantilla creada",
          detalle: `${payload.name} (${languageLabel(language)})`,
          entidad: payload.name,
          usuario: session?.name ?? "Operador",
          dispositivo: `${device.id} · ${device.code}`,
        })
        reset()
        onCreated()
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nombre (snake_case)"
          htmlFor="plantilla-nombre"
          hint="Cómo aparecerá en Meta, p. ej. pedido_en_transito."
          error={errors.name}
        >
          <Input
            id="plantilla-nombre"
            name="name"
            type="text"
            autoComplete="off"
            mono
            spellCheck={false}
            value={name}
            onChange={(event) => setName(event.target.value.toLowerCase().replace(/\s+/g, "_"))}
            placeholder="pedido_en_transito"
            invalid={Boolean(errors.name)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Idioma" htmlFor="plantilla-idioma" error={errors.language}>
            <select
              id="plantilla-idioma"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className={cn(inputBase, "appearance-none", errors.language ? "border-fallido/50" : "border-rule")}
            >
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {languageLabel(code)}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Categoría" htmlFor="plantilla-categoria" error={errors.category}>
            <select
              id="plantilla-categoria"
              value={category}
              onChange={(event) => setCategory(event.target.value as TemplateCategory)}
              className={cn(inputBase, "appearance-none", errors.category ? "border-fallido/50" : "border-rule")}
            >
              {CATEGORIES.map((code) => (
                <option key={code} value={code}>
                  {categoryLabel[code]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      <FormField
        label="Cabecera (opcional)"
        htmlFor="plantilla-cabecera"
        hint="Una línea que encabeza el mensaje. Sin variables."
        error={errors.header}
      >
        <Input
          id="plantilla-cabecera"
          type="text"
          autoComplete="off"
          maxLength={60}
          value={header}
          onChange={(event) => setHeader(event.target.value)}
          placeholder="Confirmación de entrega"
          invalid={Boolean(errors.header)}
        />
      </FormField>

      <FormField
        label="Cuerpo con variables"
        htmlFor="plantilla-cuerpo"
        hint="Usa {{1}}, {{2}}, … dentro del texto. En Marketing Meta exige un ejemplo por variable."
        error={errors.body}
      >
        <textarea
          id="plantilla-cuerpo"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          placeholder={"Hola {{1}}, tu pedido {{2}} va en camino y llega el {{3}}."}
          className={cn(
            inputBase,
            "h-auto resize-y py-2 leading-relaxed",
            errors.body ? "border-fallido/50" : "border-rule"
          )}
        />
      </FormField>

      {variables.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
            Ejemplos de muestra por variable
          </p>
          {variables.map((variable) => (
            <FormField
              key={variable.index}
              label={`Ejemplo para {{${variable.index}}}`}
              htmlFor={`plantilla-ejemplo-${variable.index}`}
              error={errors.examples && variables.length === 1 ? errors.examples : undefined}
            >
              <Input
                id={`plantilla-ejemplo-${variable.index}`}
                type="text"
                autoComplete="off"
                value={examples[String(variable.index)] ?? ""}
                onChange={(event) => setExample(variable.index, event.target.value)}
                placeholder={`Ejemplo ${variable.index}`}
                invalid={Boolean(errors.examples)}
              />
            </FormField>
          ))}
          {errors.examples && variables.length > 1 && (
            <p role="alert" className="text-xs text-fallido">
              {errors.examples}
            </p>
          )}
        </div>
      )}

      <FormField
        label="Pie (opcional)"
        htmlFor="plantilla-pie"
        hint="Línea al final del mensaje. Sin variables."
        error={errors.footer}
      >
        <Input
          id="plantilla-pie"
          type="text"
          autoComplete="off"
          maxLength={60}
          value={footer}
          onChange={(event) => setFooter(event.target.value)}
          placeholder="Gracias por confiar en nosotros"
          invalid={Boolean(errors.footer)}
        />
      </FormField>

      <div className="border-t border-rule-soft pt-4">
        <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} loading={submitting} onClick={submit}>
          Crear plantilla
        </Button>
      </div>
    </div>
  )
}

function loadTemplates(): WaTemplate[] {
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed as WaTemplate[]
    }
  } catch {
    /* almacenamiento no disponible o datos corruptos */
  }
  return []
}

function saveTemplates(templates: WaTemplate[]) {
  try {
    window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch {
    /* almacenamiento no disponible */
  }
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const { ids, status, token, metaPhone } = useConexion()
  const connected = status === "conectada" && Boolean(token) && Boolean(ids.wabaId)

  const [items, setItems] = useState<WaTemplate[]>(loadTemplates)
  const [nextCursor, setNextCursor] = useState<string>()
  const [syncing, setSyncing] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const firstLoadRef = useRef(false)

  const applyItems = useCallback((updater: (prev: WaTemplate[]) => WaTemplate[]) => {
    setItems((prev) => {
      const next = updater(prev)
      saveTemplates(next)
      return next
    })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((t) => t.name.toLowerCase().includes(q))
  }, [items, query])

  const selected = useMemo(
    () => items.find((t) => t.id === selectedId) ?? null,
    [items, selectedId]
  )

  const sync = useCallback(async (append = false) => {
    if (!connected || syncing) return
    setSyncing(true)
    try {
      const result = await listTemplates(ids.wabaId, token, append ? nextCursor : undefined)
      applyItems((prev) => (append ? [...prev, ...result.templates] : result.templates))
      setNextCursor(result.nextCursor)
    } catch (err) {
      sileo.error({
        title: "No se pudieron cargar las plantillas",
        description: graphError(err).message,
      })
    } finally {
      setSyncing(false)
    }
  }, [connected, syncing, ids.wabaId, token, nextCursor, applyItems])

  useEffect(() => {
    if (connected) {
      if (firstLoadRef.current) return
      firstLoadRef.current = true
      void sync()
    } else {
      firstLoadRef.current = false
    }
  }, [connected, sync])

  const testTemplate = (template: WaTemplate) => {
    setSelectedId(template.id)
    sileo
      .promise(
        (async () => {
          const bodyComponent = template.components.find((c) => c.type === "BODY")
          const headerComponent = template.components.find((c) => c.type === "HEADER")
          const variables = detectVariables(componentText(template, "BODY"))
          let bodyParams: string[] | undefined
          if (variables.length > 0) {
            bodyParams = bodyComponent?.example?.body_text?.[0]?.slice(0, variables.length) ?? []
            while (bodyParams.length < variables.length) {
              bodyParams.push(`Ejemplo ${bodyParams.length + 1}`)
            }
          }
          let headerParams: string[] | undefined
          if (componentText(template, "HEADER")) {
            headerParams = headerComponent?.example?.header_text?.[0]
              ? [headerComponent.example.header_text[0]]
              : ["Cabecera de ejemplo"]
          }
          return sendTemplate({
            phoneNumberId: ids.phoneNumberId,
            token,
            to: toWhatsAppNumber(metaPhone),
            templateName: template.name,
            languageCode: template.language,
            bodyParams,
            headerParams,
          })
        })(),
        {
          loading: { title: "Enviando mensaje de prueba…", description: template.name },
          success: (result) => ({
            title: "Mensaje de prueba enviado",
            description: `Meta aceptó el envío · ${shortWamid(result.wamid)}`,
          }),
          error: (err) => ({
            title: "No se pudo probar la plantilla",
            description: graphError(err).message,
          }),
        }
      )
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-8">
        <header className="mb-6">
          <div className="flex items-center gap-3 text-ink-400">
            <LayoutTemplate className="size-4" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
              Registro ·{" "}
              <time dateTime={new Date().toISOString()} suppressHydrationWarning>
                {formatDateStamp()}
              </time>
            </p>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Plantillas</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
            Plantillas de mensaje sincronizadas con tu cuenta de Meta: su idioma, el cuerpo con
            variables dinámicas, calidad y aprobación, listas para usarse en las campañas.
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <Panel
            title="Plantillas registradas en Meta"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    aria-label="Filtrar plantillas por nombre"
                    className="h-9 w-56 pl-9"
                    placeholder="Filtrar por nombre"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
            }
          >
            <TemplatesTable
              templates={filtered}
              selectedId={selectedId}
              onSelect={(template) => setSelectedId(template.id)}
              onTest={testTemplate}
            />
            <div className="flex flex-col gap-2 border-t border-rule-soft px-5 py-4">
              <p className="max-w-lg text-xs leading-relaxed text-ink-500">
                Muestra la última sincronización guardada en este equipo. Conecta la cuenta para
                actualizarlas desde la API de Meta.
              </p>
              <Button
                variant="primary"
                icon={<Link2 className="size-4" aria-hidden />}
                onClick={() => navigate("/app/conexion")}
                className="self-start"
              >
                Ir a Conexión
              </Button>
            </div>
          </Panel>

          {selected && (
            <TemplateDetail
              template={selected}
              wabaId={ids.wabaId}
              phoneNumberId={ids.phoneNumberId}
              token={token}
              to={toWhatsAppNumber(metaPhone)}
              onClose={() => setSelectedId(null)}
              onDeleted={() => setSelectedId(null)}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-3 text-ink-400">
          <LayoutTemplate className="size-4" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">
            Registro ·{" "}
            <time dateTime={new Date().toISOString()} suppressHydrationWarning>
              {formatDateStamp()}
            </time>
          </p>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-100">Plantillas</h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-400">
          Plantillas de mensaje sincronizadas con la cuenta{" "}
          <span className="font-mono text-ink-300">{ids.wabaId}</span>. Los mensajes de prueba se
          envían a tu número de empresa ({metaPhone}).
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Panel
          title="Plantillas registradas en Meta"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden />
                <Input
                  type="search"
                  aria-label="Filtrar plantillas por nombre"
                  className="h-9 w-56 pl-9"
                  placeholder="Filtrar por nombre"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <Button
                size="sm"
                icon={<RefreshCw className="size-3.5" aria-hidden />}
                loading={syncing}
                onClick={() => void sync()}
              >
                Sincronizar
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<Plus className="size-3.5" aria-hidden />}
                onClick={() => setShowCreate((value) => !value)}
              >
                {showCreate ? "Cancelar" : "Nueva plantilla"}
              </Button>
            </div>
          }
        >
          <TemplatesTable
            templates={filtered}
            selectedId={selectedId}
            onSelect={(template) => setSelectedId(template.id)}
            onTest={testTemplate}
          />
          {nextCursor && filtered.length === items.length && (
            <div className="border-t border-rule-soft px-5 py-3">
              <Button size="sm" loading={syncing} onClick={() => void sync(true)}>
                Cargar más plantillas
              </Button>
            </div>
          )}
        </Panel>

        {showCreate && (
          <Panel title="Nueva plantilla">
            <TemplateForm wabaId={ids.wabaId} token={token} onCreated={() => void sync()} />
          </Panel>
        )}

        {selected && (
          <TemplateDetail
            template={selected}
            wabaId={ids.wabaId}
            phoneNumberId={ids.phoneNumberId}
            token={token}
            to={toWhatsAppNumber(metaPhone)}
            onClose={() => setSelectedId(null)}
            onDeleted={() => {
              setSelectedId(null)
              void sync()
            }}
          />
        )}
      </div>
    </div>
  )
}