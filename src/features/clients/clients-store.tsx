import type { ReactNode } from "react"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

import type { Client } from "@/types"

import { readDurable, writeDurable } from "@/lib/db/session-scope"

interface ClientsContextValue {
  clients: Client[]
  addClients: (nuevos: Client[]) => { added: number; updated: number }
  registrarCliente: (data: ClientDraft) => { ok: boolean; error?: string }
  actualizarCliente: (id: string, data: ClientDraft) => { ok: boolean; error?: string }
  eliminarCliente: (id: string) => void
}

export interface ClientDraft {
  code: string
  name: string
  phone: string
  company: string
  city: string
  zone: string
  clientType: Client["clientType"]
}

const ClientsContext = createContext<ClientsContextValue | null>(null)

const CLIENTS_KEY = "fastws.clientes"

const isSameClient = (a: Client, b: Client) => JSON.stringify(a) === JSON.stringify(b)

function loadClients(): Client[] {
  const raw = readDurable(CLIENTS_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is Client =>
            item != null &&
            typeof item === "object" &&
            typeof (item as Client).code === "string" &&
            typeof (item as Client).name === "string"
        )
      }
    } catch {
      /* datos corruptos */
    }
  }
  return []
}

const isMobile = (p: string) => /^3\d{9}$/.test(p)

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(loadClients)
  const clientsRef = useRef(clients)
  clientsRef.current = clients

  const persist = (next: Client[]) => {
    writeDurable(CLIENTS_KEY, JSON.stringify(next))
  }

  const addClients = useCallback((nuevos: Client[]) => {
    const byCode = new Map(clientsRef.current.map((c) => [c.code, c]))
    let added = 0
    let updated = 0
    for (const n of nuevos) {
      const existing = byCode.get(n.code)
      if (existing) {
        const merged: Client = {
          ...existing,
          ...n,
          id: existing.id,
          code: existing.code,
          createdAt: existing.createdAt,
        }
        if (!isSameClient(merged, existing)) {
          byCode.set(n.code, merged)
          updated++
        }
      } else {
        byCode.set(n.code, n)
        added++
      }
    }
    if (added > 0 || updated > 0) {
      const next = [...byCode.values()]
      setClients(next)
      persist(next)
    }
    return { added, updated }
  }, [])

  const registrarCliente = useCallback((data: ClientDraft) => {
    const code = data.code.trim()
    const name = data.name.trim()
    const phone = data.phone.replace(/\D/g, "")
    if (!code) return { ok: false, error: "Escribe el código del cliente." }
    if (!name) return { ok: false, error: "Escribe el nombre del cliente." }
    if (!phone) return { ok: false, error: "Escribe el teléfono del cliente." }
    if (!isMobile(phone)) {
      return {
        ok: false,
        error: "El teléfono debe ser un móvil de 10 dígitos que empiece con 3.",
      }
    }
    if (clientsRef.current.some((c) => c.code === code)) {
      return { ok: false, error: `El código ${code} ya está registrado.` }
    }
    const now = new Date().toISOString()
    const next: Client = {
      id: `cl_${code}_${Date.now()}`,
      code,
      name,
      phone,
      phones: [],
      company: data.company.trim() || "—",
      city: data.city.trim() || "—",
      zone: data.zone.trim() || "—",
      clientType: data.clientType,
      status: "activo",
      valid: true,
      createdAt: now.slice(0, 10),
    }
    const all = [...clientsRef.current, next]
    setClients(all)
    persist(all)
    return { ok: true }
  }, [])

  const actualizarCliente = useCallback((id: string, data: ClientDraft) => {
    const code = data.code.trim()
    const name = data.name.trim()
    const phone = data.phone.replace(/\D/g, "")
    if (!code) return { ok: false, error: "Escribe el código del cliente." }
    if (!name) return { ok: false, error: "Escribe el nombre del cliente." }
    if (!phone) return { ok: false, error: "Escribe el teléfono del cliente." }
    if (!isMobile(phone)) {
      return {
        ok: false,
        error: "El teléfono debe ser un móvil de 10 dígitos que empiece con 3.",
      }
    }
    const current = clientsRef.current.find((c) => c.id === id)
    if (!current) return { ok: false, error: "Cliente no encontrado." }
    if (clientsRef.current.some((c) => c.code === code && c.id !== id)) {
      return { ok: false, error: `El código ${code} ya está registrado.` }
    }
    const next = clientsRef.current.map((c) =>
      c.id === id
        ? {
            ...c,
            code,
            name,
            phone,
            company: data.company.trim() || "—",
            city: data.city.trim() || "—",
            zone: data.zone.trim() || "—",
            clientType: data.clientType,
            valid: true,
          }
        : c
    )
    setClients(next)
    persist(next)
    return { ok: true }
  }, [])

  const eliminarCliente = useCallback((id: string) => {
    const next = clientsRef.current.filter((c) => c.id !== id)
    setClients(next)
    persist(next)
  }, [])

  const value = useMemo<ClientsContextValue>(
    () => ({ clients, addClients, registrarCliente, actualizarCliente, eliminarCliente }),
    [clients, addClients, registrarCliente, actualizarCliente, eliminarCliente]
  )

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>
}

export function useClients() {
  const context = useContext(ClientsContext)
  if (!context) {
    throw new Error("useClients debe usarse dentro de ClientsProvider")
  }
  return context
}