use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use rusqlite::{params, Connection};
use tauri::State;

use crate::relational;

const SCHEMA: &str = include_str!("../schema.sql");
const VERSION_ESQUEMA: i64 = 1;

pub struct Db {
  conn: Mutex<Connection>,
}

impl Db {
  pub fn open(dir: &Path) -> Result<Self, String> {
    std::fs::create_dir_all(dir)
      .map_err(|e| format!("no se pudo crear el directorio de datos: {e}"))?;
    let mut conn = Connection::open(dir.join("fastws.db"))
      .map_err(|e| format!("no se pudo abrir la base de datos: {e}"))?;
    // Las claves foráneas se encienden al final: durante la migración hay
    // reemplazos de tablas y filas que se insertan en un orden que no siempre
    // respeta las referencias. Los datos nuevos sí se validan.
    conn
      .execute_batch("PRAGMA foreign_keys = OFF;")
      .map_err(|e| format!("no se pudo configurar la base: {e}"))?;
    conn
      .execute_batch(SCHEMA)
      .map_err(|e| format!("no se pudo aplicar el esquema: {e}"))?;
    let version: i64 = conn
      .query_row("PRAGMA user_version", [], |row| row.get(0))
      .map_err(|e| e.to_string())?;
    if version < VERSION_ESQUEMA {
      migrar_esquema(&mut conn)?;
      conn
        .execute_batch("PRAGMA user_version = 1;")
        .map_err(|e| format!("no se pudo registrar la versión del esquema: {e}"))?;
    }
    // Corre en cada arranque: es idempotente y así también repara una base que
    // quedó a medias entre versiones.
    relational::migrar_documentos(&mut conn)?;
    conn
      .execute_batch("PRAGMA foreign_keys = ON;")
      .map_err(|e| format!("no se pudo activar la integridad referencial: {e}"))?;
    Ok(Self {
      conn: Mutex::new(conn),
    })
  }

  fn lock(&self) -> Result<MutexGuard<'_, Connection>, String> {
    self
      .conn
      .lock()
      .map_err(|_| "la base de datos está bloqueada".to_string())
  }

  pub fn all(&self) -> Result<HashMap<String, String>, String> {
    let conn = self.lock()?;
    let mut out = documentos(&conn)?;
    // Si una raíz sigue en `documents` (JSON que no se pudo migrar, o datos
    // recién insertados por una versión anterior), el documento gana: no se
    // pisa con lo que haya en la tabla.
    for key in relational::ROOTS {
      if out.contains_key(key) {
        continue;
      }
      if let Some(json) = relational::serializar_raiz(&conn, key)? {
        if json != "[]" {
          out.insert(key.to_string(), json);
        }
      }
    }
    for (documento, _) in relational::SETTINGS {
      if out.contains_key(documento) {
        continue;
      }
      if let Some(valor) = relational::leer_settings(&conn, documento)? {
        out.insert(documento.to_string(), valor);
      }
    }
    Ok(out)
  }

  /// `Some(raw)` inserta o reemplaza; `None` borra. Todo el lote va en una
  /// transacción y se escribe primero por prioridad de dependencias (usuarios
  /// antes que campañas, por ejemplo): si algo falla, no queda nada a medias.
  pub fn save(&self, entries: &HashMap<String, Option<String>>) -> Result<usize, String> {
    if entries.is_empty() {
      return Ok(0);
    }
    let mut conn = self.lock()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute_batch("PRAGMA defer_foreign_keys = ON")
      .map_err(|e| e.to_string())?;
    let mut claves: Vec<&String> = entries.keys().collect();
    claves.sort_by(|a, b| {
      relational::prioridad(a)
        .cmp(&relational::prioridad(b))
        .then_with(|| a.cmp(b))
    });
    for key in claves {
      let value = entries.get(key).expect("clave del mapa");
      let manejada = relational::guardar(&tx, key, value.as_deref())?;
      if manejada {
        tx.execute("DELETE FROM documents WHERE key = ?1", params![key])
          .map_err(|e| e.to_string())?;
        continue;
      }
      match value {
        Some(raw) => tx
          .execute(
            "INSERT INTO documents (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET
               value = excluded.value,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
            params![key, raw],
          )
          .map_err(|e| e.to_string())?,
        None => tx
          .execute("DELETE FROM documents WHERE key = ?1", params![key])
          .map_err(|e| e.to_string())?,
      };
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(entries.len())
  }

  pub fn wipe(&self) -> Result<(), String> {
    let conn = self.lock()?;
    relational::vaciar(&conn)
  }

  pub fn info(&self) -> Result<HashMap<String, String>, String> {
    let conn = self.lock()?;
    let count = relational::contar(&conn, "documents")?;
    let mut out = HashMap::new();
    out.insert("driver".to_string(), "sqlite".to_string());
    out.insert("documents".to_string(), count.to_string());
    out.insert(
      "campaigns".to_string(),
      relational::contar(&conn, "campaigns")?.to_string(),
    );
    out.insert(
      "messages".to_string(),
      relational::contar(&conn, "messages")?.to_string(),
    );
    Ok(out)
  }
}

fn documentos(conn: &Connection) -> Result<HashMap<String, String>, String> {
  let mut stmt = conn
    .prepare("SELECT key, value FROM documents")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |row| {
      Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })
    .map_err(|e| e.to_string())?;
  let mut out = HashMap::new();
  for row in rows {
    let (key, value) = row.map_err(|e| e.to_string())?;
    out.insert(key, value);
  }
  Ok(out)
}

fn columnas(conn: &Connection, tabla: &str) -> Result<Vec<String>, String> {
  let mut stmt = conn
    .prepare(&format!("PRAGMA table_info(\"{tabla}\")"))
    .map_err(|e| e.to_string())?;
  let filas = stmt
    .query_map([], |row| row.get::<_, String>(1))
    .map_err(|e| e.to_string())?;
  filas
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())
}

fn tabla_existe(conn: &Connection, tabla: &str) -> Result<bool, String> {
  let existe: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
      params![tabla],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;
  Ok(existe > 0)
}

fn nombre_legacy(conn: &Connection, base: &str) -> Result<String, String> {
  let mut nombre = format!("{base}_legacy");
  let mut n = 2;
  while tabla_existe(conn, &nombre)? {
    nombre = format!("{base}_legacy_{n}");
    n += 1;
  }
  Ok(nombre)
}

/// Reconstruye las tablas cuyo formato cambió desde la versión anterior. Si
/// tenían filas, se copian a una tabla `<tabla>_legacy` (sin conservar
/// restricciones) antes de tirarlas; el esquema nuevo se aplica después. La
/// migración de las filas de `documents` a estas tablas la hace
/// `relational::migrar_documentos`.
fn migrar_esquema(conn: &mut Connection) -> Result<(), String> {
  let tx = conn.transaction().map_err(|e| e.to_string())?;
  tx.execute_batch("PRAGMA defer_foreign_keys = ON")
    .map_err(|e| e.to_string())?;
  // Primero las hijas (messages, campaign_recipients), después las madres.
  let cambios: [(&str, &[&str]); 3] = [
    (
      "messages",
      &["position", "client_id", "sent_at"],
    ),
    (
      "campaigns",
      &["template_name", "template_language", "mapping", "activity"],
    ),
    ("audit_logs", &["at", "categoria", "titulo", "detalle"]),
  ];
  for (tabla, requeridas) in cambios {
    let cols = columnas(&tx, tabla)?;
    if cols.is_empty() {
      continue;
    }
    let al_dia = requeridas.iter().all(|req| cols.iter().any(|c| c == req));
    if al_dia {
      continue;
    }
    preservar_y_soltar(&tx, tabla)?;
  }
  if tabla_existe(&tx, "campaign_recipients")? {
    preservar_y_soltar(&tx, "campaign_recipients")?;
  }
  tx
    .execute_batch(SCHEMA)
    .map_err(|e| format!("no se pudo recrear el esquema: {e}"))?;
  tx.commit().map_err(|e| e.to_string())
}

fn preservar_y_soltar(conn: &Connection, tabla: &str) -> Result<(), String> {
  let filas: i64 = conn
    .query_row(&format!("SELECT COUNT(*) FROM \"{tabla}\""), [], |row| {
      row.get(0)
    })
    .map_err(|e| e.to_string())?;
  if filas > 0 {
    let legacy = nombre_legacy(conn, tabla)?;
    conn
      .execute_batch(&format!(
        "CREATE TABLE \"{legacy}\" AS SELECT * FROM \"{tabla}\";"
      ))
      .map_err(|e| e.to_string())?;
  }
  conn
    .execute_batch(&format!("DROP TABLE \"{tabla}\";"))
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn doc_all(db: State<'_, Db>) -> Result<HashMap<String, String>, String> {
  db.all()
}

#[tauri::command]
pub fn doc_save(
  db: State<'_, Db>,
  entries: HashMap<String, Option<String>>,
) -> Result<usize, String> {
  db.save(&entries)
}

#[tauri::command]
pub fn doc_wipe(db: State<'_, Db>) -> Result<(), String> {
  db.wipe()
}

#[tauri::command]
pub fn db_info(db: State<'_, Db>) -> Result<HashMap<String, String>, String> {
  db.info()
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::Value;

  /// Un directorio propio por prueba: `Db::open` crea el directorio, asi que
  /// se le da una ruta que todavia no existe.
  fn temporal(nombre: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("fastws-db-{nombre}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    dir
  }

  fn lote(pares: &[(&str, Option<&str>)]) -> HashMap<String, Option<String>> {
    pares
      .iter()
      .map(|(k, v)| (k.to_string(), v.map(|s| s.to_string())))
      .collect()
  }

  const USUARIO: &str = r#"[{"id":"us-1","email":"admin@fastws.local","name":"Marlén Quintero","role":"Administrador","passwordHash":"pbkdf2$100000$MDEyMzQ1Njc4OWFiY2RlZg==$BjGsnqre/mhohyyhgj38ryXKwkf7gJMJJO0vAeRiBe4=","createdAt":"2026-10-01T12:00:00.000Z"}]"#;

  const CLIENTE: &str = r#"[{"id":"cl-1","code":"C-1001","name":"Café La Roca","phone":"573001234001","phones":["573001234001","573111111111"],"company":"Comercial Andina","city":"Manizales","zone":"Norte","clientType":"NORMAL","status":"activo","valid":true,"horaInicial":"08:00","orderState":"PENDIENTE","enRuta":false,"createdAt":"2026-09-30T10:00:00.000Z"}]"#;

  const CAMPANA: &str = r#"[{"id":"cp-1","name":"Ruta lunes","description":"Recordatorio","template":{"name":"recordatorio_ruta","language":"es_CO"},"mapping":[{"key":"1","fuente":"campo","campo":"name"}],"filter":{"zone":"Norte"},"status":"EN_PROCESO","recipients":[{"clientId":"cl-1","code":"C-1001","name":"Café La Roca","phone":"573001234001","params":[],"status":"ENTREGADO","metaId":"wamid-1","sentAt":"2026-10-01T10:00:00.000Z"},{"clientId":"cl-1","code":"C-1001","name":"Café La Roca","phone":"573001234001","params":["Café"],"status":"FALLIDO","errorCode":"131031","errorMessage":"Tiempo agotado"}],"createdAt":"2026-10-01T09:00:00.000Z","startedAt":"2026-10-01T10:00:00.000Z","dispatchedBy":{"usuario":"Marlén Quintero","dispositivo":"PC-01 · Windows","at":"2026-10-01T09:59:00.000Z"},"activity":[{"tipo":"creada","at":"2026-10-01T09:00:00.000Z"}]}]"#;

  const AUDITORIA: &str = r#"[{"id":"au-1","at":"2026-10-01T10:01:00.000Z","categoria":"campana","titulo":"Campaña iniciada","detalle":"50 destinatarios","usuario":"Marlén Quintero","dispositivo":"PC-01 · Windows","entidad":"cp-1","codigoError":"131031"}]"#;

  fn json(todo: &HashMap<String, String>, key: &str) -> Value {
    serde_json::from_str(todo.get(key).unwrap_or_else(|| panic!("falta {key}"))).unwrap()
  }

  #[test]
  fn el_esquema_se_aplica_completo() {
    let dir = temporal("esquema");
    let db = Db::open(&dir).expect("abre");
    let conn = db.lock().unwrap();
    let mut stmt = conn
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .unwrap();
    let nombres: Vec<String> = stmt
      .query_map([], |row| row.get::<_, String>(0))
      .unwrap()
      .map(|r| r.unwrap())
      .collect();
    for esperada in [
      "documents",
      "users",
      "devices",
      "clients",
      "segments",
      "segment_clients",
      "templates",
      "campaigns",
      "messages",
      "message_events",
      "conversations",
      "conversation_messages",
      "sync_queue",
      "audit_logs",
      "settings",
    ] {
      assert!(
        nombres.iter().any(|n| n == esperada),
        "falta la tabla {esperada}; hay {nombres:?}"
      );
    }
    assert!(
      !nombres.iter().any(|n| n == "campaign_recipients"),
      "campaign_recipients ya no debe existir: {nombres:?}"
    );
    let version: i64 = conn
      .query_row("PRAGMA user_version", [], |row| row.get(0))
      .unwrap();
    assert_eq!(version, VERSION_ESQUEMA);
  }

  #[test]
  fn guardar_y_leer_hace_vuelta_completa() {
    let db = Db::open(&temporal("vuelta")).expect("abre");
    assert_eq!(db.all().unwrap().len(), 0);

    db.save(&lote(&[
      ("fastws.tema", Some("\"oscuro\"")),
      ("k", Some("v")),
    ]))
    .unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 2);
    assert_eq!(todo.get("fastws.tema").unwrap(), "\"oscuro\"");
    assert_eq!(todo.get("k").unwrap(), "v");
  }

  #[test]
  fn las_raices_relacionales_van_y_vuelven() {
    let db = Db::open(&temporal("raices")).expect("abre");
    db.save(&lote(&[
      (relational::USERS, Some(USUARIO)),
      (relational::CLIENTS, Some(CLIENTE)),
      (relational::CAMPAIGNS, Some(CAMPANA)),
      (relational::AUDIT, Some(AUDITORIA)),
      ("fastws.app.locale", Some("\"es\"")),
    ]))
    .unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 5, "hay {todo:?}");

    let usuarios = json(&todo, relational::USERS);
    assert_eq!(usuarios[0]["email"], "admin@fastws.local");
    assert_eq!(usuarios[0]["role"], "Administrador");
    assert!(usuarios[0]["passwordHash"]
      .as_str()
      .unwrap()
      .starts_with("pbkdf2$100000$"));

    let clientes = json(&todo, relational::CLIENTS);
    assert_eq!(clientes[0]["phones"][1], "573111111111");
    assert_eq!(clientes[0]["valid"], true);
    assert_eq!(clientes[0]["enRuta"], false);
    assert_eq!(clientes[0]["orderState"], "PENDIENTE");
    assert!(clientes[0].get("horaFinal").is_none());

    let campanas = json(&todo, relational::CAMPAIGNS);
    let campana = &campanas[0];
    assert_eq!(campana["template"]["name"], "recordatorio_ruta");
    assert_eq!(campana["mapping"][0]["campo"], "name");
    assert_eq!(campana["filter"]["zone"], "Norte");
    assert_eq!(campana["dispatchedBy"]["dispositivo"], "PC-01 · Windows");
    assert_eq!(campana["activity"][0]["tipo"], "creada");
    let destinatarios = campana["recipients"].as_array().unwrap();
    assert_eq!(destinatarios.len(), 2, "el mismo cliente dos veces");
    assert_eq!(destinatarios[0]["clientId"], "cl-1");
    assert_eq!(destinatarios[0]["metaId"], "wamid-1");
    assert_eq!(destinatarios[1]["errorCode"], "131031");
    assert!(destinatarios[1].get("sentAt").is_none());

    let auditoria = json(&todo, relational::AUDIT);
    assert_eq!(auditoria[0]["categoria"], "campana");
    assert_eq!(auditoria[0]["codigoError"], "131031");
    assert_eq!(todo.get("fastws.app.locale").unwrap(), "\"es\"");
  }

  #[test]
  fn reemplazar_una_campana_reemplaza_sus_destinatarios() {
    let db = Db::open(&temporal("destinatarios")).expect("abre");
    db.save(&lote(&[(relational::CAMPAIGNS, Some(CAMPANA))]))
      .unwrap();
    {
      let conn = db.lock().unwrap();
      assert_eq!(relational::contar(&conn, "messages").unwrap(), 2);
      assert_eq!(relational::contar(&conn, "campaigns").unwrap(), 1);
    }

    db.save(&lote(&[(relational::CAMPAIGNS, Some("[]"))]))
      .unwrap();
    {
      let conn = db.lock().unwrap();
      assert_eq!(relational::contar(&conn, "messages").unwrap(), 0);
      assert_eq!(relational::contar(&conn, "campaigns").unwrap(), 0);
    }
    assert!(db.all().unwrap().get(relational::CAMPAIGNS).is_none());
  }

  #[test]
  fn borrar_una_raiz_la_deja_vacia() {
    let db = Db::open(&temporal("borrar-raiz")).expect("abre");
    db.save(&lote(&[
      (relational::CLIENTS, Some(CLIENTE)),
      (relational::AUDIT, Some(AUDITORIA)),
    ]))
    .unwrap();

    db.save(&lote(&[(relational::CLIENTS, None)])).unwrap();

    let todo = db.all().unwrap();
    assert!(!todo.contains_key(relational::CLIENTS));
    assert!(todo.contains_key(relational::AUDIT));
    let conn = db.lock().unwrap();
    assert_eq!(relational::contar(&conn, "clients").unwrap(), 0);
  }

  #[test]
  fn guardar_sobre_la_misma_clave_reemplaza_y_no_duplica() {
    let db = Db::open(&temporal("reemplazo")).expect("abre");
    db.save(&lote(&[("fastws.tema", Some("\"claro\""))]))
      .unwrap();
    db.save(&lote(&[("fastws.tema", Some("\"oscuro\""))]))
      .unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 1, "no debe quedar la fila anterior");
    assert_eq!(todo.get("fastws.tema").unwrap(), "\"oscuro\"");
  }

  #[test]
  fn none_borra_la_fila() {
    let db = Db::open(&temporal("borra")).expect("abre");
    db.save(&lote(&[
      ("fastws.tema", Some("\"oscuro\"")),
      ("k", Some("v")),
    ]))
    .unwrap();

    db.save(&lote(&[("fastws.tema", None)])).unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 1);
    assert!(!todo.contains_key("fastws.tema"));
    assert!(todo.contains_key("k"));
  }

  #[test]
  fn el_lote_mezcla_altas_y_borrados_de_una_vez() {
    let db = Db::open(&temporal("mezcla")).expect("abre");
    db.save(&lote(&[("velocidad", Some("\"1000/h\""))])).unwrap();

    db.save(&lote(&[
      ("velocidad", None),
      ("auditoria", Some("[]")),
      ("sesiones", Some("[]")),
    ]))
    .unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 2);
    assert!(!todo.contains_key("velocidad"));
  }

  #[test]
  fn el_json_se_conserva_literal() {
    // El valor viaja como texto: SQLite no debe reinterpretar comillas, saltos
    // de linea ni caracteres no ASCII.
    let crudo = "{\"t\":\"Ñoño \\u00e9\\nlinea2\",\"n\":[1,2.5,null]}";
    let db = Db::open(&temporal("literal")).expect("abre");
    db.save(&lote(&[("k", Some(crudo))])).unwrap();
    assert_eq!(db.all().unwrap().get("k").unwrap(), crudo);
  }

  #[test]
  fn migra_los_documentos_al_asignar_la_raiz() {
    let dir = temporal("migra-docs");
    {
      let db = Db::open(&dir).expect("primera");
      let conn = db.lock().unwrap();
      conn
        .execute(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)",
          params![relational::CLIENTS, CLIENTE],
        )
        .unwrap();
      conn
        .execute(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)",
          params!["k", "v"],
        )
        .unwrap();
    }

    let db = Db::open(&dir).expect("segunda");
    let todo = db.all().unwrap();
    assert_eq!(todo.get("k").unwrap(), "v");
    let clientes = json(&todo, relational::CLIENTS);
    assert_eq!(clientes[0]["code"], "C-1001");
    let conn = db.lock().unwrap();
    let quedan: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM documents WHERE key = ?1",
        params![relational::CLIENTS],
        |row| row.get(0),
      )
      .unwrap();
    assert_eq!(quedan, 0, "el documento se movió a la tabla");
    assert_eq!(relational::contar(&conn, "clients").unwrap(), 1);
  }

  #[test]
  fn un_documento_ilegible_se_conserva_tal_cual() {
    let dir = temporal("migra-roto");
    {
      let db = Db::open(&dir).expect("primera");
      let conn = db.lock().unwrap();
      conn
        .execute(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)",
          params![relational::CLIENTS, "{roto"],
        )
        .unwrap();
    }

    let db = Db::open(&dir).expect("segunda");
    let todo = db.all().unwrap();
    assert_eq!(todo.get(relational::CLIENTS).unwrap(), "{roto");
    let conn = db.lock().unwrap();
    assert_eq!(relational::contar(&conn, "clients").unwrap(), 0);
  }

  #[test]
  fn una_raiz_que_falla_no_deja_filas_a_medias() {
    let dir = temporal("migra-atomica");
    let duplicados = r#"[{"id":"cl-1","code":"C-1","name":"Uno","phone":"573001234001","phones":[],"company":"","city":"","zone":"","clientType":"NORMAL","status":"activo","valid":true,"createdAt":"2026-01-01T00:00:00.000Z"},{"id":"cl-2","code":"C-1","name":"Dos","phone":"573001234002","phones":[],"company":"","city":"","zone":"","clientType":"NORMAL","status":"activo","valid":true,"createdAt":"2026-01-01T00:00:00.000Z"}]"#;
    {
      let db = Db::open(&dir).expect("primera");
      let conn = db.lock().unwrap();
      conn
        .execute(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)",
          params![relational::CLIENTS, duplicados],
        )
        .unwrap();
      conn
        .execute(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)",
          params![relational::USERS, USUARIO],
        )
        .unwrap();
    }

    let db = Db::open(&dir).expect("segunda");
    let todo = db.all().unwrap();
    assert_eq!(
      todo.get(relational::CLIENTS).unwrap(),
      duplicados,
      "el documento que no migra se conserva entero"
    );
    assert!(todo.contains_key(relational::USERS));
    let conn = db.lock().unwrap();
    assert_eq!(relational::contar(&conn, "clients").unwrap(), 0);
    assert_eq!(relational::contar(&conn, "users").unwrap(), 1);
    let docs: i64 = conn
      .query_row(
        "SELECT COUNT(*) FROM documents WHERE key = ?1",
        params![relational::CLIENTS],
        |row| row.get(0),
      )
      .unwrap();
    assert_eq!(docs, 1);
  }

  #[test]
  fn migra_las_tablas_del_esquema_anterior() {
    let dir = temporal("esquema-viejo");
    std::fs::create_dir_all(&dir).unwrap();
    {
      let conn = Connection::open(dir.join("fastws.db")).unwrap();
      conn
        .execute_batch(
          "CREATE TABLE campaigns (
             id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
             template_id TEXT, status TEXT, locks TEXT, created_by TEXT NOT NULL,
             started_at TEXT, finished_at TEXT, created_at TEXT, updated_at TEXT
           );
           CREATE TABLE messages (
             id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL,
             recipient_id TEXT NOT NULL, template_id TEXT, variables TEXT,
             status TEXT, meta_message_id TEXT, attempts INTEGER,
             error_code TEXT, error_message TEXT, created_at TEXT, updated_at TEXT,
             UNIQUE (campaign_id, recipient_id)
           );
           CREATE TABLE campaign_recipients (
             campaign_id TEXT NOT NULL, client_id TEXT NOT NULL,
             PRIMARY KEY (campaign_id, client_id)
           );
           CREATE TABLE audit_logs (
             id TEXT PRIMARY KEY, user_id TEXT, device_id TEXT,
             action TEXT NOT NULL, entity TEXT, entity_id TEXT, details TEXT,
             created_at TEXT
           );
           INSERT INTO campaigns (id, name, created_by) VALUES ('cp-vieja', 'Vieja', 'us-1');
           INSERT INTO messages (id, campaign_id, recipient_id) VALUES ('ms-viejo', 'cp-vieja', 'cl-1');
           INSERT INTO campaign_recipients VALUES ('cp-vieja', 'cl-1');
           INSERT INTO audit_logs (id, action) VALUES ('au-vieja', 'crear');",
        )
        .unwrap();
    }

    let db = Db::open(&dir).expect("abre y migra");
    let conn = db.lock().unwrap();
    let cols_campanas = columnas(&conn, "campaigns").unwrap();
    assert!(cols_campanas.iter().any(|c| c == "template_name"));
    assert!(!cols_campanas.iter().any(|c| c == "template_id"));
    let cols_mensajes = columnas(&conn, "messages").unwrap();
    assert!(cols_mensajes.iter().any(|c| c == "position"));
    assert!(!cols_mensajes.iter().any(|c| c == "recipient_id"));
    assert!(!tabla_existe(&conn, "campaign_recipients").unwrap());
    for legacy in ["campaigns_legacy", "messages_legacy", "audit_logs_legacy"] {
      assert!(tabla_existe(&conn, legacy).unwrap(), "falta {legacy}");
      assert_eq!(relational::contar(&conn, legacy).unwrap(), 1);
    }
    assert_eq!(relational::contar(&conn, "campaigns").unwrap(), 0);
    drop(conn);

    // Las tablas nuevas deben quedar usables después de la migración.
    db.save(&lote(&[(relational::CAMPAIGNS, Some(CAMPANA))]))
      .unwrap();
    let campanas = json(&db.all().unwrap(), relational::CAMPAIGNS);
    assert_eq!(campanas[0]["recipients"].as_array().unwrap().len(), 2);
  }

  #[test]
  fn abrir_dos_veces_no_duplica_tablas() {
    let dir = temporal("reapertura");
    Db::open(&dir).expect("primera");
    let segunda = Db::open(&dir).expect("segunda");
    assert_eq!(segunda.all().unwrap().len(), 0);
    segunda.save(&lote(&[("k", Some("v"))])).unwrap();
    assert_eq!(segunda.info().unwrap().get("documents").unwrap(), "1");
  }

  #[test]
  fn vaciar_deja_todo_listo_para_reusar() {
    let db = Db::open(&temporal("vacia")).expect("abre");
    db.save(&lote(&[
      (relational::USERS, Some(USUARIO)),
      (relational::CLIENTS, Some(CLIENTE)),
      (relational::CAMPAIGNS, Some(CAMPANA)),
      (relational::AUDIT, Some(AUDITORIA)),
      ("k", Some("1")),
    ]))
    .unwrap();
    assert_eq!(db.all().unwrap().len(), 5);

    db.wipe().unwrap();

    assert_eq!(db.all().unwrap().len(), 0);
    let conn = db.lock().unwrap();
    for tabla in ["users", "clients", "campaigns", "messages", "audit_logs", "documents"] {
      assert_eq!(relational::contar(&conn, tabla).unwrap(), 0, "{tabla}");
    }
    drop(conn);

    db.save(&lote(&[("k", Some("9"))])).unwrap();
    assert_eq!(db.all().unwrap().get("k").unwrap(), "9");
  }
}
