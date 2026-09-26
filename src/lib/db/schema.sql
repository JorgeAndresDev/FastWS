-- FastWS — Esquema SQLite (esqueleto).
-- Referencia inicial del punto 31 de la especificación.
-- La integración real con base de datos ocurrirá en la fase de backend.
-- Las tablas compartidas (Turso) usarán el mismo esquema base.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'operator',
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
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  template_id    TEXT REFERENCES templates(id),
  status         TEXT NOT NULL DEFAULT 'DRAFT',
  locks          TEXT,
  created_by     TEXT NOT NULL REFERENCES users(id),
  started_at     TEXT,
  finished_at    TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  client_id   TEXT NOT NULL REFERENCES clients(id),
  PRIMARY KEY (campaign_id, client_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id             TEXT PRIMARY KEY,
  campaign_id    TEXT NOT NULL REFERENCES campaigns(id),
  recipient_id   TEXT NOT NULL REFERENCES clients(id),
  template_id    TEXT REFERENCES templates(id),
  variables      TEXT,
  status         TEXT NOT NULL DEFAULT 'PENDING',
  meta_message_id TEXT,
  attempts       INTEGER NOT NULL DEFAULT 0,
  error_code     TEXT,
  error_message  TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (campaign_id, recipient_id)
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
  user_id     TEXT REFERENCES users(id),
  device_id   TEXT REFERENCES devices(id),
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   TEXT,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Las credenciales de Meta (access token de la WhatsApp Business API) se almacenan de forma
-- segura y nunca en código fuente ni en el repositorio; su persistencia llega con el backend
-- (Tauri + SQLite/Turso). En la fase de interfaz el token vive solo en la sesión en memoria.
CREATE TABLE IF NOT EXISTS settings (
  key      TEXT PRIMARY KEY,
  value    TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);