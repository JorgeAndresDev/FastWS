mod db;
#[cfg(windows)]
mod titlebar;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let dir = app.path().app_data_dir()?;
      let db = db::Db::open(&dir).map_err(std::io::Error::other)?;
      app.manage(db);

      // La barra de título nativa de Windows en verde FastWS. Va dentro de
      // `setup` y no en `run` porque el caption se puede restaurar al recrear la
      // ventana, y así se vuelve a teñir en cada arranque.
      #[cfg(windows)]
      if let Some(window) = app.get_webview_window("main") {
        if let Ok(hwnd) = window.hwnd() {
          titlebar::pintar(hwnd);
        }
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      db::doc_all,
      db::doc_save,
      db::doc_wipe,
      db::db_info
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
