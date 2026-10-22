use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// Raices de agregado que ya viven en tablas relacionales. La app sigue
/// hablando el contrato de documentos (`get`/`set` con JSON crudo); esta capa
/// traduce cada raiz a sus tablas y la reconstruye al leer.
pub const USERS: &str = "fastws.users";
pub const CLIENTS: &str = "fastws.clientes";
pub const CAMPAIGNS: &str = "fastws.campanas";
pub const AUDIT: &str = "fastws.auditoria";

pub const ROOTS: [&str; 4] = [USERS, CLIENTS, CAMPAIGNS, AUDIT];

/// Escalares que no merecen una tabla propia: van a `settings` con la misma
/// representacion cruda que tenian en `documents`.
pub const SETTINGS: [(&str, &str); 7] = [
    ("fastws.conexion.ids", "conexion.ids"),
    ("fastws.conexion.meta", "conexion.meta"),
    ("fastws.campanas.velocidad", "campanas.velocidad"),
    ("fastws.app.locale", "app.locale"),
    ("fastws.recuperacion.codigo", "recuperacion.codigo"),
    ("fastws.plantillas.numeroPrueba", "plantillas.numeroPrueba"),
    ("fastws.tema", "tema"),
];

pub fn es_relacional(key: &str) -> bool {
    ROOTS.contains(&key) || clave_settings(key).is_some()
}

pub fn clave_settings(key: &str) -> Option<&'static str> {
    SETTINGS
        .iter()
        .find_map(|(documento, ajuste)| (*documento == key).then_some(*ajuste))
}

/// Prioridad de escritura dentro de un lote. Los usuarios van primero porque
/// las campanas los referencian; el resto solo necesita un orden estable para
/// que las pruebas y los conflictos UNIQUE sean reproducibles.
pub fn prioridad(key: &str) -> u8 {
    match key {
        USERS => 0,
        CLIENTS => 1,
        CAMPAIGNS => 2,
        AUDIT => 3,
        _ if clave_settings(key).is_some() => 4,
        _ => 5,
    }
}

// ---------------------------------------------------------------------------
// Modelos de entrada/salida (espejo de src/types/index.ts y StoredUser).
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct User {
    id: String,
    email: String,
    name: String,
    #[serde(default = "rol_operativo")]
    role: String,
    password_hash: String,
    #[serde(default)]
    created_at: String,
}

fn rol_operativo() -> String {
    "Operativo".to_string()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UserOut {
    id: String,
    email: String,
    name: String,
    role: String,
    password_hash: String,
    created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClientIn {
    id: String,
    code: String,
    name: String,
    phone: String,
    #[serde(default)]
    phones: Vec<String>,
    #[serde(default)]
    company: String,
    #[serde(default)]
    city: String,
    #[serde(default)]
    zone: String,
    client_type: String,
    #[serde(default = "status_activo")]
    status: String,
    #[serde(default)]
    valid: bool,
    hora_inicial: Option<String>,
    hora_final: Option<String>,
    order_state: Option<String>,
    cancel_reason: Option<String>,
    en_ruta: Option<bool>,
    #[serde(default)]
    created_at: String,
}

fn status_activo() -> String {
    "activo".to_string()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ClientOut {
    id: String,
    code: String,
    name: String,
    phone: String,
    phones: Vec<String>,
    company: String,
    city: String,
    zone: String,
    client_type: String,
    status: String,
    valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    hora_inicial: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    hora_final: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    order_state: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cancel_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    en_ruta: Option<bool>,
    created_at: String,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Recipient {
    client_id: String,
    #[serde(default)]
    code: String,
    #[serde(default)]
    name: String,
    phone: String,
    #[serde(default)]
    params: Vec<String>,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    meta_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error_message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sent_at: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Template {
    name: String,
    language: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CampaignIn {
    id: String,
    name: String,
    #[serde(default)]
    description: String,
    template: Template,
    #[serde(default = "lista_vacia")]
    mapping: Value,
    #[serde(default = "objeto_vacio")]
    filter: Value,
    status: String,
    #[serde(default)]
    recipients: Vec<Recipient>,
    #[serde(default)]
    created_at: String,
    started_at: Option<String>,
    ended_at: Option<String>,
    dispatched_by: Option<Value>,
    #[serde(default = "lista_vacia")]
    activity: Value,
}

fn lista_vacia() -> Value {
    Value::Array(Vec::new())
}

fn objeto_vacio() -> Value {
    Value::Object(serde_json::Map::new())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TemplateOut {
    name: String,
    language: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CampaignOut {
    id: String,
    name: String,
    description: String,
    template: TemplateOut,
    mapping: Value,
    filter: Value,
    status: String,
    recipients: Vec<Recipient>,
    created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    started_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    ended_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dispatched_by: Option<Value>,
    activity: Value,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Audit {
    id: String,
    at: String,
    categoria: String,
    titulo: String,
    detalle: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    usuario: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    dispositivo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    entidad: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    codigo_error: Option<String>,
}

// ---------------------------------------------------------------------------
// Lectura: reconstruye el JSON que la app espera para cada raiz.
// ---------------------------------------------------------------------------

pub fn serializar_raiz(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let json = match key {
        USERS => serde_json::to_string(&leer_usuarios(conn)?),
        CLIENTS => serde_json::to_string(&leer_clientes(conn)?),
        CAMPAIGNS => serde_json::to_string(&leer_campanas(conn)?),
        AUDIT => serde_json::to_string(&leer_auditoria(conn)?),
        _ => return Ok(None),
    };
    json.map(Some).map_err(|e| e.to_string())
}

pub fn leer_settings(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let Some(ajuste) = clave_settings(key) else {
        return Ok(None);
    };
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![ajuste],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn leer_usuarios(conn: &Connection) -> Result<Vec<UserOut>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, email, name, role, password_hash, created_at
             FROM users ORDER BY rowid",
        )
        .map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map([], |row| {
            Ok(UserOut {
                id: row.get(0)?,
                email: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                password_hash: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn leer_clientes(conn: &Connection) -> Result<Vec<ClientOut>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, code, name, phone, phones, client_type, company, city, zone,
                    status, is_valid, hora_inicial, hora_final, order_state,
                    cancel_reason, en_ruta, created_at
             FROM clients ORDER BY rowid",
        )
        .map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map([], |row| {
            let phones_raw: Option<String> = row.get(4)?;
            let phones = phones_raw
                .and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok())
                .unwrap_or_default();
            let status: String = row.get(9)?;
            Ok(ClientOut {
                id: row.get(0)?,
                code: row.get(1)?,
                name: row.get(2)?,
                phone: row.get(3)?,
                phones,
                client_type: row.get(5)?,
                company: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                city: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
                zone: row.get::<_, Option<String>>(8)?.unwrap_or_default(),
                status: normalizar_status(&status),
                valid: row.get::<_, i64>(10)? != 0,
                hora_inicial: row.get(11)?,
                hora_final: row.get(12)?,
                order_state: row.get(13)?,
                cancel_reason: row.get(14)?,
                en_ruta: row.get::<_, Option<i64>>(15)?.map(|v| v != 0),
                created_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn normalizar_status(status: &str) -> String {
    match status {
        "active" => "activo".to_string(),
        "inactive" => "inactivo".to_string(),
        otro => otro.to_string(),
    }
}

fn leer_campanas(conn: &Connection) -> Result<Vec<CampaignOut>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, template_name, template_language,
                    mapping, filter, status, started_at, finished_at, created_at,
                    activity, dispatched_by
             FROM campaigns ORDER BY rowid",
        )
        .map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            Ok((
                CampaignOut {
                    id: id.clone(),
                    name: row.get(1)?,
                    description: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    template: TemplateOut {
                        name: row.get(3)?,
                        language: row.get(4)?,
                    },
                    mapping: texto_json(row.get::<_, String>(5)?),
                    filter: texto_json(row.get::<_, String>(6)?),
                    status: row.get(7)?,
                    recipients: Vec::new(),
                    started_at: row.get(8)?,
                    ended_at: row.get(9)?,
                    created_at: row.get(10)?,
                    activity: texto_json(row.get::<_, String>(11)?),
                    dispatched_by: row
                        .get::<_, Option<String>>(12)?
                        .map(texto_json)
                        .filter(|v| !v.is_null()),
                },
                id,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    for fila in filas {
        let (mut campana, id) = fila.map_err(|e| e.to_string())?;
        campana.recipients = leer_destinatarios(conn, &id)?;
        out.push(campana);
    }
    Ok(out)
}

fn texto_json(raw: String) -> Value {
    serde_json::from_str(&raw).unwrap_or(Value::Null)
}

fn leer_destinatarios(conn: &Connection, campaign_id: &str) -> Result<Vec<Recipient>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT client_id, code, name, phone, variables, status,
                    meta_message_id, error_code, error_message, sent_at
             FROM messages WHERE campaign_id = ?1 ORDER BY position",
        )
        .map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map(params![campaign_id], |row| {
            let variables: Option<String> = row.get(4)?;
            Ok(Recipient {
                client_id: row.get(0)?,
                code: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                name: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                phone: row.get(3)?,
                params: variables
                    .and_then(|raw| serde_json::from_str::<Vec<String>>(&raw).ok())
                    .unwrap_or_default(),
                status: row.get(5)?,
                meta_id: row.get(6)?,
                error_code: row.get(7)?,
                error_message: row.get(8)?,
                sent_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

fn leer_auditoria(conn: &Connection) -> Result<Vec<Audit>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, at, categoria, titulo, detalle, usuario, dispositivo,
                    entidad, codigo_error
             FROM audit_logs ORDER BY rowid",
        )
        .map_err(|e| e.to_string())?;
    let filas = stmt
        .query_map([], |row| {
            Ok(Audit {
                id: row.get(0)?,
                at: row.get(1)?,
                categoria: row.get(2)?,
                titulo: row.get(3)?,
                detalle: row.get(4)?,
                usuario: row.get(5)?,
                dispositivo: row.get(6)?,
                entidad: row.get(7)?,
                codigo_error: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    filas
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Escritura: reemplaza la raiz completa (la app siempre manda el JSON entero).
// ---------------------------------------------------------------------------

/// Devuelve `true` si la clave la maneja esta capa. Si `raw` es `None`, borra.
pub fn guardar(conn: &Connection, key: &str, raw: Option<&str>) -> Result<bool, String> {
    if let Some(ajuste) = clave_settings(key) {
        match raw {
            Some(valor) => {
                conn.execute(
                    "INSERT INTO settings (key, value) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET
                       value = excluded.value,
                       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
                    params![ajuste, valor],
                )
                .map_err(|e| e.to_string())?;
            }
            None => {
                conn.execute("DELETE FROM settings WHERE key = ?1", params![ajuste])
                    .map_err(|e| e.to_string())?;
            }
        }
        return Ok(true);
    }

    match key {
        USERS => reemplazar_usuarios(conn, raw)?,
        CLIENTS => reemplazar_clientes(conn, raw)?,
        CAMPAIGNS => reemplazar_campanas(conn, raw)?,
        AUDIT => reemplazar_auditoria(conn, raw)?,
        _ => return Ok(false),
    }
    Ok(true)
}

fn parsear<T>(raw: Option<&str>, defecto: &str) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
{
    serde_json::from_str(raw.unwrap_or(defecto))
        .map_err(|e| format!("JSON de la raiz invalido: {e}"))
}

fn reemplazar_usuarios(conn: &Connection, raw: Option<&str>) -> Result<(), String> {
    let usuarios: Vec<User> = parsear(raw, "[]")?;
    let ids: Vec<&str> = usuarios.iter().map(|u| u.id.as_str()).collect();
    // Borrar solo los que ya no estan: un DELETE total dispararia los
    // ON DELETE SET NULL de las campanas aunque el usuario siga existiendo.
    let existentes: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM users")
            .map_err(|e| e.to_string())?;
        let filas = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        filas
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    for id in existentes {
        if !ids.contains(&id.as_str()) {
            conn.execute("DELETE FROM users WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
        }
    }
    for u in &usuarios {
        conn.execute(
            "INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
             ON CONFLICT(id) DO UPDATE SET
               email = excluded.email,
               name = excluded.name,
               role = excluded.role,
               password_hash = excluded.password_hash,
               created_at = excluded.created_at,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
            params![u.id, u.email, u.name, u.role, u.password_hash, u.created_at],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn reemplazar_clientes(conn: &Connection, raw: Option<&str>) -> Result<(), String> {
    let clientes: Vec<ClientIn> = parsear(raw, "[]")?;
    let ids: Vec<&str> = clientes.iter().map(|c| c.id.as_str()).collect();
    let existentes: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT id FROM clients")
            .map_err(|e| e.to_string())?;
        let filas = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        filas
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    for id in existentes {
        if !ids.contains(&id.as_str()) {
            conn.execute("DELETE FROM clients WHERE id = ?1", params![id])
                .map_err(|e| e.to_string())?;
        }
    }
    for c in &clientes {
        let phones = serde_json::to_string(&c.phones).map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO clients (
               id, code, name, phone, phones, client_type, company, city, zone,
               status, is_valid, hora_inicial, hora_final, order_state,
               cancel_reason, en_ruta, created_at, updated_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,
                       strftime('%Y-%m-%dT%H:%M:%fZ','now'))
             ON CONFLICT(id) DO UPDATE SET
               code = excluded.code,
               name = excluded.name,
               phone = excluded.phone,
               phones = excluded.phones,
               client_type = excluded.client_type,
               company = excluded.company,
               city = excluded.city,
               zone = excluded.zone,
               status = excluded.status,
               is_valid = excluded.is_valid,
               hora_inicial = excluded.hora_inicial,
               hora_final = excluded.hora_final,
               order_state = excluded.order_state,
               cancel_reason = excluded.cancel_reason,
               en_ruta = excluded.en_ruta,
               created_at = excluded.created_at,
               updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')",
            params![
                c.id,
                c.code,
                c.name,
                c.phone,
                phones,
                c.client_type,
                c.company,
                c.city,
                c.zone,
                c.status,
                if c.valid { 1i64 } else { 0i64 },
                c.hora_inicial,
                c.hora_final,
                c.order_state,
                c.cancel_reason,
                c.en_ruta.map(|v| if v { 1i64 } else { 0i64 }),
                c.created_at,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn reemplazar_campanas(conn: &Connection, raw: Option<&str>) -> Result<(), String> {
    let campanas: Vec<CampaignIn> = parsear(raw, "[]")?;
    // La campana es el agregado completo: se reemplaza entero. `messages`
    // cascadea al borrar `campaigns`, pero se limpia primero para no depender
    // de que las claves foraneas esten activas.
    conn.execute("DELETE FROM messages", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM campaigns", [])
        .map_err(|e| e.to_string())?;
    for c in &campanas {
        conn.execute(
            "INSERT INTO campaigns (
               id, name, description, template_name, template_language, mapping,
               filter, status, started_at, finished_at, created_at, activity,
               dispatched_by, updated_at
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,
                       strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
            params![
                c.id,
                c.name,
                c.description,
                c.template.name,
                c.template.language,
                serde_json::to_string(&c.mapping).map_err(|e| e.to_string())?,
                serde_json::to_string(&c.filter).map_err(|e| e.to_string())?,
                c.status,
                c.started_at,
                c.ended_at,
                c.created_at,
                serde_json::to_string(&c.activity).map_err(|e| e.to_string())?,
                c.dispatched_by
                    .as_ref()
                    .map(serde_json::to_string)
                    .transpose()
                    .map_err(|e| e.to_string())?,
            ],
        )
        .map_err(|e| e.to_string())?;

        for (indice, r) in c.recipients.iter().enumerate() {
            let variables = serde_json::to_string(&r.params).map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT INTO messages (
                   id, campaign_id, position, client_id, code, name, phone,
                   variables, status, meta_message_id, error_code, error_message,
                   sent_at, created_at, updated_at
                 ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,
                           strftime('%Y-%m-%dT%H:%M:%fZ','now'),
                           strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
                params![
                    format!("{}:{}", c.id, indice),
                    c.id,
                    indice as i64,
                    r.client_id,
                    r.code,
                    r.name,
                    r.phone,
                    variables,
                    r.status,
                    r.meta_id,
                    r.error_code,
                    r.error_message,
                    r.sent_at,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn reemplazar_auditoria(conn: &Connection, raw: Option<&str>) -> Result<(), String> {
    let registros: Vec<Audit> = parsear(raw, "[]")?;
    conn.execute("DELETE FROM audit_logs", [])
        .map_err(|e| e.to_string())?;
    for r in &registros {
        conn.execute(
            "INSERT INTO audit_logs (
               id, at, categoria, titulo, detalle, usuario, dispositivo, entidad,
               codigo_error
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
            params![
                r.id,
                r.at,
                r.categoria,
                r.titulo,
                r.detalle,
                r.usuario,
                r.dispositivo,
                r.entidad,
                r.codigo_error,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Migracion unica `documents` -> tablas relacionales.
// ---------------------------------------------------------------------------

/// Mueve las raices que aun estan en `documents`. Si una raiz no parsea, se
/// deja tal cual: la lectura sigue prefiriendo el documento y no se pierde
/// nada. Las escrituras posteriores la reparan.
pub fn migrar_documentos(conn: &mut Connection) -> Result<usize, String> {
    let documentos: HashMap<String, String> = {
        let mut stmt = conn
            .prepare("SELECT key, value FROM documents")
            .map_err(|e| e.to_string())?;
        let filas = stmt
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| e.to_string())?;
        filas
            .collect::<Result<HashMap<_, _>, _>>()
            .map_err(|e| e.to_string())?
    };

    let mut pendientes: Vec<&String> = documentos
        .keys()
        .filter(|key| es_relacional(key))
        .collect();
    pendientes.sort_by_key(|key| prioridad(key));

    let mut movidas = 0usize;
    let mut tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute_batch("PRAGMA defer_foreign_keys = ON")
        .map_err(|e| e.to_string())?;
    for key in pendientes {
        let raw = documentos.get(key).expect("clave del mapa");
        // Un savepoint por raiz: si una fila no cumple una restriccion
        // (UNIQUE de email o codigo, por ejemplo), esa raiz se revierte
        // entera y el documento queda intacto; las demas se migran igual.
        let mut sp = tx.savepoint().map_err(|e| e.to_string())?;
        let resultado = (|| -> Result<(), String> {
            if guardar(&sp, key, Some(raw))? {
                sp.execute("DELETE FROM documents WHERE key = ?1", params![key])
                    .map_err(|e| e.to_string())?;
            }
            Ok(())
        })();
        match resultado {
            Ok(()) => {
                sp.commit().map_err(|e| e.to_string())?;
                movidas += 1;
            }
            Err(err) => {
                eprintln!("no se pudo migrar {key}: {err}; se conserva el documento");
            }
        }
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(movidas)
}

// ---------------------------------------------------------------------------
// Vaciado y diagnostico.
// ---------------------------------------------------------------------------

pub fn vaciar(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "DELETE FROM message_events;
         DELETE FROM conversation_messages;
         DELETE FROM conversations;
         DELETE FROM sync_queue;
         DELETE FROM messages;
         DELETE FROM campaigns;
         DELETE FROM segment_clients;
         DELETE FROM segments;
         DELETE FROM devices;
         DELETE FROM clients;
         DELETE FROM templates;
         DELETE FROM users;
         DELETE FROM audit_logs;
         DELETE FROM settings;
         DELETE FROM documents;",
    )
    .map_err(|e| e.to_string())
}

pub fn contar(conn: &Connection, tabla: &str) -> Result<i64, String> {
    conn.query_row(&format!("SELECT COUNT(*) FROM {tabla}"), [], |row| row.get(0))
        .map_err(|e| e.to_string())
}
