# Finish review — FastWS (src/features/auth, UI-1 · Autenticación)

Harness note: this run has no subagent capability, so the finish-reviewer role ran inline (same session as the builder). Disclosed per `reference/degraded/finish-reviewer.md`. This harness also gives the reviewing model no image input, so the rasters were validated programmatically (dimensions, non-blank pixels, DOM content match) rather than visually read; visual sign-off remains a human step. No second detector pass was run for the verdict; the parent's detector ran separately.

## disposition: fix

Missing-inputs line: no approved comp exists (code-led build), so the comp-dependent checks (comp diff reports, `build/state.json`, `mocks/` approval records) do not apply; TYPE, MATERIAL and GROUND were judged against the direction contract's OWN-WORLD. No QUALITY BAR card file is present in `.impeccable/`.

### persistence
Pass. `PRODUCT.md` present. `DESIGN.md` predates this surface (extension), and it matches the built world; it gained the Inputs subsection and the entry-screen layout note in this pass. No comp round ran (code-led). Sidecar `.impeccable/design.json` extended with the Input and Form Field components (JSON validated). Surface brief `.impeccable/surfaces/src-features-auth.md` present and its FORM block carries seed `db31ce5f`.

### fidelity
Element matrix (no approved comp; judged against OWN-WORLD):
- Split canvas — rail 2/5 + body 3/5, no centered card: **match**.
- Rail — `FastWS` lockup + descriptor, `stamp--fecha` del día, tres líneas numeradas del turno unidas por una regla vertical: **match**.
- Turn line 1 "Dispositivo" — código mono + sello `Identificado`: **contradicted** (the sello was absent; see material_fixes 1); now **match**.
- Turn lines 2/3 — tone progression activo → pendiente → hecho across the recover phases: **match**.
- Body — usuario en mono, contraseña con revelar, casilla "Recordar sesión en este equipo", CTA verde "Sellar turno" a lo ancho: **match**.
- Enlace "¿Olvidó su contraseña?" as a ghost link: **acceptable adaptation** (contract says "enlace fantasma"; rendered as a low-emphasis text link).
- Rail footer — sellos de dispositivo y conexión, icon + label + internal ring, color never alone: **match**.
- Recuperación en dos pasos (solicitar → definir) + estado de éxito: **acceptable adaptation** — the brief's Task names recuperación *y* cambio de contraseña, so the two-phase flow is brief-earned.
- GROUND — `base-950` with the fixed ambient wash: **match** (same net field as UI-0; no drift to blue-black slate).
- TYPE — Inter Tight for copy, JetBrains Mono on credentials/codes/OTP: **match**.
- MATERIAL — flat tonal surfaces, no blur, no glass, no faked photographic surface: **match**.
- Focus treatment — the contract's documented color-mix ring at 72 %, offset 2px: **contradicted** (see material_fixes 2); now **match**.

### ceiling
- The world's "sellado" impression motion (~180 ms expo) is an **unused native device** here: the auth loading state is a spinner (`Loader2`), not a stamp impression. Left for a surface that mints state from a fresh action; not a fix at this tier.
- The "argolla" ring device is reached inside every sello and in the rail's numbered markers; the date-stamp device is used. No frame/ornament left on the table at this tier.

### material_fixes
1. FIRST VIEWPORT named "1 Dispositivo con código mono y **sello Identificado**"; the first turn line rendered the device detail without the sello and in body type (a fidelity promise; craft states) → added the `stamp--entregado` "Identificado" and moved the device identity to mono.
2. `DESIGN.md` documents a focus ring of color-mix brand at 72 % (offset 2px) that the build never shipped: `Button` set `outline-2` with no outline color (UA default) and `Input` suppressed its outline with `outline-none` (a11y/states; truth — the design doc promised a treatment the code lacked) → `Button` now sets the color-mix outline color and `Input` gains the same focus-visible ring.

### keep
Keep the split bitácora canvas and the "one verb" green (the single primary "Sellar turno"): fixing the sello must not turn the rail's stamps into an elevation system, and the form must not collapse back into a centered generic login card.

## verdict pass

Recapture packet re-read at the same paths (`.impeccable/review/desktop.png` 1440×900 and `mobile.png` 390×844 for `/login`; `recover-desktop.png` 1440×900 for `/recuperar`; all valid dimensions, non-blank, DOM content matching the route). Build `npm run build` exit 0; detector `detect --url http://localhost:5173/login` and `detect --url http://localhost:5173/recuperar` both exit 0, zero findings.
- Fix 1 (Identificado sello + mono code): **resolved** — the rail's first line carries the sello and a mono code; visible in the DOM of the captured route.
- Fix 2 (focus ring): **resolved** — the documented color-mix ring now ships on buttons and inputs; the design doc and the code agree.
- Regressions introduced by the fix batch: none detected.

### remaining
- Mobile (`390px`) stacks the bitácora rail above the form; FastWS is a Windows-desktop (Tauri) app, so `mobile.png` is the web packet's required viewport, not a product target. Scoped note.
- The "sellado" impression motion stays unused until a surface mints state from a fresh action.
- The session guard means `/app` now redirects to `/login` when anonymous; the UI-0 shell rasters are preserved as `ui0-desktop.png` / `ui0-mobile.png` and were captured before the guard existed.

## disposition: ship

---

# Ronda de marca — wordmark «Fast / WS» y verde único (#14d659)

Harness note: mismo revisor degradado inline (sin subagentes) y sin entrada de imagen: los rasters se validaron programáticamente (dimensiones, no-vacío, conteo de píxeles del verde nuevo) y el marcado de dos tonos se asertó en el DOM. No se corrió un segundo detector para el veredicto; el detector del padre corrió aparte.

Inputs faltantes: no hay comp aprobado (build code-led); sin QUALITY BAR card. Los rasters de UI-0 se capturaron con una sonda same-origin temporal (ver provenance).

## disposition: fix

### persistence
Pasa. `PRODUCT.md` presente. `DESIGN.md` y `.impeccable/design.json` se actualizaron en esta misma pasada para coincidir con lo construido (extensión del mundo, no mundo nuevo), incluida la excepción del verde de marca en The One Verb Rule. El brief de la superficie de auth no cambia.

### fidelity
Matriz (contra OWN-WORLD y el pedido explícito del usuario):
- Wordmark en el rail del shell — marca raster + "Fast" en papel + "WS" en verde, descriptor "Planilla general": **match** (DOM: `Fast<span class="text-brand-400">WS</span>`).
- Wordmark en el rail de bitácora de auth, descriptor "Planilla de despacho": **match**.
- Wordmark en el estado de carga (`RequireAuth`): **match**.
- Verde único — `brand-300..700` y `entregado` salen todos del degradado del logo: **match**.
- ENTREGADO comparte el verde de la acción primaria: **adaptación aceptada** por pedido explícito del usuario; la distinción de estado la sostienen icono + etiqueta + argolla (Color-Is-Never-Alone).
- Favicon con el mismo raster: **añadido derivado** del pedido ("el logo del sistema"), sin comp previo.
- Marca fuera del topbar (un solo punto de marca): **match**.

### ceiling
- La marca ahora incluye un raster; el sello de impresión ("sellado") sigue sin usarse. No queda otro dispositivo nativo sin usar a este nivel.

### material_fixes
1. `logo.png` vivía en `dist/assets/` — salida de build que `npm run build` borra: el logo habría desaparecido en el próximo build → movido a `src/assets/logo.png` e importado por Vite (fix de verdad).
2. El raster traía relleno transparente asimétrico (arte 275×174 dentro de 460×255) → recortado al contenido + 8px y reducido a 128px de alto (47 KB → 22 KB) para su uso a ~24px.
3. Marca raster verde sobre tile verde (`bg-brand-500/15`) → verde sobre verde; tile eliminado en los tres puntos de marca.
4. El sistema tenía dos familias verdes (acento `#25d366` y estado `#37c97d`) → unificadas en la rampa del logo (canónico `#14d659`, claro `#56f66b`); tokens, DESIGN.md y sidecar actualizados, con el conflicto contra The One Verb Rule documentado como excepción de marca.
5. `brand-mark.tsx` (SVG de marca) quedó muerto al entrar el raster → eliminado.

### keep
Mantener un solo verde (la rampa del logo) y el wordmark como único punto de marca; no reintroducir un segundo verde ni repetir la marca en el topbar.

## verdict pass

Rasters releídos en las mismas rutas (5 archivos; dimensiones correctas, no vacíos): los cinco contienen píxeles del verde canónico `#14d659` (~3.1k–4.6k px muestreados en los de escritorio, el shell incluido), lo que confirma que el token alcanzó toda la UI. `npm run build` exit 0; detector exit 0 con cero hallazgos en `/login`, `/recuperar` y el shell (`/app` vía sonda same-origin, ya retirada).
- Fix 1 (ubicación del asset): **resuelto** — el logo vive en `src/assets` y se importa.
- Fix 2 (raster recortado/reducido): **resuelto** — arte centrado y peso acorde a su tamaño de uso.
- Fix 3 (verde sobre verde): **resuelto** — sin tile detrás de la marca.
- Fix 4 (verdes unificados): **resuelto** — un solo canónico en tokens, DESIGN.md y sidecar.
- Fix 5 (SVG muerto): **resuelto** — `brand-mark.tsx` eliminado; no quedan marcas competidoras.
- Regresiones introducidas por el lote: ninguna detectada.

### remaining
- ENTREGADO comparte el verde de la acción primaria: es la lectura literal del pedido; para recuperar la distinción de estado basta un paso tonal (p. ej. `#35e662`) en `--color-entregado`.
- El canónico elegido es `#14d659` (el valor exacto más repetido del degradado); el otro extremo, `#56f66b`, vive como `brand-300`.
- La marca es un raster: no cambia de color con el contexto (a diferencia del SVG anterior). Si se necesita una versión monocroma, hay que aportar el activo.

## disposition: ship

---

# Ronda de sesión — «Cerrar sesión» en el menú de cuenta

Harness note: mismo revisor degradado inline (sin subagentes). Verificación por interacción real: suite de 15 comprobaciones sobre el navegador vía CDP (`Runtime.evaluate` + `Input.dispatchKeyEvent`), no solo inspección de marcado. Sin entrada de imagen: el raster del menú abierto se validó por color de superficie y diferencia de píxeles.

Inputs faltantes: no hay comp aprobado (build code-led); el mundo no cubría ninguna superficie flotante, así que el diseño salió de las reglas existentes (Flat-By-Tone, One Verb Rule).

## disposition: fix

### persistence
Pasa. `PRODUCT.md` presente. `DESIGN.md` gana la viñeta «Menú de cuenta» en Navigation y el sidecar el componente `AccountMenu` (13 componentes), más un `don't` que fija que el cierre no se viste de verde. Los rasters del shell se re-capturaron y se añadió uno del menú abierto.

### fidelity
Matriz (contra OWN-WORLD y el pedido explícito «habilita para hacer logout»):
- El operador puede cerrar sesión desde la interfaz: **match** (antes era imposible: `signOut` existía pero nada lo llamaba).
- Cerrar sesión limpia la sesión y devuelve a la bitácora de entrada: **match** (localStorage y sessionStorage vacíos; `/login`).
- El reingreso abre la planilla: **match** (`/app`, 15/15 comprobaciones en verde).
- El topbar muestra el operador **de la sesión**, no el mock: **match** (`admin@fastws.local`, nombre y rol de la sesión; avatar derivado del nombre).
- Superficie del menú sin sombra, un tono por encima del panel: **match** (`base-800` + borde de regla; medido en el raster).
- La acción de cierre no es verde: **match** (One Verb Rule; nunca compite con «Nueva campaña»).
- Teclado completo: **match** (`↓`/`↑`, `Escape` cierra y devuelve el foco, `Tab` abandona, foco inicial en el ítem, `aria-expanded`/`aria-controls` correctos).
- El dispositivo del menú sale de la identidad real (`PC-01 · FW-XXXX · Windows`): **match**; de paso deja de estar duplicado como texto fijo.
- Añadido derivado sin comp: el menú como superficie flotante nueva (el mundo no tenía ninguna).

### ceiling
- El mundo no tenía patrón de superficie flotante ni de menú de acciones; este es el primero, y se documentó como extensión en Navigation en vez de inventar un lenguaje nuevo (reutiliza tono + regla + anillo de foco).
- El "sellado de estado" (~180 ms expo) sigue sin usarse; el menú aparece sin animación a propósito (mostrar/ocultar no es un cambio de estado del despacho).

### material_fixes
1. El botón de cuenta del topbar era un **control muerto**: prometía un menú (`ChevronDown`, `aria-label`) y no hacía nada → sustituido por un menú real con `aria-haspopup`/`aria-expanded`/`aria-controls` y foco gestionado (fix de verdad).
2. El topbar leía `currentUser` del módulo de mocks, así que **mentía sobre quién tenía el turno** → ahora lee la sesión (`useAuth`).
3. `signOut` era código inalcanzable: la función existía en el provider y **ninguna interfaz la llamaba** → ahora es la única acción del menú.
4. La identidad del dispositivo estaba escrita a mano en dos sitios (el rail mostraba `PC-01 · Oficina`) mientras `getDeviceIdentity` vivía privado en auth → exportado desde el barrel y usado por el menú.

### keep
Mantener el cierre de sesión como acción neutra dentro del menú de cuenta (nunca verde) y la identidad del topbar atada a la sesión, no a los mocks. El menú es la única superficie flotante: no multiplicarla por cada control del topbar.

## verdict pass

Suite E2E por CDP: **15/15 PASS** — shell montado con sesión, disparador cerrado por defecto, menú con la identidad de la sesión, `aria-expanded`/`aria-controls`, foco inicial en el ítem, `Escape` cierra y devuelve el foco, cierre aterriza en `/login`, sesión borrada en ambos storages, reingreso a `/app` y topbar con el operador de la sesión. `npm run build` exit 0; detector exit 0 con cero hallazgos en `/login`, `/recuperar` y el shell (`/app` vía sonda same-origin temporal, ya retirada y ausente del build).
- Fix 1 (control muerto): **resuelto** — el menú abre, recorre y cierra con teclado y ratón.
- Fix 2 (identidad prestada del mock): **resuelto** — nombre, rol y correo salen de la sesión.
- Fix 3 (logout inalcanzable): **resuelto** — hay una vía real y probada.
- Fix 4 (dispositivo duplicado a mano): **resuelto** — fuente única.
- Regresiones introducidas por el lote: ninguna detectada; los rasters de autenticación no cambiaron.

### remaining
- El detector escanea el estado de carga, no puede abrir el menú: la superficie abierta se validó con la prueba de interacción y el raster, no con el detector.
- Cerrar sesión desde un módulo profundo arrastra el destino (`from`) al reingreso: hoy se cierra desde la planilla y el reingreso abre `/app`. Si se quiere «siempre `/app`», hay que fijar el destino en el logout.
- El cierre no pide confirmación: es una acción reversible (volver a entrar), así que no la necesita.
- La prueba de teclado cubre foco y teclas; no hubo lector de pantalla real (sin `axe`/NVDA en el entorno).

## disposition: ship
