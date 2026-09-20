import { useNavigate } from "react-router-dom"
import { Clock3, Plus, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui"
import { useOnline } from "@/features/auth"
import { cn } from "@/lib/utils"

import { AccountMenu } from "./account-menu"
import { formatDateStamp } from "./date-stamp"

function ConnectionPill() {
  const online = useOnline()
  const Icon = online ? Wifi : WifiOff
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold",
        online
          ? "border-entregado/30 bg-entregado/10 text-entregado"
          : "border-pendiente/30 bg-pendiente/10 text-pendiente"
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {online ? "Listo para despacho" : "Modo local · envíos en pausa"}
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

        <span className="inline-flex items-center gap-2">
          <Button
            variant="secondary"
            icon={<Plus className="size-4" aria-hidden />}
            onClick={() => navigate("/app/campanas")}
            aria-label="Nueva campaña (próximamente)"
          >
            Nueva campaña
          </Button>
          <span className="stamp stamp--pendiente">
            <Clock3 aria-hidden />
            Próximamente
          </span>
        </span>
      </div>
    </header>
  )
}
