---
version: 2
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
THESIS: la puerta de entrada. El login es el umbral del producto —el momento en que el operador deja la calle y entra a la oficina de despacho— y se viste como tal: es la **única superficie de FastWS que no es la planilla**. Fondo azul claro con formas abstractas desenfocadas, un contenedor azul profundo y una tarjeta de cristal. Es un mundo propio, deliberadamente ajeno al carbón del shell, y por eso no sigue el conmutador de tema: la puerta se ve igual a las 6 de la mañana que a las 6 de la tarde, y eso es lo que la hace reconocible.

**Esta es la excepción documentada al Flat-By-Tone Rule y a la prohibición de blur/sombra del sistema.** No es una inconsistencia: el login no es el sistema operativo de despacho, es su marco. El resto de la app —los 12 módulos, sus paneles, sus sellos— sigue la planilla al carbón, en claro o en oscuro.

OWN-WORLD: azul, no carbón. `auth-stage` (fondo claro con formas), `auth-panel` (contenedor azul profundo, 88vw × 60vh mínimo, esquinas de 28px, sombra suave), `auth-card` (cristal de 420px, `backdrop-filter: blur(22px)`, borde translúcido, esquinas de 20px). Tipografía heredada del sistema (Inter Tight + JetBrains Mono). El verde FastWS sigue siendo el único acento y sigue siendo solo la acción primaria: "Sellar turno". Sellos con la misma gramática icono + etiqueta.

**El panel es una isla temática**: declara sus propios `--color-ink-*`, `--color-base-*` y `--color-rule*` sobre el azul. Por eso el Wordmark, los `Input`, los `FormField` y los sellos se leen bien sobre azul sin que ningún componente cambie una sola clase. También fija `color-scheme: light`, para que la casilla nativa de "Recordar sesión" no salga oscura en modo oscuro.

STORY: el operador entiende que abre su turno, no que crea una cuenta. Confirma el dispositivo, firma con sus credenciales y sella la entrada. No hay login social ni registro: es un producto de un solo operador en un solo equipo, y un botón de OAuth que no hace nada sería UI engañosa. La recuperación se lee como recordar la clave de la caseta.

FIRST VIEWPORT: una sola columna centrada. Tarjeta de cristal con, en orden: marca FastWS; título "Bitácora de entrada" y su línea de apertura; la **bitácora de turno** (las tres líneas 1 Dispositivo con código mono y sello ✓ Identificado, 2 Credenciales, 3 Sellar, unidas por una regla vertical dentro de un cuadro); el formulario —usuario en mono, contraseña con revelar por icono, casilla "Recordar sesión en este equipo", enlace "¿Olvidó su contraseña?" y acción primaria verde "Sellar turno" a lo ancho—; el pie con las credenciales de demostración; y los sellos de dispositivo y conexión.

La bitácora se conservó como lista vertical compacta y no como stepper horizontal: en 420px de ancho una fila horizontal trunca "Dispositivo" a "Disp…", y el nombre del paso es exactamente lo que hay que leer.

Las formas decorativas van **dentro** del panel, sobre sus flancos vacíos, no detrás: con la tarjeta al centro y el panel al 88% de ancho, detrás no se vería ninguna. En móvil (≤40rem) se retiran las laterales y el panel ocupa el ancho completo.

FORM: candidata 7 (Bitácora de turno) conservada dentro de una tarjeta centrada; el mundo visual es nuevo.

## Contrato con el simulacro
El check 1.4 localiza el toggle de contraseña por `aria-controls="clave"`, no por su texto visible (antes era un botón "Mostrar"/"Ocultar", ahora es `Eye`/`EyeOff`). El comportamiento verificado —que `#clave` alterne `password`/`text`/`password`— no cambió. También son intocables: los ids `#usuario` y `#clave`, el checkbox nativo, `button[type="submit"]` y los textos "Usuario o contraseña incorrectos", "Las contraseñas no coinciden", "Contraseña actualizada" y "La planilla quedará sellada".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Related targets
src/App.tsx — guard de sesión y rutas /login, /recuperar.
src/styles/index.css — bloque "MUNDO DE ENTRADA": la isla temática y sus formas.
