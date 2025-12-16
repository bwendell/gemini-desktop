//! Webview management commands.
//!
//! This module contains Tauri commands for creating and managing
//! the embedded Gemini webview.

use tauri::webview::WebviewBuilder;
use tauri::{AppHandle, Manager, WebviewUrl};
use tauri::{PhysicalPosition, PhysicalSize, Position, Size};

/// Height of the custom titlebar in pixels (logical).
const TITLEBAR_HEIGHT: f64 = 32.0;

/// URL for the Gemini AI service.
const GEMINI_URL: &str = "https://gemini.google.com";

/// Creates the Gemini webview as a child webview of the main window.
#[tauri::command]
pub async fn create_gemini_webview(app: AppHandle) -> Result<(), String> {
    let main_window = app
        .get_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    // Check if webview already exists
    if app.get_webview("gemini-webview").is_some() {
        return Ok(());
    }

    // Get window size and scale factor
    let scale_factor = main_window.scale_factor().map_err(|e| e.to_string())?;
    let size = main_window.inner_size().map_err(|e| e.to_string())?;

    let titlebar_height_phys = (TITLEBAR_HEIGHT * scale_factor) as u32;

    // Calculate bounds for the child webview
    // It should start below the titlebar and fill the rest
    let width = size.width;
    let height = if size.height > titlebar_height_phys {
        size.height - titlebar_height_phys
    } else {
        0
    };

    let builder = WebviewBuilder::new(
        "gemini-webview",
        WebviewUrl::External(GEMINI_URL.parse().unwrap()),
    );

    // Add child webview to the main window
    main_window
        .add_child(
            builder,
            Position::Physical(PhysicalPosition {
                x: 0,
                y: titlebar_height_phys as i32,
            }),
            Size::Physical(PhysicalSize { width, height }),
        )
        .map_err(|e| format!("Failed to create webview: {}", e))?;

    Ok(())
}
