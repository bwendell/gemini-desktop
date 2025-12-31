# Tasks

## 1. Core Infrastructure

- [x] 1.1 Add `printToPdf` to `HotkeyId` type and related types
  - Modify `src/shared/types/hotkeys.ts`
  - Add to `HOTKEY_IDS` array
  - Add to `IndividualHotkeySettings` interface
  - Add to `HotkeySettings` interface
  - Add default accelerator `CommandOrControl+Shift+P`

- [x] 1.2 Add IPC channels for print-to-pdf
  - Modify `src/shared/constants/ipc-channels.ts`
  - Add `PRINT_TO_PDF_TRIGGER` channel
  - Add `PRINT_TO_PDF_SUCCESS` channel (for success feedback)
  - Add `PRINT_TO_PDF_ERROR` channel (for error handling)

- [x] 1.3 Update ElectronAPI interface and preload
  - Modify `src/shared/types/ipc.ts` to add `printToPdf()` method
  - Modify `src/preload/preload.ts` to expose the method

## 2. Main Process Implementation

- [x] 2.1 Create PrintManager
  - Create `src/main/managers/printManager.ts`
  - Implement `printToPdf()` method that:
    1. Scrolls webContents to capture entire conversation
    2. Generates PDF buffer using `webContents.printToPDF()`
    3. Shows save dialog with default filename `gemini-chat-YYYY-MM-DD.pdf`
    4. Checks if file exists; if so, appends numeric suffix (`-1`, `-2`, etc.)
    5. Writes PDF to chosen location
    6. Handles errors gracefully with user feedback
  - Ensure cross-platform compatibility (Windows, macOS, Linux)

- [x] 2.2 Refactor hotkeys into global and application hotkeys

  **Goal**: Separate hotkeys into two categories based on their behavior:
  - **Global hotkeys** (`quickChat`, `bossKey`): Work system-wide via `globalShortcut.register()`, even when app is not focused
  - **Application hotkeys** (`alwaysOnTop`, `printToPdf`): Work only when app window is focused via Menu accelerators

  ### 2.2.1 Update shared types (`src/shared/types/hotkeys.ts`)
  - [x] Add `HotkeyScope` type: `'global' | 'application'`
  - [x] Add `GLOBAL_HOTKEY_IDS: HotkeyId[]` = `['quickChat', 'bossKey']`
  - [x] Add `APPLICATION_HOTKEY_IDS: HotkeyId[]` = `['alwaysOnTop', 'printToPdf']`
  - [x] Add `HOTKEY_SCOPE_MAP: Record<HotkeyId, HotkeyScope>` mapping each ID to its scope
  - [x] Add `getHotkeyScope(id: HotkeyId): HotkeyScope` helper function
  - [x] Add `isGlobalHotkey(id: HotkeyId): boolean` helper function
  - [x] Add `isApplicationHotkey(id: HotkeyId): boolean` helper function

  ### 2.2.2 Refactor HotkeyManager (`src/main/managers/hotkeyManager.ts`)

  **Current state**: ✅ Refactored - Only global hotkeys registered via `globalShortcut.register()`.

  **Completed changes**:
  - [x] Import new scope helpers from `../types`
  - [x] Modify `registerShortcuts()` to only register **global** hotkeys via `globalShortcut`
  - [x] Modify `_registerShortcutById()` to skip application hotkeys (they are handled by Menu)
  - [x] Modify `_unregisterShortcutById()` to skip application hotkeys
  - [x] Modify `setIndividualEnabled()` to handle application hotkeys differently:
    - Global hotkeys: register/unregister via `globalShortcut`
    - Application hotkeys: just update the enabled state (Menu handles accelerators)
  - [x] Modify `setAccelerator()` to handle application hotkeys differently:
    - Global hotkeys: re-register via `globalShortcut`
    - Application hotkeys: emit event to rebuild menu with new accelerator
  - [x] Add `getGlobalHotkeyActions()` method to get only global shortcut actions
  - [x] Add `getApplicationHotkeyActions()` method for menu-based hotkeys
  - [x] Keep `executeHotkeyAction()` working for both types (used by E2E tests)
  - [x] Update class docstring to document the two-tier architecture

  ### 2.2.3 Update MenuManager (`src/main/managers/menuManager.ts`)

  **Current state**: ✅ Completed - MenuManager reads accelerators dynamically from HotkeyManager.

  **Completed changes**:
  - [x] Import `HotkeyManager` or receive accelerators via constructor/method
  - [x] Dynamically read accelerators from HotkeyManager for application hotkeys
  - [x] Add method `rebuildMenuWithAccelerators()` to refresh menu when accelerators change
  - [x] Ensure menu items respect the enabled state from HotkeyManager
  - [x] Handle the case where application hotkey is disabled (hide accelerator hint or disable menu item)

  ### 2.2.4 Update main.ts initialization
  - [x] Ensure MenuManager is initialized after HotkeyManager
  - [x] Pass HotkeyManager reference to MenuManager (or use event-based sync)
  - [x] Wire up accelerator change events to trigger menu rebuild

  ### 2.2.5 Update unit tests (`tests/unit/main/hotkeyManager.test.ts`)

  **Status**: ✅ Completed - 56 tests now pass (15 new scope helper tests added).

  **Completed changes**:
  - [x] Update `registerShortcuts` tests: should only register 2 global hotkeys (was 4)
  - [x] Update expectation: `mockGlobalShortcut.register.toHaveBeenCalledTimes(2)` for global-only
  - [x] Add new tests for scope separation:
    - Test `getHotkeyScope()` returns correct scope for each hotkey
    - Test `isGlobalHotkey()` and `isApplicationHotkey()` helpers
    - Test that `alwaysOnTop` and `printToPdf` are NOT registered via `globalShortcut`
    - Test that `quickChat` and `bossKey` ARE registered via `globalShortcut`
  - [x] Update `setIndividualEnabled` tests to verify scope-aware behavior
  - [x] Update `setAccelerator` tests to verify scope-aware behavior

  ### 2.2.6 Update shared types tests (`tests/unit/shared/hotkeys.test.ts`)

  **Status**: ✅ Completed - 23 tests now pass covering all scope types and helper functions.

  **Completed changes**:
  - [x] Add tests for new type exports: `HotkeyScope`, `GLOBAL_HOTKEY_IDS`, `APPLICATION_HOTKEY_IDS`
  - [x] Test `getHotkeyScope()` returns `'global'` for `quickChat`, `bossKey`
  - [x] Test `getHotkeyScope()` returns `'application'` for `alwaysOnTop`, `printToPdf`
  - [x] Test `isGlobalHotkey()` and `isApplicationHotkey()` helper functions
  - [x] Test `GLOBAL_HOTKEY_IDS.length + APPLICATION_HOTKEY_IDS.length === HOTKEY_IDS.length`

  ### 2.2.7 Update E2E tests
  - [x] Review `tests/e2e/hotkeys.spec.ts` - may need updates for global vs app behavior
  - [x] Review `tests/e2e/hotkey-toggle.spec.ts` - verify toggles work for both types
  - [x] Review `tests/e2e/hotkey-registration.spec.ts` - verify registration tests still pass
  - [x] Add test verifying application hotkeys work when window focused
  - [x] Add test verifying application hotkeys DO NOT work when window unfocused (if testable)

  ### 2.2.8 Update renderer context (no changes expected)
  - [x] Verify `IndividualHotkeysContext.tsx` doesn't need scope awareness (UI treats all the same)
  - [x] Verify `IndividualHotkeyToggles.tsx` works for both global and application hotkeys

  ### 2.2.9 Documentation
  - [x] Update `hotkeyManager.ts` module docstring to explain the two-tier architecture
  - [x] Add inline comments explaining why certain hotkeys use global vs menu accelerators

- [x] 2.3 Register IPC handler
  - Register `PRINT_TO_PDF_TRIGGER` handler in `ipcManager.ts`
  - Delegate to `PrintManager.printToPdf()`

- [x] 2.4 Register hotkey in HotkeyManager
  - Modify `src/main/managers/hotkeyManager.ts`
  - Add `printToPdf` shortcut action in constructor
  - Action should invoke the print-to-pdf flow

- [x] 2.5 Add "Print to PDF" to File menu
  - Modify `src/main/managers/menuManager.ts`
  - Add menu item in `buildFileMenu()`
  - Include accelerator hint matching the hotkey

- [x] 2.6 Implement Custom Titlebar Menu (Windows/Linux)
  - [x] Add cross-reference comment to `src/main/managers/menuManager.ts`
  - [x] Add cross-reference comment to `src/renderer/components/titlebar/useMenuDefinitions.ts`
  - [x] Modify `src/renderer/components/titlebar/useMenuDefinitions.ts`:
    - Add "Print to PDF" item to File menu
    - Implement dynamic accelerator loading from main process
    - Ensure menu item invokes `electronAPI.printToPdf()`
  - [x] Update unit tests in `src/renderer/components/titlebar/useMenuDefinitions.test.tsx`:
    - Test menu item existence and attributes
    - Test action triggers `printToPdf`
    - Test accelerator updates dynamically

## 3. Settings Persistence

- [x] 3.1 Update settings store schema
  - Modify `src/main/store.ts` to include `printToPdf` in:
    - `individualHotkeys` defaults
    - `hotkeyAccelerators` defaults

- [x] 3.2 Test settings persistence
  - Verify enabled state persists across restarts
  - Verify custom accelerator persists across restarts

## 4. Options Window UI

- [x] 4.1 Add Print to PDF toggle to IndividualHotkeyToggles
  - Modify `src/renderer/components/options/IndividualHotkeyToggles.tsx`
  - Add new entry to `HOTKEY_CONFIGS` array:

    ```typescript
    {
      id: 'printToPdf',
      label: 'Print to PDF',
      description: 'Export current chat to PDF',
    }
    ```

  - Verify toggle and accelerator input render correctly

## 5. Testing

- [x] 5.1 Add unit tests for new hotkey type
  - Test default accelerator is `CommandOrControl+Shift+P`
  - Test `HotkeyId` type includes `printToPdf`
  - Test `HOTKEY_IDS` array includes `printToPdf`

- [x] 5.2 Add unit tests for PrintManager
  - Test filename generation with date format
  - Test filename suffix logic when file exists
  - Test cross-platform path handling

- [x] 5.3 Add coordinated tests for print-to-pdf flow

  ### 5.3.1 PrintManager ↔ WindowManager Integration (`tests/coordinated/print-manager.coordinated.test.ts`)
  - [x] Test `printToPdf()` gets webContents from WindowManager when none provided
  - [x] Test `printToPdf()` uses provided webContents when passed
  - [x] Test `printToPdf()` handles missing main window gracefully (logs error, returns without crash)
  - [x] Test `printToPdf()` handles destroyed webContents gracefully
  - [x] Cross-platform tests (darwin, win32, linux):
    - [x] Downloads folder path retrieved correctly via `app.getPath('downloads')`
    - [x] Default filename format: `gemini-chat-YYYY-MM-DD.pdf`

  ### 5.3.2 PrintManager Filename Uniqueness Logic
  - [x] Test `getUniqueFilePath()` returns original path when file doesn't exist
  - [x] Test `getUniqueFilePath()` appends `-1` when base file exists
  - [x] Test `getUniqueFilePath()` appends `-2`, `-3`, etc. for multiple collisions
  - [x] Test filename extension preserved correctly (`.pdf`)
  - [x] Test works with paths containing spaces and special characters

  ### 5.3.3 IPC Handler Integration (`tests/coordinated/print-to-pdf-ipc.coordinated.test.ts`)
  - [x] Test `PRINT_TO_PDF_TRIGGER` IPC handler delegates to PrintManager
  - [x] Test `event.sender` webContents is passed to PrintManager correctly
  - [x] Test handler logs error and continues when PrintManager not initialized
  - [x] Test handler handles async errors from PrintManager without crashing
  - [x] Test IPC coordination across managers:
    - IpcManager receives trigger → calls PrintManager.printToPdf()
    - PrintManager uses WindowManager.getMainWindow() when needed

  ### 5.3.4 PrintManager ↔ IPC Success/Error Feedback
  - [x] Test `PRINT_TO_PDF_SUCCESS` is sent to webContents with filepath after save
  - [x] Test `PRINT_TO_PDF_ERROR` is sent to webContents with error message on failure
  - [x] Test success/error channels not sent when webContents is destroyed
  - [x] Test error scenarios:
    - [x] PDF generation fails (webContents.printToPDF rejects)
    - [x] File write fails (fs.writeFile rejects)
    - [x] Save dialog error

  ### 5.3.5 WindowManager Event-Driven Print Trigger
  - [x] Test `print-to-pdf-triggered` event on WindowManager triggers print flow
  - [x] Test event-driven trigger uses main window webContents
  - [x] Test event-driven trigger handles missing main window
  - [x] Verify coordination: HotkeyManager action → WindowManager event → IpcManager listener → PrintManager

  ### 5.3.6 HotkeyManager ↔ PrintManager Coordination (`tests/coordinated/print-hotkey-coordination.coordinated.test.ts`)
  - [x] Test `printToPdf` hotkey action emits correct WindowManager event
  - [x] Test `printToPdf` shortcut action calls IPC trigger when hotkey is enabled
  - [x] Test `printToPdf` shortcut action is no-op when hotkey is disabled
  - [x] Test `printToPdf` with custom accelerator works correctly
  - [x] Test accelerator change updates menu item and persists to store
  - [x] Cross-platform: Verify accelerator `CommandOrControl+Shift+P` resolves correctly

  ### 5.3.7 MenuManager ↔ PrintManager Integration
  - [x] Test File menu contains "Print to PDF" item with correct accelerator
  - [x] Test menu item click triggers print flow via WindowManager event
  - [x] Test menu accelerator updates when HotkeyManager accelerator changes
  - [x] Test menu item enabled/disabled state matches hotkey enabled state
  - [x] Cross-platform tests:
    - macOS: Menu item in File menu with `⌘⇧P` accelerator hint
    - Windows/Linux: Menu item in File menu with `Ctrl+Shift+P` accelerator hint

  ### 5.3.8 Settings Persistence for Print to PDF (`tests/coordinated/print-to-pdf-settings.coordinated.test.ts`)
  - [x] Test `printToPdf` enabled state persists via `hotkeyPrintToPdf` store key
  - [x] Test `printToPdf` accelerator persists via `acceleratorPrintToPdf` store key
  - [x] Test default values on fresh install: enabled=true, accelerator=`CommandOrControl+Shift+P`
  - [x] Test settings loaded correctly on simulated app restart:
    - [x] Seed store with different values (e.g., enabled=false)
    - [x] Verify `HotkeyManager` is initialized with seeded values
  - [x] Test IPC updates persist to store:
    - [x] `hotkeys:individual:set` saves to store
    - [x] `hotkeys:accelerator:set` saves to store and broadcasts
  - [x] Test IPC `hotkeys:accelerator:set` for `printToPdf` updates store and broadcasts

  ### 5.3.9 Cross-Window Broadcast for Print Settings
  - [x] Test enabling/disabling `printToPdf` broadcasts to all open windows
  - [x] Test accelerator change for `printToPdf` broadcasts to all windows
  - [x] Test full hotkey settings get includes `printToPdf` with correct values
  - [x] Test destroyed windows are skipped during broadcast (no crash)

  ### 5.3.10 Save Dialog Integration
  - [x] Test `dialog.showSaveDialog` called with correct options:
    - [x] `title`: "Save Chat as PDF"
    - [x] `defaultPath`: unique path in downloads folder
    - [x] `filters`: `[{ name: 'PDF Files', extensions: ['pdf'] }]`
  - [x] Test parent window passed to dialog (uses main window or focused window)
  - [x] Test user cancel (canceled=true) exits gracefully without error
  - [x] Test empty filePath exits gracefully without error

  ### 5.3.11 PDF Generation Options
  - [x] Test `printToPDF` called with correct options:
    - [x] `printBackground: true`
    - [x] `pageSize: 'A4'`
    - [x] `landscape: false`
  - [x] Test PDF buffer passed correctly to file write
  - [x] Test large PDF generation (mock large buffer) handles correctly

  ### 5.3.12 Error Handling Coordination
  - [x] Test logger.error called with appropriate context on each error type
  - [x] Test error in one step doesn't prevent cleanup or crash app
  - [x] Test rapid print triggers (queue or debounce behavior)
  - [x] Test concurrent print requests handled correctly

  Run command: `npm run test:coordinated -- --grep "print"`

- [x] 5.4 Add integration tests (`tests/integration/print-to-pdf.integration.test.ts`)

  ### 5.4.1 IPC Trigger Workflows
  - [x] Test `electronAPI.printToPdf()` from the primary renderer process
  - [x] Test `electronAPI.printToPdf()` from a secondary renderer process (e.g., Options window)
  - [x] Verify that the `PrintManager` receives the correct `webContents` for each process type

  ### 5.4.2 User Input Workflows (Integration Level)
  - [x] Test triggering via simulated "Print to PDF" menu item click (via IPC event)
  - [x] Test triggering via simulated hotkey press (`Ctrl+Shift+P` / `Cmd+Shift+P`)
  - [x] Verify that the `HotkeyManager` and `MenuManager` are both correctly wired to the `PrintManager`

  ### 5.4.3 Settings & State Workflows
  - [x] Test enabling `printToPdf` via `electronAPI.setIndividualHotkey` and verifying immediately availability
  - [x] Test disabling `printToPdf` and verifying it can no longer be triggered via IPC or hotkey
  - [x] Test changing the accelerator and verifying the new hotkey works in the integration environment

  ### 5.4.4 Feedback & Error Workflows
  - [x] Test receiving `PRINT_TO_PDF_SUCCESS` with the correct file path payload
  - [x] Test receiving `PRINT_TO_PDF_ERROR` when the save dialog is canceled (if error is expected) or when PDF generation fails
  - [x] Verify that the renderer UI state (e.g., a loading spinner if implemented) would correctly respond to these messages

  ### 5.4.5 System Integration Workflows
  - [x] Test integration with the `SettingsStore`: verify updates are written to disk (mocked)
  - [x] Test integration with `WindowManager`: verify correct window is focused before printing
  - [x] Test integration with the system `dialog`: verify options passed to `showSaveDialog` match the spec

  ### 5.4.6 Edge Case Workflows
  - [x] Test triggering print when no windows are open (should handle gracefully)
  - [x] Test triggering print when the target window is being destroyed
  - [x] Test rapid consecutive triggers and verify the system's "in-progress" locking mechanism

  Run command: `npm run test:integration -- --spec "**/print-to-pdf*.test.ts"`

- [ ] 5.5 Add E2E tests

  ### 5.5.1 File Menu "Print to PDF" Item (`tests/e2e/print-to-pdf-menu.spec.ts`)
  - [x] Test File menu contains "Print to PDF" item visible to user
  - [x] Test menu item displays correct accelerator hint:
    - Windows/Linux: `Ctrl+Shift+P`
    - macOS: `⌘⇧P`
  - [x] Test menu item is clickable and enabled by default
  - [x] Test clicking menu item triggers print flow (save dialog opens)
  - [x] Test menu item is disabled when `printToPdf` hotkey is disabled in Options

  ### 5.5.2 Options Window Toggle (`tests/e2e/print-to-pdf-toggle.spec.ts`)
  - [ ] Test "Print to PDF" toggle is visible in Individual Hotkey Toggles section
  - [ ] Test toggle displays correct label: "Print to PDF"
  - [ ] Test toggle displays description: "Export current chat to PDF"
  - [ ] Test toggle displays platform-appropriate shortcut text
  - [ ] Test toggle has role="switch" and aria-checked attribute
  - [ ] Test clicking toggle switches enabled state
  - [ ] Test toggle state persists after closing and reopening Options window
  - [ ] Test toggle state persists after app restart (via settings store)

  ### 5.5.3 Accelerator Customization (`tests/e2e/print-to-pdf-accelerator.spec.ts`)
  - [ ] Test accelerator input field is visible next to toggle
  - [ ] Test accelerator displays default: `CommandOrControl+Shift+P`
  - [ ] Test clicking accelerator field allows editing
  - [ ] Test entering new accelerator (e.g., `Ctrl+Alt+P`) updates display
  - [ ] Test custom accelerator persists after closing Options window
  - [ ] Test custom accelerator updates menu item accelerator hint
  - [ ] Test invalid accelerator shows validation error
  - [ ] Test clearing accelerator field removes shortcut (if supported)

  ### 5.5.4 Hotkey Triggers Print Flow (`tests/e2e/print-to-pdf-hotkey.spec.ts`)
  - [ ] Test pressing `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) opens save dialog
  - [ ] Test hotkey works when main window is focused
  - [ ] Test hotkey does NOT work when app is unfocused (application hotkey, not global)
  - [ ] Test hotkey does NOT work when Options window is focused
  - [ ] Test custom accelerator triggers print flow correctly
  - [ ] Test hotkey does NOT trigger when `printToPdf` toggle is disabled

  ### 5.5.5 Save Dialog Interaction (`tests/e2e/print-to-pdf-save-dialog.spec.ts`)
  - [ ] Test save dialog opens with title "Save Chat as PDF"
  - [ ] Test default filename format: `gemini-chat-YYYY-MM-DD.pdf`
  - [ ] Test default directory is Downloads folder
  - [ ] Test PDF filter is selected: `*.pdf`
  - [ ] Test canceling save dialog does not create file
  - [ ] Test selecting location and saving creates PDF file
  - [ ] Test file collision handling: appends `-1`, `-2`, etc.

  ### 5.5.6 PDF Generation Verification (`tests/e2e/print-to-pdf-output.spec.ts`)
  - [ ] Test PDF file is created at selected location
  - [ ] Test PDF file is valid (non-zero size, valid headers)
  - [ ] Test SUCCESS IPC message sent to renderer after save
  - [ ] Test ERROR IPC message sent to renderer on failure
  - [ ] Test rapid print triggers are handled (no crash or corruption)

  ### 5.5.7 Full Workflow E2E (`tests/e2e/print-to-pdf-workflow.spec.ts`)
  - [ ] Test complete workflow: User opens app → focuses chat → presses hotkey → dialog opens → saves file → file created
  - [ ] Test complete workflow: User opens File menu → clicks "Print to PDF" → dialog opens → saves file
  - [ ] Test complete workflow: User disables toggle in Options → hotkey/menu no longer works → re-enables → works again
  - [ ] Test error recovery: File write fails → error shown → user can retry

  Run command: `npm run test:e2e -- --spec "**/print-to-pdf*.spec.ts"`

- [ ] 5.6 Cross-platform E2E verification
  - Verify tests pass on Windows CI
  - Verify tests pass on macOS CI
  - Verify tests pass on Linux CI

## 6. Verification

- [ ] 6.1 Run all existing tests to ensure no regressions
  - `npm run test` (unit)
  - `npm run test:electron` (electron unit)
  - `npm run test:coordinated` (coordinated)
  - `npm run test:integration` (integration)
  - `npm run test:e2e` (e2e)

- [ ] 6.2 Manual testing on each platform
  - [ ] Windows: Test menu, hotkey, toggle, PDF content
  - [ ] macOS: Test menu, hotkey, toggle, PDF content
  - [ ] Linux: Test menu, hotkey, toggle, PDF content

- [ ] 6.3 Verify PDF quality
  - PDF contains entire conversation (not truncated)
  - Text is readable and properly formatted
  - Images (if any) are included
