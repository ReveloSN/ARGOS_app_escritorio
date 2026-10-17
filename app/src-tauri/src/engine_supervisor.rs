use std::sync::{Mutex, MutexGuard, PoisonError};
use std::thread;

use tauri::{AppHandle, Manager};

use crate::access_token::generate_access_token;
use crate::engine_command::EngineLocation;
use crate::engine_process::{self, EngineLaunchError, EngineProcess};
use crate::engine_status::{EngineStatus, EngineStatusStore};

/// Guarda el proceso del motor para detenerlo cuando la app se cierra.
#[derive(Default)]
pub struct EngineProcessSlot(Mutex<Option<EngineProcess>>);

impl EngineProcessSlot {
    fn store(&self, process: EngineProcess) {
        *self.lock() = Some(process);
    }

    fn take(&self) -> Option<EngineProcess> {
        self.lock().take()
    }

    fn lock(&self) -> MutexGuard<'_, Option<EngineProcess>> {
        self.0.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

/// Arranca el motor sin bloquear la ventana; la interfaz consulta el estado mientras tanto.
pub fn start_engine_in_background(app: AppHandle) {
    thread::spawn(move || {
        let status = match launch_with_fresh_token(&app) {
            Ok(status) => status,
            Err(error) => {
                log::error!("no se pudo iniciar el motor: {error}");
                EngineStatus::Failed
            }
        };
        app.state::<EngineStatusStore>().set(status);
    });
}

pub fn stop_engine(app: &AppHandle) {
    if let Some(process) = app.state::<EngineProcessSlot>().take() {
        process.stop();
    }
}

/// Detiene el motor y lo vuelve a lanzar, p. ej. para que lea la nueva carpeta del historial.
#[tauri::command]
pub fn restart_engine(app: AppHandle) {
    app.state::<EngineStatusStore>().set(EngineStatus::Starting);
    stop_engine(&app);
    start_engine_in_background(app);
}

fn launch_with_fresh_token(app: &AppHandle) -> Result<EngineStatus, EngineLaunchError> {
    let token = generate_access_token()?;
    let process = engine_process::launch_engine(&engine_location(app)?, &token)?;
    let base_url = process.base_url();
    app.state::<EngineProcessSlot>().store(process);
    Ok(EngineStatus::Ready { base_url, token })
}

/// Las compilaciones de desarrollo usan el repositorio; las de distribución, el motor empaquetado.
fn engine_location(app: &AppHandle) -> Result<EngineLocation, EngineLaunchError> {
    if cfg!(debug_assertions) {
        return Ok(EngineLocation::Repository);
    }
    let resources = app
        .path()
        .resource_dir()
        .map_err(|_| EngineLaunchError::MissingResources)?;
    Ok(EngineLocation::Bundled(resources))
}
