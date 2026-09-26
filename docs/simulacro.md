# Simulacro FastWS — guion maestro

Prueba funcional integral de **todas y cada una** de las funciones de la aplicación para detectar "huecos". Cada función se ejercita con una precondición, unos pasos y un resultado esperado; si el resultado no coincide, se abre un hallazgo en [`simulacro-hallazgos.md`](simulacro-hallazgos.md) y se marca en la hoja [`simulacro-resultados.md`](simulacro-resultados.md).

## Cómo correr

```powershell
# 1. Dev server (puerto 5173, el que usan todas las pasadas CDP)
npm run dev

# 2. Fases automatizables (pasadas CDP en tools/simulacro/)
node pasada-0.mjs
node pasada-1.mjs   # auth & shell
node pasada-2.mjs   # conexión
node pasada-3.mjs   # campañas, cola, motor (fetch-stub)
node pasada-4.mjs   # clientes, importación, segmentos
node pasada-5.mjs   # plantillas, conversaciones, mensajes
node pasada-6.mjs   # reportes, historial, auditoría, dispositivos
node pasada-7.mjs   # configuración, sync, integridad cruzada

# 3. Fases manuales: seguir las tablas de las fases indicadas como MANUAL
```

Credenciales demo: `admin@fastws.local` / `despacho2026`. Código de recuperación: `000000`.

## Convenciones

- **Oráculo de storage**: antes y después de cada acción determinista se vuelca el juego de claves `fastws.*` + `sessionStorage` (`sim-oracle.mjs`) para detectar escrituras silenciosas, claves sobrevivientes y eventos de auditoría.
- **Fetch-stub**: las pasadas que tocan `graph.facebook.com` inyectan un mock de `window.fetch` (`sim-fetch-stub.mjs`) vía `Page.addScriptToEvaluateOnNewDocument` con escenarios `ok | rate | auth | terminal | 5xx | network`. Todo offline.
- **Severidad de hueco**: `P0` pérdida de datos / seguridad · `P1` función rota o miente · `P2` pulido, a11y, etiquetas.
- **Claves conocidas**: `fastws.clientes`, `fastws.campanas`, `fastws.campanas.velocidad`, `fastws.conversaciones` (`{threads, merged}`), `fastws.sesiones`, `fastws.auditoria`, `fastws.conexion.ids`, `fastws.conexion.sesion`, `fastws.app.locale`, `fastws.device`, `fastws.session` (local **o** sessionStorage según "recordar").

## Criterio de "hueco"

(a) la UI promete algo que no cumple · (b) acción destructiva sin confirmación o irreversible · (c) estado huérfano o inalcanzable · (d) dato perdido o escritura silenciosa · (e) validación con agujero · (f) auditoría ausente donde la traza es esperable · (g) mismo dato leído distinto en dos módulos · (h) texto/sello que miente.

---

## Fase 0 — Preparación (CDP: `pasada-0.mjs`)

| Función | Precondición | Resultado esperado | Señal de hueco |
|---|---|---|---|
| Dev server | `npm run dev` | `http://localhost:5173` responde | Sin server, todo el simulacro falla |
| Perfil limpio | Edge headless con `--user-data-dir` desechable | `localStorage` vacío antes del seed | Estado heredado invalida los checks |
| Seed baseline | `sim-base.mjs` siembra las 11 claves | Todas las claves con forma esperada; auditar con 2 registros | Clave mal formada rompe la app |
| Fetch-stub | Inyectar mock en documento nuevo | `window.fetch` intercepta urls `graph.facebook.com` | El stub no aplica → llamadas reales (inaceptable offline) |
| Snapshot oracle | `sim-oracle.mjs` | Dump de 11 claves + `sessionStorage` + cola auditoría | Dump incompleto |
| Detector + build | `npm run build`, `impeccable detect --json src` | `tsc` 0 · detector `[]` (código está ok al arrancar el simulacro) | Ruido previo |

**Pré-condición de todas las pasadas**: build verde + detector `[]`.

---

## Fase 1 — Auth & shell (CDP `pasada-1.mjs` + MANUAL)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 1.1 | Login correcto (sesión temporal) | Sin sesión | Rellenar email/clave, submit | Redirige a `/app`; `fastws.session` en **sessionStorage** (recordar off); turno "inicio" en `fastws.sesiones` | Sesión en el storage equivocado o ausente |
| 1.2 | Login correcto (recordada) | Sin sesión | Marcar "recordar", submit | `fastws.session` en **localStorage**; `sessionStorage` sin clave | Escritura duplicada/ausente |
| 1.3 | Login incorrecto | Sin sesión | Email o clave mala | Toast "credenciales inválidas"; sigue en `/login`; sin clave de sesión | Mensaje que revela existencia · sesión creada igual |
| 1.4 | Reveal de clave | /login | Clic en ojo | `<input type>` alterna password/text | Sin toggle |
| 1.5 | `state.from` (guard) | Sin sesión | Abrir `/app/campanas` → redirige a `/login`; luego login | Vuelve a `/app/campanas`, no a `/app` | Destino perdido |
| 1.6 | Sesión corrupta | `fastws.session="@@no-json"` | Abrir `/app` | Sin crash; redirige a `/login`; clave no se limpia | Pantalla rota |
| 1.7 | Recuperar: email | /recuperar | Email demo | Mensaje genérico de envío | Fuga de existencia |
| 1.8 | Recuperar: código + nueva clave | /recuperar | Código `000000`, clave ≥8, confirmar | Vuelve a `/login`; **ninguna** clave de storage nueva | Nueva clave persiste o el flujo es puramente informativo (hueco #H-stat) |
| 1.9 | Logout (confirmación 2 pasos) | Logueado | Menú cuenta → Cerrar sesión → Confirmar | `fastws.session` null en ambos storages; turno abierto en `fastws.sesiones` sellado con `fin`; navega a `/login` | Turno queda abierto / sesión a medias |
| 1.10 | Cierre de menú Esc | Menú abierto | Escape | Menú cierra; foco vuelve al avatar | Foco se queda en el menú |
| 1.11 | Navegación 16 rutas | Logueado + seed | Recorrer cada ruta del rail | Cada ruta renderiza su cabecera; ítem activo resaltado | Ruta en blanco / ítem sin resaltar |
| 1.12 | Pill de conexión | Seed conectada | Ver topbar | "Listo para despacho" (verde) | Sello "conectada" con token revocado (optimista, hueco #H-stat) |
| 1.13 | Pill sin conexión | Seed sin-conexión | Ver topbar | **Con `navigator.onLine`**: "Sin conexión Meta · envíos en pausa" (ámbar). **Solo con red real offline** (evento `offline`): "Modo local · envíos en pausa" | Pill verde (no es error) · confundir online/offline |
| 1.14 | Sello de fecha | Logueado | Ver topbar | "VIE 25 SEP 2026" en formato local (día ISO + día + mes + año, coincide con la fecha del entorno headless) | Zona/var format raro |
| 1.15 | "Nueva campaña" (topbar) | Logueado | Clic | Navega a `/app/campanas` (no abre wizard) | Abre wizard inesperado o navega a falsa ruta |
| 1.16 | Skip link + foco | Logueado | Tab inicial | Enlace "saltar al contenido" → `#main` | Sin skip link / falla |
| 1.17 | Ruta desconocida | Logueado | `/app/xyz` | Redirige a `/app` | 404 en blanco |
| 1.18 | Vetado `/` | Sin sesión | `/` | Redirige a `/login` | Acceso al app sin sesión |

---

## Fase 2 — Conexión Meta (CDP `pasada-2.mjs`)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 2.1 | Guardar IDs | Sin conexión | phoneNumberId + wabaId numéricos, Guardar | `fastws.conexion.ids` escrito; estado sigue sin-configurar | Escritura parcial/silenciosa |
| 2.2 | Probar sin token | IDs guardados | Probar | Estado `error` con mensaje "Completa los identificadores y el token" | Sin feedback |
| 2.3 | Probar sin red | IDs + token | Probar (fetch real bloqueado/offline) | `graphError` → "No hay conexión con Meta"; estado `error`; se audita? (verificar) | Crash sin mapeo |
| 2.4 | Probar ok (stub) | IDs + token | Probar con stub `ok` | Estado `conectada`; `fastws.conexion.sesion` con token; auditoría "Conexión Meta establecida" | Sin sello / sin auditoría |
| 2.5 | Token en claro | Conectada | Inspeccionar `fastws.conexion.sesion` | `token` legible en el localStorage | (ya es un hallazgo conocido #H-stat) |
| 2.6 | Conectada optimista al recargar | Conectada | Recargar | Estado `conectada` **sin revalidar** el token | (hueco conocido #H-stat: si token revocado, miente) |
| 2.7 | Desconectar | Conectada | Desconectar | Estado sin-configurar; borra `fastws.conexion.sesion`; **mantiene `conexion.ids`?** (verificar) · audita "Conexión Meta cerrada" | Sin confirmación (hueco candidato) · ids borrados si no deberían |
| 2.8 | Pill + sello integración | Conectada / sin | Vista `/app` y `/app/configuracion` | Coordinan con el estado | Pill y sello en desacuerdo |

---

## Fase 3 — Campañas, Cola y motor (CDP `pasada-3.mjs` con fetch-stub)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 3.1 | Wizard: zona sin conexión | Codificado | Abrir "Nueva campaña" (panel) | Zona plantillas: "Conecta tu cuenta…" | Llamada a API sin token |
| 3.2 | Wizard: lista plantillas | Conectada (stub ok) | Abrir wizard | 2 plantillas APPROVED en el select | 0 aprobadas **sin mensaje** (hueco candidato #H) |
| 3.3 | Wizard: n fallos lista | stub `auth` | Abrir wizard | Error en `role=alert` con mapeo `graphError` | Toast + lista rota |
| 3.4 | Wizard: seleccionar plantilla + reset mapeo | Paso 1 | Cambiar plantilla | Mapeo vuelve a `campo/name` | Estado previo persistente |
| 3.5 | Wizard: fuente texto fijo vacía | Paso 1 | `libre` sin texto | "Continuar" disabled con title | Puede continuar con `{{1}}` vacío |
| 3.6 | Wizard: preview `{{n}}` | Paso 1 con vars | Ver "Cómo lo leerá el primer destinatario" | Sustitución con el cliente (o `""` si sobra) | Render del nombramiento roto |
| 3.7 | Wizard: "Probar en mi número" | Conectada stub ok | Probar | POST `/messages`; toast con `wamid`; **sin auditoría** (anotar) | Sin feedback / no valida token |
| 3.8 | Wizard: filtros paso 2 (5 selects) | Paso 2 | Tipo/Ciudad/Zona/Pedido/En ruta + conteo | Conteo de destinatarios y "N excluidos" precisos | Filtro `enRuta` con `undefined`=No |
| 3.9 | Wizard: crear borrador | Paso 2 válido | Crear | `fastws.campanas` con BORRADOR tras debounce; toast; conserva `activity=creada` | Sin persistencia / `creating` atascado |
| 3.10 | Wizard: crear con `recipients=0` | Segmento vacío | Crear | Botón disabled; alert de 0 destinatarios | Crea campaña vacía |
| 3.11 | Wizard: cerrar descarta | Paso 2 con datos | Cancelar | Se pierde todo (confirmado conocido, anotar) | Auto-guardado inesperado |
| 3.12 | Planilla campañas: filas read-only | Seed | Ver tabla | Sin botones por fila; `pct` = solo ENTREGADO+LEIDO | Acciones en fila (viven en Cola) |
| 3.13 | Cola: chip velocidad read-only | Seed | Ver cabecera | "Velocidad · 1000/h" sin control | Select (ya movido) |
| 3.14 | Cola: botón Configuración | Siempre | Clic | Navega a `/app/configuracion` | Sin navegación |
| 3.15 | Cola: iniciar desde BORRADOR (sin conexión) | BORRADOR, sin token | Compuerta → Iniciar | Toast "Conecta tu cuenta primero"; **modal se cierra igual**; sigue BORRADOR | Modal cerrado tras fallo (hueco candidato #H) |
| 3.16 | Cola: iniciar ok (stub) | BORRADOR + conectada | Compuerta → Iniciar | EN_PROCESO; `dispatchedBy`; motor arranca | Motor no arranca / sin tick |
| 3.17 | Motor: progreso a FINALIZADA | stub ok | Esperar ticks | PROCESO→**FINALIZADA** con `endedAt`, `activity` finalizada, toasts | Nunca finaliza (hueco: no hay forma offline sin stub — anotar) |
| 3.18 | Motor: retry backoff | stub `rate` | Iniciar | Backoff exponencial 1→60 s, `effRate` a la mitad | Sin backoff / crash |
| 3.19 | Motor: errores 5 consecutivos → CON_ERROR | stub `5xx` persiste | Iniciar | CON_ERROR + toast "pausada por error"; reanudar lo arranca | Se queda EN_PROCESO eterno |
| 3.20 | Pausar | EN_PROCESO | Pausar (sin confirmación) | PAUSADA + `activity` pausada; motor detenido | Motor sigue tickeando |
| 3.21 | Reanudar | PAUSADA / CON_ERROR | Reanudar (sin confirmación) | EN_PROCESO desde el primer PENDIENTE | Reanuda desde 0 |
| 3.22 | Cancelar campaña | Cualquiera no cerrada | Cancelar (sin confirmación) | CANCELADA, PENDIENTE→CANCELADO; **no audita** (hueco candidato); PROCESO quedan congelados (hueco candidato) | Con confirmación (o faltante) inesperada |
| 3.23 | Auto-arranque al recargar | EN_PROCESO en seed | Recargar | Motor arranca solo; si falla stub → CON_ERROR + toast | No reanuda EN_PROCESO |
| 3.24 | CON_ERROR no reanuda sola | seed CON_ERROR | Recargar | Sigue CON_ERROR (esperado) | Reanuda automáticamente |

---

## Fase 4 — Clientes, Importación, Segmentos (CDP `pasada-4.mjs` + MANUAL con fixtures)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 4.1 | Tabla clientes read-only | Seed (4 clientes, 1 inválido) | Ver tabla, intentar clic en filas | Sin ningún botón de editar/borrar; fila no clickeable | CRUD presente (no existe, hueco #H-stat) |
| 4.2 | Clientes vacío | `fastws.clientes=[]` | Ver tabla | Estado vacío con mensaje | Tabla en blanco muda (hueco candidato #H-stat) |
| 4.3 | Import: detecta CSV | Fixture CSV | Arrastrar/soltar | Parseo con conteos válidos/duplicados/inválidos | No parsea |
| 4.4 | Import: hoja `generic` descarta campos | CSV con columna `pedido`/`en ruta`/extra tel | Importar | `orderState/cancelReason/enRuta/telefonos` **descartados** silenciosamente | Campos enriquecidos (hueco #H-stat: CSV nunca enriquece) |
| 4.5 | Import: duplicados | Dos archivos con mismo código | Importar 2º | Fila marcada "código ya registrado (se actualizará)" | Duplicado no detectado |
| 4.6 | Import: `0 válidos + N duplicados` | Archivo 100% duplicado | Importar | Panel de confirmación **no se renderiza** → imposible actualizar | Panel muestra los duplicados (hueco #H-stat) |
| 4.7 | Import: doble código en el mismo archivo | CSV con 2 filas mismo código | Parsear | Una sola fila, **sin aviso de conflicto** | Aviso de conflicto (o fusión) |
| 4.8 | Import: fijo antes que móvil en `extras` | Fixture | Parsear | Fila queda inválida aun con móvil válido abajo | Elige el móvil correcto (hueco candidato) |
| 4.9 | Import: error fatal sin columna Código/Nombre | Fixture mal | Parsear | Toast "Falta la columna obligatoria…"; paso 2 no renderiza | Crash |
| 4.10 | Import: sin botón descartar | Archivo parseado | Buscar "Descartar/Cancelar importación" | No existe (hueco candidato) | Botón presente |
| 4.11 | Import: auditoría | Importar | Ver `/app/auditoria` | Registro "Clientes importados: N nuevos · M actualizados" | Sin registro |
| 4.12 | Import: merge conserva zombies | Archivo sin col `pedido` tras uno con ella | Importar | Cliente conserva `orderState` viejo (hueco #H-stat) | Campo reseteado |
| 4.13 | Segmentos: expandir fila ≤50 | Seed | Clic chevron | Sub-tabla con ≤50 miembros + texto "…y N más" | Sin límite o crash |
| 4.14 | Segmentos: hueco 31–60 días | Seed con createdAt de 45 días | Ver "Antigüedad" | Cliente de 45 días **no aparece en ningún segmento de antigüedad** (hueco #H-stat) | Aparece en algún grupo |

---

## Fase 5 — Plantillas, Conversaciones, Mensajes (CDP `pasada-5.mjs` con fetch-stub)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 5.1 | Plantillas: muro sin conexión | Sin token | Ver `/app/plantillas` | Solo CTA "Ir a Conexión" | Lista/iniciar sin token |
| 5.2 | Plantillas: sincronizar (stub ok) | Conectada | Sync | 2 plantillas listadas; error de red mapeado | Lista vacía sin aviso |
| 5.3 | Plantillas: filtrar | Seed listado | Escribir filtro | Filtra por nombre | Sin filtro |
| 5.4 | Plantillas: "Cargar más" | stub con paging | Cargar | Usa `after` cursor; si Meta da `next` URL → error (hueco candidato) | Cursor roto |
| 5.5 | Plantillas: crear válida | stub ok | Formulario completo (MARKETING con ejemplos) | Crea y re-sync; toast PENDING/APROBADO; **no audita** | Sin crear / error silencioso |
| 5.6 | Plantillas: cabecera/pie con `{{n}}` y **cuerpo vacío** | Formulario sin cuerpo | Intentar crear | Errores de cabecera/pie **no se reportan** (hueco #H-stat) | Se reportan siempre |
| 5.7 | Plantillas: variables no consecutivas | `{{1}}{{3}}` | Crear | Error "deben ser consecutivas" | Acepta y falla en Meta |
| 5.8 | Plantillas: probar desde lista | Conectada | Probar fila | Envía `bodyParams` **sin `headerParams`** → cabecera con vars falla (hueco candidato); no valida metaPhone (hueco candidato); selecciona la fila | Header enviado |
| 5.9 | Plantillas: eliminar inline | stub ok | Eliminar → "Sí, eliminar" | DELETE a Meta; re-sync; **no audita** (hueco candidato); si falla, panel confirmación se cierra igual (hueco candidato) | Error deja el panel abierto |
| 5.10 | Plantillas: no persisten | Listado | Recargar | Lista vacía (todo en memoria) | Plantillas sobreviven (hueco #H-stat) |
| 5.11 | Conversaciones: búsqueda | Seed 3 hilos | Escribir consulta | Filtra por nombre/código/ciudad/teléfono | No filtra |
| 5.12 | Conversaciones: reescanear envíos | Seed campañas | Clic "Reescanear envíos" | Crea mensajes por token; dedupe por `merged`; hilos con estados de envío | Duplica hilos |
| 5.13 | Conversaciones: sembrar demo | 3 clientes válidos | "Poblar con datos de ejemplo" | 3 hilos `demo:*`; toast | 0 hilos con toast de éxito (hueco candidato) |
| 5.14 | Conversaciones: limpiar demo | Hilos demo + respuesta del operador | "Limpiar demo" (sin confirmación) | Borra hilos completos **incluidas respuestas** (hueco candidato); sin contar cuántos | Confirma antes |
| 5.15 | Conversaciones: responder texto ok | Conectada stub | Escribir + Enviar | Mensaje optimista PENDIENTE→PROCESO con `wamid`; **sin auditoría** | Texto se pierde al fallar (hueco candidato) |
| 5.16 | Responder texto fallo | stub `terminal` | Enviar | FALLIDO con código/msg; **el textarea se limpia igual** (hueco candidato) | Texto conservado |
| 5.17 | Responder plantilla | Conectada stub | Tab plantilla, vars completas | PENDIENTE→PROCESO; **el `text` persistido es solo el `templateName`** (anotar) | Cuerpo renderizado |
| 5.18 | Vars se borran al cambiar tab | Params escritos | Cambiar a texto libre y volver | Params vacíos (hueco candidato) | Vars conservadas |
| 5.19 | Ventana 24 h / variables vacías | Plantilla con vars | Enviar sin completar | "Completa las variables de la plantilla." y no envía | Envía con `{{n}}` crudas |
| 5.20 | Mensajes: filtro campaña | Seed | Select campaña | Filtra por nombre | Option fantasma tras nombre duplicado (hueco candidato) |
| 5.21 | Mensajes: DispatchBar vs tabla CANCELADO | Seed con cancelados | Ver cabecera+tabla | `messageOrder` **no incluye CANCELADO** → barra y total no cuadran (hueco #H-stat) | Barra cuadrada |
| 5.22 | Estados en campañas→hilos | PROCESO/ENTREGADO en campaña | Reescaneo | **ENTREGADO/LEIDO nunca propagan** a hilos (hueco #H-stat) | Estados actualizados |

---

## Fase 6 — Reportes, Historial, Auditoría, Dispositivos (CDP `pasada-6.mjs`)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 6.1 | Reportes: presets de periodo | Seed | Hoy / 7d / 30d | Agregados cambian | Sin recálculo |
| 6.2 | Reportes: rango personalizado invertido | /reportes | fin < inicio | **No bloquea** export; silencioso (hueco candidato); campo vacío → NaN | Bloquea o avisa |
| 6.3 | Reportes: export CSV vacío | Sin datos | Exportar | Cabecera-only **sin aviso** (hueco candidato) | Avisa |
| 6.4 | Reportes: CSV injection | Nombre con `=cmd` | Exportar | Celda empieza con `=` sin prefijo `'` (hueco candidato) | Escapa fórmulas |
| 6.5 | Reportes: tabs (Resumen/Mensajes/Campañas/Contactos) | Seed | Recorrer tabs | Cada tab deriva + empty state mínimo | Tab con "undefined" en celdas |
| 6.6 | Reportes: imprimir | /reportes | Print | Medios `@media print` | Columnas cortadas |
| 6.7 | Historial: búsqueda | Seed | Buscar texto | Filtra debounce; no busca por ID exacto (anotar) | No filtra |
| 6.8 | Historial: marcar leído | Seed | Toggle item | Cambia local; **no persiste al recargar** (hueco candidato) | Persiste |
| 6.9 | Historial: virtualización | Lote grande | Scroll | Windowed; trunca largo sin "cargar más" (anotar) | Crash |
| 6.10 | Auditoría: filtros de categoría | Seed | **Incluir `configuracion`** | La categoría Configuración **aparece** y filtra (contradice informe previo) | Categoría ausente del filtro |
| 6.11 | Auditoría: expandir detalle | Seed | Clic fila | Muestra payload JSON | Crash en JSON raro |
| 6.12 | Auditoría: export CSV | Seed | Exportar | CSV con igual weakness de 6.3/6.4 | — |
| 6.13 | Dispositivos: renombrar | Logueado | Editar nombre, Enter | Persiste en `fastws.device`; **sin auditoría** (hueco candidato) | Audit renombrado |
| 6.14 | Dispositivos: nombre vacío | Renombrar | Borrar todo | Guarda `""` o bloquea sin mensaje (hueco candidato) | Valida |

---

## Fase 7 — Configuración, Sync e integridad cruzada (CDP `pasada-7.mjs` + MANUAL)

| # | Función | Precondición | Pasos | Resultado esperado | Señal de hueco |
|---|---|---|---|---|---|
| 7.1 | Configuración: 5 paneles visibles | Logueado | Ver página | Velocidades · Integración · Datos del equipo · Parámetros · Acciones | Panel ausente |
| 7.2 | Velocidad: chips | Logueado | Cambiar a `2000/h` | Persiste `fastws.campanas.velocidad` (`"\"2000/h\""` con comillas → JSON válido al parsear); audita "Velocidad de despacho actualizada" | Sin auditoría / lectura rota |
| 7.3 | Velocidad: aplica en caliente al engine | EN_PROCESO activo | Cambiar velocidad | El presupuesto del tick usa la nueva tasa **sin avisar** (hueco candidato) | No aplica |
| 7.4 | Integración: resumen | Conectada / sin / error | Ver sellos | Sellos y botones a `/app/conexion`; caja de error si `error` | Sello "Conectada" sin verificación (optimista) |
| 7.5 | Datos del equipo: conteos | Seed | Ver | Conteos de clientes/campañas/hilos/sesiones + dispositivo + zona horaria + versión | Cifra que no cuadra con el seed |
| 7.6 | Parámetros: idioma | Logueado | Cambiar a `en-US` | Persiste `fastws.app.locale`; **la UI sigue en español** (hueco #H-stat) | UI se traduce |
| 7.7 | Acciones: Restablecer demo | Seed | Confirmar modal | Rebritea 7 claves; **hilo de conversaciones sembrado en forma incorrecta** (array plano) → desaparece al recargar (hueco #H-stat) | Hilo sobrevive al recargar |
| 7.8 | Acciones: Borrar datos locales | Seed | Confirmar modal | Borra 7 claves; **sobreviven** `session`, `device`, `app.locale`, `auditoria` (red y recarga) | Sesión/auditoría borradas |
| 7.9 | Acciones: confirmación Esc/click fuera | Modal abierto | Escape / click fuera | Cierra el modal | No cierra o cierra sin querer en acción peligrosa |
| 7.10 | Auditoría: cap 300 | Insertar 320 | Registrar eventos | Se conserva el top 300 (prepend) | Desborda |
| 7.11 | Turnos `fastws.sesiones`: restauración no duplica | Sesión + turno abierto igual | Recargar | No crea turno "restaurado" duplicado | Duplica turno en cada recarga |
| 7.12 | Sync: "Sincronizar" no hace red | Logueado | Clic | Solo informativo; **no sincroniza** (hueco #H-stat confirm) | Cambia data remota |
| 7.13 | Sync: resolver conflicto | Conflicto en lista | Resolver | Marca resuelto **sin aplicar cambio** (scaffold muerto #H-stat) | Aplica de verdad |
| 7.14 | Sync: base compartida | Siempre | Ver sub-sección | "Pendiente Tauri" sin acción (UI muerta) | Acción presente |
| 7.15 | Integridad: claves fantasma | Pasadas previas | `fastws.segmentos`, `historial.eventos`, `plantillas` | La app **nunca** las usa (son de seeds de captura) | Algún módulo las lee |
| 7.16 | Integridad: velocidad con comillas | Seed | Cargar app | `loadVelocidad` parsea y valida contra `VELOCIDADES` | Valor desnormalizado rompe el chip |

## Orden recomendado de ejecución

0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Las pasadas automatizadas escriben artefactos en `tools/simulacro/artifacts/`view\sim\<fase>\` (probes `.json`, DOM `.txt`, raster `.png`, dumps de oracle). Al final se vuelca `docs/simulacro-resultados.md` y se cierra una ficha por hueco confirmado en `docs/simulacro-hallazgos.md`.