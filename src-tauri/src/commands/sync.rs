use crate::services::preferences::PreferencesService;
use crate::services::storage::StorageService;
use crate::services::sync::{self, SyncService};
use serde::Serialize;
use tauri::State;

#[tauri::command]
pub fn trigger_sync(
    storage: State<StorageService>,
    prefs_service: State<PreferencesService>,
) -> Result<(), String> {
    let content = storage.read_note()?;
    let preferences = prefs_service.get()?;

    SyncService::sync_all(&content, &preferences.sync).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn check_apple_notes_permission() -> Result<(), String> {
    sync::check_apple_notes_permission().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn list_apple_notes_folders() -> Result<Vec<String>, String> {
    sync::list_apple_notes_folders().map_err(|err| err.to_string())
}

#[derive(Serialize)]
pub struct SyncTestResponse {
    pub success: bool,
    pub target: Option<String>,
    pub message: String,
}

#[tauri::command]
pub fn test_sync(
    storage: State<StorageService>,
    prefs_service: State<PreferencesService>,
) -> Result<SyncTestResponse, String> {
    let content = storage.read_note()?;
    let preferences = prefs_service.get()?;

    let outcomes = SyncService::sync_outcomes(&content, &preferences.sync);

    if outcomes.is_empty() {
        return Ok(SyncTestResponse {
            success: false,
            target: None,
            message: "No sync targets are enabled".to_string(),
        });
    }

    let outcome = outcomes.into_iter().next().unwrap();

    let target_label = Some(outcome.target.label().to_string());

    match outcome.result {
        Ok(()) => Ok(SyncTestResponse {
            success: true,
            target: target_label,
            message: "Sync completed successfully".to_string(),
        }),
        Err(err) => Ok(SyncTestResponse {
            success: false,
            target: target_label,
            message: err.to_string(),
        }),
    }
}
