# Text Prediction Capability

## ADDED Requirements

### Requirement: Text Prediction Settings

The application SHALL provide user-configurable text prediction settings in the Options window.

#### Scenario: Enable text prediction

- **GIVEN** the user opens Options → Settings tab
- **WHEN** the user toggles "Enable Text Prediction" ON
- **AND** the model has not been downloaded
- **THEN** the system SHALL begin downloading the model
- **AND** display download progress percentage

#### Scenario: Disable text prediction

- **GIVEN** text prediction is enabled
- **WHEN** the user toggles "Enable Text Prediction" OFF
- **THEN** the system SHALL unload the model from memory
- **AND** predictions SHALL no longer appear in Quick Chat

#### Scenario: Enable GPU acceleration

- **GIVEN** text prediction is enabled
- **WHEN** the user toggles "Use GPU Acceleration" ON
- **THEN** the system SHALL use GPU for inference if available
- **AND** fall back to CPU if GPU is unavailable

---

### Requirement: Model Download and Management

The application SHALL download and manage the LLM model for text prediction.

#### Scenario: Successful model download

- **GIVEN** text prediction is enabled
- **AND** the model is not downloaded
- **WHEN** download completes successfully
- **THEN** the system SHALL validate model integrity via checksum
- **AND** display "Ready" status in Options

#### Scenario: Download failure

- **GIVEN** text prediction is enabled
- **AND** download fails (network error, disk full, etc.)
- **THEN** the system SHALL display "Error" status with message
- **AND** allow the user to retry download

#### Scenario: Model storage location

- **GIVEN** a model is downloaded
- **THEN** the model file SHALL be stored in `userData/models/` directory
- **AND** persist across application updates

---

### Requirement: Quick Chat Text Prediction

The application SHALL provide text predictions while typing in Quick Chat.

#### Scenario: Ghost text appears

- **GIVEN** text prediction is enabled and model is ready
- **AND** the user is typing in Quick Chat
- **WHEN** the user pauses typing for 300ms
- **THEN** the system SHALL display a prediction as ghost text after the cursor

#### Scenario: Accept prediction with Tab

- **GIVEN** a ghost text prediction is visible
- **WHEN** the user presses the Tab key
- **THEN** the prediction text SHALL be inserted into the input
- **AND** the ghost text SHALL disappear

#### Scenario: Dismiss prediction by typing

- **GIVEN** a ghost text prediction is visible
- **WHEN** the user continues typing
- **THEN** the ghost text SHALL disappear
- **AND** a new prediction request SHALL be triggered after 300ms

#### Scenario: No prediction when disabled

- **GIVEN** text prediction is disabled
- **WHEN** the user types in Quick Chat
- **THEN** no ghost text predictions SHALL appear

---

### Requirement: IPC API for Text Prediction

The application SHALL expose IPC APIs for text prediction functionality.

#### Scenario: Get prediction for text

- **GIVEN** the model is loaded
- **WHEN** renderer calls `predictText(partialText)`
- **THEN** main process SHALL return a prediction string or null

#### Scenario: Get prediction status

- **WHEN** renderer calls `getTextPredictionStatus()`
- **THEN** main process SHALL return current status including enabled state, GPU enabled, and model status

#### Scenario: Status change notification

- **GIVEN** renderer has subscribed to `onTextPredictionStatusChanged`
- **WHEN** model status changes (downloading, ready, error)
- **THEN** renderer SHALL receive a status update event
