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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_not_found_error() {
        let error = CommandError::WindowNotFound("test window".to_string());
        assert_eq!(error.to_string(), "Failed to acquire window: test window");
    }

    #[test]
    fn test_internal_error() {
        let error = CommandError::Internal("something went wrong".to_string());
        assert_eq!(error.to_string(), "Internal error: something went wrong");
    }

    #[test]
    fn test_tauri_error_conversion() {
        // Create a simple Tauri error
        let tauri_error = tauri::Error::WindowLabelAlreadyExists("test".to_string());
        let cmd_error: CommandError = tauri_error.into();

        assert!(cmd_error.to_string().contains("Tauri error"));
    }

    #[test]
    fn test_serialization_error_conversion() {
        let json_str = "{invalid json}";
        let parse_result: Result<serde_json::Value, _> = serde_json::from_str(json_str);

        if let Err(e) = parse_result {
            let cmd_error: CommandError = e.into();
            assert!(cmd_error.to_string().contains("Serialization error"));
        }
    }

    #[test]
    fn test_serialize_window_not_found() {
        let error = CommandError::WindowNotFound("main".to_string());
        let serialized = serde_json::to_string(&error).unwrap();

        assert_eq!(serialized, "\"Failed to acquire window: main\"");
    }

    #[test]
    fn test_serialize_internal() {
        let error = CommandError::Internal("test".to_string());
        let serialized = serde_json::to_string(&error).unwrap();

        assert_eq!(serialized, "\"Internal error: test\"");
    }
}
