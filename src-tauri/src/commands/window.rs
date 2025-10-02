use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WebviewUrl, State};
use crate::services::preferences::PreferencesService;

#[tauri::command]
pub fn toggle_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    let prefs_service = app.state::<PreferencesService>();

    if window
        .is_visible()
        .map_err(|e| format!("Failed to check visibility: {}", e))?
    {
        hide_window(window)
    } else {
        show_window(window, &prefs_service)
    }
}

#[tauri::command]
pub fn show_window_command(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    let prefs_service = app.state::<PreferencesService>();
    show_window(window, &prefs_service)
}

#[tauri::command]
pub fn hide_window_command(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    hide_window(window)
}

fn show_window(window: WebviewWindow, prefs_service: &PreferencesService) -> Result<(), String> {
    let prefs = prefs_service.get()?;

    // Try to restore saved position and size
    let positioned = if let (Some(x), Some(y), Some(width), Some(height)) =
        (prefs.window_x, prefs.window_y, prefs.window_width, prefs.window_height) {

        // Check if position is on-screen
        if is_position_on_screen(&window, x, y) {
            window.set_position(PhysicalPosition::new(x, y))
                .map_err(|e| format!("Failed to set window position: {}", e))?;
            window.set_size(PhysicalSize::new(width, height))
                .map_err(|e| format!("Failed to set window size: {}", e))?;
            true
        } else {
            false
        }
    } else {
        false
    };

    // If no saved position or position was off-screen, use smart positioning
    if !positioned {
        position_window_smartly(&window)?;
    }

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus window: {}", e))?;

    Ok(())
}

fn hide_window(window: WebviewWindow) -> Result<(), String> {
    window
        .hide()
        .map_err(|e| format!("Failed to hide window: {}", e))
}

fn position_window_smartly(window: &WebviewWindow) -> Result<(), String> {
    // Get screen dimensions
    let monitor = window
        .current_monitor()
        .map_err(|e| format!("Failed to get current monitor: {}", e))?
        .ok_or("No monitor found")?;

    let monitor_size = monitor.size();
    let window_size = window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Position in top-right corner with some padding
    let padding = 20;
    let x = (monitor_size.width as i32) - (window_size.width as i32) - padding;
    let y = padding;

    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn open_preferences_window(app: AppHandle) -> Result<(), String> {
    // Check if preferences window already exists
    if let Some(window) = app.get_webview_window("preferences") {
        // Window exists, just bring it to front
        window
            .show()
            .map_err(|e| format!("Failed to show preferences window: {}", e))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus preferences window: {}", e))?;
        return Ok(());
    }

    // Create new preferences window
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        "preferences",
        WebviewUrl::App("preferences.html".into()),
    )
    .title("Preferences")
    .inner_size(500.0, 450.0)
    .resizable(false)
    .minimizable(true)
    .closable(true)
    .always_on_top(true)
    .center()
    .build()
    .map_err(|e| format!("Failed to create preferences window: {}", e))?;

    window
        .show()
        .map_err(|e| format!("Failed to show preferences window: {}", e))?;

    window
        .set_focus()
        .map_err(|e| format!("Failed to focus preferences window: {}", e))?;

    Ok(())
}

fn is_position_on_screen(window: &WebviewWindow, x: i32, y: i32) -> bool {
    // Get all available monitors
    if let Ok(monitors) = window.available_monitors() {
        for monitor in monitors {
            let pos = monitor.position();
            let size = monitor.size();

            // Check if the position is within this monitor's bounds
            if x >= pos.x && x < pos.x + size.width as i32 &&
               y >= pos.y && y < pos.y + size.height as i32 {
                return true;
            }
        }
    }
    false
}

#[tauri::command]
pub fn save_window_bounds(app: AppHandle, prefs_service: State<PreferencesService>) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    let position = window.outer_position()
        .map_err(|e| format!("Failed to get window position: {}", e))?;
    let size = window.outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    let mut prefs = prefs_service.get()?;
    prefs.window_x = Some(position.x);
    prefs.window_y = Some(position.y);
    prefs.window_width = Some(size.width);
    prefs.window_height = Some(size.height);

    prefs_service.update(prefs)?;

    Ok(())
}
