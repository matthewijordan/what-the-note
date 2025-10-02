use tauri::{
    menu::{Menu, MenuItemBuilder},
    AppHandle, Emitter,
};

pub fn create_tray(app: &AppHandle) -> Result<(), String> {
    let toggle_item = MenuItemBuilder::with_id("toggle", "Toggle Note")
        .build(app)
        .map_err(|e| format!("Failed to create toggle menu item: {}", e))?;

    let preferences_item = MenuItemBuilder::with_id("preferences", "Preferences...")
        .build(app)
        .map_err(|e| format!("Failed to create preferences menu item: {}", e))?;

    let check_updates_item = MenuItemBuilder::with_id("check-updates", "Check for Updates...")
        .build(app)
        .map_err(|e| format!("Failed to create check updates menu item: {}", e))?;

    let quit_item = MenuItemBuilder::with_id("quit", "Quit")
        .build(app)
        .map_err(|e| format!("Failed to create quit menu item: {}", e))?;

    let menu = Menu::with_items(app, &[&toggle_item, &preferences_item, &check_updates_item, &quit_item])
        .map_err(|e| format!("Failed to create menu: {}", e))?;

    // Get the existing tray icon from config and set its menu
    let tray = app.tray_by_id("main-tray")
        .ok_or_else(|| "Failed to get tray icon".to_string())?;

    tray.set_menu(Some(menu))
        .map_err(|e| format!("Failed to set tray menu: {}", e))?;

    tray.on_menu_event(menu_handler);

    // For macOS with Accessory policy, activate app on any tray interaction
    #[cfg(target_os = "macos")]
    #[allow(deprecated)] // cocoa crate is deprecated but still works
    {
        use cocoa::appkit::NSApplication;

        tray.on_tray_icon_event(move |_tray_icon, _event| {
            // Activate on any event (Enter, Click, etc)
            unsafe {
                let ns_app = cocoa::appkit::NSApp();
                ns_app.activateIgnoringOtherApps_(cocoa::base::YES);
            }
        });
    }

    Ok(())
}

fn menu_handler(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "toggle" => {
            if let Err(e) = app.emit("toggle-window", ()) {
                eprintln!("Failed to emit toggle-window event: {}", e);
            }
            // Also emit shortcut-triggered to lock window (same behavior as keyboard shortcut)
            if let Err(e) = app.emit("shortcut-triggered", ()) {
                eprintln!("Failed to emit shortcut-triggered event: {}", e);
            }
        }
        "preferences" => {
            if let Err(e) = app.emit("open-preferences", ()) {
                eprintln!("Failed to emit open-preferences event: {}", e);
            }
        }
        "check-updates" => {
            if let Err(e) = app.emit("check-updates", ()) {
                eprintln!("Failed to emit check-updates event: {}", e);
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
