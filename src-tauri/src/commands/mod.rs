//! Tauri command modules.
//!
//! This module exports all Tauri commands used by the frontend
//! to interact with the Rust backend.

pub mod webview;

// Re-export commands for easy registration
pub use webview::create_gemini_webview;
