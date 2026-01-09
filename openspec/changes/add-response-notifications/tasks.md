# Tasks: Add Response Notifications

## 1. Core Infrastructure - NotificationManager & Settings

- [x] 1.1 Add notification settings to `SettingsStore`

    **Files:**
    - [MODIFY] `src/main/store.ts` - Add `responseNotificationsEnabled: true` default

    **Acceptance Criteria:**
    - Setting defaults to `true`
    - Setting persists across app restarts

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 1.2 Create `NotificationManager` class

    **Files:**
    - [NEW] `src/main/managers/notificationManager.ts` - Manager for OS notifications and badge state

    **Context:**
    - Review [badgeManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/badgeManager.ts) for existing manager pattern
    - Review [updateManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/updateManager.ts) for event-based manager pattern

    **Acceptance Criteria:**
    - Export class with constructor accepting `mainWindow`, `badgeManager`, `store`
    - Add logger using `createLogger('[NotificationManager]')`
    - TypeScript compiles, lint passes

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 1.3 Implement window focus state tracking

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add focus tracking

    **Acceptance Criteria:**
    - `isWindowFocused` property tracks main window focus state
    - Subscribe to window `focus` and `blur` events
    - Correctly reports focus state for main window

    **Verification:**

    ```bash
    npm run test -- NotificationManager
    ```

- [x] 1.4 Implement native notification display

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add `showNotification()` method

    **Context:**
    - Use Electron's `Notification` class from main process
    - Check `Notification.isSupported()` before showing

    **Acceptance Criteria:**
    - `showNotification()` creates and shows native notification
    - Notification has title "Gemini" and body "Response ready"
    - Clicking notification focuses the main window
    - Returns early if notifications not supported on platform

    **Verification:**

    ```bash
    npm run test -- NotificationManager
    ```

- [x] 1.5 Extend `BadgeManager` for notification badges

    **Files:**
    - [MODIFY] `src/main/managers/badgeManager.ts` - Add `showNotificationBadge()` and `clearNotificationBadge()` methods

    **Acceptance Criteria:**
    - New methods parallel existing `showUpdateBadge()` / `clearUpdateBadge()`
    - Can coexist with update badges (if both conditions true, badge shows)
    - Tracks separate `hasNotificationBadge` state

    **Verification:**

    ```bash
    npm run test -- BadgeManager
    ```

- [x] 1.6 Implement badge and notification coordination

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Coordinate notification + badge

    **Acceptance Criteria:**
    - `onResponseComplete()` shows notification AND badge when unfocused
    - `onWindowFocus()` clears notification badge
    - Badge persists until window regains focus
    - Respects `responseNotificationsEnabled` setting

    **Verification:**

    ```bash
    npm run test -- NotificationManager
    ```

---

## 2. Response Detection

- [x] 2.1 Implement response detection via network monitoring

    **Files:**
    - [MODIFY] `src/main/windows/mainWindow.ts` - Add response detection logic

    **Context:**
    - Review existing `webRequest` usage for header stripping
    - Monitor Gemini streaming API completion

    **Acceptance Criteria:**
    - Detect when Gemini finishes generating a response
    - Emit `response-complete` event on MainWindow
    - Works reliably for streaming responses
    - Debounce rapid completions (1s cooldown)

    **Verification:**

    ```bash
    npm run test -- mainWindow
    ```

- [x] 2.2 Wire response detection to NotificationManager

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Subscribe to response-complete event
    - [MODIFY] `src/main/main.ts` - Wire up NotificationManager

    **Acceptance Criteria:**
    - NotificationManager receives response-complete events
    - Triggers notification flow when appropriate

    **Verification:**

    ```bash
    npm run test -- NotificationManager
    ```

---

## 3. IPC Layer

- [x] 3.1 Add IPC channels for notification settings

    **Files:**
    - [MODIFY] `src/shared/constants/ipc-channels.ts` - Add `RESPONSE_NOTIFICATIONS_GET_ENABLED`, `RESPONSE_NOTIFICATIONS_SET_ENABLED`

    **Acceptance Criteria:**
    - Channels defined following existing patterns
    - TypeScript compiles

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 3.2 Create notification types

    **Files:**
    - [NEW] `src/shared/types/notifications.ts` - `ResponseNotificationSettings` interface

    **Acceptance Criteria:**
    - Type exported with `enabled: boolean` property
    - Used by IPC handlers

    **Verification:**

    ```bash
    npm run typecheck
    ```

- [x] 3.3 Extend `ElectronAPI` interface

    **Files:**
    - [MODIFY] `src/shared/types/ipc.ts` - Add notification API methods

    **Acceptance Criteria:**
    - `getResponseNotificationsEnabled(): Promise<boolean>`
    - `setResponseNotificationsEnabled(enabled: boolean): Promise<void>`

    **Verification:**

    ```bash
    npm run typecheck
    ```

- [x] 3.4 Create `ResponseNotificationIpcHandler`

    **Files:**
    - [NEW] `src/main/managers/ipc/ResponseNotificationIpcHandler.ts` - IPC handler for notification settings
    - [MODIFY] `src/main/managers/ipc/index.ts` - Export new handler

    **Context:**
    - Review [ThemeIpcHandler.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipc/ThemeIpcHandler.ts) for handler pattern

    **Acceptance Criteria:**
    - Extends `BaseIpcHandler`
    - Handles get/set enabled channels
    - Persists setting to store
    - Notifies NotificationManager of changes

    **Verification:**

    ```bash
    npm run test -- ResponseNotificationIpcHandler
    ```

- [x] 3.5 Integrate handler into `IpcManager`

    **Files:**
    - [MODIFY] `src/main/managers/ipcManager.ts` - Add handler instantiation and registration

    **Acceptance Criteria:**
    - Handler registered with other handlers
    - IPC calls route to handler correctly

    **Verification:**

    ```bash
    npm run test -- ipcManager
    ```

- [x] 3.6 Expose APIs in preload

    **Files:**
    - [MODIFY] `src/preload/preload.ts` - Add notification API methods

    **Acceptance Criteria:**
    - `getResponseNotificationsEnabled` and `setResponseNotificationsEnabled` exposed
    - Renderer can call APIs

    **Verification:**

    ```bash
    npm run typecheck
    ```

---

## 4. Options UI

- [x] 4.1 Create `NotificationSettings` component

    **Files:**
    - [NEW] `src/renderer/components/options/NotificationSettings.tsx` - Settings component
    - [NEW] `src/renderer/components/options/NotificationSettings.css` - Styling

    **Context:**
    - Review [AutoUpdateToggle.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/components/options/AutoUpdateToggle.tsx) for toggle pattern

    **Acceptance Criteria:**
    - Single toggle for "Response Notifications"
    - Calls `setResponseNotificationsEnabled()` on change
    - Reads current state on mount

    **Verification:**

    ```bash
    npm run test -- NotificationSettings
    ```

- [x] 4.2 Add section to `OptionsWindow`

    **Files:**
    - [MODIFY] `src/renderer/components/options/OptionsWindow.tsx` - Add Notifications section
    - [MODIFY] `src/renderer/components/options/index.ts` - Export component

    **Acceptance Criteria:**
    - "Notifications" section visible in Settings tab
    - Toggle functional

    **Verification:**

    ```bash
    npm run electron:dev
    # Manual: Open Options → Settings → Verify "Response Notifications" toggle
    ```

---

## 5. Main Process Integration

- [x] 5.1 Instantiate `NotificationManager` in `main.ts`

    **Files:**
    - [MODIFY] `src/main/main.ts` - Import, instantiate, and wire up NotificationManager

    **Acceptance Criteria:**
    - NotificationManager created after MainWindow and BadgeManager
    - Passed to IpcManager if needed
    - Cleanup on app quit

    **Verification:**

    ```bash
    npm run build && npm run electron:dev
    ```

- [x] 5.2 Expose `notificationManager` for E2E testing

    **Files:**
    - [MODIFY] `src/main/main.ts` - Add to global managers

    **Acceptance Criteria:**
    - Accessible via `global.notificationManager` in tests

    **Verification:**

    ```bash
    npm run typecheck
    ```

- [x] 5.3 Fix `IpcManager` not receiving `NotificationManager` (Temporal Dependency Bug)

    **Problem:**
    In `main.ts`, `IpcManager` is instantiated during `initializeManagers()` at line 181 with `null` for `notificationManager`:

    ```typescript
    ipcManager = new IpcManager(windowManager, hotkeyManager, updateManager, printManager, llmManager, null);
    ```

    However, `NotificationManager` is only created later (after `app.whenReady()` and `createMainWindow()`) because it requires the main window to exist first. This means `ResponseNotificationIpcHandler` never has access to the `NotificationManager`, causing:
    - `getResponseNotificationsEnabled()` to always return `true` (default)
    - `setResponseNotificationsEnabled()` to be a no-op
    - Setting changes not persisting via IPC

    **Root Cause:**
    Temporal dependency: `IpcManager` is created before `NotificationManager` exists.

    **Files:**
    - [MODIFY] `src/main/main.ts` - Add setter to inject NotificationManager into IpcManager after creation
    - [MODIFY] `src/main/managers/ipcManager.ts` - Add `setNotificationManager()` method to update handler dependencies
    - [MODIFY] `src/main/managers/ipc/ResponseNotificationIpcHandler.ts` - Add setter for notificationManager

    **Context:**
    - Review [initializeManagers()](file:///c:/Users/bwend/repos/gemini/src/main/main.ts#L136-207) for manager creation order
    - Review [NotificationManager creation](file:///c:/Users/bwend/repos/gemini/src/main/main.ts#L321-345) after main window

    **Acceptance Criteria:**
    - `IpcManager` has `setNotificationManager(manager: NotificationManager)` method
    - Method updates the `ResponseNotificationIpcHandler` with the manager reference
    - In `main.ts`, after `NotificationManager` is created, call `ipcManager.setNotificationManager(notificationManager)`
    - `ResponseNotificationIpcHandler.getResponseNotificationsEnabled()` returns actual stored value
    - `ResponseNotificationIpcHandler.setResponseNotificationsEnabled()` persists and notifies
    - Logs warning only if setter is called before manager is available

    **Verification:**

    ```bash
    npm run build && npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

---

## 6. Unit Tests

- [x] 6.1 Unit test: `NotificationManager` focus state tracking

    **Files:**
    - [NEW] `tests/unit/main/managers/notificationManager.test.ts`

    **Acceptance Criteria:**
    - `isWindowFocused` updates on focus/blur events
    - Correctly tracks hidden (to tray) state

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 6.2 Unit test: `NotificationManager` shows notification when unfocused

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts`

    **Acceptance Criteria:**
    - Notification created when response-complete fires and window unfocused
    - No notification when window focused
    - No notification when setting disabled

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 6.3 Unit test: `BadgeManager` notification badge methods

    **Files:**
    - [MODIFY] `tests/unit/main/badgeManager.test.ts`

    **Acceptance Criteria:**
    - `showNotificationBadge()` sets badge
    - `clearNotificationBadge()` clears badge
    - Badge state tracked correctly

    **Verification:**

    ```bash
    npm run test -- badgeManager
    ```

- [x] 6.4 Unit test: `ResponseNotificationIpcHandler` get/set

    **Files:**
    - [NEW] `tests/unit/main/ipc/ResponseNotificationIpcHandler.test.ts`

    **Acceptance Criteria:**
    - Get returns stored value
    - Set updates store and broadcasts

    **Verification:**

    ```bash
    npm run test -- ResponseNotificationIpcHandler
    ```

- [x] 6.5 Unit test: `NotificationSettings` component

    **Files:**
    - [NEW] `tests/unit/renderer/NotificationSettings.test.tsx`

    **Acceptance Criteria:**
    - Toggle renders enabled/disabled states
    - Toggle calls API on change

    **Verification:**

    ```bash
    npm run test -- NotificationSettings
    ```

- [x] 6.6 Unit test: `MainWindow` emits response-complete event

    **Files:**
    - [NEW] `tests/unit/main/windows/mainWindow.response-detection.test.ts`

    **Context:**
    - Tests the network monitoring that detects Gemini response completion
    - Uses `session.defaultSession.webRequest.onCompleted` filter

    **Acceptance Criteria:**
    - Event emits when BardChatUi API completes with status 200
    - Event does NOT emit for non-200 status codes
    - Event is debounced (calls within 1s of each other produce only one event)
    - Debounce resets after cooldown period

    **Verification:**

    ```bash
    npm run test -- mainWindow.response-detection
    ```

- [x] 6.7 Unit test: `NotificationManager` notification click focuses window

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts`

    **Context:**
    - Tests the notification.on('click') handler

    **Acceptance Criteria:**
    - Clicking notification calls `mainWindow.show()` and `mainWindow.focus()`
    - Handles minimized window correctly (restore then focus)
    - Handles destroyed window gracefully (no crash)

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 6.8 Unit test: `NotificationManager` respects `Notification.isSupported()`

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts`

    **Context:**
    - Per REQ-NOTIF-004, must handle platforms where notifications aren't supported

    **Acceptance Criteria:**
    - When `Notification.isSupported()` returns false, `showNotification()` returns early
    - No error thrown
    - Logs appropriate message

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 6.9 Unit test: `BadgeManager` notification + update badge coexistence

    **Files:**
    - [MODIFY] `tests/unit/main/badgeManager.test.ts`

    **Context:**
    - Per REQ-NOTIF-002, notification badges must coexist with update badges

    **Acceptance Criteria:**
    - Both badges can be shown simultaneously
    - Clearing notification badge does NOT clear update badge
    - Clearing update badge does NOT clear notification badge
    - Badge only fully clears from UI when BOTH are cleared
    - `hasBadgeShown()` returns true if EITHER badge is active

    **Verification:**

    ```bash
    npm run test -- badgeManager
    ```

- [x] 6.10 Unit test: Cross-platform badge behavior (Windows, macOS, Linux)

    **Files:**
    - [MODIFY] `tests/unit/main/badgeManager.test.ts`

    **Context:**
    - Per REQ-NOTIF-004, must test all platforms
    - Use `describe.each` to parameterize across platforms

    **Acceptance Criteria:**
    - **Windows**: `setOverlayIcon()` called with correct description "Response ready"
    - **macOS**: `app.dock.setBadge()` called with badge text
    - **Linux**: Gracefully logs "not supported", no error thrown
    - All platforms: badge state tracked correctly even if visual not shown

    **Verification:**

    ```bash
    npm run test -- badgeManager
    ```

- [x] 6.11 Unit test: `IpcManager.setNotificationManager()` updates handler

    **Files:**
    - [NEW] `tests/unit/main/managers/ipcManager.setNotificationManager.test.ts`

    **Context:**
    - Tests fix for task 5.3 (temporal dependency bug)
    - Verifies late injection of NotificationManager works

    **Acceptance Criteria:**
    - `setNotificationManager(null)` does not throw
    - `setNotificationManager(mockManager)` updates internal reference
    - After `setNotificationManager()`, IPC handlers return correct values from manager
    - Multiple calls to setter update correctly (idempotent)

    **Verification:**

    ```bash
    npm run test -- ipcManager.setNotificationManager
    ```

---

## 7. Coordinated Tests

- [x] 7.1 Coordinated test: Toggle → setting persisted

    **Files:**
    - [NEW] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Acceptance Criteria:**
    - Toggle ON → store updated
    - Toggle OFF → store updated
    - Setting round-trips through IPC

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.2 Coordinated test: Response complete → notification shown

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Acceptance Criteria:**
    - Emit response-complete event on MainWindow
    - Verify notification created when unfocused
    - Verify badge shown via BadgeManager

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.3 Coordinated test: MainWindow response-complete → NotificationManager wiring

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Context:**
    - Per E2E guidelines, verify full event chain without mocks

    **Acceptance Criteria:**
    - `MainWindow.emit('response-complete')` triggers `NotificationManager.onResponseComplete()`
    - Full event chain verified (real objects, not mocked intermediaries)
    - Integration between MainWindow, NotificationManager, and BadgeManager

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.4 Coordinated test: Window focus → badge cleared (not just notification)

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Context:**
    - Per REQ-NOTIF-002 Scenario 3: badge clears when window is focused

    **Acceptance Criteria:**
    - `NotificationManager.onWindowFocus()` clears notification badge via `BadgeManager.clearNotificationBadge()`
    - Update badge is NOT affected by window focus
    - Badge cleared even if notification was dismissed

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.5 Coordinated test: Setting disabled → neither notification nor badge shown

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Context:**
    - Per REQ-NOTIF-003 Scenario 2

    **Acceptance Criteria:**
    - When `responseNotificationsEnabled=false`, `onResponseComplete()` is a no-op
    - Electron `Notification` constructor NOT called
    - `BadgeManager.showNotificationBadge()` NOT called
    - Window focus state still tracked (for when setting is re-enabled)

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.6 Coordinated test: Cross-platform notification behavior

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Context:**
    - Per REQ-NOTIF-004, coordinated test across platforms
    - Use `describe.each(['darwin', 'win32', 'linux'])` pattern

    **Acceptance Criteria:**
    - **Windows**: Toast notification + taskbar overlay
    - **macOS**: Notification Center + dock badge
    - **Linux (GNOME/KDE)**: libnotify notification + no badge (logged gracefully)
    - All platforms: notification click focuses window

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

- [x] 7.7 Coordinated test: `IpcManager.setNotificationManager()` late wiring

    **Files:**
    - [MODIFY] `tests/coordinated/response-notifications.coordinated.test.ts`

    **Context:**
    - Tests fix for task 5.3 (temporal dependency bug)
    - Verifies IPC setting round-trip works after late injection

    **Acceptance Criteria:**
    - Create `IpcManager` with `null` for notificationManager (simulating startup)
    - Call `ipcManager.setNotificationManager(realManager)` (simulating post-ready injection)
    - Set enabled = false via IPC
    - Get enabled via IPC → returns false (not default true)
    - Verify `NotificationManager.setEnabled()` was called

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications
    ```

---

## 8. Integration Tests

- [x] 8.1 Integration test: IPC `getResponseNotificationsEnabled` returns stored value

    **Files:**
    - [NEW] `tests/integration/response-notifications.integration.test.ts`

    **Acceptance Criteria:**
    - Round-trip through main process returns correct boolean

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

- [x] 8.2 Integration test: IPC `setResponseNotificationsEnabled` updates store

    **Files:**
    - [MODIFY] `tests/integration/response-notifications.integration.test.ts`

    **Acceptance Criteria:**
    - Value persists and can be retrieved

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

- [x] 8.3 Integration test: Options window shows Notifications section

    **Files:**
    - [MODIFY] `tests/integration/response-notifications.integration.test.ts`

    **Acceptance Criteria:**
    - Section visible in Settings tab
    - Toggle functional

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

- [x] 8.4 Integration test: Toggle survives Options window close/reopen

    **Files:**
    - [MODIFY] `tests/integration/response-notifications.integration.test.ts`

    **Context:**
    - Per REQ-NOTIF-003 Scenario 3: setting persists

    **Acceptance Criteria:**
    - Set toggle OFF → close Options → reopen → toggle still OFF
    - Set toggle ON → close Options → reopen → toggle still ON
    - Uses real store persistence (not mocked)

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

- [x] 8.5 Integration test: Cross-platform notification support

    **Files:**
    - [MODIFY] `tests/integration/response-notifications.integration.test.ts`

    **Context:**
    - Per REQ-NOTIF-004

    **Acceptance Criteria:**
    - Integration test works on current platform
    - Logs appropriate messages for platform-specific behavior
    - Badge tests use correct platform APIs

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

- [x] 8.6 Integration test: IPC setting works after NotificationManager late injection

    **Files:**
    - [MODIFY] `tests/integration/response-notifications.integration.test.ts`

    **Context:**
    - Verifies fix for task 5.3 (temporal dependency bug)
    - Tests that IPC handlers work correctly when NotificationManager is injected late

    **Acceptance Criteria:**
    - Set notification enabled = false via IPC → value persists
    - Get notification enabled via IPC → returns actual value (not default)
    - Setting actually affects NotificationManager behavior
    - Tests fail if 5.3 fix is reverted (regression prevention)

    **Verification:**

    ```bash
    npm run test:integration -- --spec="tests/integration/response-notifications*"
    ```

---

## 9. E2E Tests

> [!IMPORTANT]
> All E2E tests MUST follow [E2E_TESTING_GUIDELINES.md](file:///c:/Users/bwend/repos/gemini/docs/E2E_TESTING_GUIDELINES.md):
>
> - Test FULL user workflows from start to finish
> - NO mocks of internal systems - trigger production code paths
> - Verify ACTUAL outcomes users would see
> - Apply the Golden Rule: "If this code was broken, would this test fail?"

- [x] 9.1 E2E test: Toggle response notifications in Options

    **Files:**
    - [NEW] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Review [E2E_TESTING_GUIDELINES.md](file:///c:/Users/bwend/repos/gemini/docs/E2E_TESTING_GUIDELINES.md)

    **Acceptance Criteria:**
    - Click toggle → aria-checked attribute changes
    - Toggle state persists via actual IPC round-trip
    - Toggle survives Options close/reopen

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.2 E2E test: Badge clears on window focus (PRODUCTION PATH)

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per E2E guidelines: DO NOT simulate badge state
    - Must trigger FULL production code path via `mainWindow.emit('response-complete')`
    - Access `global.mainWindow` to emit the event (tests wiring from MainWindow → NotificationManager)

    **Acceptance Criteria:**
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow` (NOT `onResponseComplete()` directly)
    - Verify badge appears via `badgeManager.hasNotificationBadge`
    - Focus window via user action (not internal method call)
    - Verify badge cleared via actual BadgeManager state
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.3 E2E test: Full response notification flow

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-001: Full notification flow when unfocused
    - Cannot test actual Gemini response, but CAN test via triggering response-complete event
    - CRITICAL: Must use FULL wiring via `mainWindow.emit('response-complete')`
    - Access `global.mainWindow` to emit the event (tests wiring from MainWindow → NotificationManager)

    **Acceptance Criteria:**
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow` (NOT `onResponseComplete()` directly)
    - Verify native Notification constructor was called with correct parameters
    - Verify badge appears via `badgeManager.hasNotificationBadge`
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.4 E2E test: Notification click focuses window

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-001 Scenario 1: clicking notification focuses the main window

    **Acceptance Criteria:**
    - After notification shown, trigger notification 'click' event via production handler
    - Verify main window is focused and visible
    - Verify window restored if minimized

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.5 E2E test: No notification when window is focused

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-001 Scenario 2
    - Must use FULL wiring via `mainWindow.emit('response-complete')`
    - Access `global.mainWindow` to emit the event

    **Acceptance Criteria:**
    - Ensure window is focused via `notificationManager['isWindowFocused'] = true`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify Notification constructor was NOT called
    - Verify no badge appears via `badgeManager.hasNotificationBadge === false`
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.6 E2E test: No notification when setting is disabled

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-003 Scenario 2
    - Must use FULL wiring via `mainWindow.emit('response-complete')`
    - Access `global.mainWindow` to emit the event

    **Acceptance Criteria:**
    - Toggle response notifications OFF via actual UI click
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify NO notification appears
    - Verify NO badge appears via `badgeManager.hasNotificationBadge === false`
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.7 E2E test: Setting persists across Options close/reopen

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-003 Scenario 3

    **Acceptance Criteria:**
    - Toggle OFF
    - Close Options window via actual close action
    - Reopen Options window via menu or hotkey
    - Verify toggle is still OFF
    - Restore toggle to ON at end of test

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.8 E2E test: Cross-platform - Windows toast notification and taskbar overlay

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-004 Scenario: Windows
    - Use platform detection to conditionally run
    - Must use FULL wiring via `mainWindow.emit('response-complete')`

    **Acceptance Criteria:**
    - Skip if not Windows
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify Windows toast notification API called
    - Verify `setOverlayIcon()` called with "Response ready" description
    - Verify overlay icon visible on taskbar
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    # Run on Windows CI runner
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.9 E2E test: Cross-platform - macOS Notification Center and dock badge

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-004 Scenario: macOS
    - Use platform detection to conditionally run
    - Must use FULL wiring via `mainWindow.emit('response-complete')`

    **Acceptance Criteria:**
    - Skip if not macOS
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify macOS Notification Center notification shown
    - Verify `app.dock.setBadge()` called with badge text
    - Verify badge visible on dock
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    # Run on macOS CI runner
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.10 E2E test: Cross-platform - Linux GNOME/KDE libnotify notification

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Per REQ-NOTIF-004 Scenario: Linux (GNOME/KDE)
    - Use platform detection to conditionally run
    - Note: No native badge support on Linux
    - Must use FULL wiring via `mainWindow.emit('response-complete')`

    **Acceptance Criteria:**
    - Skip if not Linux
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify libnotify notification shown (Electron uses libnotify on Linux)
    - Verify badge gracefully skipped (logged, no error)
    - Works on both GNOME and KDE desktops (Xvfb for CI)
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    # Run on Linux CI runner (Ubuntu with GNOME or KDE)
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 9.11 E2E test: Notification works on current platform

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts`

    **Context:**
    - Generic test that works on any platform
    - Detects platform at runtime and verifies appropriate behavior
    - Must use FULL wiring via `mainWindow.emit('response-complete')`

    **Acceptance Criteria:**
    - Detect current platform
    - Set window as unfocused via `notificationManager['isWindowFocused'] = false`
    - Trigger `mainWindow.emit('response-complete')` via `global.mainWindow`
    - Verify notification appears (platform-agnostic check)
    - Verify badge appears if supported (skip on Linux) via `badgeManager.hasNotificationBadge`
    - Log platform-specific behavior for debugging
    - Test MUST fail if MainWindow → NotificationManager wiring is broken

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

---

## 10. Documentation

- [x] 10.1 Update `ARCHITECTURE.md`

    **Files:**
    - [MODIFY] `docs/ARCHITECTURE.md` - Document NotificationManager

    **Acceptance Criteria:**
    - NotificationManager listed in managers section
    - Response notification feature described

    **Verification:**

    ```bash
    # Manual review of documentation
    ```

---

## 11. QA Hardening - Defensive Programming & Error Handling

> [!IMPORTANT]
> These tasks address gaps identified during QA review. They improve defensive programming,
> error handling, and test coverage to ensure production reliability.

### Critical: Error Handling

- [x] 11.1 Add try/catch to `NotificationManager.onResponseComplete()`

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Wrap `showNotification()` and `showNotificationBadge()` in try/catch

    **Context:**
    - Review [badgeManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/badgeManager.ts#L129-156) for existing defensive error handling patterns

    **Acceptance Criteria:**
    - `showNotification()` failure does NOT prevent `showNotificationBadge()` from executing
    - `showNotificationBadge()` failure is caught and logged
    - Both operations wrapped independently so one failure doesn't block the other
    - Errors logged with appropriate severity

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.2 Add try/catch around Notification constructor in `showNotification()`

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Wrap Notification constructor and show() in try/catch

    **Context:**
    - Electron's `Notification` class can throw on certain platforms/configurations
    - Review existing pattern that checks `Notification.isSupported()` before construction

    **Acceptance Criteria:**
    - `new Notification()` wrapped in try/catch
    - `notification.show()` wrapped in try/catch
    - Failure logged with error details
    - Method returns gracefully on failure without crashing

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.3 Add type validation to `NotificationManager.setEnabled()`

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add type guard for `enabled` parameter

    **Context:**
    - IPC handler has validation, but public method should be defensive
    - Review [ResponseNotificationIpcHandler.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipc/ResponseNotificationIpcHandler.ts#L85-91) for existing validation pattern

    **Acceptance Criteria:**
    - `typeof enabled !== 'boolean'` check with early return and warning log
    - Invalid input does NOT corrupt store
    - Logs warning with received value type

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.4 Add destroyed window check in event handlers

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Check `isDestroyed()` in `onWindowFocus()` and `onWindowBlur()`

    **Acceptance Criteria:**
    - `onWindowFocus()` checks `this.mainWindow.isDestroyed()` before accessing state
    - `onWindowBlur()` checks `this.mainWindow.isDestroyed()` before accessing state
    - Events on destroyed windows are gracefully ignored
    - No exceptions thrown when window is destroyed

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.5 Add `dispose()` method to NotificationManager

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add cleanup method
    - [MODIFY] `src/main/main.ts` - Call dispose in `will-quit` handler

    **Context:**
    - Review [updateManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/updateManager.ts) for existing `destroy()` pattern

    **Acceptance Criteria:**
    - `dispose()` method removes focus/blur event listeners from mainWindow
    - Called during app `will-quit` event in `main.ts`
    - Safe to call multiple times (idempotent)
    - Logs cleanup action

    **Verification:**

    ```bash
    npm run test -- notificationManager && npm run typecheck
    ```

---

### Moderate: Defensive Improvements

- [x] 11.6 Protect response-complete event handler in main.ts

    **Files:**
    - [MODIFY] `src/main/main.ts` - Wrap `notificationManager.onResponseComplete()` in try/catch

    **Context:**
    - Line 341-343 has unprotected call that could crash if manager throws

    **Acceptance Criteria:**
    - Exception in `onResponseComplete()` is caught and logged
    - App continues running after handler failure
    - Error includes stack trace for debugging

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 11.7 Verify icon path exists before using in notification

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add `fs.existsSync()` check for icon path

    **Context:**
    - Icon path resolved in `showNotification()` but never verified

    **Acceptance Criteria:**
    - Check `fs.existsSync(iconPath)` before passing to Notification
    - If missing, log warning and omit icon (notification still shows)
    - Works for both packaged and development modes

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.8 Add error handling to UI toggle IPC call

    **Files:**
    - [MODIFY] `src/renderer/components/options/NotificationSettings.tsx` - Add try/catch and error state

    **Context:**
    - Current `handleChange` doesn't await or catch errors

    **Acceptance Criteria:**
    - `setResponseNotificationsEnabled` wrapped in try/catch
    - On failure, revert `enabled` state to previous value
    - Console error logged with details
    - User sees correct toggle state even after IPC failure

    **Verification:**

    ```bash
    npm run test -- NotificationSettings
    ```

- [x] 11.9 Extract response detection URL pattern to constants

    **Files:**
    - [MODIFY] `src/main/utils/constants.ts` - Add `GEMINI_RESPONSE_API_PATTERN`
    - [MODIFY] `src/main/windows/mainWindow.ts` - Use constant instead of hardcoded URL

    **Context:**
    - Hardcoded `*://gemini.google.com/*/BardChatUi/*` in mainWindow.ts

    **Acceptance Criteria:**
    - Pattern defined as constant in `constants.ts`
    - `mainWindow.ts` imports and uses the constant
    - Easy to update if Gemini changes API endpoints
    - JSDoc explains what the pattern matches

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

---

### Test Coverage Gaps

- [x] 11.10 Add unit tests for error handling paths

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts` - Add error path tests

    **Context:**
    - Current tests don't verify behavior when operations throw

    **Acceptance Criteria:**
    - Test: `showNotification()` throws → `onResponseComplete()` still calls `showNotificationBadge()`
    - Test: `showNotificationBadge()` throws → error logged, no crash
    - Test: `store.set()` throws → handled gracefully
    - Test: `Notification` constructor throws → method returns, no crash

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.11 Add rapid focus/blur event test

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts` - Add stress test

    **Acceptance Criteria:**
    - Test rapid sequence: focus → blur → focus → blur (10+ times in \<100ms)
    - State remains consistent after sequence
    - No race conditions or exceptions
    - Badge state correctly reflects final focus state

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.12 Add null/undefined store value test

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts` - Add edge case test

    **Acceptance Criteria:**
    - Test: `store.get('responseNotificationsEnabled')` returns `null` → defaults to `true`
    - Test: `store.get('responseNotificationsEnabled')` returns `undefined` → defaults to `true`
    - `isEnabled()` never returns non-boolean value

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 11.13 Add coordinated test for dispose cleanup

    **Files:**
    - [NEW] `tests/coordinated/response-notifications-dispose.coordinated.test.ts` - Test cleanup behavior

    **Context:**
    - Verifies task 11.5 implementation

    **Acceptance Criteria:**
    - Test: After `dispose()`, focus/blur events do NOT trigger badge changes
    - Test: `dispose()` is idempotent (safe to call twice)
    - Test: `dispose()` handles already-destroyed window gracefully

    **Verification:**

    ```bash
    npm run test:coordinated -- response-notifications-dispose
    ```

---

## 12. QA Findings - Bug Fixes & Missing Coverage

> [!IMPORTANT]
> These tasks address gaps identified during QA review of the response notifications feature.
> Section 12.1 is a **critical bug** that must be fixed.

### Critical: Bug Fixes

- [x] 12.1 Fix `dispose()` method using `.bind()` incorrectly (CRITICAL)

    **Problem:**
    The `dispose()` method calls `removeListener()` with `.bind()`, which creates **new function references** each time. This means the event listeners registered in the constructor will **never be removed**, causing memory leaks and potential crashes.

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Store bound function references and use them for both registration and removal

    **Context:**
    - Current broken code at lines 64-65 and 276-277
    - `.bind()` creates a new function instance each call, so `removeListener()` cannot find the original handlers

    **Acceptance Criteria:**
    - Bound functions stored as class properties in constructor
    - Same references used for `on()` and `removeListener()`
    - After `dispose()`, focus/blur events do NOT trigger any manager behavior
    - Existing tests still pass
    - Add unit test verifying listeners are actually removed

    **Verification:**

    ```bash
    npm run test -- notificationManager && npm run test:coordinated -- response-notifications-dispose
    ```

---

### Moderate: Error Handling Improvements

- [x] 12.2 Add try/catch around `store.set()` in `setEnabled()`

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Wrap `store.set()` in try/catch

    **Context:**
    - Task 11.10 acceptance criteria mentions testing `store.set()` throws but no protection exists

    **Acceptance Criteria:**
    - `store.set()` call wrapped in try/catch
    - Error logged with appropriate severity
    - Method returns gracefully on failure without crashing

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

- [x] 12.3 Add try/catch around `mainWindow.emit('response-complete')`

    **Files:**
    - [MODIFY] `src/main/windows/mainWindow.ts` - Wrap emit in try/catch at line 444

    **Context:**
    - If any listener throws during emit, it could crash the main process

    **Acceptance Criteria:**
    - `this.emit('response-complete')` wrapped in try/catch
    - Error logged with stack trace
    - App continues running after listener failure

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 12.4 Add null guard for `badgeManager` in `NotificationManager`

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Add null checks before calling badgeManager methods

    **Context:**
    - `onResponseComplete()` and `onWindowFocus()` assume badgeManager is always defined

    **Acceptance Criteria:**
    - Null check before `this.badgeManager.showNotificationBadge()` in `onResponseComplete()`
    - Null check before `this.badgeManager.clearNotificationBadge()` in `onWindowFocus()`
    - Warning logged if badgeManager is null
    - No crash if badgeManager is inadvertently null

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

---

### Test Coverage Gaps

- [x] 12.5 Add unit test for debounce cooldown reset in response detection

    **Files:**
    - [MODIFY] `tests/unit/main/windows/mainWindow.response-detection.test.ts` - Add debounce reset test

    **Context:**
    - Task 6.6 acceptance criteria: "Debounce resets after cooldown period"
    - Current tests may not verify events emit again AFTER cooldown expires

    **Acceptance Criteria:**
    - Test: After debounce cooldown (1000ms) expires, next event fires normally
    - Uses real or fake timers to advance past cooldown
    - Verifies event count increases after cooldown

    **Verification:**

    ```bash
    npm run test -- mainWindow.response-detection
    ```

- [x] 12.6 Document E2E test 9.4 notification click limitation

    **Files:**
    - [MODIFY] `tests/e2e/response-notifications.spec.ts` - Add comment explaining limitation

    **Context:**
    - E2E tests cannot directly trigger native OS notification click events
    - Task 9.4 acceptance criteria may not be fully automatable

    **Acceptance Criteria:**
    - Comment added explaining that notification click is tested via coordinated tests
    - Reference to coordinated test location provided
    - If test exists, verify it uses appropriate mocking strategy

    **Verification:**

    ```bash
    npm run test:e2e:spec -- --spec=tests/e2e/response-notifications.spec.ts
    ```

- [x] 12.7 Add unit test for `store.set()` exception handling

    **Files:**
    - [MODIFY] `tests/unit/main/managers/notificationManager.test.ts` - Add test case

    **Context:**
    - Task 11.10 mentions testing `store.set()` throws but test is missing

    **Acceptance Criteria:**
    - Test: `store.set()` throws → `setEnabled()` handles gracefully, no crash
    - Test: Error is logged appropriately
    - Test: Manager state remains consistent after failure

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```

---

### Additional: MainWindow & Notification Cleanup

- [x] 12.8 Remove webRequest listener when MainWindow is closed (MEDIUM)

    **Problem:**
    In `MainWindow.setupResponseDetection()`, a listener is registered on `session.defaultSession.webRequest.onCompleted`. This listener is **never removed** when the window is closed or destroyed.

    **Files:**
    - [MODIFY] `src/main/windows/mainWindow.ts` - Store listener reference and remove in cleanup

    **Context:**
    - If the window is closed and re-opened, a new listener is registered
    - Old listener may hold references to destroyed MainWindow via closure
    - Could cause multiple event emissions or memory leaks

    **Acceptance Criteria:**
    - Store listener reference when registering
    - Call `session.defaultSession.webRequest.onCompleted.removeListener()` (or equivalent) on window close
    - Add cleanup in the `closed` event handler or create `dispose()` method for MainWindow
    - Multiple window open/close cycles do not accumulate listeners

    **Verification:**

    ```bash
    npm run test -- mainWindow && npm run typecheck
    ```

- [x] 12.9 Wrap webRequest listener registration in try/catch

    **Files:**
    - [MODIFY] `src/main/windows/mainWindow.ts` - Wrap `session.defaultSession.webRequest.onCompleted(...)` in try/catch

    **Context:**
    - Line 421 is unprotected
    - If `session.defaultSession` is unavailable (test environment or specific app state), this could interrupt window creation

    **Acceptance Criteria:**
    - `session.defaultSession.webRequest.onCompleted(...)` wrapped in try/catch
    - Error logged with appropriate message
    - Window creation continues even if listener registration fails

    **Verification:**

    ```bash
    npm run typecheck && npm run lint
    ```

- [x] 12.10 Close pending notifications on NotificationManager dispose

    **Files:**
    - [MODIFY] `src/main/managers/notificationManager.ts` - Track active notifications and close on dispose

    **Context:**
    - Current `dispose()` removes event listeners but does not close pending native notifications
    - If app is quitting, notifications might remain on screen

    **Acceptance Criteria:**
    - Track active `Notification` instances in a Set or array
    - Remove from tracking when notification is closed/dismissed
    - Call `notification.close()` on all pending notifications in `dispose()`
    - Add unit test verifying notifications are closed on dispose

    **Verification:**

    ```bash
    npm run test -- notificationManager
    ```
