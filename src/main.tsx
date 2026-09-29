import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { sileo } from "sileo"
import "@fontsource-variable/inter-tight"
import "@fontsource-variable/jetbrains-mono"
import App from "./App"
import { hydrateStore, onStoreError } from "./lib/db"
import "./styles/index.css"

async function boot() {
  // Los fallos de persistencia son avisos, no excepciones: la app sigue
  // funcionando, pero el operador tiene que enterarse de que no se está
  // guardando. En Tauri llegan desde la cola de escrituras a SQLite.
  onStoreError((message) =>
    sileo.error({
      title: "No se pudo guardar",
      description: message,
    })
  )

  // Único punto asíncrono del arranque. Todos los stores leen de forma
  // síncrona en su mount, así que tienen que esperar a que la base esté
  // cargada antes de montar el árbol.
  try {
    await hydrateStore()
  } catch {
    // Si la base no abre, se entra igual: la app queda en memoria y avisa.
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

void boot()
