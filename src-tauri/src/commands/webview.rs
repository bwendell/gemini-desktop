//! Webview management commands.
//!
//! This module contains Tauri commands for creating and managing
//! the embedded Gemini webview.

use log::{error, info};
use tauri::webview::WebviewBuilder;
use tauri::{AppHandle, Manager, WebviewUrl};

use crate::errors::CommandError;

/// Height of the custom titlebar in pixels (logical).
const TITLEBAR_HEIGHT: f64 = 32.0;

/// URL for the Gemini AI service.
const GEMINI_URL: &str = "https://gemini.google.com";

/// Creates the Gemini webview as a child webview of the main window.
#[tauri::command]
#[cfg(not(tarpaulin_include))]
pub async fn create_gemini_webview(app: AppHandle) -> Result<(), CommandError> {
    info!("Initializing Gemini webview...");

    let main_window = app.get_window("main").ok_or_else(|| {
        let msg = "Main window not found".to_string();
        error!("{}", msg);
        CommandError::WindowNotFound(msg)
    })?;

    // Check if webview already exists
    if app.get_webview("gemini-webview").is_some() {
        info!("Gemini webview already exists.");
        return Ok(());
    }

    // Get window size and scale factor
    let scale_factor = main_window
        .scale_factor()
        .map_err(CommandError::TauriError)?;
    let size = main_window.inner_size().map_err(CommandError::TauriError)?;

    let bounds = crate::utils::calculate_webview_bounds(
        size.width,
        size.height,
        scale_factor,
        TITLEBAR_HEIGHT,
    );

    let builder = WebviewBuilder::new(
        "gemini-webview",
        WebviewUrl::External(GEMINI_URL.parse().unwrap()),
    );

    // Add child webview to the main window
    main_window
        .add_child(builder, bounds.position, bounds.size)
        .map_err(|e| {
            error!("Failed to add child webview: {}", e);
            CommandError::TauriError(e)
        })?;

    info!("Gemini webview created successfully.");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_titlebar_height_constant() {
        // Verify the titlebar height constant is sensible
        assert_eq!(TITLEBAR_HEIGHT, 32.0);
        assert!(TITLEBAR_HEIGHT > 0.0);
    }

    #[test]
    fn test_gemini_url_is_valid() {
        // Verify GEMINI_URL is a valid HTTPS URL string
        assert!(GEMINI_URL.starts_with("https://"));
        assert!(GEMINI_URL.contains("gemini.google.com"));
    }

    #[test]
    fn test_gemini_url_constant() {
        assert_eq!(GEMINI_URL, "https://gemini.google.com");
    }
}
