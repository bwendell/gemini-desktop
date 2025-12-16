//! Gemini Desktop Application
//!
//! This is the main library for the Tauri application.
//! It configures the Tauri builder with plugins and commands.

mod commands;
mod errors;

use commands::create_gemini_webview;
use log::info;
#[cfg(target_os = "macos")]
use tauri::menu::{MenuBuilder, SubmenuBuilder};
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size};
use tauri_plugin_log::{Target, TargetKind};

const TITLEBAR_HEIGHT: f64 = 32.0;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // --- Platform-Specific Window Decorations ---
            // macOS uses `titleBarStyle: Overlay` which requires decorations.
            // Windows and Linux use a custom titlebar, so we disable native decorations.
            #[cfg(not(target_os = "macos"))]
            {
                if let Some(main_window) = app.get_webview_window("main") {
                    info!("Non-macOS detected: Disabling native window decorations.");
                    let _ = main_window.set_decorations(false);
                }
            }

            // --- Native Menu (macOS only) ---
            // On macOS, we use native menus for system integration.
            // On Windows/Linux, React handles the menu via TitlebarMenu component.
            #[cfg(target_os = "macos")]
            {
                let app_menu = SubmenuBuilder::new(app, "Gemini Desktop")
                    .about(None)
                    .separator()
                    .quit()
                    .build()?;

                let edit_menu = SubmenuBuilder::new(app, "Edit")
                    .undo()
                    .redo()
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .select_all()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_menu)
                    .item(&edit_menu)
                    .build()?;

                app.set_menu(menu)?;
            }

            // --- Resize Listener ---
            // Setup resize listener for the main window to keep webview in sync.
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
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                ])
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![create_gemini_webview])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
