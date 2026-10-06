import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useVirtualizer } from "@tanstack/react-virtual"
import { Eye, KeyRound, LayoutTemplate, Link2, Megaphone, Plus, RefreshCw, Search, Send, Tags, TriangleAlert, Trash2, Wrench, X } from "lucide-react"
import { sileo } from "sileo"

import { Button, EmptyState, FormField, Input, Panel } from "@/components/ui"
import { formatDateStamp, formatDateShort } from "@/app/date-stamp"
import { cn } from "@/lib/utils"
import { isMobileColombian, toWhatsAppNumber } from "@/lib/phone"

import { createTemplate, deleteTemplate, graphError, listTemplates, sendTemplate } from "@/lib/wsb/api"
import type { CreateTemplateInput, TemplateComponentInput } from "@/lib/wsb/api"
import type { TemplateCategory, WaTemplate } from "@/types"

import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { registrarAuditoria } from "@/lib/audit-log"
import { readDurable, writeDurable } from "@/lib/db/session-scope"
import { useConexion } from "@/features/connection/conexion-store"
import {
  buildTemplateBodyParams,
  buildTemplateHeaderParams,
  categoryLabel,
  componentText,
  countUnnamedPlaceholders,
  detectVariables,
  languageLabel,
  QualityBadge,
  TemplateStatusChip,
} from "./template-status"

const th = "px-4 py-2 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-ink-500"
// La tabla se ajusta al panel en vez de imponer un ancho mínimo: un `min-w`
// fijo, sumado a la barra vertical de scroll, pinta una barra horizontal de
// unos píxeles en ventanas normales. Además las columnas fijas van como
// `minmax(0, Nrem)` para que puedan encogerse si un sello o un botón no caben
// en el ancho dado; con un `Nrem` a secas, el contenido se desborda hacia
// fuera y la barra horizontal vuelve a aparecer.
const TEMPLATES_TEMPLATE =
  "minmax(0, 1fr) minmax(0, 9rem) minmax(0, 7.5rem) minmax(0, 9rem) minmax(0, 8.5rem) minmax(0, 12rem)"
const LANGUAGES = ["es", "es_CO", "es_MX", "es_AR", "es_CL", "en", "en_US", "pt", "pt_BR", "fr"]
const CATEGORIES: TemplateCategory[] = ["MARKETING", "UTILITY", "AUTHENTICATION"]
const TEMPLATES_KEY = "fastws.plantillas"
const TEST_NUMBER_KEY = "fastws.plantillas.numeroPrueba"
const inputBase =
  "h-10 w-full rounded-md border bg-base-800 px-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60 focus-visible:outline-2 focus-visible:outline-offset-2"

function shortWamid(wamid: string) {
  return wamid.length > 40 ? `${wamid.slice(0, 37)}…` : wamid
}

/**
 * La categoría clasifica, no informa estado: por eso viste la paleta creativa
 * (icono a color, texto neutro) y no el vocabulario de sellos, tal como manda
 * DESIGN.md. Antes viajaba como sello de fecha neutro y sin icono, junto a dos
 * chips hermanos que sí lo llevaban.
 */
const CATEGORY_STAMP: Record<string, { icon: LucideIcon; tone: string }> = {
  MARKETING: { icon: Megaphone, tone: "stamp--pink" },
  UTILITY: { icon: Wrench, tone: "stamp--cyan" },
  AUTHENTICATION: { icon: KeyRound, tone: "stamp--indigo" },
}

function CategoryStamp({ category }: { category: string }) {
  const config = CATEGORY_STAMP[category] ?? { icon: Tags, tone: "stamp--fecha" }
  const Icon = config.icon
  return (
    <span className={cn("stamp", config.tone)}>
      <Icon aria-hidden />
      {categoryLabel[category as TemplateCategory] ?? category}
    </span>
  )
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
  const unnamed = countUnnamedPlaceholders(componentText(template, "BODY"))
  const bloqueada = !approved || unnamed > 0
  const title = !approved
    ? "Solo aprobadas se pueden probar"
    : unnamed > 0
      ? "La plantilla tiene variables sin nombre ({{}})"
      : "Enviar al número de prueba"
  return (
    <div
      role="cell"
      className="flex min-w-0 items-center gap-2 overflow-hidden px-4 py-3"
      onClick={(event) => event.stopPropagation()}
    >
      <Button
        size="sm"
        variant="primary"
        icon={<Send className="size-3.5" aria-hidden />}
        disabled={bloqueada}
        title={title}
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
      <EmptyState
        label="Sin plantillas"
        icon={LayoutTemplate}
        note="No hay plantillas que coincidan con el filtro. Sincroniza de nuevo o crea una nueva plantilla para este número de WhatsApp Business."
      />
    )
  }
  return (
    <div ref={scrollRef} className="max-h-[32rem] overflow-y-auto">
      <div role="table" className="w-full">
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
                  <p className="mt-0.5 truncate text-[0.75rem] text-ink-600">
                    {variables.length > 0
                      ? `${variables.length} variable${variables.length === 1 ? "" : "s"} · `
                      : ""}
                    {languageLabel(template.language)}
                  </p>
                </div>
                <div role="cell" className="min-w-0 px-4 py-3">
                  <TemplateStatusChip status={template.status} />
                </div>
                <div role="cell" className="min-w-0 truncate px-4 py-3 text-[0.8125rem] text-ink-300">
                  {categoryLabel[template.category] ?? template.category}
                </div>
                <div role="cell" className="min-w-0 px-4 py-3">
                  <QualityBadge quality={template.qualityScore} />
                </div>
                <div role="cell" className="min-w-0 px-4 py-3 tabular-nums text-[0.75rem] text-ink-500">
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
  const unnamed = countUnnamedPlaceholders(body)
  const approved = template.status === "APPROVED"
  // Un `{{}}` sin nombre no se puede rellenar: Meta aprobó la plantilla, pero
  // ningún `parameter_name` corresponde a un hueco vacío. Se avisa en vez de
  // enviar una petición que Meta va a rechazar.
  const insendible = unnamed > 0

  const test = () => {
    if (insendible) {
      sileo.error({
        title: "Esta plantilla no se puede probar",
        description:
          `Tiene ${unnamed} variable${unnamed === 1 ? "" : "s"} sin nombre ({{}}) en el cuerpo. ` +
          "Recréala en el gestor de plantillas de Meta con nombres (como {{nombre}}) o con números ({{1}}).",
      })
      return
    }
    if (!isMobileColombian(to)) {
      sileo.error({
        title: "Falta el número de prueba",
        description:
          "Escribe un móvil colombiano de 10 dígitos en «Número de prueba», por ejemplo 3001234567.",
      })
      return
    }
    setTesting(true)
    const bodyParams = buildTemplateBodyParams(template)
    const headerParams = buildTemplateHeaderParams(template)
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
          <CategoryStamp category={template.category} />
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
                <span key={variable.key} className="stamp stamp--fecha stamp--container font-mono">
                  {`{{${variable.key}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {unnamed > 0 && (
          <div
            role="alert"
            className="flex flex-col gap-1.5 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2"
          >
            <p className="flex items-start gap-2 text-xs leading-relaxed text-fallido">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {`Tiene ${unnamed} variable${unnamed === 1 ? "" : "s"} sin nombre en el cuerpo ({{}}): Meta la aprobó, pero no hay forma de llenarlas. Recréala con nombres ({{nombre}}) o con números ({{1}}).`}
            </p>
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
            disabled={!approved || insendible}
            title={
              !approved
                ? "Solo aprobadas se pueden probar"
                : insendible
                  ? "La plantilla tiene variables sin nombre"
                  : "Enviar al número de prueba"
            }
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

  const setExample = (key: string, value: string) => {
    setExamples((prev) => ({ ...prev, [key]: value }))
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
              key={variable.key}
              label={`Ejemplo para {{${variable.key}}}`}
              htmlFor={`plantilla-ejemplo-${variable.key}`}
              error={errors.examples && variables.length === 1 ? errors.examples : undefined}
            >
              <Input
                id={`plantilla-ejemplo-${variable.key}`}
                type="text"
                autoComplete="off"
                value={examples[String(variable.key)] ?? ""}
                onChange={(event) => setExample(variable.key, event.target.value)}
                placeholder={`Ejemplo ${variable.key}`}
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
  const raw = readDurable(TEMPLATES_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed as WaTemplate[]
    } catch {
      /* datos corruptos */
    }
  }
  return []
}

function saveTemplates(templates: WaTemplate[]) {
  writeDurable(TEMPLATES_KEY, JSON.stringify(templates))
}

/**
 * El número de la empresa a veces es un centro de contacto que no recibe
 * WhatsApp, así que el destino del mensaje de prueba es configurable y se
 * recuerda en este equipo. Si no hay nada guardado arranca con el de la empresa.
 */
function loadTestNumber(fallback: string) {
  return readDurable(TEST_NUMBER_KEY) || fallback
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
  // El número de la empresa a veces es un «Centro Contacto» que no recibe
  // WhatsApp; el mensaje de prueba tiene que ir a un número que sí lo tenga.
  const [testNumber, setTestNumber] = useState(() => loadTestNumber(metaPhone))
  const firstLoadRef = useRef(false)

  // La conexión puede llegar después del primer render; si el operador no ha
  // tocado el campo, se adopta el número real de la empresa.
  const testNumberEdited = useRef(false)
  useEffect(() => {
    if (!testNumberEdited.current && metaPhone && !readDurable(TEST_NUMBER_KEY)) {
      setTestNumber(metaPhone)
    }
  }, [metaPhone])

  const onTestNumber = (value: string) => {
    testNumberEdited.current = true
    setTestNumber(value)
    writeDurable(TEST_NUMBER_KEY, value.trim())
  }

  const testNumberInput = (
    <Input
      type="tel"
      aria-label="Número de prueba"
      className="h-9 w-44"
      placeholder="Número de prueba"
      value={testNumber}
      onChange={(event) => onTestNumber(event.target.value)}
    />
  )

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
    const unnamed = countUnnamedPlaceholders(componentText(template, "BODY"))
    if (unnamed > 0) {
      sileo.error({
        title: "Esta plantilla no se puede probar",
        description:
          `Tiene ${unnamed} variable${unnamed === 1 ? "" : "s"} sin nombre ({{}}) en el cuerpo. ` +
          "Recréala en el gestor de plantillas de Meta con nombres (como {{nombre}}) o con números ({{1}}).",
      })
      return
    }
    sileo
      .promise(
        (async () => {
          const to = toWhatsAppNumber(testNumber)
          if (!isMobileColombian(testNumber)) {
            throw new Error(
              "Escribe un móvil colombiano de 10 dígitos en «Número de prueba», por ejemplo 3001234567."
            )
          }
          return sendTemplate({
            phoneNumberId: ids.phoneNumberId,
            token,
            to,
            templateName: template.name,
            languageCode: template.language,
            bodyParams: buildTemplateBodyParams(template),
            headerParams: buildTemplateHeaderParams(template),
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
                {testNumberInput}
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
              to={toWhatsAppNumber(testNumber)}
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
          envían al número de prueba: si el número de la empresa es un centro de contacto que no
          recibe WhatsApp, pon aquí un móvil que sí lo tenga.
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
              {testNumberInput}
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
            to={toWhatsAppNumber(testNumber)}
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