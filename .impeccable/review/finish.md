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

---

# Ronda de pulido — backlog de critique (higiene previa a UI-3)

Harness note: mismo revisor degradado inline (sin subagentes). El backlog sale del critique dual-agent del shell+auth (29/40, 2 P0 + 3 P1 + 1 P2). Verificación por interacción CDP (12 comprobaciones) + detector + muestreo de píxeles de verde. Sin entrada de imagen: los rasters se validaron programáticamente.

Inputs faltantes: no hay comp aprobado; la ronda sigue el OWN-WORLD y el veredicto del critique, no un diseño nuevo.

## disposition: fix

### persistence
Pasa. `PRODUCT.md` intacto. `DESIGN.md` actualizado en la misma pasada: topbar con "Nueva campaña" secundaria + chip "Próximamente", confirmación "Cerrar turno" en el menú de cuenta, `remember=false` por defecto, y `DispatchBar` con nombre accesible por conteos. Sidecar en espejo (DispatchBar + Account Menu), JSON validado.

### fidelity
Matriz (contra OWN-WORLD y los hallazgos del critique):
- El verde queda solo para la acción primaria: **match** — avatar a `base-700`, progreso a `ink-100`, detalles de KPI a `muted`; el muestreo de píxeles cae 3105 → 1329 en el shell (el resto es wordmark, anillo activo y vocabulario de estado legítimo).
- "Nueva campaña" no promete una acción inexistente: **match** — secundaria + chip "Próximamente"; el verbo verde ya no muere en un stub.
- Controles inertes: **match** — "Pausar"/"Cancelar" eliminados del panel de campaña activa (sin cola de envío todavía).
- Piso de 12px: **match** — etiquetas de KPI y cabeceras de tabla a `0.75rem`; hints a `ink-500`.
- Cierre de turno: **match** — "Cerrar sesión" abre "Cerrar turno / Permanecer en el turno"; `remember=false` por defecto.
- DispatchBar accesible: **match** — `aria-label` construido de los conteos por estado.
- Minors: **match** — `scope="col"` en `<th>`, `datetime` en el sello de auth, `Kbd`→`<kbd>`, dispositivo de una sola fuente, `ConnectionPill` reusa `useOnline` sin `aria-label` duplicado, toggle de contraseña con `aria-controls`, error de login asociado al campo, copy "caseta" corregido.

### ceiling
- El verde ahora es escaso de verdad; el único verde restante fuera del verbo es el wordmark "WS" (marca) y el vocabulario de estado (sellos/argolla), ambos con icono + etiqueta.
- No se inventaron dispositivos nuevos: el chip "Próximamente" reusa el sello neutro (`stamp--fecha`); la confirmación reusa el patrón de menú existente.

### material_fixes
1. La **One Verb Rule se violaba en pasivos** (avatar `bg-brand-500`, progreso `text-brand-400`, detalles de KPI `tone:"brand"`) → neutralizados; el verde vuelve al verbo.
2. **El CTA primario apuntaba a un stub** → "Nueva campaña" y "Ir a campañas" degradados a secundario + "Próximamente"; no hay acción falsa.
3. **"Pausar"/"Cancelar" inertes** en la campaña activa → eliminados (sin cola real no hay pausa honesta).
4. **Violación del piso de 12px** en etiquetas KPI/cabeceras (`text-[0.6875rem]`) y hints `ink-600` → `0.75rem` e `ink-500`.
5. **Sesión por defecto persistente y logout sin confirmación** → `remember=false`; confirmación "Cerrar turno" antes de sellar la salida.
6. **`DispatchBar` solo-color** → `aria-label` desde los conteos.
7. Minors de a11y/copy: `scope` en `<th>`, `datetime` en el sello de auth, `<kbd>` semántico, dispositivo de una sola fuente, `ConnectionPill` sin duplicación, toggle con `aria-controls`, error asociado al campo, "caseta"→"turno".

### keep
Mantener la escasez del verde y el "Próximamente" explícito hasta que exista la superficie de campañas (UI-7). No reintroducir controles inertes ni etiquetas por debajo de 12px. No cambiar la confirmación de cierre sin decidir antes el ritual de "sellar turno" completo.

## verdict pass

Verificación CDP: **12/12 PASS** — avatar no verde, "Próximamente" presente, "Nueva campaña" sin `bg-brand-500`, DispatchBar con conteos en `aria-label`, 5 `<th scope="col">`, detalle de KPI `ink-500`, sin "Pausar/Cancelar", confirmación "Cerrar turno / Permanecer", "Permanecer" conserva la sesión, "Cerrar turno" limpia sesión y aterriza en `/login`, `remember` desmarcado por defecto. `npm run build` exit 0; detector `[]` en `src public` y en `/login`, `/recuperar`, `/app` (vía sonda same-origin temporal, retirada). Verde del shell 3105 → 1329 px muestreados.
- Fix 1–7: **resueltos**, cada uno verificado por código, detector o interacción.
- Regresiones: ninguna detectada; los 6 rasters re-capturados y con procedencia actualizada.

### remaining
- "Nueva campaña" sigue navegando al stub "Módulo en construcción"; es la decisión acordada ("marcado como próximamente") hasta UI-7.
- Pendientes del critique no atacados aquí (decisión de alcance): atajo de teclado para "Nueva campaña", folios de planilla (pregunta provocadora, no bug), sello de `BORRADOR`, desborde de IDs Meta y credenciales demo en el pie (intencional para demo).
- El puntaje del critique (29/40) no se re-calculó; la mejora se medirá al re-correr `/impeccable critique`.

## disposition: ship

---

# Ronda de crítica #2 — los 3 P1 (validación por campo, pill de conexión, "Próximamente" no-disabled)

Harness note: mismo revisor degradado inline. El backlog sale del critique dual-agent re-corrido (32/40, 0 P0 + 3 P1 + 2 P2; trend 29 → 32). Verificación por interacción CDP (17 comprobaciones) + detector + muestreo de píxeles ámbar/verde. Sin entrada de imagen: rasters validados programáticamente.

Inputs faltantes: no hay comp aprobado nuevo; los 3 P1 se atacan contra el OWN-WORLD y el veredicto del critique.

## disposition: fix

### persistence
Pasa. `PRODUCT.md` intacto. `DESIGN.md` y sidecar actualizados en la misma pasada: Field con `role="alert"` + ids (`-hint`/`-error`) + `aria-describedby` + `noValidate`, pill "Listo para despacho / Modo local · envíos en pausa" (verde/ámbar, nunca rojo), sellos "Próximamente" ámbar `.stamp--pendiente` + `Clock3`, verde re-declarado solo para el verbo ("Sellar turno"). JSON validado.

### fidelity
Matriz (contra OWN-WORLD y los hallazgos del critique #2):
- Validación por campo que no duerme al noValidate: **match** — `FormField` emite `id="<campo>-hint|error"`, el error viaja con `role="alert"` y `aria-describedby` apunta a hint o error (XOR); `login` y `recuperar` validan por fase con `fieldErrors`, sin hide/validate nativos.
- Offline sin alarmismo: **match** — el modo local es una pausa, no un error: pill ámbar "Modo local · envíos en pausa" (`role="status"`), online verde "Listo para despacho"; el rojo queda fuera de la conexión.
- CTA "próximamente" que no parece deshabilitado: **match** — los sellos pasan de neutro gris a ámbar `.stamp--pendiente` con `Clock3`; un secundario con color de espera no se lee como deshabilitado.

### ceiling
- El verde sigue escaso: la única adición de verde en el shell (~+37 px) es el punto del pill online, vocabulario de estado legítimo.
- El ámbar "Próximamente" reusa el sello PENDIENTE ya existente; no se inventaron dispositivos.

### material_fixes
1. **`noValidate` sin contraparte por campo** → `FormField` con hint/error idados + `role="alert"` + `aria-describedby`; `validateLogin`/errores por fase en `login` y `recuperar`; los checks nativos se apagan.
2. **Offline binario verde/rojo** → pill de dos estados: "Listo para despacho" (verde) / "Modo local · envíos en pausa" (ámbar); el modo local nunca es rojo.
3. **CTA gris leído como deshabilitado** → sellos "Próximamente" en el topbar y el dashboard pasan a `.stamp--pendiente` (ámbar) con `Clock3`; el día que exista la superficie, el sello se vuelve verde.

### keep
Mantener el ámbar de "Próximamente" hasta UI-7, la regla de que el modo local no se pinta de rojo, y el patrón `FormField` (ids + `role="alert"`) como canon de formularios.

## verdict pass

Verificación CDP: **17/17 PASS** — error de usuario con `role="alert"` visible y `aria-describedby` correcto, hint reemplazado por error, submit sin campos requeridos bloqueado con mensajes por campo, pill "Listo para despacho" en línea, chip "Próximamente" ámbar en topbar y dashboard, `aria-invalid` en campos inválidos. `npm run build` exit 0; detector `[]` en `src public` y en `/login`, `/recuperar`, `/app` (sonda same-origin temporal, retirada). Ámbar `#f0b13c` ≈188 px muestreados en `ui0-desktop` y `ui0-cuenta-desktop`; verde del shell 1329 → ≈1366.
- P1 1–3: **resueltos**, cada uno verificado por interacción o muestreo.
- Regresiones: ninguna; los 6 rasters re-capturados (14:27) y con procedencia actualizada.

### remaining
- P2 del critique #2 sin atacar: el badge del paso "2" en `auth-shell` y `Button` con `loading` que no pone `disabled` (`aria-busy` sí) — doble submit posible.
- El puntaje no se re-calculó; la subida se medirá al re-correr `/impeccable critique` (29 → 32 la última vez).

## disposition: ship
