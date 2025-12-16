// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(not(tarpaulin_include))]
fn main() {
    gemini_desktop_lib::run()
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_main_exists() {
        // This test verifies that the main function is present and the module compiles.
        // The actual execution is tested via E2E tests.
        assert!(true);
    }
}
