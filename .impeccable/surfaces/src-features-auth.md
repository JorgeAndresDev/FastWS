---
version: 3
slug: "src-features-auth"
primary_target: "src/features/auth"
related_targets: ["src/App.tsx", "src/styles/index.css"]
---

# FastWS — Autenticación (UI-1)

## Scope
Superficie de entrada al sistema: inicio de sesión presentado como apertura de turno, recordar sesión, identificación de dispositivo y recuperación/cambio de contraseña. Modo: Operate.

## Audience / job
Operador de pyme colombiana que abre su turno de despacho en un PC con Windows; necesita entrar rápido, confirmar que el equipo y la conexión están bien, y recuperar la clave sin depender de soporte.

## Task
Iniciar sesión con usuario y contraseña; recordar la sesión en este equipo; ver el dispositivo identificado; solicitar recuperación y definir una contraseña nueva. Todo con sesión simulada (mock), sin backend todavía.

## Proof / content
Datos y credenciales simulados, rotulados como sintéticos; credenciales de demostración visibles en pantalla. Sin claims comerciales.

## Direction contract
THESIS: la puerta de entrada. El login es el umbral del producto y se viste como tal: **la única superficie de FastWS que no es la planilla**. Dos columnas —marca grande a la izquierda, formulario en tarjeta de cristal a la derecha— sobre un fondo oscuro de marca (carbón + verde FastWS) coordinado con el resto del sistema. Es un mundo propio, deliberadamente ajeno al carbón del shell, y no sigue el conmutador de tema: la puerta se ve igual a las 6 de la mañana que a las 6 de la tarde, y eso es lo que la hace reconocible.

**Esta es la excepción documentada al Flat-By-Tone Rule y a la prohibición de blur/sombra del sistema.** No es una inconsistencia: el login no es el sistema operativo de despacho, es su marco. El resto de la app —los 12 módulos, sus paneles, sus sellos— sigue la planilla al carbón, en claro o en oscuro.

OWN-WORLD: oscuro de marca, no carbón del shell ni azul genérico. `auth-stage` (fondo carbón con resplandores verde y azul de marca), `auth-grid` (dos columnas: marca + tarjeta), `auth-brand` (logo y nombre en tamaño grande, `Wordmark size="lg"`), `auth-card` (cristal de 420px, `backdrop-filter: blur(22px)`, borde translúcido, esquinas de 20px). Tipografía heredada del sistema (Inter Tight + JetBrains Mono). El verde FastWS sigue siendo el único acento y solo la acción primaria: "Sellar turno". Sellos con la misma gramática icono + etiqueta.

**`.auth-grid` es una isla temática**: declara los tokens del tema oscuro. Por eso el Wordmark, los `Input`, los `FormField` y los sellos se leen bien sin que ningún componente cambie una sola clase. También fija `color-scheme: light`, para que la casilla nativa de "Recordar sesión" no salga oscura.

STORY: el operador entiende que abre su turno, no que crea una cuenta. Confirma el dispositivo, firma con sus credenciales y sella la entrada. No hay login social ni registro: es un producto de un solo operador en un solo equipo, y un botón de OAuth que no hace nada sería UI engañosa. La recuperación se lee como recordar la clave de la caseta.

**La trazabilidad de turno se conserva, pero en los sellos.** El stepper de tres pasos (1 Dispositivo / 2 Credenciales / 3 Sellar) ya no ocupa la pantalla; la trazabilidad vive en los sellos de **PC-01** y **Listo para despacho** al pie de la tarjeta. Así la pantalla sigue diciendo "este turno es de este equipo" sin competir con el formulario.

FIRST VIEWPORT: dos columnas. Izquierda: marca FastWS grande (logo + nombre) con su línea de marca. Derecha: tarjeta de cristal con el título "Bitácora de entrada" y su línea de apertura, el formulario —usuario en mono, contraseña con revelar por icono, casilla "Recordar sesión en este equipo", enlace "¿Olvidó su contraseña?" y acción primaria verde "Sellar turno" a lo ancho—, el pie con las credenciales de demostración, y los sellos de dispositivo y conexión.

Bajo ~900px se apila a una columna: marca centrada arriba, formulario debajo.

FORM: dos columnas con marca grande; el mundo visual es oscuro de marca con cristal.

## Contrato con el simulacro
El check 1.4 localiza el toggle de contraseña por `aria-controls="clave"`, no por su texto visible (es un icono `Eye`/`EyeOff`). El comportamiento verificado —que `#clave` alterne `password`/`text`/`password`— no cambió. También son intocables: los ids `#usuario` y `#clave`, el checkbox nativo, `button[type="submit"]` y los textos "Usuario o contraseña incorrectos", "Las contraseñas no coinciden", "Contraseña actualizada" y "La planilla quedará sellada". El simulacro no aserciona la bitácora de paso, así que su retirada no afecta al gate.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Related targets
src/App.tsx — guard de sesión y rutas /login, /recuperar.
src/styles/index.css — bloque "MUNDO DE ENTRADA": la isla temática en dos columnas.
src/app/wordmark.tsx — variante `size="lg"` para la marca grande.
