mod commands;
mod models;
mod services;

use commands::{note, preferences, window};
use services::{preferences::PreferencesService, shortcuts::ShortcutsService, storage::StorageService, tray};

#[cfg(target_os = "macos")]
use services::hotcorner::HotCornerService;

use tauri::{Listener, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Initialize services
            let storage = StorageService::new(&app_handle)
                .expect("Failed to initialize storage service");

            let prefs_service = PreferencesService::new(&app_handle)
                .expect("Failed to initialize preferences service");

            let prefs = prefs_service.get()
                .expect("Failed to load preferences");

            // Set up system tray
            tray::create_tray(&app_handle)
                .expect("Failed to create system tray");

            // Register keyboard shortcut if enabled
            if prefs.shortcut_enabled {
                ShortcutsService::register(&app_handle, &prefs.keyboard_shortcut)
                    .expect("Failed to register keyboard shortcut");
            }

            // Set up hot corner service (macOS only)
            #[cfg(target_os = "macos")]
            {
                let hotcorner = HotCornerService::new();
                hotcorner.update_config(
                    prefs.hotcorner_corner,
                    prefs.hotcorner_size,
                    prefs.hotcorner_enabled,
                );
                hotcorner.start(app_handle.clone());
                app.manage(hotcorner);
            }

            // Manage services state
            app.manage(storage);
            app.manage(prefs_service);

            // Set up event listeners
            let app_handle_clone = app_handle.clone();
            app.listen("toggle-window", move |_event| {
                if let Err(e) = window::toggle_window(app_handle_clone.clone()) {
                    eprintln!("Failed to toggle window: {}", e);
                }
            });

            #[cfg(target_os = "macos")]
            {
                let app_handle_clone = app_handle.clone();
                app.listen("hotcorner-triggered", move |_event| {
                    if let Err(e) = window::show_window_command(app_handle_clone.clone()) {
                        eprintln!("Failed to show window from hotcorner: {}", e);
                    }
                });
            }

            // Show window on launch if configured
            if prefs.show_on_launch {
                if let Err(e) = window::show_window_command(app_handle.clone()) {
                    eprintln!("Failed to show window on launch: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            note::get_note,
            note::save_note,
            preferences::get_preferences,
            preferences::update_preferences,
            window::toggle_window,
            window::show_window_command,
            window::hide_window_command,
            window::open_preferences_window,
            window::save_window_bounds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
