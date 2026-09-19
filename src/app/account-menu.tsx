import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import type { KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, LogOut } from "lucide-react"

import { getDeviceIdentity, useAuth } from "@/features/auth"
import { cn } from "@/lib/utils"

export function AccountMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const device = useMemo(() => getDeviceIdentity(), [])

  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation()
      close()
      return
    }
    if (event.key === "Tab" && open) {
      setOpen(false)
      return
    }
    if (!open || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return

    event.preventDefault()
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    )
    if (items.length === 0) return
    const current = items.indexOf(document.activeElement as HTMLElement)
    const step = event.key === "ArrowDown" ? 1 : -1
    const next = (current + step + items.length) % items.length
    items[next]?.focus()
  }

  const handleSignOut = () => {
    setOpen(false)
    signOut()
    navigate("/login", { replace: true })
  }

  if (!user) return null

  const initial = user.name.trim().charAt(0).toUpperCase() || "?"

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Cuenta del usuario: ${user.name}, ${user.role}`}
        onClick={() => setOpen((value) => !value)}
        className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-base-800"
      >
        <span
          className="grid size-7 place-items-center rounded-full bg-brand-500 text-xs font-bold text-base-950"
          aria-hidden
        >
          {initial}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-[0.8125rem] font-semibold text-ink-100">{user.name}</span>
          <span className="block text-xs text-ink-500">{user.role}</span>
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 text-ink-500 transition-transform group-hover:text-ink-300",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Cuenta del usuario"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-panel border border-rule bg-base-800"
        >
          <div className="border-b border-rule-soft px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-600">
              Turno activo
            </p>
            <p className="mt-1.5 text-[0.8125rem] font-semibold text-ink-100">{user.name}</p>
            <p className="text-xs text-ink-500">{user.role}</p>
            <p className="mt-2 break-all font-mono text-xs text-ink-300">{user.email}</p>
          </div>

          <p className="border-b border-rule-soft px-4 py-2.5 font-mono text-xs text-ink-400">
            {device.id} · {device.code} · {device.platform}
          </p>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[0.8125rem] font-semibold text-ink-200 transition-colors hover:bg-base-750 hover:text-ink-100"
            >
              <LogOut className="size-4 shrink-0 text-ink-500" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
