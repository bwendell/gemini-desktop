//! Gemini Desktop Application
//!
//! This is the main library for the Tauri application.
//! It configures the Tauri builder with plugins and commands.

mod commands;

use commands::create_gemini_webview;
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};

const TITLEBAR_HEIGHT: f64 = 32.0;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Setup resize listener for the main window
            if let Some(main_window) = app.get_webview_window("main") {
                let main_window_clone = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Resized(size) = event {
                        // Update gemini webview bounds if it exists
                        if let Some(webview) = app_handle.get_webview("gemini-webview") {
                            let scale_factor = main_window_clone.scale_factor().unwrap_or(1.0);
                            let titlebar_height_phys = (TITLEBAR_HEIGHT * scale_factor) as u32;

                            let width = size.width;
                            let height = if size.height > titlebar_height_phys {
                                size.height - titlebar_height_phys
                            } else {
                                0
                            };

                            let _ = webview.set_bounds(tauri::Rect {
                                position: Position::Physical(PhysicalPosition {
                                    x: 0,
                                    y: titlebar_height_phys as i32,
                                }),
                                size: Size::Physical(PhysicalSize { width, height }),
                            });
                        }
                    }
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![create_gemini_webview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
