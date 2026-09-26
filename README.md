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
| Lógica pura | **31 tests unitarios** (Vitest) |
| Capa de datos | **Simulada**: `localStorage` / `sessionStorage` del navegador |
| Integración Meta | **Verificada contra la API real** (lectura); el envío aún no se ha ejecutado |
| Persistencia prevista | SQLite local vía Tauri — **pendiente** |
| Webhooks | **Pendiente** (los estados entregado/leído no llegan todavía) |

> La app **no está lista para producción**: no hay backend, los envíos reales nunca se han
> ejecutado y los estados de entrega llegan simulados. Ver la sección *Qué falta*.

## Requisitos

- **Node.js 20 o superior** (probado en v24) y npm.
- Para la **Fase 1 (Tauri + SQLite)**: Rust (`rustup`) y Visual Studio Build Tools con el
  workload *Desarrollo para el escritorio con C++*. En Windows ambos son obligatorios.
- **Credenciales de Meta** solo si vas a probar la integración real (opcional).

## Comandos

```bash
npm install

npm run dev            # servidor de desarrollo en http://localhost:5173
npm run build          # comprobación de tipos + build de producción
npm run preview        # sirve el build

npm run lint           # ESLint sobre src y tools
npm test               # tests unitarios (Vitest)
npm run verify         # lint + test + build: el gate de calidad

npm run sim            # simulacro end-to-end (185 checks, 8 pasadas)
npm run smoke:meta     # validación de solo lectura contra la API real de Meta
```

`npm run sim` y `npm run smoke:meta` requieren el dev server en marcha (`npm run dev`).

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
de petición ni respuestas reales de Meta. Para eso está la capa 2.

### 2. Validación contra la API real (`npm run smoke:meta`)

Cinco llamadas `GET` de solo lectura: número, WABA, pertenencia del número a la WABA,
inventario de plantillas y estado de verificación. **No envía ningún mensaje.**

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
| Estados, filtros, auditoría | Reales sobre almacenamiento del navegador |
| Plantillas y envíos | Se simulan; contra Meta solo se ha leído |
| Entregado / leído / respuestas | **Simulados.** Requiere webhooks (Fase 3) |
| Datos de clientes | Datos de demostración. No se han usado datos reales de clientes |
| Multi‑PC | No existe. Es una decisión de producto pendiente (`PRODUCT.md §69`) |

## Qué falta para producción

1. **Persistencia real** — Tauri + SQLite. Hoy todo vive en el navegador, así que
   limpiar sus datos borra la planilla. `src/lib/db/schema.sql` es el esquema previsto y
   `src/lib/phone.ts` ya aísla la conversión de teléfonos a formato Meta.
2. **Envío real** — tokens en el almacén seguro de Tauri (nunca en código ni repo,
   `PRODUCT.md §61`) y guardas: modo ensayo, lista blanca en desarrollo y confirmación
   explícita al arrancar una campaña.
3. **Webhooks** — un Worker de Cloudflare que reciba los estados y respuestas. Sin esto la
   columna de entrega/read nunca se llena con datos reales.
4. **Sincronización multi‑PC** — fuera de alcance mientras opere en un equipo.

## Documentación

- [`docs/simulacro-hallazgos.md`](./docs/simulacro-hallazgos.md) — ficha de hallazgos con
  severidad, evidencia y estado (confirmado / descartado / corregido).
- [`docs/simulacro-resultados.md`](./docs/simulacro-resultados.md) — resultado de las 185
  comprobaciones, una por una.
- [`docs/simulacro.md`](./docs/simulacro.md) — cómo se ejecuta y cómo se lee el simulacro.
