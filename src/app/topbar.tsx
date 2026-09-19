import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui"
import { cn } from "@/lib/utils"

import { AccountMenu } from "./account-menu"
import { formatDateStamp } from "./date-stamp"

function ConnectionPill() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  const Icon = online ? Wifi : WifiOff
  return (
    <span
      role="status"
      aria-label={online ? "Conectado" : "Sin conexión"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
        online
          ? "border-entregado/30 bg-entregado/10 text-entregado"
          : "border-fallido/30 bg-fallido/10 text-fallido"
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {online ? "Conectado" : "Sin conexión"}
    </span>
  )
}

export function Topbar() {
  const navigate = useNavigate()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-rule-soft bg-base-900 px-5">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          Registro de operación
        </span>
        <span className="text-ink-600">·</span>
        <time
          className="stamp stamp--fecha"
          dateTime={new Date().toISOString()}
          suppressHydrationWarning
        >
          {formatDateStamp()}
        </time>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionPill />
        <span className="h-5 w-px bg-rule-soft" aria-hidden />
        <AccountMenu />

        <Button
          variant="primary"
          icon={<Plus className="size-4" aria-hidden />}
          onClick={() => navigate("/app/campanas")}
        >
          Nueva campaña
        </Button>
      </div>
    </header>
  )
}