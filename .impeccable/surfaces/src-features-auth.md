---
version: 1
slug: "src-features-auth"
primary_target: "src/features/auth"
related_targets: ["src/App.tsx"]
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
THESIS: el inicio de sesión como la apertura de turno de la planilla de despacho; rechaza la tarjeta de login centrada y genérica — entrar es fichar la entrada del turno nocturno.

OWN-WORLD: hereda el mundo completo del shell (carbón profundo por tonos, Inter Tight + JetBrains Mono, sellos icono+etiqueta+argolla, verde WhatsApp solo para la acción primaria). La pantalla es una bitácora vertical: el turno se abre en tres líneas numeradas de registro (1 Dispositivo, 2 Credenciales, 3 Sellar), con el sello de fecha del día y el estado del equipo/la conexión como sellos.

STORY: el operador entiende que abre su turno, no que crea una cuenta; confirma dispositivo y conexión, firma con sus credenciales y sella la entrada; la recuperación se lee como recordar la clave de la caseta.

FIRST VIEWPORT: pantalla completa partida en dos. Rail izquierdo de bitácora (~2/5): marca FastWS, sello de fecha del día, y las tres líneas del turno (1 Dispositivo con código mono y sello Identificado, 2 Credenciales, 3 Sellar) unidas por una regla vertical. Cuerpo derecho (~3/5): el formulario activo como líneas de planilla — usuario en mono, contraseña con revelar, casilla "Recordar sesión en este equipo", enlace fantasma "¿Olvidó su contraseña?", y acción primaria verde "Sellar turno" a lo ancho; pie con los sellos de dispositivo y conexión. No hay tarjeta centrada.

FORM: candidata 7 (Bitácora de turno) de la lista de estructuras, la de mayor resonancia; seed db31ce5f.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Related targets
src/App.tsx — guard de sesión y rutas /login, /recuperar.
