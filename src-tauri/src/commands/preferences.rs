use crate::models::preferences::Preferences;
use crate::services::preferences::PreferencesService;
use crate::services::shortcuts::ShortcutsService;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_autostart::ManagerExt;

#[cfg(target_os = "macos")]
use crate::services::hotcorner::HotCornerService;

#[tauri::command]
pub fn get_preferences(prefs_service: State<PreferencesService>) -> Result<Preferences, String> {
    prefs_service.get()
}

#[tauri::command]
pub fn update_preferences(
    new_prefs: Preferences,
    prefs_service: State<PreferencesService>,
    app: AppHandle,
    #[cfg(target_os = "macos")] hotcorner: State<HotCornerService>,
) -> Result<(), String> {
    let old_prefs = prefs_service.get()?;

    // Save preferences
    prefs_service.update(new_prefs.clone())?;

    // Update keyboard shortcut if changed or enabled/disabled
    if old_prefs.keyboard_shortcut != new_prefs.keyboard_shortcut
        || old_prefs.shortcut_enabled != new_prefs.shortcut_enabled
    {
        if new_prefs.shortcut_enabled {
            ShortcutsService::register(&app, &new_prefs.keyboard_shortcut)?;
        } else {
            ShortcutsService::unregister_all(&app)?;
        }
    }

    // Update hot corner if changed (macOS only)
    #[cfg(target_os = "macos")]
    {
        if old_prefs.hotcorner_corner != new_prefs.hotcorner_corner
            || old_prefs.hotcorner_size != new_prefs.hotcorner_size
            || old_prefs.hotcorner_enabled != new_prefs.hotcorner_enabled
        {
            hotcorner.update_config(
                new_prefs.hotcorner_corner,
                new_prefs.hotcorner_size,
                new_prefs.hotcorner_enabled,
            );
        }
    }

    // Update launch on startup if changed
    if old_prefs.launch_on_startup != new_prefs.launch_on_startup {
        let autostart_manager = app.autolaunch();
        if new_prefs.launch_on_startup {
            let _ = autostart_manager.enable();
        } else {
            let _ = autostart_manager.disable();
        }
    }

    // Emit event to notify frontend of changes
    app.emit("preferences-updated", new_prefs)
        .map_err(|e| format!("Failed to emit preferences-updated event: {}", e))?;

    Ok(())
}
