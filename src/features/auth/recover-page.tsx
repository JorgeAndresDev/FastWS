import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Check, MailCheck, TriangleAlert } from "lucide-react"

import { Button, FormField, Input } from "@/components/ui"

import { AuthShell, type TurnStep } from "./auth-shell"
import { DEMO_CREDENTIALS, useAuth } from "./auth-provider"
import { getDeviceIdentity } from "./device"

type Phase = "solicitar" | "definir" | "listo"

export function RecoverPage() {
  const { requestRecovery, resetPassword } = useAuth()
  const navigate = useNavigate()
  const device = useMemo(getDeviceIdentity, [])

  const [phase, setPhase] = useState<Phase>("solicitar")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deviceStep: TurnStep = {
    index: 1,
    label: "Dispositivo",
    detail: `${device.platform} · ${device.code}`,
    monoDetail: true,
    tone: "hecho",
    stamp: { label: "Identificado", tone: "entregado" },
  }

  const recoverStep: TurnStep =
    phase === "solicitar"
      ? { index: 2, label: "Recuperar clave", detail: "Solicite las instrucciones", tone: "activo" }
      : { index: 2, label: "Recuperar clave", detail: "Instrucciones enviadas", tone: "hecho" }

  const passwordStep: TurnStep =
    phase === "listo"
      ? { index: 3, label: "Nueva contraseña", detail: "Clave actualizada", tone: "hecho" }
      : {
          index: 3,
          label: "Nueva contraseña",
          detail: "Defina una clave nueva",
          tone: phase === "definir" ? "activo" : "pendiente",
        }

  const steps: TurnStep[] = [deviceStep, recoverStep, passwordStep]

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await requestRecovery(email)
      setPhase("definir")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible enviar las instrucciones.")
    } finally {
      setPending(false)
    }
  }

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }
    setPending(true)
    try {
      await resetPassword(email, code, password)
      setPhase("listo")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la contraseña.")
    } finally {
      setPending(false)
    }
  }

  const back = (
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 transition-colors hover:text-ink-100"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Volver a la bitácora de entrada
    </Link>
  )

  if (phase === "solicitar") {
    return (
      <AuthShell
        steps={steps}
        device={device}
        title="Recuperar la clave del turno"
        intro="Indique el correo del operador. Le enviaremos las instrucciones para recordar la clave de la caseta."
        footer={back}
      >
        <form onSubmit={handleRequest} className="flex flex-col gap-5" noValidate>
          <FormField label="Correo del operador" htmlFor="correo">
            <Input
              id="correo"
              name="correo"
              type="email"
              autoComplete="username"
              spellCheck={false}
              mono
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={DEMO_CREDENTIALS.email}
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
            icon={<MailCheck className="size-4" aria-hidden />}
            className="w-full"
          >
            {pending ? "Enviando…" : "Enviar instrucciones"}
          </Button>
        </form>
      </AuthShell>
    )
  }

  if (phase === "definir") {
    return (
      <AuthShell
        steps={steps}
        device={device}
        title="Definir la clave nueva"
        intro="Escriba el código de verificación y su nueva contraseña. La planilla registrará el cambio."
        footer={back}
      >
        <form onSubmit={handleReset} className="flex flex-col gap-5" noValidate>
          <p className="stamp stamp--entregado">
            <MailCheck aria-hidden />
            Instrucciones enviadas a {email}
          </p>

          <FormField
            label="Código de verificación"
            htmlFor="codigo"
            hint="Revise el correo. En la demostración el código es 000000."
          >
            <Input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              mono
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="000000"
              disabled={pending}
              required
            />
          </FormField>

          <FormField label="Nueva contraseña" htmlFor="nueva" hint="Mínimo 8 caracteres.">
            <Input
              id="nueva"
              name="nueva"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              required
            />
          </FormField>

          <FormField label="Confirmar contraseña" htmlFor="confirmar">
            <Input
              id="confirmar"
              name="confirmar"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              invalid={Boolean(error)}
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
            icon={<Check className="size-4" aria-hidden />}
            className="w-full"
          >
            {pending ? "Actualizando…" : "Definir contraseña"}
          </Button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      steps={steps}
      device={device}
      title="Clave actualizada"
      intro="La contraseña quedó registrada en la planilla. Puede retomar la apertura del turno."
      footer={back}
    >
      <div className="flex flex-col gap-5">
        <p className="stamp stamp--entregado">
          <Check aria-hidden />
          Contraseña actualizada
        </p>
        <Button variant="primary" className="w-full" onClick={() => navigate("/login")}>
          Volver a iniciar sesión
        </Button>
      </div>
    </AuthShell>
  )
}
