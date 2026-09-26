import { useMemo } from "react"
import { NavLink } from "react-router-dom"

import { getDeviceIdentity } from "@/features/auth"
import { cn } from "@/lib/utils"

import { navGroups } from "./nav"
import { Wordmark } from "./wordmark"

export function Sidebar() {
  const device = useMemo(() => getDeviceIdentity(), [])

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-rule-soft bg-base-900 print:hidden">
      <div className="border-b border-rule-soft px-5 py-4">
        <Wordmark descriptor="Planilla general" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Módulos">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-ink-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/app"}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem] transition-colors",
                        isActive
                          ? "bg-base-750 text-ink-100"
                          : "text-ink-300 hover:bg-base-800 hover:text-ink-100"
                      )
                    }
                  >
                    <item.icon
                      className="size-4 shrink-0 text-ink-400 group-hover:text-ink-300"
                      aria-hidden
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-rule-soft px-5 py-3 text-xs leading-tight text-ink-500">
        <p className="font-semibold uppercase tracking-[0.12em] text-ink-400">Equipo</p>
        <p className="mt-0.5">
          {device.id} · {device.platform}
        </p>
        <p className="text-ink-600">fastws v0.1 · UI-0</p>
      </div>
    </aside>
  )
}
