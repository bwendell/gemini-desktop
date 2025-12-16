use thiserror::Error;

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("Failed to acquire window: {0}")]
    WindowNotFound(String),
    #[error("Tauri error: {0}")]
    TauriError(#[from] tauri::Error),
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),
    #[error("Internal error: {0}")]
    Internal(String),
}

// Implement Serialize so we can return it to frontend
impl serde::Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
