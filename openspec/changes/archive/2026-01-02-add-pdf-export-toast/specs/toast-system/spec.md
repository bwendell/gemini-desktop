## ADDED Requirements

### Requirement: Toast with Action Buttons for File Operations

The toast system SHALL support action buttons that can trigger IPC calls, specifically for file-related operations like revealing files in the system explorer.

#### Scenario: Toast with "Show in Folder" action

- **GIVEN** a toast is displayed with a "Show in Folder" action button
- **WHEN** the user clicks the action button
- **THEN** the action's callback is executed
- **AND** the IPC call to reveal the file in folder is triggered
