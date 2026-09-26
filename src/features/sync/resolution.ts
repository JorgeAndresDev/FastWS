export interface ResolutionRule {
  id: string
  titulo: string
  detalle: string
}

export const RESOLUTION_RULES: ResolutionRule[] = [
  {
    id: "claves",
    titulo: "Claves estables e idempotencia",
    detalle:
      "Los clientes se identifican por su Código y los envíos por la pareja campaña+destinatario (clave única). Replicar el mismo cambio no crea duplicados.",
  },
  {
    id: "ultima-escritura",
    titulo: "Última escritura gana",
    detalle:
      "Cuando dos equipos editan el mismo registro, gana la versión con el updated_at más reciente. Es el criterio de conflicto por defecto.",
  },
  {
    id: "bloqueo",
    titulo: "Bloqueo de campaña por equipo",
    detalle:
      "Mientras una campaña está en proceso, su despacho queda asignado al equipo que la inició (ver dispatchedBy·dispositivo) para evitar envíos simultáneos.",
  },
  {
    id: "cola",
    titulo: "Cola de cambios ordenada",
    detalle:
      "Todo cambio local espera en la tabla sync_queue y se sube en orden de creación, con reintentos y sin saltar pasos cuando la conexión falla.",
  },
]

export const SHARED_BASE_NOTE =
  "Estas reglas se aplicarán cuando exista la base compartida (cliente Tauri + Turso, fase de backend). Hoy cada equipo trabaja solo con sus datos locales."