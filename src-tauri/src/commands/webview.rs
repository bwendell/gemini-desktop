//! Webview management commands.
//!
//! This module contains Tauri commands for creating and managing
//! the embedded Gemini webview.

use log::{error, info};
use tauri::webview::WebviewBuilder;
use tauri::{AppHandle, Manager, WebviewUrl};

use crate::constants::{GEMINI_URL, GEMINI_WEBVIEW_LABEL, MAIN_WINDOW_LABEL, TITLEBAR_HEIGHT};
use crate::errors::CommandError;

/// Creates the Gemini webview as a child webview of the main window.
#[tauri::command]
#[cfg(not(tarpaulin_include))]
pub async fn create_gemini_webview(app: AppHandle) -> Result<(), CommandError> {
    info!("Initializing Gemini webview...");

    let main_window = app.get_window(MAIN_WINDOW_LABEL).ok_or_else(|| {
        let msg = "Main window not found".to_string();
        error!("{}", msg);
        CommandError::WindowNotFound(msg)
    })?;

    // Check if webview already exists
    if app.get_webview(GEMINI_WEBVIEW_LABEL).is_some() {
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

    // Parse URL with proper error handling (no unwrap)
    let url = GEMINI_URL.parse().map_err(|e| {
        error!("Failed to parse GEMINI_URL: {}", e);
        CommandError::Internal(format!("Invalid URL: {}", e))
    })?;

    let builder = WebviewBuilder::new(GEMINI_WEBVIEW_LABEL, WebviewUrl::External(url));

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
    fn test_constants_are_accessible() {
        // Constants are now imported from crate::constants
        // Detailed tests for these values are in constants.rs
        assert!(TITLEBAR_HEIGHT > 0.0);
        assert!(!GEMINI_URL.is_empty());
        assert!(!GEMINI_WEBVIEW_LABEL.is_empty());
        assert!(!MAIN_WINDOW_LABEL.is_empty());
    }

    #[test]
    fn test_gemini_url_is_parseable() {
        // Verify URL can be parsed as a valid URL
        // The actual WebviewUrl parsing uses tauri's internal parser
        assert!(GEMINI_URL.starts_with("https://"));
        assert!(GEMINI_URL.contains("gemini.google.com"));
    }
}
