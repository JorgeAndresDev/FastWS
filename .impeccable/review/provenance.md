# Review raster provenance

Every shipping raster in this folder, with how it was produced. Provenance travels with the raster so a later reader knows the capture is staged, not user-supplied.

| File | Dimensions | Bytes | Captured (local) | Source | Method |
| --- | --- | --- | --- | --- | --- |
| `desktop.png` | 1440×900 | 70139 | 2026-09-16 23:27 | `http://localhost:5173/login` (Vite dev server) | Edge headless `--headless=new --disable-gpu --hide-scrollbars --window-size=1440,900` |
| `mobile.png` | 390×844 | 47138 | 2026-09-16 23:27 | `http://localhost:5173/login` (Vite dev server) | Edge headless `--headless=new --disable-gpu --hide-scrollbars --window-size=390,844` |
| `recover-desktop.png` | 1440×900 | 55165 | 2026-09-16 23:27 | `http://localhost:5173/recuperar` (Vite dev server) | Edge headless `--headless=new --disable-gpu --hide-scrollbars --window-size=1440,900` |
| `ui0-desktop.png` | 1440×900 | 186569 | 2026-09-16 23:34 | `http://localhost:5173/app` (Vite dev server) | Edge headless + CDP: `Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot` |
| `ui0-cuenta-desktop.png` | 1440×900 | 194781 | 2026-09-16 23:34 | `http://localhost:5173/app`, menú de cuenta abierto | Edge headless + CDP (clic en el disparador, espera de `[role="menu"]`, luego `Page.captureScreenshot`) |
| `ui0-mobile.png` | 390×844 | 79214 | 2026-09-16 23:34 | `http://localhost:5173/app` (Vite dev server) | Edge headless + CDP: `Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot` |

- `desktop.png` / `mobile.png` / `recover-desktop.png` are the **UI-1 (autenticación)** shipping rasters reviewed by `.impeccable/review/finish.md`.
- `ui0-desktop.png` / `ui0-mobile.png` are the **UI-0 (app shell)** rasters reviewed by `.impeccable/review/finish-ui0.md`; `ui0-cuenta-desktop.png` is the **menú de cuenta / cierre de sesión** surface (same `finish.md` round, «Cerrar sesión»).
- **Gated route:** `/app` sits behind `RequireAuth`, so browser tooling lands on `/login`. The shell captures seed the demo session in `localStorage` over CDP and then navigate, so no file is ever added to `public/` for this. The **detector** cannot seed storage, so scanning the shell still needed a temporary same-origin probe (`public/__seed.html`) that was deleted after the run; `/app` remains guarded in the shipped build (verified: `dist/__seed.html` absent).
- **Brand/green round:** all rasters were re-captured after the wordmark («Fast» papel + «WS» verde) and the single-green token change; each shows pixels of the canonical green `#14d659` (≈3.1k–4.6k sampled px on the 1440-wide captures, shell included), confirming the token reached the whole UI.
- **Account-menu round:** `ui0-desktop.png` / `ui0-mobile.png` were re-captured after the topbar gained the account menu, and `ui0-cuenta-desktop.png` was added to show the open menu. Menu raster verified programmatically: the panel renders `#1a222c` (`base-800` — one tone above the `base-850` panels, per Flat-By-Tone) across a 288px band under the topbar, and 144 sampled pixels of scanline y=100 differ from the closed capture. Glyph edges carry ClearType colour fringes (subpixel AA), which is why isolated tinted pixels appear on text.
- Browser: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`. Each capture used a fresh `--user-data-dir`, so no session/cache is stored with the image.
- These are **staged** captures from a currently-running dev server, not user screenshots. The user's own capture of the real page outranks them.
- Validation: each raster loaded and pixel-sampled (System.Drawing) — asserted non-blank (mean luminance well above zero), dimensions match the named viewport, presence of the canonical green, and the captured DOM was dumped per route and asserted to contain that route's expected text (e.g. `Sellar turno`, `Identificado`, `Planilla general`, the two-tone `Fast<span class="text-brand-400">WS</span>` markup, `Turno activo` + `Cerrar sesión` for the open menu).
- The reviewing model receives no image input in this harness: it verified dimensions, non-blankness, green presence and DOM content programmatically but did not visually read the rasters. Visual sign-off is a human step.
