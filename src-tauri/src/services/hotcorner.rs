#![allow(deprecated)] // cocoa crate is deprecated but still works

use crate::models::preferences::Corner;
use cocoa::appkit::NSScreen;
use cocoa::base::nil;
use core_graphics::event::CGEvent;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct HotCornerService {
    is_running: Arc<AtomicBool>,
    corner: Arc<Mutex<Corner>>,
    size: Arc<Mutex<u32>>,
    enabled: Arc<Mutex<bool>>,
}

impl HotCornerService {
    pub fn new() -> Self {
        Self {
            is_running: Arc::new(AtomicBool::new(false)),
            corner: Arc::new(Mutex::new(Corner::TopRight)),
            size: Arc::new(Mutex::new(10)),
            enabled: Arc::new(Mutex::new(true)),
        }
    }

    pub fn start(&self, app: AppHandle) {
        if self.is_running.load(Ordering::SeqCst) {
            return;
        }

        self.is_running.store(true, Ordering::SeqCst);

        let is_running = Arc::clone(&self.is_running);
        let corner = Arc::clone(&self.corner);
        let size = Arc::clone(&self.size);
        let enabled = Arc::clone(&self.enabled);

        thread::spawn(move || {
            let mut last_trigger = Instant::now();
            let debounce_duration = Duration::from_millis(100); // Emit every 100ms while in corner

            while is_running.load(Ordering::SeqCst) {
                if !*enabled.lock().unwrap() {
                    thread::sleep(Duration::from_millis(50));
                    continue;
                }

                if let Some(mouse_pos) = Self::get_mouse_position() {
                    let corner_val = *corner.lock().unwrap();
                    let size_val = *size.lock().unwrap();
                    let screen_bounds = Self::get_screen_bounds();

                    if Self::is_in_corner(mouse_pos, corner_val, size_val, screen_bounds) {
                        if last_trigger.elapsed() > debounce_duration {
                            if let Err(e) = app.emit("hotcorner-triggered", ()) {
                                eprintln!("Failed to emit hotcorner-triggered event: {}", e);
                            }
                            last_trigger = Instant::now();
                        }
                    }
                }

                thread::sleep(Duration::from_millis(50));
            }
        });
    }

    pub fn update_config(&self, new_corner: Corner, new_size: u32, new_enabled: bool) {
        *self.corner.lock().unwrap() = new_corner;
        *self.size.lock().unwrap() = new_size;
        *self.enabled.lock().unwrap() = new_enabled;
    }

    fn get_mouse_position() -> Option<(f64, f64)> {
        let event_source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState).ok()?;
        let event = CGEvent::new(event_source).ok()?;
        let location = event.location();
        Some((location.x, location.y))
    }

    fn get_screen_bounds() -> (f64, f64) {
        unsafe {
            let screen = NSScreen::mainScreen(nil);
            if screen != nil {
                let frame = NSScreen::frame(screen);
                (frame.size.width, frame.size.height)
            } else {
                (1920.0, 1080.0) // Fallback
            }
        }
    }

    fn is_in_corner(
        mouse_pos: (f64, f64),
        corner: Corner,
        size: u32,
        screen_bounds: (f64, f64),
    ) -> bool {
        let (mx, my) = mouse_pos;
        let (sw, sh) = screen_bounds;
        let trigger_size = size as f64;

        match corner {
            Corner::TopRight => mx >= (sw - trigger_size) && my <= trigger_size,
            Corner::TopLeft => mx <= trigger_size && my <= trigger_size,
            Corner::BottomRight => mx >= (sw - trigger_size) && my >= (sh - trigger_size),
            Corner::BottomLeft => mx <= trigger_size && my >= (sh - trigger_size),
        }
    }
}
