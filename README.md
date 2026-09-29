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
| Interfaz (12 módulos del MVP) | Completa y verificada: **185 comprobaciones** end‑to‑end, 0 fallos |
| Lógica pura | **31 tests unitarios** (Vitest) + **8 tests de persistencia** (Rust) |
| Capa de datos | **Real en escritorio**: SQLite vía Tauri. `localStorage` en el navegador |
| Shell de escritorio | **Tauri 2.12** compilando y arrancando; base creada con el esquema completo |
| Integración Meta | **Verificada contra la API real** (lectura); el envío aún no se ha ejecutado |
| Webhooks | **Pendiente** (los estados entregado/leído no llegan todavía) |

> La app **no está lista para producción**: los envíos reales nunca se han ejecutado, los
> estados de entrega llegan simulados y la autenticación sigue siendo de demostración.
> Ver la sección *Qué falta*.

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

npm run sim            # simulacro end-to-end (185 checks, 8 pasadas)
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
- **Efímero** — muere con la ventana. El **token de Meta** y la sesión temporal. Se queda en
  `sessionStorage` del webview incluso en Tauri.

**Migración:** la primera vez que la app de escritorio arranca con datos del navegador, los
copia a SQLite y a partir de ahí SQLite manda. El token nunca se copia.

El esquema es `src-tauri/schema.sql` (fuente única, la aplica Rust al abrir). La tabla
`documents` guarda hoy cada raíz de agregado como JSON; las tablas relacionales están
definidas y son la capa 2.

## Validación

Hay dos capas complementarias, y conviene entender la diferencia.

### 1. Simulacro end‑to‑end (`npm run sim`)

Ocho pasadas que conducen un Edge headless por la interfaz con el **Graph API simulado**
(ver `tools/simulacro/sim-base.mjs`, función `fetchStubSrc`). Comprueba 185 behaviours:
recorridos, formularios, estados de carga y error, persistencia, auditoría y permisos.

```
tools/simulacro/
├── sim-base.mjs        # CDP, arranque de Edge, stub de la Graph API
├── pasada-0.mjs … 7    # las ocho pasadas
├── mk-fixtures.cjs     # genera los CSV de prueba
└── artifacts/          # capturas y JSON de cada corrida (ignorado por git)
```

**Límite importante:** al.stubbar la API, el simulacro *no* valida autenticación, formatos
de petición ni respuestas reales de Meta. Para eso está la capa 2. Tampoco prueba SQLite:
corre siempre contra la implementación de navegador. La persistencia se cubre aparte, en la
capa 3.

### 2. Persistencia SQLite (`npm run test:rust`)

Ocho pruebas sobre la base real, sin Tauri ni webview (`src-tauri/src/db.rs`): aplicación del
esquema, vuelta guardar/leer, reemplazo por clave, borrado, lotes mixtos de alta y borrado,
conservación literal del JSON, reapertura sin duplicar tablas y vaciado reutilizable.

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
| Persistencia | Real: SQLite, sobrevive al cierre de la app |
| Plantillas y envíos | Se simulan; contra Meta solo se ha leído |
| Entregado / leído / respuestas | **Simulados.** Requiere webhooks (Fase 3) |
| Token de Meta | Efímero: vive en sesión y **no** se escribe en la base |
| Autenticación | **Demostración**: credenciales fijas en el código fuente |
| Datos de clientes | Datos de demostración. No se han usado datos reales de clientes |
| Multi‑PC | No existe. Es una decisión de producto pendiente (`PRODUCT.md §69`) |

## Qué falta para producción

1. **Autenticación de verdad** — hoy `admin@fastws.local` / `despacho2026` están literales en
   `src/features/auth/auth-provider.tsx`. Esto solo, ya bloquea la producción.
2. **Token de Meta cifrado en reposo** — hoy vive en `sessionStorage` del webview, que no
   cifra. Debe pasar al almacén seguro de Windows (DPAPI o Credential Manager).
3. **Capa relacional** — `documents` sigue guardando cada agregado como JSON. Una campaña de
   5.000 destinatarios reescribe 5.000 filas por lote. La capa 2 migra raíz por raíz sin
   cambiar el contrato del repositorio.
4. **Envío real** — guardas: modo ensayo, lista blanca en desarrollo y confirmación explícita
   al arrancar una campaña.
5. **Webhooks** — un Worker de Cloudflare que reciba los estados y respuestas. Sin esto la
   columna de entrega/read nunca se llena con datos reales.
6. **Sincronización multi‑PC** — fuera de alcance mientras opere en un equipo.

## Documentación

- [`docs/simulacro-hallazgos.md`](./docs/simulacro-hallazgos.md) — ficha de hallazgos con
  severidad, evidencia y estado (confirmado / descartado / corregido).
- [`docs/simulacro-resultados.md`](./docs/simulacro-resultados.md) — resultado de las 185
  comprobaciones, una por una.
- [`docs/simulacro.md`](./docs/simulacro.md) — cómo se ejecuta y cómo se lee el simulacro.
