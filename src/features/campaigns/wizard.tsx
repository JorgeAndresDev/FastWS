import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Link2, ListOrdered, RefreshCw, Send, Trash2, Users } from "lucide-react"
import { sileo } from "sileo"

import { Button, FormField, Input } from "@/components/ui"
import { formatNumber } from "@/lib/utils"
import { toWhatsAppNumber } from "@/lib/phone"
import { graphError, listTemplates, sendTemplate } from "@/lib/wsb/api"

import type {
  CampaignVariableMapping,
  Client,
  ClientFieldKey,
  ClientKind,
  OrderState,
  WaTemplate,
} from "@/types"

import { useConexion } from "@/features/connection/conexion-store"
import { useClients } from "@/features/clients/clients-store"
import { componentText, detectVariables, languageLabel } from "@/features/templates/template-status"
import { useCampaigns } from "./campaigns-store"

const inputBase =
  "h-10 w-full rounded-md border bg-base-800 px-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60 focus-visible:outline-2 focus-visible:outline-offset-2"

const label = "text-xs font-bold uppercase tracking-[0.14em]"

const FIELD_OPTIONS: Array<{ key: ClientFieldKey; label: string }> = [
  { key: "name", label: "Nombre" },
  { key: "code", label: "Código" },
  { key: "company", label: "Empresa" },
  { key: "city", label: "Ciudad" },
  { key: "zone", label: "Zona" },
  { key: "clientType", label: "Tipo de cliente" },
  { key: "horaInicial", label: "Hora inicial" },
  { key: "horaFinal", label: "Hora final" },
  { key: "orderState", label: "Estado del pedido" },
  { key: "cancelReason", label: "Motivo de cancelación" },
  { key: "enRuta", label: "¿En ruta?" },
]

interface VariableChoice {
  fuente: "campo" | "libre"
  campo: ClientFieldKey
  texto?: string
}

function fieldLabel(client: Client, campo: ClientFieldKey): string {
  switch (campo) {
    case "clientType":
      return client.clientType === "CASHLESS" ? "Cashless" : "Normal"
    case "orderState":
      return client.orderState === "PENDIENTE"
        ? "Pedido pendiente"
        : client.orderState === "CANCELADO"
          ? "Pedido cancelado"
          : "—"
    case "enRuta":
      return client.enRuta == null ? "—" : client.enRuta ? "Sí" : "No"
    case "horaInicial":
      return client.horaInicial ?? "—"
    case "horaFinal":
      return client.horaFinal ?? "—"
    case "cancelReason":
      return client.cancelReason ?? "—"
    default:
      return String(client[campo] ?? "")
  }
}

function resolveValue(client: Client, choice: VariableChoice): string {
  if (choice.fuente === "libre") return choice.texto ?? ""
  return fieldLabel(client, choice.campo)
}

function hasMissingValue(value: string | undefined): boolean {
  return value === undefined || value === "" || value === "—"
}

function resolveBody(body: string, mappingArr: CampaignVariableMapping[], params: string[]): string {
  let out = body
  mappingArr.forEach((entry, i) => {
    out = out.split(`{{${entry.index}}}`).join(params[i] ?? "")
  })
  return out
}

interface PlannedRecipient {
  clientId: string
  code: string
  name: string
  phone: string
  params: string[]
  status: "PENDIENTE"
}

interface PlannedCampaign {
  name: string
  description: string
  template: WaTemplate
  mapping: CampaignVariableMapping[]
  recipients: PlannedRecipient[]
  filter: {
    clientType?: ClientKind
    city?: string
    zone?: string
    orderState?: OrderState
    enRuta?: boolean
  }
}

export function CampaignWizard({ onClose }: { onClose: () => void }) {
  const { ids, token, metaPhone } = useConexion()
  const { clients } = useClients()
  const { guardar } = useCampaigns()

  const connected = Boolean(token) && Boolean(ids.wabaId)

  const [templates, setTemplates] = useState<WaTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const [templateId, setTemplateId] = useState("")
  const [mapping, setMapping] = useState<Record<string, VariableChoice>>({})
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [step, setStep] = useState(1)
  const [creating, setCreating] = useState(false)

  const [clientType, setClientType] = useState<"" | ClientKind>("")
  const [city, setCity] = useState("")
  const [zone, setZone] = useState("")
  const [orderState, setOrderState] = useState<"" | OrderState>("")
  const [enRuta, setEnRuta] = useState<"true" | "false" | "">("")

  useEffect(() => {
    if (!connected) return
    let active = true
    setLoadingTemplates(true)
    setTemplatesError(null)
    listTemplates(ids.wabaId, token)
      .then((result) => {
        if (!active) return
        setTemplates(result.templates.filter((t) => t.status === "APPROVED"))
      })
      .catch((err) => {
        if (active) setTemplatesError(graphError(err).message)
      })
      .finally(() => {
        if (active) setLoadingTemplates(false)
      })
    return () => {
      active = false
    }
  }, [connected, ids.wabaId, token])

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null
  const variables = useMemo(
    () => detectVariables(selectedTemplate ? componentText(selectedTemplate, "BODY") : ""),
    [selectedTemplate]
  )

  const cities = useMemo(
    () => [...new Set(clients.map((c) => c.city).filter(Boolean))].sort(),
    [clients]
  )
  const zones = useMemo(
    () => [...new Set(clients.map((c) => c.zone).filter(Boolean))].sort(),
    [clients]
  )

  const candidates = useMemo(() => {
    return clients.filter((c) => {
      const digits = c.phone.replace(/\D/g, "")
      if (!c.valid || !/^3\d{9}$/.test(digits)) return false
      if (clientType && c.clientType !== clientType) return false
      if (city && c.city !== city) return false
      if (zone && c.zone !== zone) return false
      if (orderState && c.orderState !== orderState) return false
      if (enRuta !== "" && (c.enRuta ?? false) !== (enRuta === "true")) return false
      return true
    })
  }, [clients, clientType, city, zone, orderState, enRuta])

  const selectTemplate = (id: string) => {
    setTemplateId(id)
    const template = templates.find((t) => t.id === id)
    if (!template) return
    const next: Record<string, VariableChoice> = {}
    for (const variable of detectVariables(componentText(template, "BODY"))) {
      next[String(variable.index)] = { fuente: "campo", campo: "name" }
    }
    setMapping(next)
  }

  const mappingArr = useMemo<CampaignVariableMapping[]>(() => {
    if (!selectedTemplate) return []
    return detectVariables(componentText(selectedTemplate, "BODY")).map((variable) => {
      const choice = mapping[String(variable.index)] ?? { fuente: "campo", campo: "name" as const }
      return {
        index: variable.index,
        fuente: choice.fuente,
        campo: choice.fuente === "campo" ? choice.campo : undefined,
        texto: choice.fuente === "libre" ? (choice.texto ?? "") : undefined,
      }
    })
  }, [selectedTemplate, mapping])

  const mapped = useMemo(() => {
    if (!selectedTemplate || mappingArr.length === 0) {
      return { recipients: [] as PlannedRecipient[], sinValor: 0, preview: null as PlannedRecipient | null }
    }
    const recipients: PlannedRecipient[] = []
    let sinValor = 0
    let preview: PlannedRecipient | null = null
    for (const client of candidates) {
      const params = mappingArr.map((entry) =>
        resolveValue(client, {
          fuente: entry.fuente,
          campo: entry.campo ?? "name",
          texto: entry.texto,
        })
      )
      if (params.some(hasMissingValue)) {
        sinValor += 1
        continue
      }
      const planned: PlannedRecipient = {
        clientId: client.id,
        code: client.code,
        name: client.name,
        phone: `57${client.phone.replace(/\D/g, "")}`,
        params,
        status: "PENDIENTE",
      }
      recipients.push(planned)
      if (!preview) preview = planned
    }
    return { recipients, sinValor, preview }
  }, [mappingArr, selectedTemplate, candidates])

  const previewBody = useMemo(() => {
    if (!selectedTemplate || !mapped.preview) return null
    return resolveBody(componentText(selectedTemplate, "BODY"), mappingArr, mapped.preview.params)
  }, [selectedTemplate, mappingArr, mapped.preview])

  const setChoice = (index: number, choice: VariableChoice) => {
    setMapping((prev) => ({ ...prev, [String(index)]: choice }))
  }

  const probar = () => {
    if (!selectedTemplate) return
    const bodyComponent = selectedTemplate.components.find((c) => c.type === "BODY")
    let bodyParams: string[] | undefined
    if (mappingArr.length > 0) {
      bodyParams = mapped.preview?.params ?? []
      while (bodyParams.length < mappingArr.length) {
        bodyParams = [...bodyParams, `Ejemplo ${bodyParams.length + 1}`]
      }
      if (bodyParams.length === 0) return
    } else {
      bodyParams = bodyComponent?.example?.body_text?.[0]
    }
    const headerComponent = selectedTemplate.components.find((c) => c.type === "HEADER")
    let headerParams: string[] | undefined
    if (componentText(selectedTemplate, "HEADER")) {
      headerParams = headerComponent?.example?.header_text?.[0]
        ? [headerComponent.example.header_text[0]]
        : ["Cabecera de ejemplo"]
    }
    sileo.promise(
      (async () =>
        sendTemplate({
          phoneNumberId: ids.phoneNumberId,
          token,
          to: toWhatsAppNumber(metaPhone),
          templateName: selectedTemplate.name,
          languageCode: selectedTemplate.language,
          bodyParams,
          headerParams,
        }))(),
      {
        loading: { title: "Enviando mensaje de prueba…", description: selectedTemplate.name },
        success: (result) => ({
          title: "Mensaje de prueba enviado",
          description: `Meta aceptó el envío · ${result.wamid.slice(0, 30)}…`,
        }),
        error: (err) => ({
          title: "No se pudo probar la plantilla",
          description: graphError(err).message,
        }),
      }
    )
  }

  const build = (): PlannedCampaign | null => {
    if (!selectedTemplate || mapped.recipients.length === 0) return null
    return {
      name: name.trim(),
      description: description.trim(),
      template: selectedTemplate,
      mapping: mappingArr,
      recipients: mapped.recipients.map(({ clientId, code, name, phone, params }) => ({
        clientId,
        code,
        name,
        phone,
        params,
        status: "PENDIENTE" as const,
      })),
      filter: {
        clientType: clientType || undefined,
        city: city || undefined,
        zone: zone || undefined,
        orderState: orderState || undefined,
        enRuta: enRuta === "" ? undefined : enRuta === "true",
      },
    }
  }

  const crear = () => {
    const dados = build()
    if (!selectedTemplate || dados === null) return
    if (dados.recipients.length === 0) return
    setCreating(true)
    guardar({
      id: crypto.randomUUID(),
      name: dados.name,
      description: dados.description,
      template: { name: selectedTemplate.name, language: selectedTemplate.language },
      mapping: dados.mapping,
      filter: dados.filter,
      status: "BORRADOR",
      recipients: dados.recipients,
      createdAt: new Date().toISOString(),
      activity: [],
    })
    sileo.success({
      title: "Campaña creada",
      description: `${formatNumber(dados.recipients.length)} destinatarios en borrador, listos para iniciar desde la Cola.`,
    })
    onClose()
  }

  const mappingInvalid = variables.some((variable) => {
    const choice = mapping[String(variable.index)] ?? { fuente: "campo", campo: "name" }
    if (choice.fuente === "libre" && !(choice.texto ?? "").trim()) return true
    return false
  })

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="stamp stamp--proceso stamp--container">
          <ListOrdered aria-hidden />
          {step === 1 ? "Paso 1 de 2" : "Paso 2 de 2"}
        </span>
        <span className={label + " text-ink-500"}>
          {step === 1 ? "Plantilla y mapeo de variables" : "Segmento de destinatarios"}
        </span>
      </div>

      {step === 1 && (
        <>
          <FormField
            label="Plantilla aprobada"
            htmlFor="campana-plantilla"
            hint="Solo plantillas aprobadas por Meta pueden despacharse. Si no aparece, créala o espera la revisión en Plantillas."
          >
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-xs text-ink-500">
                <RefreshCw className="size-3.5 animate-spin" aria-hidden />
                Cargando plantillas de Meta…
              </div>
            ) : !connected ? (
              <p className="flex items-center gap-2 text-xs text-ink-500">
                <Link2 className="size-3.5" aria-hidden />
                Conecta tu cuenta de WhatsApp Business para listar las plantillas.
              </p>
            ) : templatesError ? (
              <p role="alert" className="flex items-center gap-2 text-xs text-fallido">
                <Trash2 className="size-3.5" aria-hidden />
                {templatesError}
              </p>
            ) : (
              <select
                id="campana-plantilla"
                value={templateId}
                onChange={(e) => selectTemplate(e.target.value)}
                className={cnSelect}
              >
                <option value="">Elige una plantilla aprobada…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {languageLabel(t.language)}
                  </option>
                ))}
              </select>
            )}
          </FormField>

          {selectedTemplate && (
            <div className="flex flex-col gap-3 rounded-lg border border-rule-soft bg-base-800/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-ink-100">
                  {selectedTemplate.name}
                </span>
                <span className="stamp stamp--entregado stamp--container">
                  <CheckCircle2 aria-hidden />
                  Aprobada
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                {componentText(selectedTemplate, "BODY")}
              </p>
              {variables.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className={label + " text-ink-500"}>Variables del cuerpo</p>
                  {variables.map((variable) => {
                    const choice = mapping[String(variable.index)] ?? {
                      fuente: "campo",
                      campo: "name",
                    }
                    return (
                      <div
                        key={variable.index}
                        className="grid items-center gap-2 sm:grid-cols-[auto_11rem_1fr]"
                      >
                        <span className="stamp stamp--fecha stamp--container font-mono">{`{{${variable.index}}}`}</span>
                        <select
                          aria-label={`Fuente de la variable ${variable.index}`}
                          value={choice.fuente}
                          onChange={(e) =>
                            setChoice(variable.index, {
                              fuente: e.target.value as "campo" | "libre",
                              campo: "name",
                              texto: choice.texto,
                            })
                          }
                          className={cnSelect}
                        >
                          <option value="campo">Campo del cliente</option>
                          <option value="libre">Texto fijo</option>
                        </select>
                        {choice.fuente === "campo" ? (
                          <select
                            aria-label={`Campo para {{${variable.index}}}`}
                            value={choice.campo}
                            onChange={(e) =>
                              setChoice(variable.index, {
                                ...choice,
                                campo: e.target.value as ClientFieldKey,
                              })
                            }
                            className={cnSelect}
                          >
                            {FIELD_OPTIONS.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type="text"
                            value={choice.texto ?? ""}
                            onChange={(e) =>
                              setChoice(variable.index, { ...choice, texto: e.target.value })
                            }
                            placeholder={`Texto para {{${variable.index}}}`}
                            invalid={!(choice.texto ?? "").trim()}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {mapped.preview && previewBody && (
                <div className="flex flex-col gap-1.5 border-t border-rule-soft pt-3">
                  <p className={label + " text-ink-500"}>Cómo lo leerá el primer destinatario</p>
                  <p className="text-xs text-ink-400">
                    {mapped.preview.name} · {mapped.preview.phone}
                  </p>
                  <p className="whitespace-pre-wrap rounded-md border border-rule-soft bg-base-900/60 px-3 py-2 text-sm leading-relaxed text-ink-100">
                    {previewBody}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 border-t border-rule-soft pt-3">
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Send className="size-3.5" aria-hidden />}
                  onClick={probar}
                >
                  Probar en mi número ({metaPhone})
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-rule-soft pt-4">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<ArrowRight className="size-4" aria-hidden />}
              disabled={!selectedTemplate || mappingInvalid}
              title={
                mappingInvalid ? "Completa el texto fijo de cada variable." : undefined
              }
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre de la campaña" htmlFor="campana-nombre">
              <Input
                id="campana-nombre"
                type="text"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Promoción septiembre mayoristas"
              />
            </FormField>
            <FormField label="Descripción (opcional)" htmlFor="campana-descripcion">
              <Input
                id="campana-descripcion"
                type="text"
                autoComplete="off"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contexto del envío"
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FormField label="Tipo" htmlFor="campana-tipo">
              <select
                id="campana-tipo"
                value={clientType}
                onChange={(e) => setClientType(e.target.value as "" | ClientKind)}
                className={cnSelect}
              >
                <option value="">Todos</option>
                <option value="NORMAL">Normal</option>
                <option value="CASHLESS">Cashless</option>
              </select>
            </FormField>
            <FormField label="Ciudad" htmlFor="campana-ciudad">
              <select
                id="campana-ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={cnSelect}
              >
                <option value="">Todas</option>
                {cities.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Zona" htmlFor="campana-zona">
              <select
                id="campana-zona"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className={cnSelect}
              >
                <option value="">Todas</option>
                {zones.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Pedido" htmlFor="campana-pedido">
              <select
                id="campana-pedido"
                value={orderState}
                onChange={(e) => setOrderState(e.target.value as "" | OrderState)}
                className={cnSelect}
              >
                <option value="">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </FormField>
            <FormField label="En ruta" htmlFor="campana-ruta">
              <select
                id="campana-ruta"
                value={enRuta}
                onChange={(e) => setEnRuta(e.target.value as "true" | "false" | "")}
                className={cnSelect}
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </FormField>
          </div>

          {selectedTemplate && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-rule-soft bg-base-800/40 px-4 py-3">
              <p className={label + " text-ink-500"}>Plantilla del mensaje</p>
              <p className="font-mono text-sm font-bold text-ink-100">{selectedTemplate.name}</p>
              <p className="whitespace-pre-wrap rounded-md border border-rule-soft bg-base-900/60 px-3 py-2 text-sm leading-relaxed text-ink-200">
                {componentText(selectedTemplate, "BODY")}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2.5 rounded-lg border border-rule-soft bg-base-800/40 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink-200">
              <Users className="size-4 text-ink-400" aria-hidden />
              {formatNumber(mapped.recipients.length)} destinatarios
            </p>
            <p className="text-xs leading-relaxed text-ink-500">
              Solo clientes válidos con móvil de 10 dígitos (3xxxxxxxxx), de la plantilla de clientes
              actual y sin valores vacíos en las variables del mensaje. El snapshot se congela al
              crear: nuevas importaciones no modifican este lote.
            </p>
            {mapped.sinValor > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fallido">
                {formatNumber(mapped.sinValor)} excluidos por faltarles dato para el mensaje
              </p>
            )}
          </div>

          {mapped.recipients.length === 0 && (
            <p role="alert" className="text-xs text-fallido">
              {mapped.sinValor > 0
                ? "Ningún cliente del segmento tiene todos los datos para el mensaje: revisa el mapeo o amplía el segmento."
                : "El segmento no arroja destinatarios: amplía los filtros o importa más clientes."}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-rule-soft pt-4">
            <Button variant="ghost" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => setStep(1)}>
              Volver
            </Button>
            <div className="flex items-center gap-3">
              {mapped.recipients.length > 0 && (
                <span className="stamp stamp--fecha stamp--container">
                  <Check aria-hidden />
                  Crear en borrador
                </span>
              )}
              <Button
                variant="primary"
                loading={creating}
                disabled={!name.trim() || mapped.recipients.length === 0}
                title={
                  !name.trim()
                    ? "Ponle un nombre a la campaña."
                    : mapped.recipients.length === 0
                      ? "El segmento no tiene destinatarios válidos para enviar."
                      : undefined
                }
                onClick={crear}
              >
                Crear campaña
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const cnSelect = `${inputBase} appearance-none`