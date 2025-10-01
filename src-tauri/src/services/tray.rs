use tauri::{
    menu::{Menu, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Emitter,
};

pub fn create_tray(app: &AppHandle) -> Result<(), String> {
    let toggle_item = MenuItemBuilder::with_id("toggle", "Toggle Note")
        .build(app)
        .map_err(|e| format!("Failed to create toggle menu item: {}", e))?;

    let preferences_item = MenuItemBuilder::with_id("preferences", "Preferences...")
        .build(app)
        .map_err(|e| format!("Failed to create preferences menu item: {}", e))?;

    let quit_item = MenuItemBuilder::with_id("quit", "Quit")
        .build(app)
        .map_err(|e| format!("Failed to create quit menu item: {}", e))?;

    let menu = Menu::with_items(app, &[&toggle_item, &preferences_item, &quit_item])
        .map_err(|e| format!("Failed to create menu: {}", e))?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(menu_handler)
        .build(app)
        .map_err(|e| format!("Failed to create tray icon: {}", e))?;

    Ok(())
}

fn menu_handler(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "toggle" => {
            if let Err(e) = app.emit("toggle-window", ()) {
                eprintln!("Failed to emit toggle-window event: {}", e);
            }
        }
        "preferences" => {
            if let Err(e) = app.emit("open-preferences", ()) {
                eprintln!("Failed to emit open-preferences event: {}", e);
            }
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
