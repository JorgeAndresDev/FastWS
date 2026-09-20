import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ShieldCheck, TriangleAlert } from "lucide-react"

import { Button, FormField, Input } from "@/components/ui"

import { AuthShell, type TurnStep } from "./auth-shell"
import { DEMO_CREDENTIALS, useAuth } from "./auth-provider"
import { getDeviceIdentity } from "./device"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateLogin(email: string, password: string) {
  const errors: { email?: string; password?: string } = {}
  const value = email.trim()
  if (!value) errors.email = "Escriba su usuario."
  else if (!EMAIL_RE.test(value)) errors.email = "El usuario debe ser un correo válido."
  if (!password) errors.password = "Escriba su contraseña."
  return errors
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const device = useMemo(getDeviceIdentity, [])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app"

  const steps: TurnStep[] = [
    {
      index: 1,
      label: "Dispositivo",
      detail: `${device.platform} · ${device.code}`,
      monoDetail: true,
      tone: "hecho",
      stamp: { label: "Identificado", tone: "entregado" },
    },
    { index: 2, label: "Credenciales", detail: "Usuario y contraseña del operador", tone: "activo" },
    { index: 3, label: "Sellar turno", detail: "Abre la planilla de despacho", tone: "pendiente" },
  ]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validateLogin(email, password)
    setFieldErrors(errors)
    if (errors.email || errors.password) return
    setError(null)
    setPending(true)
    try {
      await signIn(email, password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      steps={steps}
      device={device}
      title="Bitácora de entrada"
      intro="Abra su turno de despacho con las credenciales del operador. La planilla queda sellada a su nombre hasta el cierre."
      footer={
        <p className="text-xs leading-relaxed text-ink-600">
          Datos de demostración. Usuario{" "}
          <span className="font-mono text-ink-400">{DEMO_CREDENTIALS.email}</span> · contraseña{" "}
          <span className="font-mono text-ink-400">{DEMO_CREDENTIALS.password}</span>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormField
          label="Usuario"
          htmlFor="usuario"
          hint="El correo con el que fue dado de alta."
          error={fieldErrors.email}
        >
          <Input
            id="usuario"
            name="usuario"
            type="email"
            autoComplete="username"
            spellCheck={false}
            mono
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operador@empresa.co"
            invalid={Boolean(fieldErrors.email || error)}
            aria-describedby={
              fieldErrors.email ? "usuario-error" : error ? "login-error" : "usuario-hint"
            }
            disabled={pending}
            required
          />
        </FormField>

        <FormField label="Contraseña" htmlFor="clave" error={fieldErrors.password}>
          <div className="relative">
            <Input
              id="clave"
              name="clave"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={Boolean(fieldErrors.password || error)}
              aria-describedby={
                fieldErrors.password ? "clave-error" : error ? "login-error" : undefined
              }
              className="pr-20"
              disabled={pending}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-200"
              aria-pressed={showPassword}
              aria-controls="clave"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-ink-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 accent-ink-100"
            />
            Recordar sesión en este equipo
          </label>
          <Link
            to="/recuperar"
            className="text-xs font-semibold text-ink-400 transition-colors hover:text-ink-100"
          >
            ¿Olvidó su contraseña?
          </Link>
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="flex items-start gap-2 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2 text-xs leading-relaxed text-fallido"
          >
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={pending}
          icon={<ShieldCheck className="size-4" aria-hidden />}
          className="w-full"
        >
          {pending ? "Sellando turno…" : "Sellar turno"}
        </Button>
      </form>
    </AuthShell>
  )
}
