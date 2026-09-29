import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // El simulacro tiene `http://localhost:5173` fijo en sus aserciones y
    // `tauri.conf.json` apunta su devUrl al mismo puerto. Sin `strictPort`,
    // Vite se corre al 5174 si algo ocupa el 5173 y las dos cosas quedan
    // apuntando a servidores distintos.
    port: 5173,
    strictPort: true,
    // Los artefactos de evidencia (simulacro y revisiones visuales) se escriben
    // dentro del repo; sin esto, cada escritura dispara un full-reload de HMR
    // que parte las pruebas del simulacro por mitad. Lo mismo pasa con
    // `src-tauri/target`: `tauri dev` compila Rust ahí mientras la app corre.
    watch: {
      ignored: [
        "**/tools/simulacro/artifacts/**",
        "**/.impeccable/**",
        "**/dist/**",
        "**/src-tauri/**",
      ],
    },
  },
})