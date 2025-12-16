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
}
