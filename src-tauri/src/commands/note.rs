use crate::services::storage::StorageService;
use tauri::State;

#[tauri::command]
pub fn get_note(storage: State<StorageService>) -> Result<String, String> {
    storage.read_note()
}

#[tauri::command]
pub fn save_note(content: String, storage: State<StorageService>) -> Result<(), String> {
    storage.write_note(&content)
}
