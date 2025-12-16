//! Utility functions for webview management.
//!
//! This module contains pure logic functions that can be tested
//! independently of the Tauri runtime.

use tauri::{PhysicalPosition, PhysicalSize, Position, Rect, Size};

/// Calculates the bounds for a webview positioned below a titlebar.
///
/// # Arguments
/// * `window_width` - Width of the parent window in physical pixels
/// * `window_height` - Height of the parent window in physical pixels
/// * `scale_factor` - DPI scale factor of the window
/// * `titlebar_height` - Height of the titlebar in logical pixels
///
/// # Returns
/// A `Rect` representing the position and size of the webview
pub fn calculate_webview_bounds(
    window_width: u32,
    window_height: u32,
    scale_factor: f64,
    titlebar_height: f64,
) -> Rect {
    let titlebar_height_phys = (titlebar_height * scale_factor) as u32;

    let width = window_width;
    let height = if window_height > titlebar_height_phys {
        window_height - titlebar_height_phys
    } else {
        0
    };

    Rect {
        position: Position::Physical(PhysicalPosition {
            x: 0,
            y: titlebar_height_phys as i32,
        }),
        size: Size::Physical(PhysicalSize { width, height }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_webview_bounds_normal() {
        let bounds = calculate_webview_bounds(1920, 1080, 1.0, 32.0);

        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 1920,
                height: 1048
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 32 })
        );
    }

    #[test]
    fn test_calculate_webview_bounds_with_scale_factor() {
        let bounds = calculate_webview_bounds(3840, 2160, 2.0, 32.0);

        // titlebar_height_phys = 32.0 * 2.0 = 64
        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 3840,
                height: 2096
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 64 })
        );
    }

    #[test]
    fn test_calculate_webview_bounds_small_window() {
        let bounds = calculate_webview_bounds(800, 600, 1.0, 32.0);

        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 800,
                height: 568
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 32 })
        );
    }

    #[test]
    fn test_calculate_webview_bounds_tiny_window() {
        // Window smaller than titlebar
        let bounds = calculate_webview_bounds(100, 20, 1.0, 32.0);

        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 100,
                height: 0
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 32 })
        );
    }

    #[test]
    fn test_calculate_webview_bounds_exact_titlebar_height() {
        // Window height exactly equals titlebar height
        let bounds = calculate_webview_bounds(800, 32, 1.0, 32.0);

        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 800,
                height: 0
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 32 })
        );
    }

    #[test]
    fn test_calculate_webview_bounds_fractional_scale() {
        let bounds = calculate_webview_bounds(1440, 900, 1.5, 32.0);

        // titlebar_height_phys = 32.0 * 1.5 = 48
        assert_eq!(
            bounds.size,
            Size::Physical(PhysicalSize {
                width: 1440,
                height: 852
            })
        );
        assert_eq!(
            bounds.position,
            Position::Physical(PhysicalPosition { x: 0, y: 48 })
        );
    }
}
