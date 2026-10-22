# FastWS

Sistema de escritorio Windows para administrar clientes y ejecutar envíos masivos de
WhatsApp mediante la **API oficial de Meta** (no automatización de WhatsApp Web).
Interfaz en español (Colombia), dark-first, con el principio *«local cuando sea posible,
Internet solamente cuando sea necesario»*.

La especificación del producto vive en [`PRODUCT.md`](./PRODUCT.md); las decisiones de
interfaz y tokens de diseño en [`DESIGN.md`](./DESIGN.md).

## Estado actual

| Capa | Estado |
|---|---|
| Interfaz (12 módulos del MVP) | Completa y verificada: **198 comprobaciones** end‑to‑end, 0 fallos |
| Lógica pura | **65 tests unitarios** (Vitest) + **26 tests de persistencia** (Rust) |
| Capa de datos | **Real en escritorio**: SQLite relacional vía Tauri. `localStorage` en el navegador |
| Shell de escritorio | **Tauri 2.12** compilando y arrancando; instaladores MSI/NSIS generados (sin firmar) |
| Integración Meta | **Verificada contra la API real** (lectura); el envío real aún no se ha ejecutado |
| Guardas de envío | Modo ensayo por defecto, lista blanca en desarrollo y confirmación por campaña |
| Webhooks | **Pendiente** (los estados entregado/leído no llegan todavía) |

> La app **no está lista para producción**: los envíos reales nunca se han ejecutado, los
> estados de entrega llegan simulados y varias plantillas de Meta deben recrearse con
> variables con nombre. Ver la sección *Qué falta*.

## Requisitos

- **Node.js 20 o superior** (probado en v24) y npm.
- Para la **app de escritorio**: Rust (`rustup`, toolchain `stable-x86_64-pc-windows-msvc`) y
  Visual Studio Build Tools 2022 con el workload *Desarrollo para el escritorio con C++*
  (MSVC v143 + Windows SDK). En Windows ambos son obligatorios.
- Para la **interfaz en el navegador**: nada más que Node. Es la ruta que usa el simulacro.
- **Credenciales de Meta** solo si vas a probar la integración real (opcional).

## Comandos

```bash
npm install

npm run dev            # servidor de desarrollo en http://localhost:5173
npm run build          # comprobación de tipos + build de producción
npm run preview        # sirve el build

npm run tauri:dev      # app de escritorio en modo desarrollo (levanta SQLite)
npm run tauri:build    # instalador .msi / .exe de producción

npm run lint           # ESLint sobre src y tools
npm test               # tests unitarios (Vitest)
npm run test:rust      # tests de la capa SQLite (cargo test)
npm run verify         # lint + test + test:rust + build: el gate de calidad

npm run sim            # simulacro end-to-end (198 checks, 8 pasadas)
npm run smoke:meta     # validación de solo lectura contra la API real de Meta
```

`npm run sim` y `npm run smoke:meta` requieren el dev server en marcha (`npm run dev`).

## Capa de datos

La app tiene **dos implementaciones del mismo contrato** y elige una sola vez al arrancar:

| Implementación | Dónde corre | Qué usa |
|---|---|---|
| `impl-web` | Navegador, y el simulacro | `localStorage` |
| `impl-tauri` | App de escritorio | SQLite vía IPC de Tauri |

El contrato vive en `src/lib/db/contracts.ts` y espeja la superficie de `Storage` a propósito:
los stores leen de forma **sincrónica** en su montaje, y ese comportamiento no se tocó. La
asincronía de SQLite se concentra en un único punto, `hydrateStore()` en `src/main.tsx`, que
corre antes de montar el árbol. Después de eso, `get` y `set` son síncronos porque `impl-tauri`
sirve desde memoria y persiste en segundo plano, con una cola que respeta el orden.

**Alcances de persistencia** (`src/lib/db/session-scope.ts`):

- **Duradero** — sobrevive al cierre. Clientes, campañas, conversaciones, auditoría, turnos,
  identidad del equipo, sesión recordada, identificadores de Meta. Va a la base.
- **Efímero** — muere con la ventana. La sesión temporal. Se queda en `sessionStorage`
  del webview incluso en Tauri. El **token de Meta** es la excepción: en escritorio se
  cifra con **DPAPI** (`src-tauri/src/secrets.rs`), no vive en `sessionStorage`.

**Migración:** la primera vez que la app de escritorio arranca con datos del navegador, los
copia a SQLite y a partir de ahí SQLite manda. El token nunca se copia.

El esquema es `src-tauri/schema.sql` (fuente única, la aplica Rust al abrir). Desde la
Fase 4, las raíces de agregado viven en tablas relacionales: `users`, `clients`,
`campaigns` + `messages`, `audit_logs` y los ajustes en `settings`. `documents` queda como
respaldo para JSON ilegible o datos de versiones anteriores; si existe un documento, gana
sobre la tabla. La migración de documentos corre en cada arranque con un *savepoint* por
raíz, y las tablas del esquema viejo se conservan como `<tabla>_legacy` cuando tenían filas.

## Validación

Hay tres capas complementarias, y conviene entender la diferencia.

### 1. Simulacro end‑to‑end (`npm run sim`)

Ocho pasadas que conducen un Edge headless por la interfaz con el **Graph API simulado**
(ver `tools/simulacro/sim-base.mjs`, función `fetchStubSrc`). Comprueba 198 behaviours:
recorridos, formularios, estados de carga y error, persistencia, auditoría, permisos y las
guardas de envío.

```
tools/simulacro/
├── sim-base.mjs        # CDP, arranque de Edge, stub de la Graph API
├── pasada-0.mjs … 7    # las ocho pasadas
├── mk-fixtures.cjs     # genera los CSV de prueba
└── artifacts/          # capturas y JSON de cada corrida (ignorado por git)
```

**Límite importante:** al simular la API, el simulacro *no* valida autenticación, formatos
de petición ni respuestas reales de Meta. Para eso está la capa 3. Tampoco prueba SQLite:
corre siempre contra la implementación de navegador. La persistencia se cubre aparte, en la
capa 2.

### 2. Persistencia SQLite (`npm run test:rust`)

Veintiséis pruebas sobre la base real, sin Tauri ni webview (`src-tauri/src/db.rs` y
`src-tauri/src/relational.rs`): esquema, vuelta guardar/leer, reemplazo por clave, borrado,
lotes mixtos, conservación literal del JSON, reapertura sin duplicar tablas, vaciado
reutilizable, ida y vuelta de raíces relacionales, reemplazo de campañas con sus
destinatarios, migración de documentos con *savepoint* por raíz y migración del esquema
anterior dejando `<tabla>_legacy`.

### 3. Validación contra la API real (`npm run smoke:meta`)

Cuatro llamadas `GET` de solo lectura: número, WABA, pertenencia del número a la WABA e
inventario de plantillas. El estado de verificación no se pide: no está expuesto con este
token y hay que confirmarlo en Meta Business. **No envía ningún mensaje.**

Requiere un `.env` en la raíz (ya ignorado por git):

```bash
cp .env.example .env    # rellena META_TOKEN, META_WABA_ID, META_PHONE_NUMBER_ID
npm run smoke:meta
```

El token nunca se imprime: solo su longitud y los últimos cuatro caracteres.

## Qué es real y qué es simulado

Conviene ser explícito, porque es donde una demo puede engañar:

| Parte | Cómo se comporta hoy |
|---|---|
| Interfaz y navegación | Real |
| Estados, filtros, auditoría | Reales. Sobre SQLite en escritorio, `localStorage` en navegador |
| Persistencia | Real: SQLite relacional, sobrevive al cierre de la app |
| Plantillas y envíos | Lectura de plantillas real; el envío contra Meta aún no se ha ejecutado |
| Entregado / leído / respuestas | **Simulados.** Requiere webhooks (Fase 3) |
| Guardas de envío | Reales: ensayo por defecto, lista blanca en desarrollo, confirmación explícita por campaña |
| Token de Meta | Cifrado con DPAPI en escritorio; `sessionStorage` solo en el navegador |
| Autenticación | Real: PBKDF2 con sal, hash y comparación en tiempo constante |
| Datos de clientes | Datos de demostración. No se han usado datos reales de clientes |
| Multi‑PC | No existe. Es una decisión de producto pendiente (`PRODUCT.md §69`) |

## Qué falta para producción

1. **Envío real validado** — las guardas y el flujo están listos, pero el despacho contra
   Meta no se ha ejecutado. Antes hay que recrear en el gestor de Meta las plantillas que
   usan `{{}}` sin nombre y correr una campaña de prueba con el modo real.
2. **Webhooks** — un Worker de Cloudflare que reciba los estados y respuestas. Sin esto la
   columna de entrega/read nunca se llena con datos reales.
3. **Firma del instalador** — `npm run tauri:build` ya produce
   `FastWS_0.1.0_x64_en-US.msi` y `FastWS_0.1.0_x64-setup.exe` en
   `src-tauri/target/release/bundle/`, pero sin certificado de firma de código. Windows
   mostrará advertencias de SmartScreen hasta firmarlos.
4. **Sincronización multi‑PC** — fuera de alcance mientras opere en un equipo.

## Documentación

- [`docs/simulacro-hallazgos.md`](./docs/simulacro-hallazgos.md) — ficha de hallazgos con
  severidad, evidencia y estado (confirmado / descartado / corregido).
- [`docs/simulacro-resultados.md`](./docs/simulacro-resultados.md) — resultado de las 198
  comprobaciones, una por una.
- [`docs/simulacro.md`](./docs/simulacro.md) — cómo se ejecuta y cómo se lee el simulacro.
