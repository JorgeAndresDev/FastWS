import type { Campaign, CampaignRecipient, CampaignStatus } from "@/types"

import { graphError, sendTemplate } from "@/lib/wsb/api"

type ErrorKind = "auth" | "retry" | "terminal"

const RATE_CODES = new Set(["130429", "130407", "130413", "131042"])

function classifyError(err: Error & { code?: string }): ErrorKind {
  const code = err.code
  if (code === "190") return "auth"
  if (!code) return "retry"
  const n = Number(code)
  if (!Number.isFinite(n)) return "terminal"
  if (RATE_CODES.has(code) || (n >= 500 && n < 600)) return "retry"
  return "terminal"
}

export interface EngineAccess {
  phoneNumberId: string
  token: string
}

export interface EngineHooks {
  getState: () => { campaign: Campaign; access: EngineAccess; ratePerSecond: number }
  onProgress: (
    id: string,
    recipients: CampaignRecipient[],
    nextStatus: CampaignStatus,
    endedAt?: string
  ) => void
}

interface Runtime {
  cursor: number
  remainder: number
  backoffUntil: number
  consecutive: number
  effRate: number
  lastTick: number
  busy: boolean
  stalled: boolean
  timer?: ReturnType<typeof setInterval>
}

const runtimes = new Map<string, Runtime>()
const hooks = new Map<string, EngineHooks>()

const TICK_MS = 1000

function firstPending(campaign: Campaign) {
  return campaign.recipients.findIndex((recipient) => recipient.status === "PENDIENTE")
}

function install(id: string) {
  const runtime = runtimes.get(id)
  if (!runtime) return
  if (runtime.timer) clearInterval(runtime.timer)
  runtime.busy = false
  runtime.lastTick = Date.now()
  runtime.timer = setInterval(() => void tick(id), TICK_MS)
  void tick(id)
}

async function tick(id: string) {
  const runtime = runtimes.get(id)
  const hk = hooks.get(id)
  if (!runtime || !hk || runtime.busy || runtime.timer === undefined) return

  const { campaign, access, ratePerSecond } = hk.getState()
  const now = Date.now()
  if (campaign.status !== "EN_PROCESO") return
  if (!access.token || !access.phoneNumberId) {
    if (!runtime.stalled) {
      runtime.stalled = true
      hk.onProgress(id, campaign.recipients, "CON_ERROR")
      stopTimer(id)
    }
    return
  }
  if (now < runtime.backoffUntil) return

  runtime.busy = true
  try {
    let budget = ratePerSecond * ((now - runtime.lastTick) / 1000) + runtime.remainder
    runtime.lastTick = now
    const todo = Math.min(Math.floor(budget), 25)
    runtime.remainder = budget - todo

    const recipients = [...campaign.recipients]
    let nextStatus: CampaignStatus = campaign.status
    let endedAt: string | undefined
    let brokeRetry = false
    let authError = false

    let sent = 0
    while (sent < todo && runtime.cursor < recipients.length) {
      const index = runtime.cursor
      const recipient = recipients[index]
      if (recipient.status !== "PENDIENTE") {
        runtime.cursor++
        continue
      }
      try {
        const result = await sendTemplate({
          phoneNumberId: access.phoneNumberId,
          token: access.token,
          to: recipient.phone,
          templateName: campaign.template.name,
          languageCode: campaign.template.language,
          bodyParams: recipient.params.length > 0 ? recipient.params : undefined,
        })
        recipients[index] = {
          ...recipient,
          status: "PROCESO",
          metaId: result.wamid,
          sentAt: new Date().toISOString(),
        }
        runtime.consecutive = 0
        runtime.cursor++
      } catch (err) {
        const clean = graphError(err) as Error & { code?: string }
        const kind = classifyError(clean)
        if (kind === "auth") {
          authError = true
          break
        }
        if (kind === "retry") {
          runtime.consecutive++
          runtime.backoffUntil =
            now + Math.min(60_000, 1_000 * 2 ** Math.min(runtime.consecutive, 6))
          runtime.effRate = Math.max(0.028, (runtime.effRate || ratePerSecond) / 2)
          brokeRetry = true
          break
        }
        recipients[index] = {
          ...recipient,
          status: "FALLIDO",
          errorCode: clean.code,
          errorMessage: clean.message,
          sentAt: new Date().toISOString(),
        }
        runtime.cursor++
      }
      sent++
    }

    if (authError) {
      nextStatus = "CON_ERROR"
    } else if (brokeRetry && runtime.consecutive >= 5) {
      nextStatus = "CON_ERROR"
    } else if (recipients.every((recipient) => recipient.status !== "PENDIENTE")) {
      nextStatus = "FINALIZADA"
      endedAt = new Date().toISOString()
    } else {
      nextStatus = "EN_PROCESO"
    }

    const live = hk.getState().campaign
    if (live.status !== "EN_PROCESO") {
      return
    }

    hk.onProgress(id, recipients, nextStatus, endedAt)
    if (nextStatus === "FINALIZADA" || nextStatus === "CON_ERROR") {
      stopTimer(id)
    }
  } finally {
    runtime.busy = false
  }
}

function stopTimer(id: string) {
  const runtime = runtimes.get(id)
  if (runtime?.timer) {
    clearInterval(runtime.timer)
    runtime.timer = undefined
  }
}

export function engineStart(id: string, hk: EngineHooks) {
  hooks.set(id, hk)
  const campaign = hk.getState().campaign
  const rate = hk.getState().ratePerSecond
  runtimes.set(id, {
    cursor: Math.max(0, firstPending(campaign)),
    remainder: 0,
    backoffUntil: 0,
    consecutive: 0,
    effRate: rate,
    lastTick: Date.now(),
    busy: false,
    stalled: false,
  })
  install(id)
}

export function engineResume(id: string) {
  const runtime = runtimes.get(id)
  const hk = hooks.get(id)
  if (!runtime || !hk) return
  const { campaign, ratePerSecond } = hk.getState()
  runtime.cursor = Math.max(0, firstPending(campaign))
  runtime.consecutive = 0
  runtime.backoffUntil = 0
  runtime.effRate = ratePerSecond
  runtime.remainder = 0
  runtime.stalled = false
  install(id)
}

export function enginePause(id: string) {
  stopTimer(id)
}

export function engineHas(id: string) {
  return runtimes.has(id)
}

export function engineCancel(id: string) {
  stopTimer(id)
  runtimes.delete(id)
  hooks.delete(id)
}