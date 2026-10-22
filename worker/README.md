# FastWS Webhooks

Worker de Cloudflare que recibe los webhooks de WhatsApp Business, los guarda en
D1 y los expone al escritorio para que actualice estados y conversaciones.

## Qué hace

- `GET /webhook`: responde el desafío de verificación de Meta.
- `POST /webhook`: valida `X-Hub-Signature-256` con el App Secret, normaliza
  estados y mensajes, y los inserta con deduplicación.
- `GET /events?after=<id>&limit=<n>`: entrega eventos al escritorio con
  autenticación `Bearer`. El escritorio guarda el cursor y repite la consulta.
- `GET /health`: comprobación de disponibilidad.

Los eventos se conservan **30 días**. No se guarda el payload crudo de Meta:
solo el estado o el texto necesario para actualizar la app.

## Despliegue

Requisitos: cuenta de Cloudflare, Wrangler y un App de Meta con WhatsApp
Business.

```powershell
# 1. Crear la base D1 y copiar el database_id en wrangler.toml
npx wrangler d1 create fastws-webhooks

# 2. Aplicar el esquema
npx wrangler d1 migrations apply fastws-webhooks --remote --config worker/wrangler.toml

# 3. Cargar los secretos (se piden por consola)
npx wrangler secret put META_VERIFY_TOKEN --config worker/wrangler.toml
npx wrangler secret put META_APP_SECRET --config worker/wrangler.toml
npx wrangler secret put DESKTOP_TOKEN --config worker/wrangler.toml

# 4. Publicar
npx wrangler deploy --config worker/wrangler.toml
```

`META_VERIFY_TOKEN` es una cadena que tú eliges; se escribe igual en Meta y en
el Worker. `META_APP_SECRET` está en Meta → App → Configuración básica.
`DESKTOP_TOKEN` es el token que se pega en FastWS → Configuración → Webhooks de
Meta; debe ser largo y aleatorio.

## Configurar Meta

En Meta → WhatsApp → Configuración → Webhooks:

- URL de devolución de llamada: `https://<worker>.workers.dev/webhook`
- Token de verificación: el mismo `META_VERIFY_TOKEN`
- Campo suscrito: `messages`

Meta envía un `GET` de verificación y después los `POST` de estados y
respuestas. Si la firma no coincide, el Worker responde `401` y no guarda nada.

## Probar en local

```powershell
Copy-Item worker/.dev.vars.example worker/.dev.vars
npx wrangler d1 migrations apply fastws-webhooks --local --config worker/wrangler.toml
npx wrangler dev worker/src/index.js --config worker/wrangler.toml
```

El Worker queda en `http://localhost:8787`. En FastWS se puede configurar esa URL
y el `DESKTOP_TOKEN` de `.dev.vars`; el CSP de la app permite `localhost`.

Sin un túnel público, Meta no puede alcanzar `localhost`; para una prueba real
se necesita un dominio público o `cloudflared tunnel`.

## Notas

- La lista de orígenes CORS se puede ajustar con `ALLOWED_ORIGINS` (separados por
  coma). Por defecto acepta Vite y el webview de Tauri.
- Si publicas el Worker en un dominio propio (no `*.workers.dev`), agrega ese origen a
  `connect-src` en `src-tauri/tauri.conf.json`; el CSP actual solo permite
  `https://*.workers.dev`, localhost y Tauri.
- El endpoint `/events` no tiene rate limit propio: el token debe ser secreto y
  el Worker se publica bajo HTTPS.
- La limpieza de eventos vencidos ocurre en cada `POST /webhook`; si no llegan
  webhooks, los eventos viejos permanecen hasta el siguiente.
