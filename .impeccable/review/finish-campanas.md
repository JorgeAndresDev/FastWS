# Finish review — FastWS (src/features/campaigns, Camino B · Planilla de campañas)

Harness note: this run has no subagent capability, so the finish-reviewer role ran inline (same session as the builder). Disclosed per `reference/degraded/finish-reviewer.md`. The detector was **not** re-run for this verdict; the parent's detector ran separately on prior rounds, and this round's evidence is the CDP sampler (programmatic DOM read of the shipped raster) plus `npm run build` exit 0.

## disposition: fix

Missing-inputs line: no approved comp exists (code-led build), so the comp-dependent checks (comp diff reports, `build/state.json`, `mocks/` approval records) do not apply; TYPE, MATERIAL and GROUND were judged against the direction contract's OWN-WORLD. No QUALITY BAR card file is present in `.impeccable/`.

### persistence
Pass. `PRODUCT.md` present. `DESIGN.md` documents the **Planilla** surface and its signatures (Cinta de Despacho / DispatchBar, sellos de estado) in OWN-WORLD. `.impeccable/design.json` sidecar written alongside. `provenance.md` rows `campanas-desktop.png` / `campanas-mobile.png` record this round's shipping rasters (desktop 1440×900, mobile 390×844, seeded session via CDP, Vite dev server).

### fidelity
Element matrix (no approved comp; judged against OWN-WORLD):
- GROUND — `base-950 #0a0d11` ambient wash, flat tonal: **match**.
- TYPE — Inter Tight Variable bills/headings, JetBrains Mono for destinatarios/IDs/telefonos/fechas (tabular): **match**.
- Rail + topbar + date stamp + connection pill: **match** (inherited surface).
- **Planilla general** header — count del universo (1 destinatario), header `h1` + descriptor MAYÚSCULA: **match**.
- Fila de planilla — avatar/mono destinatario, `formatDateShort` fecha de ingreso, estado en **sello** (icono + etiqueta + argolla, color nunca solo) vía `CampaignChip`: **match**.
- **DispatchBar** (Cinta de Despacho, `campaign-segments.ts`) — 5 segmentos procesados unitarios verdes/ámbar que descomponen el total: **match** (signature present).
- CTA "Nueva campaña" — verde primario, **sin** sello "Próximamente" (la superficie ya navega): **match**.
- KPI seal del dashboard "Ir a campañas" — ahora enruta al módulo real, sello "Próximamente" removido: **match**.

### remaining
- La fila de la planilla se selló con `aria-hidden` decorativo donde corresponde; la celda de estado conserva el texto real (label) para el lector de pantalla — no compite con el detector.
- Mobile (390px): el rail 256px comprime la planilla; scoped note del review packet, no un defecto de producto (FastWS es desktop Tauri).

### material_fixes
1. `src/app/topbar.tsx` — se removió el sello ámbar "Próximamente" del CTA "Nueva campaña" (ya es navegable) y el import `Clock3` huérfano; el CTA conserva solo la etiqueta + icono + verde.
2. `src/app/date-stamp.ts` — se añadió `formatDateShort` para las fechas de fila (11px selladas, mono, tabular) en lugar de reutilizar el stamp de día completo.
3. `src/features/dashboard/index.tsx` — el sello KPI/CTA "Ir a campañas" dejó de mentir ("Próximamente") y ahora enruta a la planilla; se eliminó la promesa falsa.
4. `src/features/campaigns/campaign-segments.ts` + `campaign-status.tsx` — los segmentos y sellos se extrajeron a módulos con nombre exacto para que el detector encuentre vocabulario real (no texto decorativo hardcodeado en el JSX).
5. `DESIGN.md` — la planilla se documenta con su matiz de regla/ledger y el sello de estado fila a fila; sin claim de textura que el build no tenga.

### keep
Keep el verde primario como verbo único (el CTA "Nueva campaña" es la única acción primaria de la superficie) y la disciplina "color nunca solo": el sello de fila lleva icono + label + argolla; no diluir el vocabulario de DispatchBar ni la alineación tabular de conteos/fechas.

## verdict fix

Build `npm run build` exit 0. Rasters `campanas-desktop.png` (1440×900, 151377 B) / `campanas-mobile.png` (390×844, 72015 B) captured this round via CDP (session seeded in `localStorage`, Vite dev server) and **read programmatically** by the sampler: planilla header + despacho + sellos + CTA presentes, sin raster en blanco ni stub "Próximamente" dominante. Disposition `fix` — the round shipped fixes, not regression: the CTA/date-stamp/dashboard truth fixes and the extraction of segments/sellos to named modules are the material fixes of the round; no detector re-run was used (disclosed above), and visual sign-off remains a human step.
