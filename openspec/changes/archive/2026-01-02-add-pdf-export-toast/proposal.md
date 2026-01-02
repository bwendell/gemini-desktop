# Change: Add PDF Export Toast Notification

## Why

When users export a chat to PDF, they currently receive no visual feedback about where the file was saved. Users should see a success toast notification with the save location that is clickable to open the file in their system's file explorer.

## What Changes

- Add a success toast notification when PDF export completes successfully
- The toast message displays the full file path (e.g., "Successfully exported chat to C:\Users\...\gemini-chat.pdf")
- The toast includes an action button to reveal the file in the system's file explorer
- Add new IPC channel and handler for `shell:show-item-in-folder` to support cross-platform "reveal in folder" functionality
- Add error toast notification when PDF export fails

## Impact

- Affected specs: `print-to-pdf`, `toast-system`
- Affected code:
  - `src/main/managers/ipcManager.ts` - Add IPC handler for reveal in folder
  - `src/renderer/App.tsx` - Add listener for print-to-pdf success/error events and show toast
  - `src/shared/constants/ipc-channels.ts` - Add new IPC channel constant
  - `src/preload/preload.ts` - Expose reveal-in-folder API to renderer
  - `src/shared/types/ipc.ts` - Add type for the new API
