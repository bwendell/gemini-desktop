//! Tauri command modules.
//!
//! This module exports all Tauri commands used by the frontend
//! to interact with the Rust backend.

pub mod webview;

// Re-export commands for easy registration
pub use webview::create_gemini_webview;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_exports() {
        // Verify that the command is accessible via re-export
        // This tests the module structure and exports
        let _fn_ptr = create_gemini_webview;
    }
}
