import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

import { readDurable, writeDurable } from "@/lib/db/session-scope"

export type ThemeMode = "oscuro" | "claro"

const THEME_KEY = "fastws.tema"

/**
 * Modo por defecto: oscuro. Es lo que fija PRODUCT.md ("dark-first, comprometido
 * por el cliente") y lo para el que está calibrada la paleta: los pisos de
 * contraste de la tinta y el modelo de elevación por tono nacieron ahí.
 */
const DEFAULT_MODE: ThemeMode = "oscuro"

const MODES: readonly ThemeMode[] = ["oscuro", "claro"]

function isMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value)
}

function readMode(): ThemeMode {
  const raw = readDurable(THEME_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (isMode(parsed)) return parsed
    } catch {
      /* dato corrupto: se usa el default */
    }
  }
  return DEFAULT_MODE
}

/**
 * Aplica el modo sobre `<html>`. El atributo es lo unico que lee CSS, asi que
 * los dos mundos pueden convivir en la misma hoja sin condicionales.
 */
function paint(mode: ThemeMode) {
  const root = document.documentElement
  root.dataset.theme = mode
  // `color-scheme` le dice al navegador (y a WebView2) que use sus propios
  // controles nativos en claro: scrollbars, checkboxes, select. Sin esto, el
  // checkbox de "Recordar sesión" y las barras quedan oscuros en modo claro.
  root.style.colorScheme = mode
}

interface ThemeContextValue {
  mode: ThemeMode
  /** Invierte el modo. */
  toggle: () => void
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)

  useEffect(() => {
    paint(mode)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    writeDurable(THEME_KEY, JSON.stringify(next))
  }, [])

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === "oscuro" ? "claro" : "oscuro"
      writeDurable(THEME_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggle, setMode }),
    [mode, toggle, setMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider")
  }
  return context
}

/**
 * Se llama una vez, antes de montar el árbol, junto a `hydrateStore()`. Sin esto
 * la app pinta el modo oscuro por defecto y el claro aparece un frame después.
 */
export function paintStoredTheme() {
  paint(readMode())
}
