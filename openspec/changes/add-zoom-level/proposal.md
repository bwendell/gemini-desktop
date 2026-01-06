# Change: Add Zoom Level Control for Main Window

## Why

Users need the ability to adjust the zoom level of the Gemini content in the main window for accessibility and comfort. Currently, there is no way to zoom in or out of the embedded Gemini page. Standard browser zoom functionality (Ctrl+Plus, Ctrl+Minus) is expected by users but not currently implemented.

## What Changes

- Add zoom in/out functionality to the main window's Gemini iframe content
- Implement standard keyboard shortcuts (Ctrl+Plus, Ctrl+Minus) as application hotkeys
- Add "Zoom In" and "Zoom Out" menu items to the View menu with current zoom level displayed
- Persist zoom level across application restarts via SettingsStore
- Zoom range limited to 50%-200% using Chrome/Firefox default zoom steps

## Impact

- Affected specs: New `zoom-control` capability
- Affected code:
    - `src/main/managers/menuManager.ts` - Add zoom menu items to View menu
    - `src/main/managers/windowManager.ts` - Add zoom control methods
    - `src/main/store.ts` - Add zoom level to persisted settings
    - `src/main/windows/mainWindow.ts` - Apply zoom level on window creation
    - `src/shared/constants/ipc-channels.ts` - Add zoom IPC channels (if needed for renderer awareness)

## Scope Clarifications

- **Main window only**: Zoom applies only to the main window's Gemini iframe, not Options or Quick Chat windows
- **No reset option**: Ctrl+0 reset zoom is not included
- **Fixed hotkeys**: Zoom shortcuts are not customizable (standard Ctrl+/Ctrl- only)
- **No numpad support**: Only main keyboard plus/minus keys
- **Application hotkeys**: Work only when app is focused (not global)
