use crate::services::{
    preferences::PreferencesService, storage::StorageService, sync::SyncService,
};
use tauri::State;

#[tauri::command]
pub fn get_note(storage: State<StorageService>) -> Result<String, String> {
    storage.read_note()
}

#[tauri::command]
pub fn save_note(
    content: String,
    storage: State<StorageService>,
    prefs_service: State<PreferencesService>,
) -> Result<(), String> {
    storage.write_note(&content)?;

    match prefs_service.get() {
        Ok(preferences) => {
            if let Err(err) = SyncService::sync_all(&content, &preferences.sync) {
                eprintln!("Sync failed: {}", err);
            }
        }
        Err(err) => {
            eprintln!("Failed to load preferences for sync: {}", err);
        }
    }

    Ok(())
}
