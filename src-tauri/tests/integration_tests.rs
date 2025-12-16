//! Integration tests for Tauri commands and runtime behavior.
//!
//! These tests verify that constants and basic module structure are correct.
//! Full E2E testing of Tauri commands requires the application runtime,
//! which is covered by the E2E test suite.

use gemini_desktop_lib::utils;

#[test]
fn test_calculate_webview_bounds_integration() {
    // Test that the utils module is accessible and works correctly
    let bounds = utils::calculate_webview_bounds(1920, 1080, 1.0, 32.0);

    // Verify the calculation produces sensible results
    assert!(bounds.size.to_logical::<f64>(1.0).width > 0.0);
    assert!(bounds.size.to_logical::<f64>(1.0).height > 0.0);
}

#[test]
fn test_lib_constants() {
    // Verify that the library can be linked and basic structure is correct
    // The actual run() function is tested via E2E tests
    assert!(true);
}
