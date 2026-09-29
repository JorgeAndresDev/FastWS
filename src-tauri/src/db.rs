use std::collections::HashMap;
use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;
use tauri::State;

const SCHEMA: &str = include_str!("../schema.sql");

pub struct Db {
  conn: Mutex<Connection>,
}

impl Db {
  pub fn open(dir: &Path) -> Result<Self, String> {
    std::fs::create_dir_all(dir)
      .map_err(|e| format!("no se pudo crear el directorio de datos: {e}"))?;
    let conn = Connection::open(dir.join("fastws.db"))
      .map_err(|e| format!("no se pudo abrir la base de datos: {e}"))?;
    conn
      .execute_batch(SCHEMA)
      .map_err(|e| format!("no se pudo aplicar el esquema: {e}"))?;
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

  /// `Some(raw)` inserta o reemplaza la fila; `None` la borra. Todo el lote
  /// va en una transaccion: si algo falla, no queda nada a medias.
  pub fn save(&self, entries: &HashMap<String, Option<String>>) -> Result<usize, String> {
    if entries.is_empty() {
      return Ok(0);
    }
    let mut conn = self.lock()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    {
      let mut upsert = tx
        .prepare(
          "INSERT INTO documents (key, value) VALUES (?1, ?2)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
        )
        .map_err(|e| e.to_string())?;
      let mut delete = tx
        .prepare("DELETE FROM documents WHERE key = ?1")
        .map_err(|e| e.to_string())?;
      for (key, value) in entries {
        match value {
          Some(raw) => upsert
            .execute(rusqlite::params![key, raw])
            .map_err(|e| e.to_string())?,
          None => delete.execute(rusqlite::params![key]).map_err(|e| e.to_string())?,
        };
      }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(entries.len())
  }

  pub fn wipe(&self) -> Result<(), String> {
    let conn = self.lock()?;
    conn
      .execute("DELETE FROM documents", [])
      .map_err(|e| e.to_string())?;
    Ok(())
  }

  pub fn info(&self) -> Result<HashMap<String, String>, String> {
    let conn = self.lock()?;
    let count: i64 = conn
      .query_row("SELECT COUNT(*) FROM documents", [], |row| row.get(0))
      .map_err(|e| e.to_string())?;
    let mut out = HashMap::new();
    out.insert("driver".to_string(), "sqlite".to_string());
    out.insert("documents".to_string(), count.to_string());
    Ok(out)
  }
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
      "clients",
      "campaigns",
      "campaign_recipients",
      "messages",
      "conversations",
      "audit_logs",
      "settings",
    ] {
      assert!(
        nombres.iter().any(|n| n == esperada),
        "falta la tabla {esperada}; hay {nombres:?}"
      );
    }
  }

  #[test]
  fn guardar_y_leer_hace_vuelta_completa() {
    let db = Db::open(&temporal("vuelta")).expect("abre");
    assert_eq!(db.all().unwrap().len(), 0);

    db.save(&lote(&[
      ("fastws.clientes", Some("[{\"id\":\"cl-1\"}]")),
      ("fastws.campanas", Some("[]")),
    ]))
    .unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 2);
    assert_eq!(todo.get("fastws.clientes").unwrap(), "[{\"id\":\"cl-1\"}]");
  }

  #[test]
  fn guardar_sobre_la_misma_clave_reemplaza_y_no_duplica() {
    let db = Db::open(&temporal("reemplazo")).expect("abre");
    db.save(&lote(&[("fastws.clientes", Some("[1]"))])).unwrap();
    db.save(&lote(&[("fastws.clientes", Some("[2]"))])).unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 1, "no debe quedar la fila anterior");
    assert_eq!(todo.get("fastws.clientes").unwrap(), "[2]");
  }

  #[test]
  fn none_borra_la_fila() {
    let db = Db::open(&temporal("borra")).expect("abre");
    db.save(&lote(&[
      ("fastws.clientes", Some("[]")),
      ("fastws.campanas", Some("[]")),
    ]))
    .unwrap();

    db.save(&lote(&[("fastws.clientes", None)])).unwrap();

    let todo = db.all().unwrap();
    assert_eq!(todo.len(), 1);
    assert!(!todo.contains_key("fastws.clientes"));
    assert!(todo.contains_key("fastws.campanas"));
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
  fn abrir_dos_veces_no_duplica_tablas() {
    let dir = temporal("reapertura");
    Db::open(&dir).expect("primera");
    let segunda = Db::open(&dir).expect("segunda");
    assert_eq!(segunda.all().unwrap().len(), 0);
    segunda.save(&lote(&[("k", Some("v"))])).unwrap();
    assert_eq!(segunda.info().unwrap().get("documents").unwrap(), "1");
  }

  #[test]
  fn vaciar_deja_la_tabla_lista_para_reusar() {
    let db = Db::open(&temporal("vacia")).expect("abre");
    db.save(&lote(&[("a", Some("1")), ("b", Some("2"))])).unwrap();
    db.wipe().unwrap();
    assert_eq!(db.all().unwrap().len(), 0);
    db.save(&lote(&[("a", Some("9"))])).unwrap();
    assert_eq!(db.all().unwrap().get("a").unwrap(), "9");
  }
}
