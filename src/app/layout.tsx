import { useEffect, useRef } from "react"
import { Outlet, useLocation } from "react-router-dom"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"

export function AppLayout() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden bg-base-950">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-base-800 focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-ink-100"
      >
        Saltar al contenido
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}