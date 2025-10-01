use std::fs;
use std::path::PathBuf;
use tauri::Manager;

pub struct StorageService {
    note_path: PathBuf,
}

impl StorageService {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get data directory: {}", e))?;

        fs::create_dir_all(&data_dir)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;

        let note_path = data_dir.join("note.txt");

        Ok(Self { note_path })
    }

    pub fn read_note(&self) -> Result<String, String> {
        if !self.note_path.exists() {
            return Ok(Self::default_note());
        }

        fs::read_to_string(&self.note_path)
            .map_err(|e| format!("Failed to read note: {}", e))
    }

    pub fn write_note(&self, content: &str) -> Result<(), String> {
        fs::write(&self.note_path, content)
            .map_err(|e| format!("Failed to write note: {}", e))
    }

    fn default_note() -> String {
        r#"<h1>Welcome to What The Note!</h1><p>A minimal, always-accessible sticky note for macOS.</p><h2>Quick Start</h2><ul><li><p><strong>Show/Hide:</strong> Use keyboard shortcut (⌥⌘N) or hover your mouse in the top-right corner</p></li><li><p><strong>Formatting:</strong> Click the text icon in the top-left to reveal styling options</p></li><li><p><strong>Settings:</strong> Click the gear icon to customize behavior and shortcuts</p></li></ul><h2>Features</h2><ul data-type="taskList"><li data-checked="false"><label><input type="checkbox"></label><div><p>Auto-save - your notes are saved instantly</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Rich formatting - bold, italic, lists, headings, and more</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Drag to reposition, resize from edges</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Click away to hide (customizable in settings)</p></div></li><li data-checked="false"><label><input type="checkbox"></label><div><p>Adjustable text size in preferences</p></div></li></ul><p><em>Delete this text and start writing your notes!</em></p>"#.to_string()
    }
}
