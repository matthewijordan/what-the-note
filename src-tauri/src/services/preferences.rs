use crate::models::preferences::Preferences;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::Manager;

pub struct PreferencesService {
    preferences: Arc<Mutex<Preferences>>,
    config_path: PathBuf,
}

impl PreferencesService {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let config_dir = app_handle
            .path()
            .app_config_dir()
            .map_err(|e| format!("Failed to get config directory: {}", e))?;

        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;

        let config_path = config_dir.join("preferences.json");
        let preferences = Self::load_from_file(&config_path)?;

        Ok(Self {
            preferences: Arc::new(Mutex::new(preferences)),
            config_path,
        })
    }

    fn load_from_file(path: &PathBuf) -> Result<Preferences, String> {
        if !path.exists() {
            return Ok(Preferences::default());
        }

        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read preferences file: {}", e))?;

        let preferences: Preferences = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse preferences: {}", e))?;

        preferences.validate()?;

        Ok(preferences)
    }

    pub fn get(&self) -> Result<Preferences, String> {
        self.preferences
            .lock()
            .map(|prefs| prefs.clone())
            .map_err(|e| format!("Failed to lock preferences: {}", e))
    }

    pub fn update(&self, new_prefs: Preferences) -> Result<(), String> {
        new_prefs.validate()?;

        {
            let mut prefs = self
                .preferences
                .lock()
                .map_err(|e| format!("Failed to lock preferences: {}", e))?;
            *prefs = new_prefs.clone();
        }

        let json = serde_json::to_string_pretty(&new_prefs)
            .map_err(|e| format!("Failed to serialize preferences: {}", e))?;

        fs::write(&self.config_path, json)
            .map_err(|e| format!("Failed to write preferences file: {}", e))?;

        Ok(())
    }
}
