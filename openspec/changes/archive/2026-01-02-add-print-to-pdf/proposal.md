# Change: Add Print to PDF Feature

## Why

Users need the ability to export their Gemini chat conversations to PDF for archival, sharing, or offline reference. Currently there is no way to save or print chat content from the application.

## What Changes

- Add "Print to PDF" entry to the File menu
- Add configurable global hotkey for Print to PDF (default: `Ctrl+Shift+P`)
- Add enable/disable toggle and hotkey customization in Options window
- Implement PDF generation using Electron's `webContents.printToPDF()` API
- **Capture entire conversation** by scrolling to capture full content, not just visible viewport
- **Always show save dialog** for user to choose destination
- **Default filename**: `gemini-chat-YYYY-MM-DD.pdf` with numeric suffix if file exists (e.g., `-1`, `-2`)
- Add IPC channels for print-to-pdf communication
- **Cross-platform support**: Must work on Windows, macOS, and Linux

## Impact

- Affected specs: None (new capability)
- Affected code:
  - `src/main/managers/menuManager.ts` - Add File menu item
  - `src/main/managers/hotkeyManager.ts` - Add new hotkey
  - `src/shared/types/hotkeys.ts` - Add `printToPdf` to `HotkeyId`
  - `src/shared/constants/ipc-channels.ts` - Add print-to-pdf channels
  - `src/renderer/components/options/IndividualHotkeyToggles.tsx` - Add toggle config
  - `src/main/managers/` - New PrintManager or extension to existing manager
  - `src/preload/preload.ts` - Expose print API to renderer
  - E2E tests for the new feature
  - Integration tests for the new feature
