import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, ShieldCheck, TriangleAlert, UserPlus } from "lucide-react"

import { Button, FormField, Input } from "@/components/ui"

import { AuthShell } from "./auth-shell"
import { useAuth } from "./auth-provider"
import { getDeviceIdentity } from "./device"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(name: string, email: string, password: string, confirm: string) {
  const errors: { name?: string; email?: string; password?: string; confirm?: string } = {}
  if (!name.trim()) errors.name = "Escriba el nombre del operador."
  const value = email.trim()
  if (!value) errors.email = "Escriba el correo del operador."
  else if (!EMAIL_RE.test(value)) errors.email = "El correo no parece válido."
  if (!password) errors.password = "Escriba una contraseña."
  if (password !== confirm) errors.confirm = "Las contraseñas no coinciden."
  return errors
}

/**
 * Alta del primer operador. Solo aparece cuando la app no tiene ningún usuario
 * (primer arranque o tras borrar todos). Sin ella no habría forma de entrar:
 * la pantalla de login no sirve si no hay con quién comparar.
 */
export function BootstrapPage() {
  const { createAdmin } = useAuth()
  const navigate = useNavigate()
  const device = useMemo(getDeviceIdentity, [])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirm?: string
  }>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validate(name, email, password, confirm)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setError(null)
    setPending(true)
    try {
      await createAdmin(name, email, password)
      navigate("/app", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el operador.")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell
      device={device}
      title="Alta del primer operador"
      intro="Este equipo todavía no tiene operador. Cree la cuenta con la que se sellará la planilla; después podrá dar de alta a más usuarios."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <FormField label="Nombre" htmlFor="operador-nombre" error={fieldErrors.name}>
          <Input
            id="operador-nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="María Fernanda López"
            invalid={Boolean(fieldErrors.name || error)}
            disabled={pending}
            required
          />
        </FormField>

        <FormField label="Correo" htmlFor="operador-correo" error={fieldErrors.email}>
          <Input
            id="operador-correo"
            name="correo"
            type="email"
            autoComplete="username"
            spellCheck={false}
            mono
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="operador@empresa.co"
            invalid={Boolean(fieldErrors.email || error)}
            disabled={pending}
            required
          />
        </FormField>

        <FormField
          label="Contraseña"
          htmlFor="operador-clave"
          hint="Mínimo 10 caracteres, con mayúsculas, minúsculas y un número."
          error={fieldErrors.password}
        >
          <div className="relative">
            <Input
              id="operador-clave"
              name="clave"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              invalid={Boolean(fieldErrors.password || error)}
              className="pr-10"
              disabled={pending}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-ink-400 transition-colors hover:bg-base-750 hover:text-ink-100"
              aria-pressed={showPassword}
              aria-controls="operador-clave"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </FormField>

        <FormField label="Repetir contraseña" htmlFor="operador-clave-2" error={fieldErrors.confirm}>
          <Input
            id="operador-clave-2"
            name="clave2"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            invalid={Boolean(fieldErrors.confirm || error)}
            disabled={pending}
            required
          />
        </FormField>

        {error && (
          <p
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
          icon={<UserPlus className="size-4" aria-hidden />}
          className="w-full"
        >
          {pending ? "Creando operador…" : "Crear operador"}
        </Button>

        <p className="flex items-start gap-2 text-[0.75rem] leading-relaxed text-ink-500">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ink-400" aria-hidden />
          La contraseña se guarda con PBKDF2 (100 000 iteraciones) y una sal propia.
          Si la pierde, solo se puede cambiar con el código de recuperación.
        </p>
      </form>
    </AuthShell>
  )
}