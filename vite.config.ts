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
    // Los artefactos de evidencia (simulacro y revisiones visuales) se escriben
    // dentro del repo; sin esto, cada escritura dispara un full-reload de HMR
    // que parte las pruebas del simulacro por la mitad.
    watch: {
      ignored: ["**/tools/simulacro/artifacts/**", "**/.impeccable/**", "**/dist/**"],
    },
  },
})