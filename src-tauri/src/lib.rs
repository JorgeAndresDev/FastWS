mod db;

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
