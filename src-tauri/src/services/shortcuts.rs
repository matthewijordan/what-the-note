use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

pub struct ShortcutsService;

impl ShortcutsService {
    pub fn register(app: &AppHandle, shortcut_str: &str) -> Result<(), String> {
        // Unregister any existing shortcuts first
        Self::unregister_all(app)?;

        let shortcut: Shortcut = shortcut_str
            .parse()
            .map_err(|e| format!("Invalid shortcut format: {:?}", e))?;

        app.global_shortcut()
            .on_shortcut(shortcut, move |app, _shortcut, event| {
                // Only respond to key press, not release, to avoid double-triggering
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Err(e) = app.emit("toggle-window", ()) {
                        eprintln!("Failed to emit toggle-window event: {}", e);
                    }
                    // Notify frontend that window was triggered via shortcut (implicit focus)
                    if let Err(e) = app.emit("shortcut-triggered", ()) {
                        eprintln!("Failed to emit shortcut-triggered event: {}", e);
                    }
                }
            })
            .map_err(|e| format!("Failed to register shortcut: {}", e))?;

        Ok(())
    }

    pub fn unregister_all(app: &AppHandle) -> Result<(), String> {
        app.global_shortcut()
            .unregister_all()
            .map_err(|e| format!("Failed to unregister shortcuts: {}", e))
    }
}
