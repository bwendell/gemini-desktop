# Toast System Specification

## ADDED Requirements

### Requirement: Generic Toast Component

The system SHALL provide a generic Toast component that supports multiple notification types (success, error, info, warning, progress) with consistent styling and animations.

#### Scenario: Display success toast

- **GIVEN** a component calls `showToast({ type: 'success', title: 'Success', message: 'Operation completed' })`
- **WHEN** the toast is displayed
- **THEN** a toast with green accent appears in the bottom-left corner with the specified title and message
- **AND** the toast auto-dismisses after the default duration (5 seconds)

#### Scenario: Display error toast

- **GIVEN** a component calls `showToast({ type: 'error', title: 'Error', message: 'Something went wrong' })`
- **WHEN** the toast is displayed
- **THEN** a toast with red accent appears with the specified content
- **AND** the toast includes a dismiss button

#### Scenario: Display info toast

- **GIVEN** a component calls `showToast({ type: 'info', title: 'Tip', message: 'Press Ctrl+K for quick search' })`
- **WHEN** the toast is displayed
- **THEN** a toast with blue/accent color appears with the specified content

#### Scenario: Display warning toast

- **GIVEN** a component calls `showToast({ type: 'warning', title: 'Warning', message: 'Session expiring soon' })`
- **WHEN** the toast is displayed
- **THEN** a toast with yellow/orange accent appears with the specified content

#### Scenario: Display progress toast

- **GIVEN** a component calls `showToast({ type: 'progress', title: 'Downloading', message: 'Please wait...', progress: 50 })`
- **WHEN** the toast is displayed
- **THEN** a toast with a progress bar at 50% appears
- **AND** the progress bar updates when progress value changes

---

### Requirement: Toast Context API

The system SHALL provide a React context and hook (`useToast`) for displaying toasts from any component in the application.

#### Scenario: Show toast from nested component

- **GIVEN** a component nested deep in the component tree uses `useToast()`
- **WHEN** it calls `showToast({ type: 'info', message: 'Hello' })`
- **THEN** the toast appears at the root level above all content
- **AND** other toasts can be queued simultaneously

#### Scenario: Dismiss toast programmatically

- **GIVEN** a toast is currently visible
- **WHEN** a component calls `dismissToast(toastId)`
- **THEN** the toast animates out and is removed from the stack

#### Scenario: Custom toast duration

- **GIVEN** a component calls `showToast({ type: 'info', message: 'Quick tip', duration: 2000 })`
- **WHEN** the toast is displayed
- **THEN** the toast auto-dismisses after 2 seconds

#### Scenario: Persistent toast (no auto-dismiss)

- **GIVEN** a component calls `showToast({ type: 'error', message: 'Critical error', persistent: true })`
- **WHEN** the toast is displayed
- **THEN** the toast remains visible until manually dismissed

---

### Requirement: Toast Container

The system SHALL provide a ToastContainer component that manages the positioning and stacking of multiple toasts.

#### Scenario: Multiple toasts displayed

- **GIVEN** multiple toasts are triggered in sequence
- **WHEN** they are displayed
- **THEN** toasts stack vertically in the bottom-left corner
- **AND** newer toasts appear above older toasts
- **AND** each toast can be dismissed independently

#### Scenario: Toast animations

- **GIVEN** a toast is triggered
- **WHEN** it appears
- **THEN** it slides in from the left with a spring animation
- **AND** when dismissed, it slides out to the left with a fade

---

### Requirement: Update Toast Integration

The system SHALL maintain backward compatibility with the existing update notification flow by providing an UpdateToast wrapper that uses the generic toast system.

#### Scenario: Update available notification

- **GIVEN** the main process emits an update-available event
- **WHEN** the renderer receives the event
- **THEN** an info toast appears with the update version
- **AND** the toast shows "Downloading..." message

#### Scenario: Update downloaded notification

- **GIVEN** an update has been downloaded
- **WHEN** the update-downloaded event is received
- **THEN** a success toast appears with "Restart Now" and "Later" buttons
- **AND** the `hasPendingUpdate` flag is set to true

#### Scenario: Update error notification

- **GIVEN** an update check fails
- **WHEN** the update-error event is received
- **THEN** an error toast appears with the error message

---

### Requirement: Toast Accessibility

The system SHALL ensure all toasts are accessible to screen readers and keyboard users.

#### Scenario: Screen reader announcement

- **GIVEN** a toast appears
- **WHEN** it is rendered
- **THEN** it has `role="alert"` and `aria-live="polite"` attributes
- **AND** the content is announced to screen readers

#### Scenario: Keyboard dismiss

- **GIVEN** a toast is visible with a dismiss button
- **WHEN** the user focuses the dismiss button and presses Enter
- **THEN** the toast is dismissed

#### Scenario: Focus management

- **GIVEN** a toast with action buttons appears
- **WHEN** the user presses Tab
- **THEN** focus moves to the first action button
- **AND** subsequent Tab presses cycle through toast buttons
