import { useNavigate } from "react-router-dom"
import { CircleAlert, Link2, Link2Off, TriangleAlert, Wifi } from "lucide-react"

import { Button, Panel } from "@/components/ui"
import { useConexion } from "@/features/connection/conexion-store"
import { hourMinute } from "@/features/reports/report-dates"
import { cn } from "@/lib/utils"

const label = "text-xs font-bold uppercase tracking-[0.14em]"

export function IntegracionPanel() {
  const navigate = useNavigate()
  const { status, metaPhone, wabaName, ids, verifiedAt, lastError } = useConexion()

  const conectada = status === "conectada"
  const enProgreso = status === "probando"
  const fallida = status === "error"

  const actionStamp = conectada ? (
    <span className="stamp stamp--entregado stamp--container">
      <Wifi aria-hidden />
      Conectada
    </span>
  ) : enProgreso ? (
    <span className="stamp stamp--proceso stamp--container">
      <Link2 aria-hidden />
      Probando
    </span>
  ) : fallida ? (
    <span className="stamp stamp--fallido stamp--container">
      <TriangleAlert aria-hidden />
      Error
    </span>
  ) : (
    <span className="stamp stamp--fecha stamp--container">
      <Link2Off aria-hidden />
      Sin configurar
    </span>
  )

  return (
    <Panel title="Integración de WhatsApp Business" action={actionStamp}>
      {conectada ? (
        <dl className="grid gap-2 px-5 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Número de la empresa</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{metaPhone || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Cuenta de WhatsApp Business</dt>
            <dd className="text-[0.8125rem] text-ink-100">{wabaName || ids.wabaId || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Phone Number ID</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{ids.phoneNumberId || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>WABA ID</dt>
            <dd className="font-mono text-[0.8125rem] text-ink-100">{ids.wabaId || "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className={cn(label, "text-ink-500")}>Última verificación</dt>
            <dd className="text-[0.8125rem] text-ink-100">
              {verifiedAt ? `${hourMinute(verifiedAt)} · ${new Date(verifiedAt).toLocaleDateString("es-CO")}` : "—"}
            </dd>
          </div>
          <div className="flex items-center gap-3 border-t border-rule-soft pt-4">
            <Button
              variant="secondary"
              icon={<Link2 className="size-4" aria-hidden />}
              onClick={() => navigate("/app/conexion")}
            >
              Gestionar en Conexión
            </Button>
          </div>
        </dl>
      ) : (
        <div className="flex flex-col gap-4 px-5 py-4">
          {fallida && lastError && (
            <div
              role="alert"
              className="flex flex-col gap-1.5 rounded-md border border-fallido/30 bg-fallido/10 px-3 py-2"
            >
              <p className="flex items-start gap-2 text-xs leading-relaxed text-fallido">
                <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {lastError.message}
              </p>
            </div>
          )}
          <p className="text-xs leading-relaxed text-ink-500">
            Este panel refleja el estado de la sesión guardada en Conexión. Los identificadores y el
            token se gestionan allí y no se duplican aquí.
          </p>
          <div>
            <Button
              variant="primary"
              icon={<Link2 className="size-4" aria-hidden />}
              onClick={() => navigate("/app/conexion")}
            >
              Ir a Conexión
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}