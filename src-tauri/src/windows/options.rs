//! Options window management.
//!
//! This module handles the creation and management of the Options window.
//! The options window provides application settings and configuration.
//!
//! # Cross-Platform Behavior
//! - **macOS**: Uses native window decorations with traffic light controls
//! - **Windows/Linux**: Uses custom titlebar with minimize, maximize, close buttons
//!
//! # Error Handling
//! All operations log detailed error information and return user-friendly errors.

use log::{error, info, warn};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::constants::{
    OPTIONS_WINDOW_HEIGHT, OPTIONS_WINDOW_LABEL, OPTIONS_WINDOW_MIN_HEIGHT,
    OPTIONS_WINDOW_MIN_WIDTH, OPTIONS_WINDOW_TITLE, OPTIONS_WINDOW_WIDTH,
};
use crate::errors::CommandError;

/// Creates or focuses the Options window.
///
/// If the options window already exists, it will be focused.
/// Otherwise, a new window is created with the appropriate settings
/// for the current platform.
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Ok(())` - Window was created or focused successfully
/// * `Err(CommandError)` - Window creation failed
///
/// # Example
/// ```ignore
/// // Called from frontend via invoke
/// invoke('create_options_window');
/// ```
#[tauri::command]
#[cfg(not(tarpaulin_include))]
pub async fn create_options_window(app: AppHandle) -> Result<(), CommandError> {
    info!("Opening options window...");

    // Check if the options window already exists
    if let Some(existing_window) = app.get_webview_window(OPTIONS_WINDOW_LABEL) {
        info!("Options window already exists, focusing...");

        // Try to unminimize if minimized
        if let Err(e) = existing_window.unminimize() {
            warn!("Failed to unminimize options window: {}", e);
        }

        // Focus the existing window
        existing_window.set_focus().map_err(|e| {
            error!("Failed to focus existing options window: {}", e);
            CommandError::TauriError(e)
        })?;

        return Ok(());
    }

    // Create the options window URL
    // Uses the options.html entry point which renders the OptionsWindow component
    let url = WebviewUrl::App("options.html".into());

    // Build the options window with appropriate settings
    let window_builder = WebviewWindowBuilder::new(&app, OPTIONS_WINDOW_LABEL, url)
        .title(OPTIONS_WINDOW_TITLE)
        .inner_size(OPTIONS_WINDOW_WIDTH, OPTIONS_WINDOW_HEIGHT)
        .min_inner_size(OPTIONS_WINDOW_MIN_WIDTH, OPTIONS_WINDOW_MIN_HEIGHT)
        .resizable(true)
        .center()
        // Disable decorations on Windows/Linux for custom titlebar
        // macOS uses native decorations with titleBarStyle overlay
        .decorations(cfg!(target_os = "macos"));

    // Platform-specific window configuration
    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    // Build and show the window
    let window = window_builder.build().map_err(|e| {
        error!(
            "Failed to create options window: {} (label: {}, url: options.html)",
            e, OPTIONS_WINDOW_LABEL
        );
        CommandError::TauriError(e)
    })?;

    // Focus the new window
    window.set_focus().map_err(|e| {
        error!(
            "Options window created but failed to focus: {} (label: {})",
            e, OPTIONS_WINDOW_LABEL
        );
        CommandError::TauriError(e)
    })?;

    info!(
        "Options window created successfully (label: {}, dimensions: {}x{})",
        OPTIONS_WINDOW_LABEL, OPTIONS_WINDOW_WIDTH, OPTIONS_WINDOW_HEIGHT
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constants_are_accessible() {
        // Verify window constants are properly imported and valid
        assert!(!OPTIONS_WINDOW_LABEL.is_empty());
        assert!(!OPTIONS_WINDOW_TITLE.is_empty());
        assert!(OPTIONS_WINDOW_WIDTH > 0.0);
        assert!(OPTIONS_WINDOW_HEIGHT > 0.0);
        assert!(OPTIONS_WINDOW_MIN_WIDTH > 0.0);
        assert!(OPTIONS_WINDOW_MIN_HEIGHT > 0.0);
    }

    #[test]
    fn test_minimum_dimensions_are_smaller_than_default() {
        // Ensure minimum dimensions make sense relative to defaults
        assert!(OPTIONS_WINDOW_MIN_WIDTH <= OPTIONS_WINDOW_WIDTH);
        assert!(OPTIONS_WINDOW_MIN_HEIGHT <= OPTIONS_WINDOW_HEIGHT);
    }
}
