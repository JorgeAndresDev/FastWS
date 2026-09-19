# Product

<!-- impeccable:product-schema 1 -->

## Platform

web
(Interfaz React + TypeScript empaquetada como aplicación de escritorio Windows mediante Tauri.)

## Stack

- Tauri (shell de escritorio Windows)
- React + TypeScript
- Tailwind CSS
- SQLite (local) · Turso/libSQL (compartido, multi-PC)
- Meta WhatsApp Business Cloud API (envíos oficiales)
- Cloudflare Workers (webhooks)
- Git + GitHub (control de versiones)
No se usa FastAPI ni backend alojado propio.

## Users

- Operador de una pyme colombiana (rol único administrativo/operativo inicial): importa clientes, crea campañas de envío masivo de WhatsApp, monitorea el progreso y revisa resultados. El sistema proyecta agregar roles más adelante.
- Ámbito lingüístico: español (Colombia), UI en español.

## Product Purpose

Sistema de escritorio Windows para administrar clientes y ejecutar envíos masivos de WhatsApp mediante la API oficial Meta, recibir estados y respuestas vía webhooks, mantener historial, mostrar estadísticas y funcionar en uno o varios computadores compartiendo datos. "Local cuando sea posible, Internet solamente cuando sea necesario".

## Positioning

Envíos masivos por la API oficial de Meta (no automatización de WhatsApp Web), con arquitectura híbrida local/nube de costo de infraestructura mínimo: una PC funciona solo con SQLite local; varias PCs comparten información vía Turso, sin servidor tradicional ni vínculo a un backend alojado.

## Operating Context

- Uso diario en escritorio Windows por un operador que gestiona campañas de clientes.
- Importación de clientes desde Excel/CSV, validación de teléfonos, detección de duplicados.
- Plantillas oficiales Meta previamente aprobadas; variables dinámicas `{{1}}`, `{{2}}`, etc.
- Números colombianos almacenados en formato local y convertidos al formato Meta durante el envío (57 + número).
- Envío por cola con lotes, velocidad controlada, pausa/reanudación/cancelación y estados por mensaje (PENDING → PROCESSING → SENT → DELIVERED → READ / FAILED / CANCELLED).
- Recepción de estados y respuestas mediante webhooks (Cloudflare Worker → base de datos → desktop).
- Volúmenes iniciales de 200 a 4.000 mensajes por campaña, con diseño escalable.
- Indicadores: total, enviado, entregado, leído, fallido, respondido; porcentajes de entrega, lectura y respuesta.
- Modo sin conexión: consultas locales, preparación de campañas y edición siguen disponibles; las operaciones remotas (envíos, webhooks, sincronización) requieren internet.

## Capabilities and Constraints

Confirmado en MVP (sección 39 de la especificación):
- Autenticación: login, sesión, recordar sesión, cambio/recuperación de contraseña, identificación de dispositivo.
- Clientes: CRUD, importación Excel/CSV, validación, duplicados, búsqueda y filtros.
- Plantillas: consulta de plantillas Meta, selección, validación de aprobación, mapeo de variables.
- Campañas: crear, seleccionar destinatarios, seleccionar plantilla, vista previa, validación, confirmación; estados BORRADOR/PROGRAMADA/EN PROCESO/PAUSADA/FINALIZADA/CANCELADA/CON ERROR.
- Envíos: cola, lotes, progreso, pausa/reanudación/cancelación, estados, errores legibles, ID de meta por mensaje, bloqueo de campaña por computador.
- Webhooks: entregado, leído, fallido, respuestas.
- Historial: campañas, mensajes, clientes; auditoría de acciones.
- Dashboard: estadísticas principales.
- Multi-PC: sincronización, identificación de dispositivos, bloqueo de campaña para evitar procesamiento simultáneo.

Restricciones:
- Uso de APIs oficiales; prohibido automatizar WhatsApp Web para envíos masivos.
- Los tokens/credenciales de Meta se almacenan de forma segura y nunca en código fuente ni en el repositorio.
- Infraestructura priorizada en servicios gratuitos (Tauri, GitHub, Turso, Cloudflare Workers dentro de límites). Sin VPS ni hosting tradicional.
- El costo variable principal es el uso de la plataforma WhatsApp/Meta.
- No registrar tokens ni información sensible innecesaria en logs.
- Estructura de datos base (sección 31): users, devices, clients, segments, segment_clients, templates, campaigns, campaign_recipients, messages, message_events, conversations, conversation_messages, sync_queue, audit_logs, settings.

Decidido durante el desarrollo (a confirmar antes de producción):
- Integración con WABA/Phone Number ID y flujo de OAuth/verificación de webhooks de Meta.
- Estructura exacta de sincronización y resolución de conflictos entre dispositivos.

## Brand Commitments

- Nombre del producto: FastWS.
- Dirección visual de la interfaz: dark-first (oscura por defecto), comprometido por el cliente.
- Voz del copy: español, neutral e imperativa en etiquetas (ej. "Crear campaña", "Importar clientes"), patrones modernos de UI.
- Sin logo ni activos de marca confirmados todavía; branding provisorio hasta aportar los reales.

## Evidence on Hand

- Especificación completa del producto (documento provisto por el cliente): módulos, flujos, estructura de datos, infraestructura y alcance MVP.
- Esquema SQLite esqueleto en src/lib/db/schema.sql (referencia inicial).
- No hay todavía: lista real de clientes, plantillas Meta aprobadas, credenciales de Meta, ni activos visuales de marca. La UI se construye con datos simulados; no fabricar datos reales de clientes como si fueran veraces.

## Product Principles

1. Local primero: todo lo posible debe funcionar sin internet; la nube solo para lo que la requiere.
2. Trazabilidad total: cada mensaje y acción es rastreable (campaña, destinatario, mensaje, evento, usuario, dispositivo).
3. Control sobre el volumen: envíos por cola, lotes y velocidad controlada, sin disparos masivos descontrolados.
4. Evitar duplicados y errores: idempotencia por campaña+destinatario, validación de teléfonos, reintentos controlados y errores comprensibles.
5. Costo e infraestructura mínimos: servicios gratuitos y APIs oficiales, sin servidores propios.

## Accessibility & Inclusion

Sin requisito específico declarado. Se aplicarán las buenas prácticas estándar (contraste, navegación por teclado, etiquetas accesibles) como línea de base de calidad en el flujo impeccable (audit).