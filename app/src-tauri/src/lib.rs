mod access_token;
mod engine_command;
mod engine_process;
mod engine_status;
mod engine_supervisor;

use engine_status::EngineStatusStore;
use engine_supervisor::EngineProcessSlot;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(EngineStatusStore::default())
        .manage(EngineProcessSlot::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            engine_status::engine_status,
            engine_supervisor::restart_engine
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            engine_supervisor::start_engine_in_background(app.handle().clone());
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                engine_supervisor::stop_engine(app);
            }
        });
}
