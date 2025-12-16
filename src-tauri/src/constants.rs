//! Shared constants for the Gemini Desktop application.
//!
//! This module contains constants that are shared across the codebase
//! to prevent duplication and ensure consistency.

/// Height of the custom titlebar in pixels (logical).
///
/// This is used for:
/// - Calculating webview bounds (offsetting below titlebar)
/// - Resize event handlers to reposition the webview
pub const TITLEBAR_HEIGHT: f64 = 32.0;

/// URL for the Gemini AI service.
pub const GEMINI_URL: &str = "https://gemini.google.com";

/// Label for the main application window.
pub const MAIN_WINDOW_LABEL: &str = "main";

/// Label for the embedded Gemini webview.
pub const GEMINI_WEBVIEW_LABEL: &str = "gemini-webview";

// --- Options Window Constants ---

/// Label for the options window.
/// Used to identify the window for focus/close operations.
pub const OPTIONS_WINDOW_LABEL: &str = "options";

/// Title displayed in the options window titlebar.
pub const OPTIONS_WINDOW_TITLE: &str = "Options";

/// Default width of the options window in logical pixels.
pub const OPTIONS_WINDOW_WIDTH: f64 = 600.0;

/// Default height of the options window in logical pixels.
pub const OPTIONS_WINDOW_HEIGHT: f64 = 500.0;

/// Minimum width of the options window in logical pixels.
pub const OPTIONS_WINDOW_MIN_WIDTH: f64 = 400.0;

/// Minimum height of the options window in logical pixels.
pub const OPTIONS_WINDOW_MIN_HEIGHT: f64 = 300.0;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_titlebar_height_is_positive() {
        assert!(TITLEBAR_HEIGHT > 0.0);
        assert_eq!(TITLEBAR_HEIGHT, 32.0);
    }

    #[test]
    fn test_gemini_url_is_valid_https() {
        assert!(GEMINI_URL.starts_with("https://"));
        assert!(GEMINI_URL.contains("gemini.google.com"));
    }

    #[test]
    fn test_window_labels_are_non_empty() {
        assert!(!MAIN_WINDOW_LABEL.is_empty());
        assert!(!GEMINI_WEBVIEW_LABEL.is_empty());
    }

    #[test]
    fn test_options_window_label_is_valid() {
        assert!(!OPTIONS_WINDOW_LABEL.is_empty());
        // Label should be lowercase for consistency
        assert_eq!(OPTIONS_WINDOW_LABEL, OPTIONS_WINDOW_LABEL.to_lowercase());
    }

    #[test]
    fn test_options_window_title_is_valid() {
        assert!(!OPTIONS_WINDOW_TITLE.is_empty());
    }

    #[test]
    fn test_options_window_dimensions_are_valid() {
        // Default dimensions should be positive
        assert!(OPTIONS_WINDOW_WIDTH > 0.0);
        assert!(OPTIONS_WINDOW_HEIGHT > 0.0);
        // Minimum dimensions should be positive and <= defaults
        assert!(OPTIONS_WINDOW_MIN_WIDTH > 0.0);
        assert!(OPTIONS_WINDOW_MIN_HEIGHT > 0.0);
        assert!(OPTIONS_WINDOW_MIN_WIDTH <= OPTIONS_WINDOW_WIDTH);
        assert!(OPTIONS_WINDOW_MIN_HEIGHT <= OPTIONS_WINDOW_HEIGHT);
    }
}
