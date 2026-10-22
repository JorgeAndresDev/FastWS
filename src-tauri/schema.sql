-- FastWS — Esquema SQLite. Fuente única de verdad: la aplica Rust al abrir
-- la base (src-tauri/src/db.rs, include_str! de este archivo).
--
-- La tabla `documents` sostiene la capa 1: cada raíz de agregado se guarda como
-- un JSON en una fila, el mismo contrato que la app ya usaba con localStorage.
-- La capa 2 (src-tauri/src/relational.rs) migra las raíces a las tablas
-- relacionales de abajo sin cambiar el contrato del repositorio. `documents`
-- queda como respaldo para claves sin tabla y para JSON que no se pudo migrar.

CREATE TABLE IF NOT EXISTS documents (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Operativo',
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS devices (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  fingerprint TEXT NOT NULL UNIQUE,
  last_sync   TEXT,
  sync_status TEXT NOT NULL DEFAULT 'never',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL,
  phones         TEXT,
  client_type    TEXT NOT NULL CHECK (client_type IN ('NORMAL', 'CASHLESS')),
  company        TEXT,
  city           TEXT,
  zone           TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  is_valid       INTEGER NOT NULL DEFAULT 0,
  hora_inicial   TEXT,
  hora_final     TEXT,
  order_state    TEXT CHECK (order_state IN ('PENDIENTE', 'CANCELADO')),
  cancel_reason  TEXT,
  en_ruta        INTEGER,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS segments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  criteria    TEXT,
  created_by  TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS segment_clients (
  segment_id TEXT NOT NULL REFERENCES segments(id),
  client_id  TEXT NOT NULL REFERENCES clients(id),
  PRIMARY KEY (segment_id, client_id)
);

CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,
  meta_name   TEXT NOT NULL,
  language    TEXT NOT NULL,
  status      TEXT NOT NULL,
  category    TEXT,
  body        TEXT,
  variables   TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  description       TEXT,
  template_name     TEXT NOT NULL,
  template_language TEXT NOT NULL,
  mapping           TEXT NOT NULL DEFAULT '[]',
  filter            TEXT NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'BORRADOR',
  started_at        TEXT,
  finished_at       TEXT,
  activity          TEXT NOT NULL DEFAULT '[]',
  dispatched_by     TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Un mensaje por destinatario de la campaña. `client_id` NO tiene clave
-- foránea: los destinatarios son una foto del cliente al momento del envío y
-- el cliente puede borrarse después. La posición conserva el orden original
-- (el mismo cliente puede aparecer más de una vez en una campaña).
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  campaign_id     TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL,
  client_id       TEXT NOT NULL,
  code            TEXT,
  name            TEXT,
  phone           TEXT NOT NULL,
  variables       TEXT,
  status          TEXT NOT NULL DEFAULT 'PENDIENTE',
  meta_message_id TEXT,
  error_code      TEXT,
  error_message   TEXT,
  sent_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (campaign_id, position)
);

CREATE TABLE IF NOT EXISTS message_events (
  id         TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id),
  status     TEXT NOT NULL,
  meta_message_id TEXT,
  error_code TEXT,
  error_description TEXT,
  source     TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES clients(id),
  campaign_id    TEXT REFERENCES campaigns(id),
  status         TEXT NOT NULL DEFAULT 'open',
  last_message_at TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id           TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  direction    TEXT NOT NULL,
  body         TEXT NOT NULL,
  meta_message_id TEXT,
  status       TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id          TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  operation   TEXT NOT NULL,
  payload     TEXT,
  device_id   TEXT NOT NULL REFERENCES devices(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  at          TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  titulo      TEXT NOT NULL,
  detalle     TEXT NOT NULL,
  usuario     TEXT,
  dispositivo TEXT,
  entidad     TEXT,
  codigo_error TEXT
);

-- Las credenciales de Meta (access token de la WhatsApp Business API) NO viven
-- aquí: el token es un secreto y va al almacén seguro del sistema, no a una
-- tabla. Las tablas compartidas (Turso) usarán el mismo esquema base.
CREATE TABLE IF NOT EXISTS settings (
  key      TEXT PRIMARY KEY,
  value    TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
