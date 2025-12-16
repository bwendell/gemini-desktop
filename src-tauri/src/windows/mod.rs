//! Window management module.
//!
//! This module provides modular window creation and management for
//! secondary windows (options, settings, etc.). Each window type
//! has its own submodule with dedicated creation logic.
//!
//! # Architecture
//! - Each window type is defined in its own submodule
//! - Commands are re-exported for easy registration in `lib.rs`
//! - Uses shared utilities and error handling from parent modules

pub mod options;

// Re-export window commands for easy registration in lib.rs
pub use options::create_options_window;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_options_command_is_exported() {
        // Verify the command is accessible via re-export
        let _ = create_options_window;
    }
}
