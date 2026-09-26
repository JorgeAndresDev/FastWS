---
name: FastWS
description: Planilla de despacho nocturna para envíos masivos de WhatsApp comercial
colors:
  coal: "#0a0d11"
  coal-panel: "#141a22"
  coal-raised: "#1a222c"
  paper: "#eef2f6"
  paper-muted: "#aebbc9"
  paper-dim: "#8a98a8"
  paper-faint: "#7d8a9a"
  paper-ghost: "#778594"
  rule: "#2a3542"
  rule-soft: "#232c37"
  verde: "#14d659"
  verde-bright: "#35e662"
  proceso: "#5aa2ff"
  pendiente: "#f0b13c"
  entregado: "#14d659"
  leido: "#a78bfa"
  fallido: "#f0646f"
  cancelado: "#8a97a7"
  teal: "#2dd4bf"
  sky: "#38bdf8"
  indigo: "#818cf8"
  fuchsia: "#e879f9"
  cyan: "#22d3ee"
  lime: "#a3e635"
  pink: "#f472b6"
  amber: "#fbbf24"
typography:
  display:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter Tight Variable, Inter Tight, ui-sans-serif, system-ui"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.14em"
    textTransform: "uppercase"
  mono:
    fontFamily: "JetBrains Mono Variable, JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
  stamp:
    fontSize: "0.8125rem"
    fontWeight: 600
  kpi:
    fontSize: "1.375rem"
    fontWeight: 700
    letterSpacing: "-0.02em"
  rounded:
    panel: "10px"
    stamp: "9999px"
    control: "6px"
    minimal: "2px"
    shape: "8px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.coal}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.verde-bright}"
  button-secondary:
    backgroundColor: "{colors.coal-raised}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    textColor: "{colors.paper-muted}"
    rounded: "{rounded.control}"
  stamp:
    rounded: "{rounded.stamp}"
    padding: "0 12px"
    minHeight: "24px"
    textColor: "{colors.coal}"
  panel:
    backgroundColor: "{colors.coal-panel}"
    rounded: "{rounded.panel}"
---

# Design System: FastWS

## Overview

**Creative North Star: "La planilla de despacho"**

La interfaz trata el WhatsApp comercial como una oficina de despacho nocturna. Rechaza el dark-SaaS neutro y genérico: cada mensaje es una línea de planilla, cada estado es un sello oficial fechado, y el monitor es la mesa del despachador encendida en la madrugada. La cercanía la pone un solo acento verde — el del logotipo, `#14d659` — reservado exclusivamente para la acción primaria. Todo lo demás es registro, anotación y comprobante.

La información vive sobre superficies de carbón profundo que se apilan por tono, no por sombra: el plano es más oscuro, el panel sobre el plano un escalón más claro, la elevación llega por la rejilla de líneas, los bordes y las reglas divisorias. Ni un solo desplazamiento de profundidad por blur o sombra ambiental: la honestidad de la planilla es plana. Los dígitos importantes usan cifras tabulares y las identidades técnicas (IDs de Meta, teléfonos, fechas estampadas) usan monoespaciada, como los anotadores marcados a mano en un manifiesto. Todo verde de la interfaz sale del mismo logotipo: su degradado va del verde profundo `#14d659` al verde claro `#56f66b`, y de ahí se derivan los pasos de interacción.

**Key Characteristics:**
- Carbón profundo de fondo, planos apilados por tono (sin sombras ni blur).
- Un solo acento: verde FastWS en ≤10 % de la pantalla, solo acción primaria (todo verde del sistema sale del logotipo).
- Sellos de estado en gramática Bamboo — icono + etiqueta + píldora sólida en héroes, dot sin fondo en tablas — donde el color nunca es la única señal.
- Letras de formulario en Inter Tight (headers tensos, tracking alto), monoespaciada para IDs y cifras.
- Reglas divisorias y bordes de 1px como única textura de datos; microinteracción de "sellado" a ~180 ms con easing expo, nunca decorativa.
- Motion honesta (Operate/Read): el anillo de avance de la campaña activa transiciona su `stroke-dashoffset` a 400 ms con el mismo expo (`cubic-bezier(0.16,1,0.3,1)`) — el sello que avanza; el swap de rango de la tendencia hace un fade de opacidad 220 ms (`.chart-swap`); nada más se anima por página. Bloque global `@media (prefers-reduced-motion: reduce)` en `index.css` colapsa animaciones/transiciones a 0.01 ms (aclaración: la claridad de estado y opacidad se conserva; el movimiento espacial se retira) y los spinners usan `motion-reduce:animate-none`. El centro del anillo de la campaña activa habla con el verbo del mundo en vez de un rótulo mudo: **SELLANDO** mientras corre, **SELLADA** al llegar a 100 %.

## Colors

Tinta sobre carbón: la paleta es una escala de blancos sucios (paper) sobre grises-carbón casi negros (base). El verde FastWS es el único acento; los sellos de estado amplían la paleta en azul, ámbar, violeta y rojo, siempre como etiqueta funcionando con icono, nunca como color por color. Las categorías (clasificación, no estado) usan una paleta **creativa** — teal, sky, indigo, fuchsia, cyan, lime, pink, amber — que nunca compite con el vocabulario de estado.

### Primary
- **Verde FastWS** (`#14d659`): el verde del logotipo, único acento del sistema — acción primaria (botón "Sellar turno" de la bitácora de entrada), enlaces accionables que disparan despacho y anillos de foco. Su rareza es el punto: aparece contado y en los mismos sitios.
- **Brillo** (`#35e662`) para hover y texto verde sobre carbón; **claro** (`#56f66b`, el otro extremo del degradado del logo) para lectura sobre el verde en contextos de foco; **hondo** (`#10a845`) / **noche** (`#0d8738`) para active y estados profundos. Todos son pasos del mismo verde: no existe un segundo verde en el sistema.

### Secondary (sellos de estado — vocabulario sello)
- **Azul Proceso** (`#5aa2ff`): mensaje en tránsito (PROCESO). Azul de trabajo, sin carga emocional.
- **Ámbar Pendiente** (`#f0b13c`): en cola o programado (PENDIENTE/PROGRAMADA). Precaución de espera.
- **Verde Entregado** (`#14d659`): entregado a destino (ENTREGADO/FINALIZADA). Comparte el verde del logotipo por decisión de marca; la distinción del estado la hacen el icono y la etiqueta, nunca el tono.
- **Violeta Leído** (`#a78bfa`): leído por el cliente (LEÍDO). El color de la confirmación. Por esa verdad de color, la serie «Respuestas» de la tendencia del dashboard se pinta con el **Gris Cancelado**, no con violeta: cuenta hilos con entrada, no recibos de lectura; el violeta queda reservado al sello LEÍDO.
- **Rojo Fallido** (`#f0646f`): error (FALLIDO/CON_ERROR). Alerta, siempre con mensaje legible junto a él.
- **Gris Cancelado** (`#8a97a7`): cancelado/pausado (CANCELADO/PAUSADA). Retirada sin dramatismo.

### Creative (categorías, no estado)
**Teal** (`#2dd4bf`), **Sky** (`#38bdf8`), **Indigo** (`#818cf8`), **Fuchsia** (`#e879f9`), **Cyan** (`#22d3ee`), **Lime** (`#a3e635`), **Pink** (`#f472b6`), **Amber** (`#fbbf24`): colores libres de Bamboo para etiquetas de clasificación — criterio de segmento, tipo de evento de historial, categoría de auditoría, origen del cliente. Viajan solo como balín del icono en la variante dot (texto neutral) o como fondo de píldora en héroes; viven en las píldoras y no en el vocabulario de estado. `error` conserva el **rojo Fallido** por ser severidad, no taxonomía.

### Neutral
- **Carbón Fondo** (`#0a0d11`): plano de la oficina; fondo del layout.
- **Carbón Trapo** (`#0f131a`): sidebar y topbar; primer escalón sobre el fondo.
- **Carbón Panel** (`#141a22`): todas las superficies de registro (paneles, tablas).
- **Carbón Alzado** (`#1a222c`): hover de filas, botones secundarios, campos.
- **Carbón Alto** (`#202a36` / `#273342` / `#334054`): escalones de hover, divisiones audibles.
- **Papel** (`#eef2f6`): texto principal, títulos.
- **Papel Medio** (`#d7dfe8`): sub-títulos, énfasis.
- **Papel Tenue** (`#aebbc9`): texto secundario legible, manchas de mono.
- **Papel Apagado** (`#8a98a8`): meta text, teléfonos, marcas técnicas.
- **Papel Pálido** (`#7d8a9a`): texto desactivado, hints de bajo énfasis; piso de contraste 4.5:1 sobre carbón.
- **Papel Fantasma** (`#778594`): lo mínimo legible sobre carbón oscuro (firmas de versión).
- **Regla** (`#2a3542`) / **Regla Suave** (`#232c37`): bordes y divisiones de ledger.

### Named Rules
**The One Verb Rule.** El verde FastWS es un verbo: actúa (crear, enviar, ir a). Si una superficie no dispara la acción primaria del despacho, no se viste de verde. Única excepción: el logotipo — la "WS" del nombre (verde `#35e662`) y la marca raster, que son marca, no interfaz.

**The Color-Is-Never-Alone Rule.** Ningún estado se transmite solo por color: cada sello lleva icono + etiqueta, y los errores siempre traen su mensaje legible.

## Typography

**Display Font:** Inter Tight Variable (Inter Tight, ui-sans-serif, system-ui)
**Body Font:** Inter Tight Variable (misma familia, pesos medios)
**Label/Mono Font:** JetBrains Mono Variable (JetBrains Mono, ui-monospace, SFMono-Regular)

**Character:** Inter Tight como grotesca de formulario de despacho — apretada, tenza, con headers de módulo en doble altura y tracking tenso. JetBrains Mono pone la identidad del registro: IDs Meta, teléfonos, códigos de error y relojes estampados. Es una pareja de taller: la máquina de escribir de los datos sobre la letra dibujada para leerlos.

### Hierarchy
- **Display** (700, 1.5rem, 1.1, tracking -0.02em): títulos de módulo ("Planilla general"). Letra de cabecera.
- **Headline** (700, 1.25rem, 1.2, tracking -0.01em): títulos de panel y de campaña activa.
- **Title** (700, 0.875–0.8125rem, 1.3): nombres de fila (cliente, campaña) y de action.
- **Body** (400, 0.8125rem, 1.5): párrafos descriptivos; máx ~65ch en textos largos.
- **Label** (700, 0.75rem, letter-spacing 0.14em, MAYÚSCULAS): etiquetas de KPI, cabeceras de tabla, títulos de panel, "Registro de operación". El piso funcional es 0.75rem (12px); las teclas de atajo pueden bajar al piso de 0.6875rem (11px).
- **KPI display** (700, 1.375rem, tabular): la cifra grande de las tarjetas KPI.
- **Stamp/Key** (600, 0.8125rem, regular): badges de estado en gramática Bamboo — texto regular sin MAYÚSCULAS ni tracking. Las teclas de atajo (Kbd) mantienen su excepción de 11px.
- **Mono** (400, 0.75rem): IDs Metas, teléfonos, fechas estampadas, códigos de error, teclas de acceso.
- **Digits tabulares** en todas las cifras invariables (KPIs, porcentajes, contadores).

### Named Rules
**The Tabular Ledger Rule.** Cualquier columna de cifras usa `font-variant-numeric: tabular-nums`; las cifras deben alinearse como columnas de un libro contable, no danzar al cambiar.

**The 12px Floor Rule.** El texto funcional no baja de 12px (0.75rem); solo las teclas de atajo pueden compactarse a 11px. Texto funcional por debajo de 11px es fallo de legibilidad, no estilo.

## Layout

Sistema de escritorio Windows (ventana fluida, mínimo confortable ~1024×720). La aplicación es una cuadricula orientada a la planilla:

- **App shell**: rail izquierdo fijo de 256px (módulos agrupados OPERACIÓN/CLIENTES/COMUNICACIÓN/SISTEMA) + topbar de 64px + cuerpo de scroll vertical. El rail es fijo; el contenido respira centrado en `max-w-7xl` con `px-8 py-8`.
- **Densidad de registro**: filas de tabla de ~44px de alto (`py-2.5`), paneles con padding 20px, listas de campaña con 12–16px internos. La planilla tolera densidad: más información visible por viewport.
- **Rhythm**: los bloques se separan con `gap-6` (24px); las distinciones internas con `gap-3`/`gap-4`. El dashboard prioriza por orden: sello del día + campaña activa (el verbo, el pico) arriba, luego la franja de **4 KPIs de decisión** (`grid-cols-2 md:grid-cols-4`, tarjetas «totales de planilla»), luego tendencia/registro. Las cifras webhook (Leídos/Respondidos) viven en el donut y su nota, no en tarjetas repetidas. La tendencia lleva **leyenda de serie** con el mismo patrón del donut (cuadro + nombre) para que ninguna serie dependa de recordar su color; y el sello de conexión usa el **Azul Proceso** — una vinculación activa, no una entrega.
- **Grid interior**: paneles de datos de dos columnas (3/5 + 2/5 en `lg`); el panel activo (campaña en curso) ocupa ancho completo sobre la rejilla, como la planilla en curso sobre la mesa.
- **Pantallas de entrada (autenticación)**: lienzo de pantalla completa partido en dos (`lg:grid-cols-[minmax(320px,2fr)_3fr]`): rail de bitácora a 2/5 — marca, sello de fecha, líneas numeradas del turno unidas por una regla vertical, y sellos de dispositivo/conexión al pie — y cuerpo a 3/5 con el formulario leído como líneas de planilla. Sin tarjeta centrada; en anchos bajo `lg` el rail se apila sobre el formulario.

## Elevation & Depth

Sistema **plano por tono, sin sombras de elevación**. La profundidad no se fabrica con `box-shadow` ni blur: se construye apilando superficies de carbón cada vez más claras (fondo oscuro → panels → alzados) y con bordes de regla (`1px`, `rule`/`rule-soft`). Dentro de una superficie de datos la única textura es la regla divisoria de 1px. El plano de fondo lleva un lavado radial tenue (carbón `base-800` al 55 %, anclado arriba) y un velo lineal de 220px, ambos con `color-mix` tenue y `background-attachment: fixed`: es la luz ambiental de la oficina nocturna, no una sombra ni un gradiente decorativo de contenido. La excepción a "sin `box-shadow`" son los **anillos de estado** — el doble-ring del ítem activo y el focus ring — que son indicadores de selección, no elevación.

### Named Rules
**The Flat-By-Tone Rule.** Elevación = tono más claro, nunca sombra. Un elemento sobre otro se marca con carbón alzado y una regla divisoria, no con un drop shadow.

## Shapes

Lenguaje de formas de formulario y sello, contenido:

- **Paneles**: esquinas suaves de 10px (`0.625rem`), borde de regla de 1px.
- **Controles** (botones, pills de conexión): esquinas de 6px (`0.375rem`), altura fija (40px md, 32px sm).
- **Sellos**: badges en gramática Bamboo (Tec de Monterrey) — píldora de radio 9999px. Variante **container** (héroes): fondo sólido del color, texto carbón `#0a0d11`, min-height 24px, padding 0 12px, icono 12px; la neutral es carbón alzado con texto papel tenue. Variante **dot** (tablas y filas): sin fondo, texto papel tenue e icono a color. El icono hace de balín; el texto viaja neutro.
- **Teclas (Kbd)**: esquinas de 4px, borde inferior grueso (2px) — relieve de tecla mecánica.
- **Manchas técnicas** (avatar de usuario, icono marca): cuadrados moderadamente redondeados (8px) o círculos; nunca formas clínicas sobresalientes.

## Components

### Brand
- **Verde de marca:** el logotipo trae un degradado de dos verdes — profundo `#14d659` y claro `#56f66b`; toda la familia verde del sistema se deriva de esos dos (el canónico es `#14d659`). No se admite ningún otro verde.
- **Logotipo (Wordmark):** marca raster en verde (`src/assets/logo.png`, PNG con transparencia, servido a ~24px de alto) seguida del nombre en dos tonos: "Fast" en papel (`#eef2f6`) y "WS" en verde `#35e662`, Inter Tight bold tracking `-0.02em` a 14px. El nombre completo viaja como texto para lectores de pantalla (`sr-only`); la marca raster es decorativa (`alt=""`).
- **Ubicación:** en la cabecera del rail lateral (con descriptor MAYÚSCULA "Planilla general"), en la cabecera del rail de bitácora de autenticación (descriptor "Planilla de despacho") y en el estado de carga (`RequireAuth`). Es el único punto de marca de la interfaz; no se repite en el topbar.
- **Favicon:** el mismo raster, como `icon` en `index.html`.

### Buttons
- **Shape:** esquinas de 6px, alto fijo (md 40px / sm 32px), gap de icono 8px, texto semibold (md 14px / sm 13px).
- **Primary:** fondo verde FastWS (`#14d659`), texto carbón `#0a0d11` (contraste inverso), padding 0 16px. Solo acción primaria. Hover → `#35e662`, Active → `#10a845`.
- **Secondary:** carbón alzado (`#1a222c`) + borde regla + texto papel; hover sube a `#202a36`.
- **Ghost:** texto papel tenue sobre transparente; hover fondo carbón `#1a222c`.
- **Danger:** fondo rojo fallido sólido (`#f0646f`) + texto carbón `#0a0d11` — contraste inverso como el primario, sin tinte translúcido; hover `#f79aa1`, active un paso hacia carbón. Usado en desconexión, cancelación de despacho y borrado de plantilla.
- **Focus:** anillo de color-mix del verde al 72 %, offset 2px, visible solo con teclado.
- **Loading:** sustituye el icono por un spinner (`Loader2`, rotate infinito), deshabilita el clic, `opacity-45`.

### Chips
- **Badge de estado (`.stamp`):** gramática Bamboo con dos variantes sobre la misma base inline-flex (gap 6.4px, texto regular 13px 600, sin MAYÚSCULAS). **Container** (`.stamp--container`): píldora de fondo sólido del color con texto carbón — reservada a los estados hero (cabeceras de panel, fila de héroes del dashboard, topbar, alarmas, empty states, agregados de reportes) y a las variables `{{n}}` en mono neutral. **Dot** (sin la clase): sin fondo, icono a color y etiqueta papel tenue — para los estados dentro de tablas y filas (chips de campaña, mensajes, plantillas, importación, eventos, auditoría, criterios). Mapeo de vocabulario (PROCESO/PENDIENTE/ENTREGADO/LEIDO/FALLIDO/CANCELADO); la píldora nunca degrada a pill de SaaS porque el grafismo del icono y el contraste carbón afirman la marca.
- **Regla de taxonomía:** el color del estado es un vocabulario de *estado*, no de *categoría*. Las etiquetas que clasifican datos — criterios de segmento, tipos de evento de historial, categorías de auditoría, tipo de cliente — usan los **colores creativos** (dot: icono a color, texto neutro); la única excepción es `error`, que conserva el rojo por ser severidad, no taxonomía.
- **Badge fecha (`.stamp--fecha`):** papel tenue (dot) o píldora carbón alzada (container). Sello "MIÉ 16 SEP 2026" del topbar, periodos y agregados neutrales.
- **Sello pendiente (`.stamp--pendiente`, ámbar):** las acciones futuras que aún no cumplen hoy, con icono `Clock3` — un CTA secundario que no parece deshabilitado; el ámbar anuncia espera. Hoy las acciones de la planilla de campañas existen (alta con wizard, despacho desde la Cola), así que su verde queda solo para accionar; el ámbar "Próximamente" se reserva a los módulos realmente futuros (Mensajes, Historial, Conversaciones).

### Cards / Containers
- **Panel (`.panel`):** esquinas 10px, fondo `#141a22`, borde regla 1px, cabecera con título-label MAYÚSCULA 12px y borde inferior de regla suave. Contenedor canónico de toda superficie de registro.
- **Tarjeta KPI:** panel condensado (padding 12–16px), label MAYÚSCULA 12px + cifra display (1.375rem, bold, tabular) + nota de detalle 12px. Una regla de 1px (rule/80) tacha el total entre el label y la cifra — el léxico del total de planilla; la cifra va `leading-none`. Nada más se amplifica: la nota de detalle queda fina. Hover solo cambia el borde (señal suave).

### Inputs
- **Campo de planilla:** alto 40px (md) / 32px (sm), esquinas 6px, fondo carbón alzado `#1a222c`, borde regla 1px, texto papel 13px, placeholder papel pálido. Foco: borde brand al 60 % y anillo de color-mix del verde al 72 % (outline 2px, offset 2px). Inválido: borde rojo fallido al 50 % (`focus` al 70 %), con `aria-invalid`.
- **Entrada mono:** los campos técnicos (usuario/correo, código de verificación, teléfono, código Meta) se escriben en JetBrains Mono, como la celda mecanografiada de la planilla.
- **Field (etiqueta + campo + nota):** etiqueta MAYÚSCULA 12px (`label`) sobre el campo, nota de ayuda 12px en papel pálido bajo él; el error se anuncia en texto legible junto al campo (`role="alert"`), nunca solo con color. Hint y error viajan con `id` propio (`<campo>-hint` / `<campo>-error`) y se enlazan por `aria-describedby`; la validación por campo reemplaza los checks nativos (`noValidate`).

- **Grupo de selección (chips radio):** selector de una sola opción como hilera de botones con `aria-pressed`, nunca `<select>` (campos: velocidad de despacho, idioma de la aplicación). Ítem activo: carbón sólido `base-750` con texto papel; inactivo: `base-800` con texto `ink-300`, hover `base-750` — la selección plana del rail, nunca tinte del color ni verde. La opción marcada se anuncia por contexto (leyenda junto al grupo, ejemplo "aplica a todas las campañas desde la próxima tanda") y el cambio se registra en Auditoría (categoría `configuracion`).

### Navigation
- **Rail lateral (256px):** fondo `#0f131a`, grupos con labels de sección (12px, MAYÚSCULA, tracking 0.16em) y enlaces de 36px con icono 16px (`ink-400`) delante de la etiqueta. Ítem activo: carbón alzado sólido (`base-750`, un escalón sobre el hover `base-800`) con texto papel — selección plana sin tinte verde. Ítem inactivo: texto papel tenue, hover carbón alzado. Los atajos numéricos (Alt+n) se eliminaron por decisión de producto; la navegación es por clic.
- **Selección:** todo estado activo de selección — ítem del rail, pestañas de rango y filtros — es carbón sólido por plano-por-tono, nunca tinte translúcido del color; el verde queda reservado a la acción primaria (One Verb Rule).
- **Topbar (64px):** sello de fecha a la izquierda ("Registro de operación · MIÉ 16 SEP 2026"), pill de conexión (● Listo para despacho / ● Modo local · envíos en pausa — verde/ámbar del vocabulario; nunca rojo, porque el modo local no es un error), identidad de usuario (avatar carbón + nombre + rol) y "Nueva campaña" a la derecha en tratamiento secundario — sin sello: es la acción real que abre el wizard de alta (dos pasos: plantilla y mapeo → segmento de destinatarios) y se guarda en borrador. El verde del CTA "Nueva campaña" queda reservado para la acción primaria de la superficie que abre.
- **Menú de cuenta (topbar):** la identidad del operador se despliega en un menú anclado a la derecha (`w-72`), una sola acción. Superficie un tono por encima del panel (carbón alzado `base-800` + borde de regla, sin sombra: Flat-By-Tone). Cabecera "TURNO ACTIVO" con nombre, rol y correo en mono; línea de dispositivo en mono (`PC-01 · FW-XXXX · Windows`); al pie, **Cerrar sesión** en tratamiento neutro — nunca verde, porque no es la acción primaria (One Verb Rule). Cerrar sesión abre una confirmación "Cerrar turno" (rojo) / "Permanecer en el turno" antes de sellar la salida. Teclado: `↓`/`↑` recorren los ítems, `Escape` cierra y devuelve el foco al disparador, `Tab` abandona el menú. Cerrar el turno limpia la sesión (local y de sesión) y devuelve a la bitácora de entrada; el reingreso abre la planilla. "Recordar sesión" queda desmarcado por defecto (equipo compartido).

### Signature Component: Cinta de Despacho (DispatchBar)
Barra horizontal segmentada que descompone el total de una campaña por estado, cada segmento al color del sello. **Orden de lectura excepción-primera: FALLIDO → LEIDO → ENTREGADO → PROCESO → PENDIENTE → CANCELADO** (lo que necesita atención queda a la izquierda). Alto 12px en la campaña activa (md) y 6px en las filas de "Últimas campañas" (sm), esquinas 2px, esquinas internas 0. Es la planilla misma: una lectura inmediata de qué fracción del despacho sigue en curso. Aparece en la campaña activa y en cada fila de "Últimas campañas". Sin animación de ancho (perf), la señal de movimiento se reserva al sellado del estado. El nombre accesible se construye desde los conteos ("675 entregados, 1305 leídos…"), nunca solo del color.

**Honestidad del avance:** el porcentaje «Progreso» de filas de campaña y cola cuenta solo **sellados = entregado + leído** (regla `deliveryProgress()` en `campaign-segments.ts`), nunca `total − pendiente`: una campaña 100 % fallida o cancelada debe leer 0 %, no 100 %. El anillo de la campaña activa (dashboard) queda rotulado «procesados» porque ahí la fracción es trabajo de procesamiento (PENDIENTE consumido), no entrega consumada. El arranque de un despacho desde la Cola pasa por una **compuerta de confirmación** (destinatarios · velocidad · «empieza ahora») antes de tocar el motor Meta.

## Do's and Don'ts

### Do:
- **Do** pintar con verde FastWS únicamente la acción primaria; sobre fondos carbón, el verde es un verbo.
- **Do** estampar estado con icono + etiqueta: si el detector de color falla, la etiqueta sigue contando la historia.
- **Do** usar `tabular-nums` en toda cifra columna y `0.75rem` como mínimo funcional (teclas 11px como excepción).
- **Do** indicar la fila activa con el doble-ring brand sobre el verde al 10 %.
- **Do** acompañar cada fallo con su mensaje legible (código Meta en mono + explicación en texto).
- **Do** contraste AA (≥4.5:1) para todo texto funcional sobre carbón; verificar con el detector en cada lote.

### Don't:
- **Don't** usar sombras ni blur para elevar superficies: elevar es subir un tono de carbón y marcar una regla.
- **Don't** usar el verde FastWS en marcas pasivas, iconos decorativos o textos de estado: solo acción primaria.
- **Don't** transmitir estado solo por color; el color del sello nunca viaja sin icono y etiqueta.
- **Don't** animar ancho/alto/padding/margen para transiciones de estado; usar transform y opacity, o el sellado expo de ~180 ms.
- **Don't** bajar texto funcional de 12px ni inventar claims comerciales con los datos simulados.