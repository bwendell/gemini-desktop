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

- [ ] 2.2 Refactor hotkeys into global and application hotkeys

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

## 3. Settings Persistence

- [ ] 3.1 Update settings store schema
  - Modify `src/main/store.ts` to include `printToPdf` in:
    - `individualHotkeys` defaults
    - `hotkeyAccelerators` defaults

- [ ] 3.2 Test settings persistence
  - Verify enabled state persists across restarts
  - Verify custom accelerator persists across restarts

## 4. Options Window UI

- [ ] 4.1 Add Print to PDF toggle to IndividualHotkeyToggles
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

- [ ] 5.1 Add unit tests for new hotkey type
  - Test default accelerator is `CommandOrControl+Shift+P`
  - Test `HotkeyId` type includes `printToPdf`
  - Test `HOTKEY_IDS` array includes `printToPdf`

- [ ] 5.2 Add unit tests for PrintManager
  - Test filename generation with date format
  - Test filename suffix logic when file exists
  - Test cross-platform path handling

- [ ] 5.3 Add integration tests for print-to-pdf flow
  - Test IPC handler receives and processes request
  - Test PDF buffer is generated from webContents
  - Test save dialog is shown
  - Test file is written to disk
  - Test error handling when write fails

- [ ] 5.4 Add E2E tests
  - Test File menu contains "Print to PDF" item
  - Test clicking menu item opens save dialog
  - Test toggle in Options enables/disables the hotkey
  - Test accelerator customization works
  - Test hotkey triggers print flow when enabled
  - Test hotkey does not trigger when disabled

- [ ] 5.5 Cross-platform E2E verification
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
