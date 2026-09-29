import { useState } from "react"
import { DatabaseBackup, Eraser, TriangleAlert, X } from "lucide-react"

import { Button, Panel } from "@/components/ui"
import { borrarDatosLocales, restablecerDemo } from "@/lib/demo"

type Confirmar = "demo" | "borrar" | null

const CONFIRM_DETAIL: Record<Exclude<Confirmar, null>, { titulo: string; cuerpo: string; accion: string }> = {
  demo: {
    titulo: "Restablecer datos de demostración",
    cuerpo:
      "Se reemplazarán los datos actuales de clientes, campañas, conversaciones y velocidades por un conjunto de demostración. La sesión y la conexión Meta no se tocan. La app se recargará.",
    accion: "Restablecer",
  },
  borrar: {
    titulo: "Borrar datos locales",
    cuerpo:
      "Se borrarán de este equipo los clientes, campañas, velocidad, conversaciones, turnos y la sesión de conexión Meta. No hay deshacer: la app se recargará con una planilla vacía.",
    accion: "Borrar todo",
  },
}

export function AccionesPanel() {
  const [confirmar, setConfirmar] = useState<Confirmar>(null)

  const ejecutar = () => {
    if (confirmar === "demo") restablecerDemo()
    if (confirmar === "borrar") borrarDatosLocales()
    setConfirmar(null)
    window.location.reload()
  }

  const detalle = confirmar ? CONFIRM_DETAIL[confirmar] : null

  return (
    <Panel title="Acciones de datos">
      <div className="flex flex-col gap-4 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="danger"
            icon={<DatabaseBackup className="size-4" aria-hidden />}
            onClick={() => setConfirmar("demo")}
          >
            Restablecer datos de demostración
          </Button>
          <Button
            variant="danger"
            icon={<Eraser className="size-4" aria-hidden />}
            onClick={() => setConfirmar("borrar")}
          >
            Borrar datos locales
          </Button>
        </div>
        <p role="note" className="text-xs leading-relaxed text-ink-500">
          Ambas acciones se registran en Auditoría y recargan la aplicación para que los módulos
          vuelvan a leer los datos desde el almacenamiento.
        </p>
      </div>

      {detalle && (
        <div
          className="scrim fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmar-datos-titulo"
          onKeyDown={(e) => e.key === "Escape" && setConfirmar(null)}
        >
          <div className="panel w-full max-w-md">
            <header className="flex items-center justify-between gap-3 border-b border-rule-soft px-5 py-3">
              <h2
                id="confirmar-datos-titulo"
                className="text-xs font-bold uppercase tracking-[0.14em] text-ink-400"
              >
                {detalle.titulo}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                icon={<X className="size-4" aria-hidden />}
                aria-label="Cerrar"
                onClick={() => setConfirmar(null)}
              />
            </header>
            <div className="flex flex-col gap-4 px-5 py-4">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-400">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {detalle.cuerpo}
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmar(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  icon={
                    confirmar === "demo" ? (
                      <DatabaseBackup className="size-4" aria-hidden />
                    ) : (
                      <Eraser className="size-4" aria-hidden />
                    )
                  }
                  onClick={ejecutar}
                >
                  {detalle.accion}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}