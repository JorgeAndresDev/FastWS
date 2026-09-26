import { useNavigate } from "react-router-dom"
import { Link2Off, Plus, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui"
import { useOnline } from "@/features/auth"
import { useConexion } from "@/features/connection/conexion-store"
import { cn } from "@/lib/utils"

import { AccountMenu } from "./account-menu"
import { formatDateStamp } from "./date-stamp"

function ConnectionPill() {
  const online = useOnline()
  const { status } = useConexion()
  const ready = online && status === "conectada"

  const Icon = ready ? Wifi : online ? Link2Off : WifiOff
  const label = ready
    ? "Listo para despacho"
    : online
      ? "Sin conexión Meta · envíos en pausa"
      : "Modo local · envíos en pausa"

  return (
    <span
      role="status"
      className={cn(
        "stamp",
        ready ? "stamp--entregado" : "stamp--pendiente",
        "stamp--container"
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}

export function Topbar() {
  const navigate = useNavigate()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-rule-soft bg-base-900 px-5 print:hidden">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
          Registro de operación
        </span>
        <span className="text-ink-600">·</span>
        <time
          className="stamp stamp--fecha stamp--container"
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

        <span className="inline-flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Plus className="size-4" aria-hidden />}
            onClick={() => navigate("/app/campanas")}
          >
            Nueva campaña
          </Button>
        </span>
      </div>
    </header>
  )
}
