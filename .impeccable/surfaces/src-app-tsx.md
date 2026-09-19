---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# FastWS — App Shell (UI-0)

## Scope
Primer surface del sistema: shell de la aplicación + sistema de diseño + dashboard como primer viewport. Modo: Operate.

## Audience / job
Operador de pyme colombiana que administra clientes y campañas de WhatsApp a diario en Windows desktop.

## Task
Navegar entre los 16 módulos, ver contexto (conexión, usuario, equipo), acceder por teclado a cada módulo y leer el estado de campañas desde el dashboard.

## Proof / content
Datos simulados (mock) identificados como sintéticos; UI en español neutro-imperativo. Hasta que lleguen datos reales, no fabricar claims comerciales.

## Direction contract
THESIS: el WhatsApp comercial como oficina de despacho nocturna; rechaza el dark-SaaS neutro genérico. Cada mensaje es una línea de planilla; cada estado un sello oficial fechado.

OWN-WORLD: carbón profundo (base #0a0d11) como plano de oficina nocturna; rejilla de ledger tenue (reglas horizontales) sobre las superficies de datos; Inter Tight como grotesca de formulario (headers de módulo en doble altura y tracking tenso), dígitos tabulares para cifras, JetBrains Mono para IDs y códigos Meta. Vocabulario de sellos: azul=PROCESO, ámbar=PENDIENTE, verde=ENTREGADO, violeta=LEÍDO, rojo=FALLIDO; cada sello con etiqueta+patrón, el color nunca es la única señal. Verde WhatsApp = único acento cálido, solo para la acción primaria.

STORY: el operador lee campañas como despachos; la cola es la planilla, el dashboard el tablero de control; confianza por el registro, cercanía por el verde. El cambio de estado de un mensaje "se sella" (microinteracción única ~180ms con easing expo, nunca decorativa).

FIRST VIEWPORT: rail izquierdo de planillas (módulos agrupados en OPERACIÓN/CLIENTES/COMUNICACIÓN/SISTEMA) con acceso directo por número de teclado (1-8), highlight doble-ring en el módulo activo; cabecera superior con título tipo sello de fecha, identidad de usuario, dispositivo y pill de conexión (● Conectado / ○ Sin conexión). Cuerpo: tira de KPIs sellados (clientes válidos/inválidos, enviados, entregados, leídos, fallidos, % de respuesta), tabla-ledger con los últimos mensajes y columna SELLO, cinta de progreso de la campaña activa estilo despacho, y acción primaria "Nueva campaña" en verde WhatsApp arriba a la derecha.

FORM: candidata 5 de la lista grounding — la planilla de despacho. Seed b94547f2.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Related targets
src/features/* — los módulos heredan el mundo del shell; el dashboard vive en src/features/dashboard.
