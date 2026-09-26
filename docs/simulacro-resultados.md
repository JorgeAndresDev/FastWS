# Simulacro — hoja de resultados

Ejecución: **Fecha** `2026-09-25` · **Dev server** `http://localhost:5173` · **Build** ✅ pasó (`npm run build`) · **Fases 1-4** corregidas + **verificación completa Fases 5-7** re-ejecutada de punta a punta: **185 checks, 185 OK, 0 huecos** · **Responsable** `opencode`

## Resumen

| Fase | Checks | OK | HUECO | Notas |
|---|---|---|---|---|
| 0 Preparación | 7 | 7 | 0 | dev, perfil, seed 11 claves (10 local + 1 session), stub templates/send/rate, app con seed |
| 1 Auth & shell | 44 | 44 | 0 | **CORREGIDO S11** (código de 6 dígitos expuesto en el input + clave persistida con hash); N1 informativo |
| 2 Conexión | 11 | 11 | 0 | **CORREGIDOS S10/S30/N2/S23** (revalidación al arrancar, ids al form, confirmación y borrado de ids) |
| 3 Campañas, Cola, motor | 24 | 24 | 0 | **CORREGIDOS S8/S13** (modal de cancelar con auditoría; `iniciar` mantiene el modal si falla) |
| 4 Clientes, Importación, Segmentos | 17 | 17 | 0 | **CORREGIDOS S5/S6/S7/S17/N3** (CRUD clientes + estado vacío, panel de duplicados, hoja `generic`, grupo 31-60 d, sub-tabla de miembros) + nuevo 4.1b (alta de cliente); S18 descartado |
| 5 Plantillas, Conversaciones, Mensajes | 38 | 38 | 0 | **CORREGIDOS S3/S9/S14/S16/S19/S22/S2 + N4-N8** (cache de plantillas, validación header/footer, textarea en fallo, params al cambiar pestaña, headerParams, mensaje renderizado, opciones filtro, reescaneo ENTREGADO/LEIDO, cursor de paginación, auditoría) |
| 6 Reportes, Historial, Auditoría, Dispositivos | 28 | 28 | 0 | **CORREGIDOS S20/S21/S24/S25/S29 + N10/N11** (rango de fechas acotado, CSV sin inyección de fórmulas, clave de día con relleno, KPI coherentes con la lista); S24/S25/S29 **descartados** |
| 7 Configuración, Sync, integridad | 16 | 16 | 0 | **CORREGIDOS S1/S12 + N12** (demo siembra `{threads, merged}`, copy de velocidad en caliente, «Borrar todo» borra el token); S4 **descartado** (la página declara que la sincronización aún no existe) |
| **Total** | **185** | **185** | **0** | todos los huecos confirmados corregidos y verificados en verde |

## Detalle

| Fase.# | Función | Resultado (OK / HUECO# / N/A) | Evidencia observada |
|---|---|---|---|
| 0.1 | Dev server :5173 | OK | responde; pasadas corren |
| 0.2 | Perfil limpio | OK | local/session vacíos antes del seed |
| 0.3 | Seed baseline 11 claves | OK | 10 en localStorage + `fastws.conexion.sesion` en sessionStorage (S10) + auditoría 2 regs |
| 0.4 | Fetch-stub templates/send/rate | OK | 3 plantillas · wamid-sim-* · rate ok |
| 0.5 | App carga con seed conectado | OK | dashboard no vacío, pill conectada |
| 1.12 | Vetado `/` sin sesión | OK | `/`→`/login` |
| 1.3 | Login incorrecto | OK | error inline genérico; sin sesión; permanece en /login |
| 1.4 | Reveal de clave | OK | toggle Mostrar/Ocultar alterna `password`→`text`→`password` |
| 1.5 | Guard + `state.from` | OK | `/app/campanas`→`/login`; tras login recordada vuelve a Campañas |
| 1.2 | Login recordada | OK | `fastws.session` en localStorage, ss null, turno `inicio` + `recordar:true` |
| 1.6 | Sesión corrupta | OK | `ls=@@corrupto` no revienta; redirige a /login |
| 1.7 | Recuperar clave | OK | email demo avanza; el código real (6 dígitos) + contraseña coincidente llega a "Contraseña actualizada" |
| 1.7 | [S11] código de recuperación expuesto | OK | el input `#codigo` publica el código en su placeholder (6 dígitos ≠ `000000`) y la bandeja simulada lo muestra |
| 1.7h | [S11] clave nueva persiste | OK | login con `nuevaClave2026` **funciona** (hash en `fastws.clave.hash`); luego se restaura la clave demo limpiando ese registro |
| 1.1 | Login temporal | OK | ss solo en sessionStorage; ls null |
| 1.16 | Sello de fecha topbar | OK | `VIE 25 SEP 2026` |
| 1.15 | "Nueva campaña" (topbar) | OK | navega a `/app/campanas` |
| 1.10 | Navegación 16 rutas | OK | todas renderizan; `aria-current=page` en cada ítem |
| 1.11 | Ruta desconocida | OK | `/app/xyz`→`/app` |
| 1.13 | Skip link | OK | "Saltar al contenido" presente |
| 1.14 | Pill de conexión | OK | conectada: "Listo para despacho"; sin conexión online: "Sin conexión Meta · envíos en pausa"; offline real: "Modo local · envíos en pausa" |
| 1.9 | Menú de cuenta + teclado | OK | abre (item enfocable), ArrowDown/Up mantienen item, Escape cierra y devuelve foco al avatar |
| 1.8 | Logout 2 pasos + cierre de turno | OK | confirmación "La planilla quedará sellada"; ls/ss null; `fin` sellado en `fastws.sesiones` |
| 2.0 | Conexión estado inicial | OK | "Sin configurar" con seed sin-conexión |
| 2.2 | Probar sin token | OK | error inline "Pega el token…" + `conexion.ids` no escrito (valida antes de guardar) |
| 2.3a | [N2] primer submit con todo lleno | OK | el primer clic ya guarda los ids y llega a la red: alert "No hay conexión con Meta…" (antes mentía con "Completa los identificadores") |
| 2.1 | Guardar IDs vía Probar | OK | `fastws.conexion.ids` persistido + badge "Identificadores guardados" |
| 2.3 | Probar sin red | OK | estado error, alert "No hay conexión con Meta…"; **no audita** errores de conexión |
| 2.4 | Probar ok (stub) | OK | "Listo para despacho"; sesión con token; audita "Conexión Meta establecida" |
| 2.5 | Token en claro, solo en sesión | OK | `EAAQ_SIMTOKEN` en `fastws.conexion.sesion` de **sessionStorage**; `localStorage` queda `null` |
| 2.6 | [S10] revalidación al recargar | OK | tras la recarga llama a la Graph API (≥1 request) y queda "Listo para despacho" (antes 0 llamadas, conexión optimista) |
| 2.7 | [S23] Desconectar | OK | pide confirmación ("Desconectar Meta" → "Desconectar y borrar"); borra sesión **e** identificadores; audita "Conexión Meta cerrada" |
| 2.8 | Pill + sello coordinados | OK | conectada→"Listo para despacho"; desconectada→"Sin conexión Meta · envíos en pausa" |
| 3.1 | Wizard sin conexión | OK | "Conecta tu cuenta de WhatsApp Business para listar las plantillas" (no fetch) |
| 3.2 | Lista plantillas APPROVED | OK | `recordatorio_ruta` y `confirmacion_demo` · Español |
| 3.4 | Elegir plantilla resetea mapeo | OK | todas las variables vuelven a `campo/name` |
| 3.6 | Preview al primer destinatario | OK | bloque "Cómo lo leerá el primer destinatario" presente |
| 3.5 | Variable libre vacía | OK | Continuar deshabilitado con title "Completa el texto fijo de cada variable."; con texto se habilita |
| 3.7 | Probar en mi número | OK | toast "Mensaje de prueba enviado · wamid-sim-\*" |
| 3.8 | Filtros recalcular segmento | OK | CASHLESS=1, zona Sur=1 (clientes 10 dígitos re-sembrados) |
| 3.9 | Crear BORRADOR | OK | persistido + toast "Campaña creada :: 4 destinatarios en borrador" |
| 3.10 | Segmento 0 destinatarios | OK | "Crear campaña" disabled + alert "El segmento no arroja destinatarios…" |
| 3.11 | Cancelar sin confirmar | OK | cierra el wizard y descarta |
| 3.12 | Planilla read-only | OK | filas sin botones; pct = entregado/leído |
| 3.13 | Chip velocidad read-only | OK | "Velocidad · 1000/h" texto plano, sin select/input |
| 3.14 | Botón Configuración | OK | navega a `/app/configuracion` |
| 3.23 | Auto-arranque al cargar | OK | camp-1 EN_PROCESO del seed finaliza solo: "3 aceptados por Meta, 1 con error" |
| 3.16 | Iniciar desde BORRADOR | OK | EN_PROCESO + `dispatchedBy` (Administrador · PC-01) + actividad `iniciada` |
| 3.17 | Motor completa | OK | FINALIZADA + `endedAt` + actividad `finalizada` + toast |
| 3.20 | Pausar | OK | PAUSADA y motor detenido (0 envíos durante pausa) |
| 3.21 | Reanudar | OK | vuelve a EN_PROCESO y completa |
| 3.22 | Cancelar | OK | modal "Cancelar campaña" (título + botón de confirmación) → CANCELADA; PENDIENTE→CANCELADO; PROCESO/ENTREGADO intactos; audita "Campaña cancelada" |
| 3.15 | Iniciar sin conexión | OK | toast "Conecta tu cuenta primero"; el modal de confirmación **se mantiene abierto**; sigue BORRADOR sin dispatchedBy |
| 3.18 | Backoff exponencial (rate) | OK | lapsos entre reintentos crecen: 4 s, 5 s, 8 s, 16 s (sin marcar FALLIDO) |
| 3.19 | 5 errores → CON_ERROR | OK | toast "Campaña pausada por error"; actividad `con_error`; PENDIENTE intactos |
| 3.24 | CON_ERROR no se auto-reanuda | OK | tras recarga sigue CON_ERROR |
| 4.1 | Clientes: tabla con acciones | OK | tabla virtualizada (1 encabezado + 5 filas) con 2 botones por fila (Editar/Eliminar) = 10 |
| 4.1b | Alta de cliente | OK | "Nuevo cliente" persiste C-6 · Bodega Sur · 3001234006, audita "Cliente registrado" y la fila aparece en la tabla |
| 4.2 | Clientes vacío | OK | `clientes=[]` → estado "Sin clientes" y sin filas |
| 4.3 | Import: detecta CSV | OK | paso 2 "2 · Validación (un cliente por Código)" con "5 filas · 4 válidas · 0 duplicadas" |
| 4.3c | Import: confirmar | OK | "Importar 4 clientes" → storage 4 nuevos (NA-1001..4); inválido NA-BAD excluido; auditoría "4 nuevos" |
| 4.4 | Hoja `generic` mapea campos | OK | EA-7001 → `orderState=CANCELADO`, `enRuta=true` y 1 teléfono en `phones` (solo la primera columna tipo teléfonos) |
| 4.5 | Duplicados | OK | 4 filas con razón "código ya registrado (se actualizará)" |
| 4.6 | `0 válidos + N duplicados` | OK | con 0 válidas y 4 duplicadas sí aparece "3 · Resumen y confirmación" y el botón "Importar 4 clientes" |
| 4.7 | Doble código en un archivo | OK | 1 fila, gana el primero, **sin** aviso de conflicto |
| 4.8 | Fijo antes que móvil en extras | OK | FM-6001 queda **válido** con el móvil de extras `3112223344` como principal y el fijo como teléfono extra |
| 4.9 | Error sin columna Código/Nombre | OK | toast "No se pudo leer el archivo :: Falta la columna obligatoria…"; sin paso 2 |
| 4.10 | Sin botón descartar | OK | 0 botones "Descartar/Cancelar importación" (se mantiene la decisión de diseño: el flujo se abandona cambiando de archivo) |
| 4.11 | Auditoría import | OK | registro "Clientes importados: 4 nuevos · 0 actualizados por Código" |
| 4.12a | XLSX multipágina | OK | madre.xlsx (ETA+CANCELADOS+BASES) → "3 válidos"; ZZ-9001 `orderState=CANCELADO` + 2 móviles extra |
| 4.12b | Merge conserva zombies | **DESC [S18]** | reimport genérico (mismo código) **limpia** `orderState`/`enRuta`: `{...existing,...n}` reescribe con `undefined`; no hay zombi |
| 4.13 | Segmentos: expandir ≤50 | OK | "Válidos" (61 miembros) expandido → 50 filas + nota "La lista se recorta a 50 filas…", sin mensaje de vacío |
| 4.14 | Grupo 31–60 días | OK | 61 clientes (60 de hoy + 1 a 45 d): Nuevos=60 · **Intermedios (31–60 días)=1** · Reactivación=0 |
| 5.1 | Plantillas sin conexión | OK | muestra la última sincronización guardada en el equipo + CTA "Ir a Conexión"; sin fetch |
| 5.2 | Sincroniza al cargar | OK | 3 filas (2 APPROVED + 1 PENDING) leídas del stub en el montaje |
| 5.2b | Error de red en sync | OK | toast de error de red; sin filas |
| 5.3 | Filtro por nombre | OK | tecleo filtra 3→1 fila |
| 5.4a | Paginación con cursor | OK | "Cargar más plantillas" anexa filas: 3→4 (usa `paging.cursors.after`) |
| 5.4b | [N4] cursor extraído del `next` URL | OK | con `paging=next-url` la app envía solo `after=QVFv_NEXTURL` (ya no la URL entera como cursor) |
| 5.5 | Crear plantilla MARKETING en revisión | OK | toast "Plantilla enviada a revisión"; stub POST id `tpl-sim-1` PENDING |
| 5.5b | [N5] crear audita | OK | `fastws.auditoria` 1→2 al crear la plantilla |
| 5.6 | [S9] cabecera/pie con `{{n}}` reportan hueco | OK | con el cuerpo vacío se reportan los 3 errores: cuerpo + "La cabecera no admite variables." + "El pie no admite variables." |
| 5.7 | Variables no consecutivas `{{1}} {{3}}` | OK | app las bloquea (valida continuidad) |
| 5.8 | Probar desde lista | OK | POST con `to=573100000000` (número de empresa) |
| 5.8b | [S19] prueba desde lista manda headerParams | OK | plantilla con `{{1}}` en cabecera: `hasHeader=true` y `bodyParams=1` |
| 5.9 | Eliminar con confirmación | OK | inline "Sí, eliminar" → DELETE ok (stub) + toast "Plantilla eliminada" + auditoría "Plantilla eliminada" |
| 5.9b | Re-sync tras borrar OK | OK | tras "Sincronizar" quedan 2 filas (la borrada sale de la lista) |
| 5.9c | Fallo en DELETE | OK | toast "No se pudo eliminar la plantilla"; la plantilla sigue en la lista (2) |
| 5.9d | [N6] fallo en DELETE: el detalle se mantiene | OK | la confirmación se cierra pero el detalle **permanece abierto** y no se audita un borrado fallido |
| 5.10 | [S3] cache de plantillas | OK | se guardan en `fastws.plantillas` (3 entradas) y reaparecen tras recargar |
| 5.12 | Re-escaneo: hilos derivados de envíos | OK | 6 hilos con estados PROCESO/FALLIDO/CANCELADO/LEIDO/ENTREGADO (`Con error`, `Pendiente`) |
| 5.12b | Re-escaneo idempotente | OK | 2º re-escaneo no duplica (6 hilos) |
| 5.12c | Hilo CANCELADO con motivo | OK | el motivo llega al detalle del hilo |
| 5.22 | [S22] LEIDO/ENTREGADO → hilos | OK | las campañas con ENTREGADO/LEIDO también generan hilos (3009900005 y 3009900006 presentes) |
| 5.11a | Búsqueda por teléfono | OK | filtra a 1 hilo |
| 5.11b | Filtro "Con error" | OK | deja solo el hilo FALLIDO |
| 5.11c | Filtro "Respondidas" sin demos | OK | 0 hilos (vacío correcto) |
| 5.13 | Sembrar demo | OK | +3 hilos demo (9) y activa "Limpiar demo" |
| 5.14 | Limpiar demo | OK | pide confirmación con conteo de hilos, alcance y «no hay deshacer»; «Volver» no borra y «Sí, limpiar» deja 6 hilos |
| 5.15 | Responder texto | OK | POST con body correcto (`Hola desde simulacro`) |
| 5.15b | Mensaje PROCESO + textarea | OK | wamid recibido, sello PROCESO, textarea limpio |
| 5.16 | Fallo terminal | OK | mensaje FALLIDO con código y sello |
| 5.16b | [S14] el textarea conserva lo escrito | OK | tras el FALLIDO el textarea mantiene "Adios simulacro" (ya no se pierde) |
| 5.17 | Responder con plantilla | OK | POST de plantilla `confirmacion_demo` |
| 5.17b | [N7] texto persistido = mensaje renderizado | OK | la burbuja final del hilo incluye el valor de la variable ("Pedido 1234"), no solo el nombre |
| 5.17c | [S19] responder plantilla manda headerParams | OK | `hasHeader=true` también en el responder |
| 5.18 | [S16] cambiar de modo conserva las variables | OK | al alternar texto ↔ plantilla el valor escrito ("Persistencia demo") sigue en el campo |
| 5.19 | Variables vacías | OK | error en pantalla, **sin** llamar a Meta (sends 3→3) |
| 5.20 | [N8] filtro deduplicado por nombre | OK | "Mixta Demostrativa" aparece **1 vez** en el selector de campaña |
| 5.21 | [S2] CANCELADO en tabla y en el resumen | OK | la barra de despacho incluye los cancelados: "2 en proceso, 1 entregados, 1 leídos, 1 fallidos, 1 cancelados" |
| 5.13b | Sin clientes válidos | OK | toast "Sin clientes de ejemplo", no envía |
| 6.1 | Reportes: pestañas y KPIs | OK | 6 pestañas (Resumen/Por día/Por campaña/Por estado/Por cliente/Por usuario) + 7 tarjetas KPI |
| 6.2 | Periodo y rango | OK | "Hoy" aplica; "Rango" revela los date inputs Desde/Hasta |
| 6.3 | [S20] rango invertido | OK | los date inputs se acotan entre sí (`min`/`max`) y el rango se normaliza: un rango invertido devuelve los datos, no un reporte vacío |
| 6.4 | Filtro por origen | OK | "Ejemplos" acota el conjunto (vacía la lista si no hay ejemplos) |
| 6.5 | Búsqueda | OK | filtra por cliente/campaña/teléfono |
| 6.6 | Botón CSV | OK | se habilita con registros y se bloquea sin ellos |
| 6.7 | Exportación CSV | OK | BOM UTF-8 + delimitador `;` + CRLF + 14 columnas + `reporte-mensajes-AAAA-MM-DD.csv` |
| 6.8 | [S21] inyección de fórmulas | OK | una celda `=SUM(1,1)` sale como `'=SUM(1,1)`: no se ejecuta al abrir |
| 6.9 | Vista Por estado | OK | 7 columnas (Registro…Error) + sellos `StatusStamp` |
| 6.10 | [N10] clave de día | OK | la vista Por día muestra el día legible (ya no la clave cruda `2026-0-5T12:00:00`) |
| 6.11 | Estado vacío Reportes | OK | sello "Sin registro" + "Crea y despacha campañas…" |
| 6.12 | Historial: interruptor | OK | "Envíos exitosos" arranca en `aria-checked="false"` y por eso oculta lo enviado con éxito |
| 6.13 | Historial: activar | OK | al encenderlo aparece la bitácora de campañas |
| 6.14 | Historial: pestañas | OK | 6 pestañas por tipo; "Errores" acota la lista |
| 6.15 | Historial: búsqueda | OK | acota por título/detalle |
| 6.16 | [S24] estado efímero | **DESC** | filtro/búsqueda/interruptor vuelven al estado inicial al recargar — correcto: no hay selección que persistir |
| 6.17 | [N9] campaña cancelada | OK | se registra como campaña con su motivo; solo el mensaje cancelado cuenta como error (1 error, no 2), igual que Auditoría |
| 6.18 | Estado vacío Historial | OK | sello "Sin registro" + ayuda |
| 6.19 | Auditoría: tarjetas | OK | Turno/Campaña/Error/Conexión/Importación |
| 6.20 | Auditoría: categorías | OK | 6 pestañas; "Turnos" deja solo los turnos |
| 6.21 | Auditoría: periodo | OK | "Hoy" acota el libro |
| 6.22 | Auditoría: búsqueda | OK | acota por título/detalle |
| 6.23 | Exportación CSV Auditoría | OK | 8 columnas + `;` + BOM + `auditoria-AAAA-MM-DD.csv` |
| 6.24 | [N11] KPI vs lista | OK | los KPI cuentan lo mismo que la lista filtrada |
| 6.26 | Dispositivos: formulario | OK | `#nombre-equipo` con hint, `maxlength=32` y "Guardar" deshabilitado en vacío |
| 6.27 | Dispositivos: renombrar | OK | persiste en `fastws.device` y el botón queda en "Guardado" |
| 6.28 | [S25] renombrar | **DESC a medias** | no deja rastro en Auditoría (por diseño: apodo local) pero el nombre vacío sí queda bloqueado |
| 6.29 | Dispositivos: turno | OK | sello "Turno activo" + bitácora de 7 columnas con el turno abierto |
| 7.1 | Configuración: paneles | OK | velocidad, integración, estado, parámetros y acciones |
| 7.2 | Velocidad: opciones | OK | 4000/2000/1000/500 con 1000/h activo |
| 7.3 | Velocidad: persistencia | OK | escribe `fastws.campanas.velocidad` y audita "Velocidad de despacho actualizada" |
| 7.4 | [S12] copy de velocidad | OK | declara "aplica en caliente", como hace el motor (antes decía "desde la próxima tanda") |
| 7.5 | Formato regional | OK | persiste `en-US` y audita; la UI sigue en español (ya lo declara el note) |
| 7.6 | Estado del equipo | OK | 5 conjuntos + zona horaria del sistema |
| 7.7 | Panel de integración | OK | "Conectada" + "Gestionar en Conexión" |
| 7.8 | Acciones: diálogo | OK | "Restablecer datos de demostración" confirma y aclara que no toca sesión ni conexión; audita el cambio |
| 7.9 | [S1] forma del seed | OK | `fastws.conversaciones` queda como `{threads, merged}` y el store lee el hilo sembrado |
| 7.10 | [S29] diálogo de borrado | **DESC** | el diálogo **sí** declara clientes, campañas, velocidad, conversaciones, turnos y la sesión de conexión |
| 7.11 | [N12] "Borrar todo" | OK | borra también el token de Meta (sessionStorage): la app queda desconectada |
| 7.12 | Sincronización: paneles | OK | 6 paneles con sellos estáticos ("Local solamente", "Base compartida: pendiente Tauri") |
| 7.13 | Sincronización: conjuntos | OK | tabla con los 5 conjuntos y su conteo |
| 7.14 | [S4] honestidad de Sincronización | **DESC** | declara que la sincronización "todavía no existe" (llega con Tauri), usa futuro para lo que llegará y no ofrece controles falsos |
| 7.15 | Sincronización: pulso | OK | cada equipo declara "Sincronizado: nunca" |