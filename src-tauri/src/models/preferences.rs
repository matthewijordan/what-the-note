use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum Corner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

impl Default for Corner {
    fn default() -> Self {
        Corner::TopRight
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Preferences {
    pub show_on_launch: bool,
    pub launch_on_startup: bool,
    pub hotcorner_enabled: bool,
    pub hotcorner_corner: Corner,
    pub hotcorner_size: u32,
    pub shortcut_enabled: bool,
    pub keyboard_shortcut: String,
    pub auto_focus: bool,
    pub auto_hide_enabled: bool,
    pub auto_hide_delay_ms: u32,
    pub hide_on_blur: bool,
    pub fade_duration_ms: u32,
    pub text_size: u32,
    pub window_x: Option<i32>,
    pub window_y: Option<i32>,
    pub window_width: Option<u32>,
    pub window_height: Option<u32>,
    pub sync: SyncPreferences,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct SyncPreferences {
    pub markdown_enabled: bool,
    pub markdown_path: Option<String>,
    pub include_metadata: bool,
    pub apple_notes_enabled: bool,
    pub apple_notes_title: String,
    pub apple_notes_folder: String,
}

impl Default for SyncPreferences {
    fn default() -> Self {
        Self {
            markdown_enabled: false,
            markdown_path: None,
            include_metadata: true,
            apple_notes_enabled: false,
            apple_notes_title: "What The Note".to_string(),
            apple_notes_folder: "Notes".to_string(),
        }
    }
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            show_on_launch: false,
            launch_on_startup: true,
            hotcorner_enabled: true,
            hotcorner_corner: Corner::TopRight,
            hotcorner_size: 10,
            shortcut_enabled: true,
            keyboard_shortcut: "Alt+Command+N".to_string(),
            auto_focus: true,
            auto_hide_enabled: false,
            auto_hide_delay_ms: 5000,
            hide_on_blur: true,
            fade_duration_ms: 200,
            text_size: 14,
            window_x: None,
            window_y: None,
            window_width: None,
            window_height: None,
            sync: SyncPreferences::default(),
        }
    }
}

impl Preferences {
    pub fn validate(&self) -> Result<(), String> {
        if self.hotcorner_size == 0 || self.hotcorner_size > 100 {
            return Err("Hot corner size must be between 1 and 100 pixels".to_string());
        }

        if self.auto_hide_delay_ms < 250 || self.auto_hide_delay_ms > 300000 {
            return Err("Auto-hide delay must be between 250ms and 300000ms".to_string());
        }

        if self.fade_duration_ms > 2000 {
            return Err("Fade duration must be 2000ms or less".to_string());
        }

        if self.keyboard_shortcut.is_empty() {
            return Err("Keyboard shortcut cannot be empty".to_string());
        }

        if self.text_size < 8 || self.text_size > 32 {
            return Err("Text size must be between 8px and 32px".to_string());
        }

        self.sync.validate()?;

        Ok(())
    }
}

impl SyncPreferences {
    pub fn is_any_enabled(&self) -> bool {
        self.markdown_enabled || self.apple_notes_enabled
    }

    fn validate(&self) -> Result<(), String> {
        if self.markdown_enabled && self.apple_notes_enabled {
            return Err("Only one sync target can be enabled at a time".to_string());
        }

        if self.apple_notes_enabled && self.apple_notes_title.trim().is_empty() {
            return Err("Apple Notes title cannot be empty".to_string());
        }

        if self.apple_notes_enabled && self.apple_notes_folder.trim().is_empty() {
            return Err("Apple Notes folder cannot be empty".to_string());
        }

        Ok(())
    }
}
