import { Navigate, Outlet, useLocation } from "react-router-dom"

import { Wordmark } from "@/app/wordmark"

import { useAuth } from "./auth-provider"

function OpeningPlanilla() {
  return (
    <div className="grid min-h-screen place-items-center bg-base-950">
      <div className="flex items-center gap-3">
        <Wordmark />
        <p className="text-sm font-semibold text-ink-400">Abriendo la planilla…</p>
      </div>
    </div>
  )
}

export function RequireAuth() {
  const { user, ready, bootstrapNeeded } = useAuth()
  const location = useLocation()

  if (!ready) return <OpeningPlanilla />
  // Sin usuarios no hay con quién entrar: la pantalla de login no serviría.
  // El alta es lo primero, y desde ahí se vuelve a la app.
  if (bootstrapNeeded) return <Navigate to="/bootstrap" replace />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
