import { useMemo, useState } from "react"
import { MessageCircleMore, Send, Sparkles } from "lucide-react"

import { Button, StatusStamp } from "@/components/ui"
import { cn } from "@/lib/utils"

import type { ConversationMessage, ConversationThread, WaTemplate } from "@/types"

import { componentText, detectVariables, languageLabel } from "@/features/templates/template-status"
import { useConexion } from "@/features/connection/conexion-store"
import { useClients } from "@/features/clients/clients-store"
import { ConvoChip } from "./conversation-status"
import { useConversations } from "./conversations-store"

const inputBase =
  "w-full rounded-md border bg-base-800 px-3 text-[0.8125rem] text-ink-100 outline-none transition-colors placeholder:text-ink-500 focus:border-brand-500/60 focus-visible:outline-2 focus-visible:outline-offset-2"

function renderTemplate(template: WaTemplate, params: Record<string, string>): string {
  const header = componentText(template, "HEADER")
  const body = componentText(template, "BODY")
  const footer = componentText(template, "FOOTER")
  const apply = (text: string) =>
    [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].reduce(
      (acc, match) =>
        acc.replace(match[0], params[match[1]]?.trim() || match[0]),
      text
    )
  return [header && apply(header), body && apply(body), footer && apply(footer)]
    .filter(Boolean)
    .join("\n")
}

function timeShort(iso?: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString("es-CO", { hour12: false, hour: "2-digit", minute: "2-digit" })
}

function shortId(id?: string, max = 22) {
  if (!id) return ""
  return id.length > max ? `${id.slice(0, max)}…` : id
}

function Bubble({ message }: { message: ConversationMessage }) {
  const inbound = message.direction === "entrante"
  return (
    <div className={cn("flex flex-col gap-1", inbound ? "items-start" : "items-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border px-3 py-2",
          inbound ? "border-rule-soft bg-base-800" : "border-rule bg-base-750"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-200">{message.text}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-ink-500">
        <span className="tabular-nums font-mono">{timeShort(message.sentAt)}</span>
        {message.viaTemplate && (
          <span className="stamp stamp--fecha">
            <MessageCircleMore aria-hidden />
            Plantilla
          </span>
        )}
        {message.direction === "saliente" && <StatusStamp status={message.status} />}
        {message.metaId && (
          <span className="font-mono" title={message.metaId}>
            {shortId(message.metaId)}
          </span>
        )}
        {message.status === "FALLIDO" && message.errorCode && (
          <span className="font-mono text-fallido">{message.errorCode}</span>
        )}
      </div>
      {message.status === "FALLIDO" && message.errorMessage && (
        <p className="max-w-[28rem] text-xs leading-relaxed text-fallido/80">
          {message.errorMessage}
        </p>
      )}
    </div>
  )
}

interface ThreadDetailProps {
  thread: ConversationThread
  templates: WaTemplate[]
  templatesError: string | null
}

export function ThreadDetail({ thread, templates, templatesError }: ThreadDetailProps) {
  const { clients } = useClients()
  const { token } = useConexion()
  const { responder, responderPlantilla } = useConversations()

  const connected = Boolean(token)
  const client = clients.find((c) => `57${c.phone.replace(/\D/g, "")}` === thread.phone)

  const [mode, setMode] = useState<"texto" | "plantilla">("texto")
  const [text, setText] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [params, setParams] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messages = useMemo(
    () =>
      [...thread.messages].sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? "")),
    [thread.messages]
  )

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null
  const variables = useMemo(
    () =>
      selectedTemplate ? detectVariables(componentText(selectedTemplate, "BODY")) : [],
    [selectedTemplate]
  )

  const switchMode = (next: "texto" | "plantilla") => {
    setMode(next)
    setError(null)
  }

  const send = async () => {
    setError(null)
    if (!connected) {
      setError("Conecta tu cuenta de WhatsApp Business para responder.")
      return
    }
    if (mode === "texto") {
      const trimmed = text.trim()
      if (!trimmed) {
        setError("Escribe la respuesta.")
        return
      }
      setSending(true)
      try {
        const ok = await responder(thread.phone, trimmed)
        if (ok) setText("")
      } finally {
        setSending(false)
      }
      return
    }
    if (!selectedTemplate) {
      setError("Elige una plantilla aprobada.")
      return
    }
    const paramsArr = variables.map((variable) => params[String(variable.index)] ?? "")
    if (variables.length > 0 && paramsArr.some((value) => !value.trim())) {
      setError("Completa las variables de la plantilla.")
      return
    }
    const headerComponent = selectedTemplate.components.find((c) => c.type === "HEADER")
    let headerParams: string[] | undefined
    if (componentText(selectedTemplate, "HEADER")) {
      headerParams = headerComponent?.example?.header_text?.[0]
        ? [headerComponent.example.header_text[0]]
        : ["Cabecera de ejemplo"]
    }
    setSending(true)
    try {
      const ok = await responderPlantilla(
        thread.phone,
        selectedTemplate.name,
        selectedTemplate.language,
        paramsArr,
        headerParams,
        renderTemplate(selectedTemplate, params)
      )
      if (ok) setTemplateId("")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-13rem)] flex-col overflow-hidden rounded-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-ink-100">
              {client?.name ?? "Cliente no registrado"}
            </p>
            {thread.origin === "demo" && (
              <span className="stamp stamp--fecha stamp--container">
                <Sparkles aria-hidden />
                Datos de ejemplo
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-ink-500">{thread.phone}</p>
          {client && (
            <p className="mt-0.5 text-xs text-ink-500">
              {client.city} · {client.zone || "sin zona"} ·{" "}
              {client.clientType === "CASHLESS" ? "Cashless" : "Normal"}
            </p>
          )}
        </div>
        <ConvoChip status={thread.status} />
      </header>

      <div className="flex max-h-[calc(100vh-24rem)] min-h-[22rem] flex-col gap-3 overflow-y-auto px-5 py-4">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        {messages.length === 0 && (
          <p className="m-auto text-xs text-ink-500">
            Sin mensajes todavía. Responde desde la caja inferior.
          </p>
        )}
      </div>

      <div className="border-t border-rule-soft px-5 py-4">
        {!connected && (
          <p role="status" className="mb-3 text-xs text-ink-500">
            Conecta tu cuenta de WhatsApp Business en{" "}
            <span className="text-ink-300">Conexión</span> para responder.
          </p>
        )}

        <div role="tablist" aria-label="Modo de respuesta" className="mb-3 flex items-center gap-2">
          {(
            [
              { value: "texto", label: "Texto libre" },
              { value: "plantilla", label: "Responder con plantilla" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              role="tab"
              type="button"
              aria-selected={mode === option.value}
              onClick={() => switchMode(option.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                mode === option.value
                  ? "border-rule bg-base-750 text-ink-100"
                  : "border-rule bg-base-800 text-ink-500 hover:text-ink-200"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "texto" ? (
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe la respuesta…"
            className={cn(inputBase, "resize-none py-2")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {templates.length === 0 && !templatesError ? (
              <p className="text-xs text-ink-500">
                Sin plantillas aprobadas cargadas. Sincronízalas desde el módulo Plantillas.
              </p>
            ) : (
              <>
                <select
                  value={templateId}
                  onChange={(e) => {
                    setTemplateId(e.target.value)
                    setParams({})
                  }}
                  className={cn(inputBase, "h-10 appearance-none")}
                  aria-label="Plantilla aprobada"
                >
                  <option value="">Elige una plantilla aprobada…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {languageLabel(t.language)}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="whitespace-pre-wrap rounded-md border border-rule-soft bg-base-800/40 px-3 py-2 text-xs leading-relaxed text-ink-400">
                    {componentText(selectedTemplate, "BODY")}
                  </p>
                )}
                {variables.map((variable) => (
                  <div key={variable.index} className="grid items-center gap-2 sm:grid-cols-[auto_1fr]">
                    <span className="stamp stamp--fecha stamp--container font-mono">{`{{${variable.index}}}`}</span>
                    <input
                      type="text"
                      value={params[String(variable.index)] ?? ""}
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [String(variable.index)]: e.target.value,
                        }))
                      }
                      placeholder={`Valor para {{${variable.index}}}`}
                      className={cn(inputBase, "h-10")}
                    />
                  </div>
                ))}
              </>
            )}
            {templatesError && (
              <p role="alert" className="text-xs text-fallido">
                {templatesError}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-2 text-xs text-fallido">
            {error}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="max-w-md text-[0.75rem] leading-relaxed text-ink-500">
            El texto libre solo aplica dentro de la ventana de 24 h (cliente respondió o una
            plantilla fue entregada). Si Meta lo rechaza, responde con una plantilla aprobada.
          </p>
          <Button
            variant="primary"
            icon={<Send className="size-3.5" aria-hidden />}
            loading={sending}
            disabled={!connected}
            onClick={send}
          >
            {mode === "texto" ? "Enviar" : "Enviar plantilla"}
          </Button>
        </div>
      </div>
    </div>
  )
}