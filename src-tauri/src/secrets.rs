//! Guarda de secretos con DPAPI (Windows Data Protection API).
//!
//! Por que un modulo aparte y no una tabla de SQLite: el access token de Meta
//! es un secreto. La tabla `settings` del esquema lo excluye a proposito, y el
//! `documents` guarda el resto de datos sin cifrar. Aqui el texto solo existe en
//! claro dentro del proceso, y lo que llega a disco es la salida de
//! `CryptProtectData`, que Windows ata a la cuenta de usuario que la ejecuto:
//! otro usuario del equipo (o el mismo usuario desde otra maquina) no puede
//! descifrarlo.
//!
//! La eleccion frente a Credential Manager es deliberada: alli el token
//! apareceria en el administrador de credenciales de Windows del operador, y el
//! token es de la empresa. DPAPI lo deja en un archivo de la app que el usuario
//! no tiene por que administered a mano.
//!
//! Que resuelve el problema que reporto el operador: con el token en
//! `sessionStorage` del webview, cerrar la ventana lo borraba y habia que
//! escribirlo otra vez en cada arranque. Aqui sobrevive hasta que se llama a
//! `secret_delete`, que es exactamente lo que hace el boton "Desconectar".

use std::path::{Path, PathBuf};

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

use windows::Win32::Foundation::{HLOCAL, LocalFree};
use windows::Win32::Security::Cryptography::{
  CRYPT_INTEGER_BLOB, CRYPTPROTECT_LOCAL_MACHINE, CryptProtectData, CryptUnprotectData,
};
use windows::core::PCWSTR;

/// Descripción de para qué sirve el secreto. DPAPI la usa como "entropía" y
/// ademas la muestra al hacer `CryptProtectData`, así que un blob robado sin
/// este texto no se descifra aunque se copie a otro programa.
const DESCRIPCION: &str = "FastWS · token de la API de WhatsApp";

/// Version del formato guardado. Si el blob se cambia, se incrementa para que
/// `leer` pueda rechazarlo en vez de devolver basura.
const VERSION: &str = "dpapi-v1";

/// La guarda completa: cifrado + archivo.
pub struct Secrets {
  dir: PathBuf,
}

impl Secrets {
  /// `dir` es el directorio de datos de la app (el mismo de la base).
  pub fn new(dir: &Path) -> Result<Self, String> {
    let sub = dir.join("secrets");
    std::fs::create_dir_all(&sub)
      .map_err(|e| format!("no se pudo crear el directorio de secretos: {e}"))?;
    Ok(Self { dir: sub })
  }

  fn ruta(&self, label: &str) -> PathBuf {
    self.dir.join(format!("{label}.secret"))
  }

  /// Cifra y guarda `plain`. Sobrescribe el secreto anterior de esa etiqueta.
  pub fn write(&self, label: &str, plain: &str) -> Result<(), String> {
    let (cipher, _) = self.proteger(plain)?;
    std::fs::write(self.ruta(label), cipher.as_bytes())
      .map_err(|e| format!("no se pudo guardar el secreto: {e}"))
  }

  /// Descifra el secreto de `label`, o `Ok(None)` si no hay ninguno.
  pub fn read(&self, label: &str) -> Result<Option<String>, String> {
    let ruta = self.ruta(label);
    if !ruta.exists() {
      return Ok(None);
    }
    let crudo = std::fs::read_to_string(&ruta)
      .map_err(|e| format!("no se pudo leer el secreto: {e}"))?;
    match self.desproteger(&crudo) {
      Ok(Some(plain)) => Ok(Some(plain)),
      Ok(None) => Ok(None),
      Err(e) => Err(format!(
        "el secreto guardado no se pudo descifrar: {e}. Vuelve a escribirlo en Conexión."
      )),
    }
  }

  /// Borra el secreto. Idempotente: si no existe, no hace nada ni falla.
  pub fn delete(&self, label: &str) -> Result<bool, String> {
    let ruta = self.ruta(label);
    match std::fs::remove_file(&ruta) {
      Ok(()) => Ok(true),
      Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
      Err(e) => Err(format!("no se pudo borrar el secreto: {e}")),
    }
  }

  /// Que etiquetas tienen secretos, util para diagnostico.
  pub fn labels(&self) -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(entradas) = std::fs::read_dir(&self.dir) {
      for e in entradas.flatten() {
        if let Some(nombre) = e.file_name().to_str() {
          if let Some(label) = nombre.strip_suffix(".secret") {
            out.push(label.to_string());
          }
        }
      }
    }
    out.sort();
    out
  }

  /// `CryptProtectData` con `CRYPTPROTECT_LOCAL_MACHINE`: el blob se ata al
  /// perfil de la maquina, asi que sobrevive al cierre de sesion y sirve para
  /// una app que se ejecuta como un solo operador por equipo. Devuelve
  /// (base64 del blob, descripcion).
  fn proteger(&self, plain: &str) -> Result<(String, String), String> {
    let bytes = plain.as_bytes();
    let entrada = CRYPT_INTEGER_BLOB {
      cbData: bytes.len() as u32,
      pbData: bytes.as_ptr() as *mut u8,
    };
    // La descripción viaja como PCWSTR (UTF-16 terminado en NUL). Además de
    // mostrarse al cifrar, DPAPI la usa como entropía: sin este texto el blob
    // no se descifra aunque se copie a otro programa.
    let mut desc: Vec<u16> = DESCRIPCION.encode_utf16().collect();
    desc.push(0);
    let desc_pcw = PCWSTR(desc.as_ptr());
    let mut salida = CRYPT_INTEGER_BLOB::default();
    unsafe {
      CryptProtectData(
        &entrada,
        desc_pcw,
        None,
        None,
        None,
        CRYPTPROTECT_LOCAL_MACHINE,
        &mut salida,
      )
      .map_err(|e| format!("DPAPI no cifró el secreto: {e}"))?;
      let datos = std::slice::from_raw_parts(salida.pbData, salida.cbData as usize);
      let b64 = format!("{VERSION}:{}", BASE64.encode(datos));
      // DPAPIMemoryProtect limpia el buffer; sin esto el texto en claro se
      // queda en el heap del proceso esperando a que otro lo lea.
      LocalFree(Some(HLOCAL(salida.pbData as *mut _)));
      Ok((b64, DESCRIPCION.to_string()))
    }
  }

  /// `CryptUnprotectData`. `Ok(None)` si el blob no es nuestro formato.
  fn desproteger(&self, blob: &str) -> Result<Option<String>, String> {
    let Some(carga) = blob.strip_prefix(&format!("{VERSION}:")) else {
      return Ok(None);
    };
    let datos = BASE64
      .decode(carga.trim())
      .map_err(|e| format!("el blob cifrado no es base64 válido: {e}"))?;
    let entrada = CRYPT_INTEGER_BLOB {
      cbData: datos.len() as u32,
      pbData: datos.as_ptr() as *mut u8,
    };
    let mut salida = CRYPT_INTEGER_BLOB::default();
    unsafe {
      CryptUnprotectData(&entrada, None, None, None, None, 0, &mut salida)
        .map_err(|e| format!("DPAPI no descifró el secreto: {e}"))?;
      let bytes = std::slice::from_raw_parts(salida.pbData, salida.cbData as usize);
      let texto = String::from_utf8(bytes.to_vec())
        .map_err(|e| format!("el secreto descifrado no es texto valido: {e}"));
      LocalFree(Some(HLOCAL(salida.pbData as *mut _)));
      texto.map(Some)
    }
  }
}

// ────────────────────────────────────────────────────────────────────────── comandos

#[tauri::command]
pub fn secret_write(
  secrets: tauri::State<'_, Secrets>,
  label: String,
  plain: String,
) -> Result<bool, String> {
  secrets.write(&label, &plain)?;
  Ok(true)
}

#[tauri::command]
pub fn secret_read(secrets: tauri::State<'_, Secrets>, label: String) -> Result<Option<String>, String> {
  secrets.read(&label)
}

#[tauri::command]
pub fn secret_delete(secrets: tauri::State<'_, Secrets>, label: String) -> Result<bool, String> {
  secrets.delete(&label)
}

/// Solo diagnostico: nunca devuelve el texto, solo que etiquetas existen.
#[tauri::command]
pub fn secret_labels(secrets: tauri::State<'_, Secrets>) -> Result<Vec<String>, String> {
  Ok(secrets.labels())
}

#[cfg(test)]
mod tests {
  use super::*;

  fn temporal(nombre: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
      "fastws-secret-{nombre}-{}",
      std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    dir
  }

  const TOKEN: &str = "EAAG-falso-para-pruebas-1234567890";

  #[test]
  fn el_viaje_redondo_devuelve_el_mismo_secreto() {
    let s = Secrets::new(&temporal("viaje")).expect("abre");
    s.write("meta-token", TOKEN).expect("escribe");
    assert_eq!(s.read("meta-token").unwrap().as_deref(), Some(TOKEN));
  }

  #[test]
  fn lo_que_llega_a_disco_no_es_el_secreto() {
    // El punto del modulo: en el archivo no puede aparecer el token en claro.
    let dir = temporal("opaco");
    let s = Secrets::new(&dir).expect("abre");
    s.write("meta-token", TOKEN).expect("escribe");
    let crudo = std::fs::read_to_string(s.ruta("meta-token")).expect("lee el archivo");
    assert!(!crudo.contains(TOKEN), "el token quedo en claro en disco");
    assert!(crudo.starts_with(VERSION), "falta el prefijo de version");
  }

  #[test]
  fn guardar_sobre_el_mismo_label_reemplaza() {
    let s = Secrets::new(&temporal("reemplaza")).expect("abre");
    s.write("meta-token", TOKEN).expect("escribe");
    s.write("meta-token", "otro-token-distinto").expect("reescribe");
    assert_eq!(
      s.read("meta-token").unwrap().as_deref(),
      Some("otro-token-distinto")
    );
    assert_eq!(s.labels(), vec!["meta-token".to_string()]);
  }

  #[test]
  fn un_secreto_inexistente_no_es_error() {
    let s = Secrets::new(&temporal("vacio")).expect("abre");
    assert_eq!(s.read("nada").unwrap(), None);
    assert!(s.labels().is_empty());
  }

  #[test]
  fn borrar_deja_el_label_perdido_y_es_idempotente() {
    let s = Secrets::new(&temporal("borra")).expect("abre");
    s.write("meta-token", TOKEN).expect("escribe");
    assert!(s.delete("meta-token").expect("borra"));
    assert_eq!(s.read("meta-token").unwrap(), None);
    // Segundo borrado: no debe fallar, porque "Desconectar" puede pulsarse dos
    // veces o sobre una conexion que ya no estaba.
    assert!(!s.delete("meta-token").expect("borra dos veces"));
  }

  #[test]
  fn un_blob_de_otra_version_se_ignora_en_vez_de_devolver_basura() {
    let s = Secrets::new(&temporal("version")).expect("abre");
    std::fs::write(s.ruta("meta-token"), "dpapi-v0:AAAA").expect("escribe a mano");
    assert_eq!(s.read("meta-token").unwrap(), None);
  }

  #[test]
  fn un_blob_corrupto_da_error_explicito() {
    let s = Secrets::new(&temporal("corrupto")).expect("abre");
    std::fs::write(s.ruta("meta-token"), "dpapi-v1:no-es-base64!!").expect("escribe a mano");
    let err = s.read("meta-token").expect_err("debe fallar");
    assert!(err.contains("no se pudo descifrar"), "mensaje poco util: {err}");
  }

  #[test]
  fn dos_labels_conviven() {
    let s = Secrets::new(&temporal("conviven")).expect("abre");
    s.write("meta-token", "token-de-meta").expect("escribe");
    s.write("otra-cosa", "secreto-distinto").expect("escribe");
    assert_eq!(s.labels(), vec!["meta-token", "otra-cosa"]);
    assert_eq!(s.read("meta-token").unwrap().as_deref(), Some("token-de-meta"));
    assert_eq!(s.read("otra-cosa").unwrap().as_deref(), Some("secreto-distinto"));
  }
}