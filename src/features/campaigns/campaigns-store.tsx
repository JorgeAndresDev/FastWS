import type { ReactNode } from "react"
import { useCallback, useContext, useEffect, useMemo, useRef, useState, createContext } from "react"
import { sileo } from "sileo"

import type { Campaign, CampaignRecipient, CampaignStatus } from "@/types"

import { getDeviceIdentity } from "@/features/auth/device"
import { readSession } from "@/features/auth/session"
import { registrarAuditoria } from "@/lib/audit-log"
import { readDurable, writeDurable } from "@/lib/db/session-scope"
import { useConexion } from "@/features/connection/conexion-store"
import {
  engineCancel,
  engineHas,
  enginePause,
  engineResume,
  engineStart,
  type EngineHooks,
} from "./engine"

export const VELOCIDADES = ["4000/h", "2000/h", "1000/h", "500/h"] as const

export const VELOCIDAD_DEFAULT = "1000/h"

export function parseSpeed(speed: string) {
  const n = Number(speed.split("/")[0])
  return Number.isFinite(n) && n > 0 ? n / 3600 : 1000 / 3600
}

interface CampaignsContextValue {
  campaigns: Campaign[]
  velocidad: string
  setVelocidad: (velocidad: string) => void
  guardar: (campaign: Campaign) => void
  iniciar: (id: string) => boolean
  pausar: (id: string) => void
  reanudar: (id: string) => void
  cancelar: (id: string) => void
}

const CampaignsContext = createContext<CampaignsContextValue | null>(null)

const CAMPAIGNS_KEY = "fastws.campanas"
const VELOCIDAD_KEY = "fastws.campanas.velocidad"

function isCampaign(item: unknown): item is Campaign {
  if (item == null || typeof item !== "object") return false
  const campaign = item as Partial<Campaign>
  return (
    typeof campaign.id === "string" &&
    typeof campaign.name === "string" &&
    typeof campaign.status === "string" &&
    Array.isArray(campaign.recipients) &&
    typeof campaign.createdAt === "string" &&
    campaign.template != null &&
    typeof campaign.template.name === "string" &&
    typeof campaign.template.language === "string"
  )
}

/**
 * Las campañas guardadas antes del cambio de `index` a `key` traen el índice
 * numérico en ese campo. Sin esta traducción el motor enviaría una campaña
 * nombrada sin `parameter_name` y Meta la rechazaría; con ella, una campaña
 * posicional antigua sigue enviándose igual porque "1" es un nombre numérico y
 * `sendTemplate` lo omite.
 */
function migrateMapping(campaign: Campaign): Campaign {
  if (!Array.isArray(campaign.mapping)) return campaign
  const mapping = campaign.mapping.map((entry, position) => {
    const legacy = (entry as { index?: unknown }).index
    if (typeof entry.key === "string" && entry.key !== "") return entry
    if (typeof legacy === "string" && legacy !== "") return { ...entry, key: legacy }
    if (typeof legacy === "number") return { ...entry, key: String(legacy) }
    return { ...entry, key: String(position + 1) }
  })
  return { ...campaign, mapping }
}

function loadCampaigns(): Campaign[] {
  const raw = readDurable(CAMPAIGNS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter(isCampaign)
          .map((campaign) =>
            migrateMapping({
              ...campaign,
              activity: Array.isArray(campaign.activity) ? campaign.activity : [],
            })
          )
      }
    } catch {
      /* datos corruptos */
    }
  }
  return []
}

function loadVelocidad(): string {
  const raw = readDurable(VELOCIDAD_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (typeof parsed === "string" && (VELOCIDADES as readonly string[]).includes(parsed)) {
        return parsed
      }
    } catch {
      /* dato corrupto */
    }
  }
  return VELOCIDAD_DEFAULT
}

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const { ids, token } = useConexion()

  const [campaigns, setCampaigns] = useState<Campaign[]>(loadCampaigns)
  const campaignsRef = useRef(campaigns)
  campaignsRef.current = campaigns

  const [velocidad, setVelocidadState] = useState<string>(loadVelocidad)
  const velocidadRef = useRef(velocidad)
  velocidadRef.current = velocidad

  const idsRef = useRef(ids)
  idsRef.current = ids
  const tokenRef = useRef(token)
  tokenRef.current = token

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastPersistAlert = useRef(0)

  const commit = useCallback((next: Campaign[]) => {
    campaignsRef.current = next
    setCampaigns(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (!writeDurable(CAMPAIGNS_KEY, JSON.stringify(next))) {
        const now = Date.now()
        if (now - lastPersistAlert.current > 30_000) {
          lastPersistAlert.current = now
          sileo.error({
            title: "No se pudo guardar en este dispositivo",
            description:
              "La sesión sigue activa, pero los cambios no quedan guardados entre recargas (almacenamiento lleno o bloqueado).",
          })
        }
      }
    }, 250)
  }, [])

  const makeHooks = useCallback(
    (campaignId: string): EngineHooks => ({
      getState: () => {
        const campaign = campaignsRef.current.find((c) => c.id === campaignId)
        if (!campaign) throw new Error("Campaña no encontrada.")
        return {
          campaign,
          access: {
            phoneNumberId: idsRef.current.phoneNumberId,
            token: tokenRef.current,
          },
          ratePerSecond: parseSpeed(velocidadRef.current),
        }
      },
      onProgress: (id, recipients: CampaignRecipient[], nextStatus: CampaignStatus, endedAt) => {
        const campaign = campaignsRef.current.find((c) => c.id === id)
        const now = new Date().toISOString()
        const next = campaignsRef.current.map((c) =>
          c.id === id
            ? {
                ...c,
                recipients,
                status: nextStatus,
                ...(endedAt ? { endedAt } : {}),
                activity:
                  nextStatus === "FINALIZADA" || nextStatus === "CON_ERROR"
                    ? [
                        ...(c.activity ?? []),
                        {
                          tipo:
                            nextStatus === "FINALIZADA" ? ("finalizada" as const) : ("con_error" as const),
                          at: endedAt ?? now,
                        },
                      ]
                    : (c.activity ?? []),
              }
            : c
        )
        commit(next)
        if (nextStatus === "FINALIZADA") {
          sileo.success({
            title: "Campaña finalizada",
            description: campaign
              ? `${campaign.name} terminó: ${recipients.filter((r) => r.status === "PROCESO").length} aceptados por Meta, ${recipients.filter((r) => r.status === "FALLIDO").length} con error.`
              : "Todos los mensajes fueron procesados.",
          })
        } else if (nextStatus === "CON_ERROR") {
          sileo.error({
            title: "Campaña pausada por error",
            description: campaign
              ? `${campaign.name} entró en espera por error de Meta (autenticación o límite de velocidad). Reanuda cuando la conexión esté estable.`
              : "La campaña entró en espera por un error de Meta.",
          })
        }
      },
    }),
    [commit]
  )

  useEffect(() => {
    for (const campaign of campaignsRef.current) {
      if (campaign.status === "EN_PROCESO") {
        engineStart(campaign.id, makeHooks(campaign.id))
      }
    }
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [makeHooks])

  const guardar = useCallback(
    (campaign: Campaign) => {
      const existing = campaignsRef.current.find((c) => c.id === campaign.id)
      const hasActivity =
        (existing?.activity?.length ?? 0) > 0 || (campaign.activity?.length ?? 0) > 0
      const activity = hasActivity
        ? (campaign.activity ?? [])
        : [{ tipo: "creada" as const, at: campaign.createdAt }]
      commit([...campaignsRef.current.filter((c) => c.id !== campaign.id), { ...campaign, activity }])
    },
    [commit]
  )

  const iniciar = useCallback(
    (id: string): boolean => {
      const nearest = campaignsRef.current.find((c) => c.id === id)
      if (!nearest || nearest.status !== "BORRADOR") return false
      if (!tokenRef.current || !idsRef.current.phoneNumberId) {
        sileo.error({
          title: "Conecta tu cuenta primero",
          description:
            "El despacho necesita la conexión Meta (token en sesión) para enviar los mensajes.",
        })
        return false
      }
      const now = new Date().toISOString()
      const device = getDeviceIdentity()
      const session = readSession()
      const next = campaignsRef.current.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "EN_PROCESO" as CampaignStatus,
              startedAt: c.startedAt ?? now,
              dispatchedBy: {
                usuario: session?.name ?? "Operador",
                dispositivo: `${device.id} · ${device.code}`,
                at: now,
              },
              activity: [...(c.activity ?? []), { tipo: "iniciada" as const, at: now }],
            }
          : c
      )
      commit(next)
      engineStart(id, makeHooks(id))
      return true
    },
    [commit, makeHooks]
  )

  const pausar = useCallback(
    (id: string) => {
      enginePause(id)
      const now = new Date().toISOString()
      commit(
        campaignsRef.current.map((c) =>
          c.id === id && c.status === "EN_PROCESO"
            ? {
                ...c,
                status: "PAUSADA" as CampaignStatus,
                activity: [...(c.activity ?? []), { tipo: "pausada" as const, at: now }],
              }
            : c
        )
      )
    },
    [commit]
  )

  const reanudar = useCallback(
    (id: string) => {
      const nearest = campaignsRef.current.find((c) => c.id === id)
      if (!nearest) return
      if (nearest.status !== "PAUSADA" && nearest.status !== "CON_ERROR") return
      if (!tokenRef.current || !idsRef.current.phoneNumberId) {
        sileo.error({
          title: "Conecta tu cuenta primero",
          description:
            "El despacho necesita la conexión Meta (token en sesión) para enviar los mensajes.",
        })
        return
      }
      const now = new Date().toISOString()
      commit(
        campaignsRef.current.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "EN_PROCESO" as CampaignStatus,
                activity: [...(c.activity ?? []), { tipo: "reanudada" as const, at: now }],
              }
            : c
        )
      )
      if (engineHas(id)) {
        engineResume(id)
      } else {
        engineStart(id, makeHooks(id))
      }
    },
    [commit, makeHooks]
  )

  const cancelar = useCallback(
    (id: string) => {
      const target = campaignsRef.current.find((c) => c.id === id)
      if (!target) return
      engineCancel(id)
      const now = new Date().toISOString()
      commit(
        campaignsRef.current.map((c) => {
          if (c.id !== id) return c
          const recipients = c.recipients.map((r) =>
            r.status === "PENDIENTE" ? { ...r, status: "CANCELADO" as const } : r
          )
          return {
            ...c,
            status: "CANCELADA" as CampaignStatus,
            recipients,
            endedAt: now,
            activity: [...(c.activity ?? []), { tipo: "cancelada" as const, at: now }],
          }
        })
      )
      const device = getDeviceIdentity()
      const sessionUser = readSession()
      registrarAuditoria({
        categoria: "campana",
        titulo: "Campaña cancelada",
        detalle: `${target.name}`,
        entidad: target.name,
        usuario: sessionUser?.name ?? "Operador",
        dispositivo: `${device.id} · ${device.code}`,
      })
    },
    [commit]
  )

  const setVelocidad = useCallback((value: string) => {
    velocidadRef.current = value
    setVelocidadState(value)
    writeDurable(VELOCIDAD_KEY, JSON.stringify(value))
  }, [])

  const value = useMemo<CampaignsContextValue>(
    () => ({
      campaigns,
      velocidad,
      setVelocidad,
      guardar,
      iniciar,
      pausar,
      reanudar,
      cancelar,
    }),
    [campaigns, velocidad, setVelocidad, guardar, iniciar, pausar, reanudar, cancelar]
  )

  return <CampaignsContext.Provider value={value}>{children}</CampaignsContext.Provider>
}

export function useCampaigns() {
  const context = useContext(CampaignsContext)
  if (!context) {
    throw new Error("useCampaigns debe usarse dentro de CampaignsProvider")
  }
  return context
}