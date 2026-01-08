# Change: Add Response Notifications

## Why

Users often switch away from the app while waiting for Gemini to generate a response. Currently there's no way to know when the response is ready without checking back. This feature notifies users when:

- The app window is not focused
- Gemini finishes generating a response

This improves multitasking by allowing users to work in other applications and only return to Gemini when the response is ready.

## What Changes

- Add **"Enable Response Notifications"** toggle in Options window Settings tab (enabled by default)
- Add new `NotificationManager` in main process using Electron's `Notification` API
- Track window focus state to determine when to show notifications
- Show **native OS notification** when response completes and app is unfocused
- Show **taskbar badge** (Windows/macOS) when response completes and app is unfocused
- Badge persists until the window regains focus
- Clicking notification focuses the main window
- Response detection via network request monitoring (most robust approach)

## Response Detection Strategy

**Chosen Approach: Network Request Interception**

The most robust method is monitoring Gemini's streaming API responses using Electron's `webRequest` API:

1. Monitor requests to `gemini.google.com/*/BardChatUi/*` (or similar streaming endpoints)
2. Detect when the streaming response chunk contains the "done" signal
3. Fire an internal event to trigger notification logic

This is more reliable than DOM mutation observation because:

- Framework-agnostic (works regardless of UI changes)
- Network events are atomic and unambiguous
- Already proven pattern in the codebase (header stripping uses `webRequest`)
- Avoids fragile CSS selectors that could break with UI updates

## Impact

- Affected specs: None (new capability)
- Affected code:
    - `src/main/managers/notificationManager.ts` - **NEW** manager for OS notifications and badge state
    - `src/main/managers/ipc/ResponseNotificationIpcHandler.ts` - **NEW** IPC handler for settings
    - `src/main/store.ts` - Add notification settings
    - `src/shared/constants/ipc-channels.ts` - Add notification channels
    - `src/shared/types/notifications.ts` - **NEW** types for notification settings
    - `src/shared/types/ipc.ts` - Extend `ElectronAPI` interface
    - `src/preload/preload.ts` - Expose notification APIs
    - `src/main/managers/ipc/index.ts` - Export new handler
    - `src/main/managers/ipcManager.ts` - Add handler
    - `src/renderer/components/options/NotificationSettings.tsx` - **NEW** settings component
    - `src/renderer/components/options/OptionsWindow.tsx` - Add settings section
    - `src/main/windows/mainWindow.ts` - Add focus tracking + response detection
    - `src/main/managers/badgeManager.ts` - Extend for response notification badges
    - `src/main/main.ts` - Wire up NotificationManager

## Platform Support

| Platform | OS Notification             | Taskbar Badge        | Notes                              |
| -------- | --------------------------- | -------------------- | ---------------------------------- |
| Windows  | ✅ Toast via `Notification` | ✅ Green dot overlay | Uses existing BadgeManager pattern |
| macOS    | ✅ Native notification      | ✅ Dock badge text   | Uses existing BadgeManager pattern |
| Linux    | ✅ libnotify (GNOME/KDE)    | ⚠️ No native API     | Notification works, badge skipped  |
