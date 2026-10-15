use std::sync::{Mutex, MutexGuard, PoisonError};

use serde::Serialize;

/// Estado del motor que la interfaz consulta con el comando `engine_status`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum EngineStatus {
    Starting,
    Ready {
        #[serde(rename = "baseUrl")]
        base_url: String,
        token: String,
    },
    Failed,
}

pub struct EngineStatusStore(Mutex<EngineStatus>);

impl Default for EngineStatusStore {
    fn default() -> Self {
        Self(Mutex::new(EngineStatus::Starting))
    }
}

impl EngineStatusStore {
    pub fn set(&self, status: EngineStatus) {
        *self.lock() = status;
    }

    pub fn current(&self) -> EngineStatus {
        self.lock().clone()
    }

    fn lock(&self) -> MutexGuard<'_, EngineStatus> {
        self.0.lock().unwrap_or_else(PoisonError::into_inner)
    }
}

#[tauri::command]
pub fn engine_status(store: tauri::State<'_, EngineStatusStore>) -> EngineStatus {
    store.current()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_starts_in_starting_state() {
        let store = EngineStatusStore::default();

        assert_eq!(store.current(), EngineStatus::Starting);
    }

    #[test]
    fn ready_status_serializes_with_camel_case_url() {
        let status = EngineStatus::Ready {
            base_url: "http://127.0.0.1:1".into(),
            token: "t".into(),
        };

        let json = serde_json::to_value(status).unwrap();

        assert_eq!(json["kind"], "ready");
        assert_eq!(json["baseUrl"], "http://127.0.0.1:1");
        assert_eq!(json["token"], "t");
    }

    #[test]
    fn unit_statuses_serialize_as_tagged_objects() {
        let failed = serde_json::to_value(EngineStatus::Failed).unwrap();

        assert_eq!(failed, serde_json::json!({"kind": "failed"}));
    }
}
