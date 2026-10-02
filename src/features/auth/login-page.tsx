import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, ShieldCheck, TriangleAlert } from "lucide-react"

import { Button, FormField, Input } from "@/components/ui"

import { AuthShell } from "./auth-shell"
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
      device={device}
      title="Bitácora de entrada"
      intro="Abra su turno de despacho con las credenciales del operador. La planilla queda sellada a su nombre hasta el cierre."
      footer={
        <p className="text-balance text-[0.75rem] leading-relaxed text-ink-500">
          Datos de demostración. Usuario{" "}
          <span className="font-mono text-ink-300">{DEMO_CREDENTIALS.email}</span> · contraseña{" "}
          <span className="font-mono text-ink-300">{DEMO_CREDENTIALS.password}</span>
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
              className="pr-10"
              disabled={pending}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-ink-400 transition-colors hover:bg-base-750 hover:text-ink-100"
              aria-pressed={showPassword}
              aria-controls="clave"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </FormField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[0.75rem] text-ink-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 accent-brand-500"
            />
            Recordar sesión en este equipo
          </label>
          <Link
            to="/recuperar"
            className="text-[0.75rem] font-semibold text-ink-300 transition-colors hover:text-ink-100"
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
