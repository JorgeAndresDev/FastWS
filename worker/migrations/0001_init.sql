CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  wamid TEXT,
  phone TEXT,
  status TEXT,
  occurred_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_received ON events (received_at);
