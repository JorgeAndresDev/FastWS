import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    // `catch {}` vacío es intencional: el simulacro ignora fallos al sondear.
    ignores: ["dist", "node_modules", "tools/simulacro/artifacts", ".impeccable", "agent", ".agents", ".claude"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // `catch {}` vacío es deliberado en el simulacro: al sondear la red
    // cualquier fallo se traduce en "sin respuesta", no en un error.
    rules: { "no-empty": ["error", { allowEmptyCatch: true }] },
  },
  {
    // TypeScript ya comprueba los nombres no definidos; `no-undef` produce
    // falsos positivos con tipos y módulos.
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // El proyecto usa `any` de forma puntual en fronteras de datos externos.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Herramientas de Node: simulacro y smoke test.
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // Los .cjs son CommonJS por definición: require() es la única forma.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
)
