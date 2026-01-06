# Zoom Control

Provides zoom level control for the main window's Gemini content.

## ADDED Requirements

### Requirement: Zoom Level Range

The system SHALL support zoom levels between 50% and 200% inclusive.

#### Scenario: Minimum zoom level enforced

- **WHEN** user attempts to zoom out below 50%
- **THEN** the zoom level remains at 50%

#### Scenario: Maximum zoom level enforced

- **WHEN** user attempts to zoom in above 200%
- **THEN** the zoom level remains at 200%

---

### Requirement: Zoom Level Steps

The system SHALL use standard Chrome/Firefox zoom level steps: 50%, 67%, 75%, 80%, 90%, 100%, 110%, 125%, 150%, 175%, 200%.

#### Scenario: Zoom in from 100%

- **WHEN** user zooms in from 100%
- **THEN** the zoom level changes to 110%

#### Scenario: Zoom out from 100%

- **WHEN** user zooms out from 100%
- **THEN** the zoom level changes to 90%

---

### Requirement: Keyboard Shortcuts

The system SHALL provide Ctrl+Plus (Ctrl+=) for zoom in and Ctrl+Minus for zoom out as application hotkeys.

#### Scenario: Zoom in via keyboard

- **WHEN** user presses Ctrl+Plus with main window focused
- **THEN** the zoom level increases by one step

#### Scenario: Zoom out via keyboard

- **WHEN** user presses Ctrl+Minus with main window focused
- **THEN** the zoom level decreases by one step

#### Scenario: Shortcuts only work when focused

- **WHEN** user presses Ctrl+Plus with application not focused
- **THEN** no zoom change occurs (shortcuts are application-scoped, not global)

---

### Requirement: View Menu Integration

The system SHALL display "Zoom In" and "Zoom Out" menu items in the View menu with accelerator labels and the current zoom percentage.

#### Scenario: Menu shows current zoom level

- **WHEN** user opens the View menu at 125% zoom
- **THEN** the menu displays "Zoom In (125%)" and "Zoom Out (125%)" with accelerator labels

#### Scenario: Menu item triggers zoom

- **WHEN** user clicks "Zoom In" menu item
- **THEN** the zoom level increases by one step

---

### Requirement: Zoom Level Persistence

The system SHALL persist the zoom level across application restarts.

#### Scenario: Zoom level restored on restart

- **GIVEN** user has set zoom level to 150%
- **WHEN** user restarts the application
- **THEN** the main window opens at 150% zoom

#### Scenario: Default zoom level

- **GIVEN** no zoom level has been set previously
- **WHEN** user opens the application for the first time
- **THEN** the main window opens at 100% zoom

---

### Requirement: Main Window Only

The system SHALL apply zoom control only to the main window's Gemini content. Options and Quick Chat windows SHALL NOT be affected by zoom settings.

#### Scenario: Options window unaffected

- **WHEN** user changes zoom level in main window
- **THEN** the Options window remains at default zoom

#### Scenario: Quick Chat unaffected

- **WHEN** user changes zoom level in main window
- **THEN** the Quick Chat window remains at default zoom

---

### Requirement: Invalid Stored Zoom Level Handling

The system SHALL gracefully handle invalid zoom levels stored in settings by falling back to 100% zoom.

#### Scenario: Corrupted zoom value in settings

- **GIVEN** the stored zoom level is NaN, null, or undefined
- **WHEN** the application starts
- **THEN** the main window opens at 100% zoom and the stored value is corrected

#### Scenario: Out-of-range zoom value in settings

- **GIVEN** the stored zoom level is 25% (below minimum) or 300% (above maximum)
- **WHEN** the application starts
- **THEN** the zoom level is clamped to the nearest valid value (50% or 200%)

#### Scenario: Non-standard zoom step in settings

- **GIVEN** the stored zoom level is 112% (not in the step array)
- **WHEN** user zooms in
- **THEN** the zoom level snaps to the next higher step (125%)

---

### Requirement: Missing Window Handling

The system SHALL safely handle zoom operations when the main window is unavailable.

#### Scenario: Zoom requested with no main window

- **WHEN** zoom in/out is triggered but main window does not exist
- **THEN** the operation is silently ignored (no error thrown)

#### Scenario: Zoom requested with destroyed window

- **WHEN** zoom is triggered after main window is closed but before app quits
- **THEN** the operation is silently ignored

---

### Requirement: Zoom Persistence Failure Handling

The system SHALL continue functioning if zoom level persistence fails.

#### Scenario: Store write failure

- **WHEN** saving zoom level to store fails
- **THEN** the zoom change is still applied to the current session
- **AND** an error is logged but no user-facing error is shown
