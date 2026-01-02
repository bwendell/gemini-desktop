# print-to-pdf Specification

## Purpose
TBD - created by archiving change add-pdf-export-toast. Update Purpose after archive.
## Requirements
### Requirement: PDF Export Success Toast

When a PDF export completes successfully, the system SHALL display a success toast notification showing the saved file location with an option to reveal the file in the system file explorer.

#### Scenario: Display success toast after PDF export

- **GIVEN** the user triggers the print-to-PDF feature
- **AND** the user selects a save location and confirms
- **WHEN** the PDF file is successfully saved
- **THEN** a success toast appears with the message "Successfully exported chat to {filePath}"
- **AND** the toast includes a "Show in Folder" action button

#### Scenario: Reveal file in folder

- **GIVEN** a PDF export success toast is displayed
- **WHEN** the user clicks the "Show in Folder" action button
- **THEN** the system file explorer opens with the exported PDF file selected

---

### Requirement: PDF Export Error Toast

When a PDF export fails, the system SHALL display an error toast notification with the error message.

#### Scenario: Display error toast on PDF export failure

- **GIVEN** the user triggers the print-to-PDF feature
- **WHEN** the PDF generation or save operation fails
- **THEN** an error toast appears with the error message
- **AND** the toast remains visible until manually dismissed

---

### Requirement: Reveal in Folder API

The system SHALL provide a cross-platform API for revealing files in the system's native file explorer.

#### Scenario: Reveal file on Windows

- **GIVEN** the application is running on Windows
- **WHEN** `revealInFolder(path)` is called with a valid file path
- **THEN** Windows Explorer opens with the file selected

#### Scenario: Reveal file on macOS

- **GIVEN** the application is running on macOS
- **WHEN** `revealInFolder(path)` is called with a valid file path
- **THEN** Finder opens with the file selected

#### Scenario: Reveal file on Linux

- **GIVEN** the application is running on Linux
- **WHEN** `revealInFolder(path)` is called with a valid file path
- **THEN** the default file manager opens with the file or its containing folder visible

