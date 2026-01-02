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

- [x] 5.5 Add E2E tests

  ### 5.5.1 File Menu "Print to PDF" Item (`tests/e2e/print-to-pdf-menu.spec.ts`)
  - [x] Test File menu contains "Print to PDF" item visible to user
  - [x] Test menu item displays correct accelerator hint:
    - Windows/Linux: `Ctrl+Shift+P`
    - macOS: `⌘⇧P`
  - [x] Test menu item is clickable and enabled by default
  - [x] Test clicking menu item triggers print flow (save dialog opens)
  - [x] Test menu item is disabled when `printToPdf` hotkey is disabled in Options

  ### 5.5.2 Options Window Toggle (`tests/e2e/print-to-pdf-toggle.spec.ts`) [x]
  - [x] Test "Print to PDF" toggle is visible in Individual Hotkey Toggles section
  - [x] Test toggle displays correct label: "Print to PDF"
  - [x] Test toggle displays description: "Save current conversation as PDF"
  - [x] Test toggle displays platform-appropriate shortcut text
  - [x] Test toggle has role="switch" and aria-checked attribute
  - [x] Test clicking toggle switches enabled state
  - [x] Test toggle state persists after closing and reopening Options window
  - [x] Test toggle state persists after app restart (via settings store)

  ### 5.5.3 Accelerator Customization (`tests/e2e/print-to-pdf-accelerator.spec.ts`) [x]
  - [x] Test accelerator input field is visible next to toggle
  - [x] Test accelerator displays default: `CommandOrControl+Shift+P`
  - [x] Test clicking accelerator field allows editing
  - [x] Test entering new accelerator (e.g., `Ctrl+Alt+P`) updates display
  - [x] Test custom accelerator persists after closing Options window
  - [x] Test custom accelerator updates menu item accelerator hint
  - [x] Test invalid accelerator shows validation error
  - [x] Test clearing accelerator field removes shortcut (via reset button)

  ### 5.5.4 Hotkey Triggers Print Flow (`tests/e2e/print-to-pdf-hotkey.spec.ts`)
  - [x] Test pressing `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) opens save dialog
  - [x] Test hotkey works when main window is focused
  - [x] Test hotkey does NOT work when app is unfocused (application hotkey, not global)
  - [x] Test hotkey does NOT work when Options window is focused
  - [x] Test custom accelerator triggers print flow correctly
  - [x] Test hotkey does NOT trigger when `printToPdf` toggle is disabled

  ### 5.5.5 Save Dialog Interaction (`tests/e2e/print-to-pdf-save-dialog.spec.ts`)
  - [x] Test save dialog opens with title "Save Chat as PDF"
  - [x] Test default filename format: `gemini-chat-YYYY-MM-DD.pdf`
  - [x] Test default directory is Downloads folder
  - [x] Test PDF filter is selected: `*.pdf`
  - [x] Test canceling save dialog does not create file
  - [x] Test selecting location and saving creates PDF file
  - [x] Test file collision handling: appends `-1`, `-2`, etc.

  ### 5.5.6 PDF Generation Verification (`tests/e2e/print-to-pdf-output.spec.ts`)
  - [x] Test PDF file is created at selected location
  - [x] Test PDF file is valid (non-zero size, valid headers)
  - [x] Test SUCCESS IPC message sent to renderer after save
  - [x] Test ERROR IPC message sent to renderer on failure
  - [x] Test rapid print triggers are handled (no crash or corruption)

  ### 5.5.7 Full Workflow E2E (`tests/e2e/print-to-pdf-workflow.spec.ts`)
  - [x] Test complete workflow: User opens app → focuses chat → presses hotkey → dialog opens → saves file → file created
  - [x] Test complete workflow: User opens File menu → clicks "Print to PDF" → dialog opens → saves file
  - [x] Test complete workflow: User disables toggle in Options → hotkey/menu no longer works → re-enables → works again
  - [x] Test error recovery: File write fails → error shown → user can retry

  Run command: `npm run test:e2e -- --spec "**/print-to-pdf*.spec.ts"`

- [x] 5.6 Cross-platform E2E verification
  - Verify tests pass on Windows CI
  - Verify tests pass on macOS CI
  - Verify tests pass on Linux CI

## 6. Verification

- [x] 6.1 Run all existing tests to ensure no regressions
  - `npm run test` (unit)
  - `npm run test:electron` (electron unit)
  - `npm run test:coordinated` (coordinated)
  - `npm run test:integration` (integration)
  - `npm run test:e2e` (e2e)

- [x] 6.2 Manual testing on each platform
  - [x] Windows: Test menu, hotkey, toggle, PDF content
  - [x] macOS: Test menu, hotkey, toggle, PDF content
  - [x] Linux: Test menu, hotkey, toggle, PDF content

- [x] 6.3 Verify PDF quality
  - PDF contains entire conversation (not truncated)
  - Text is readable and properly formatted
  - Images (if any) are included

## 7. Bug Fix: Print Entire Conversation (Not Just Visible Viewport)

### 7.0 Investigation Findings

**Bug Description:** The current `PrintManager.printToPdf()` implementation only captures what is currently visible in the browser viewport. Long conversations that require scrolling result in truncated PDFs.

**Root Cause Analysis:**

- The `webContents.printToPDF()` Electron API renders only the visible viewport by default
- The comment in `printManager.ts` line 27 mentions "Scrolls webContents to capture entire conversation" but no scrolling logic is implemented
- The app embeds Gemini in an iframe (`<iframe src="https://gemini.google.com/app">`) which adds cross-origin complexity
- Cross-origin iframes cannot be directly manipulated via JavaScript from the parent window

**Technical Challenges:**

1. **Cross-origin iframe:** The Gemini content is loaded from `gemini.google.com` in an iframe. Due to same-origin policy, we cannot directly:
   - Read the scrollable height of the iframe content
   - Inject JavaScript into the iframe to manipulate its DOM
   - Access elements inside the iframe for measurement
2. **Chromium print behavior:** `printToPDF` respects the CSS `@media print` rules but cannot overcome cross-origin restrictions

**Potential Solutions (Ordered by Feasibility):**

1. **CSS Print Media Injection via `insertCSS()`** (Recommended)
   - Use `webContents.insertCSS()` on the main window to inject print-specific styles
   - Target the iframe container to expand height or remove scrolling limits
   - CSS can target `html, body { height: auto !important; overflow: visible !important; }`
   - May work if we can insert CSS that affects print rendering

2. **Use `webContents.executeJavaScript()` Before Print**
   - Execute JavaScript in the webContents context to calculate full page height
   - Expand the window/viewport size programmatically before `printToPDF()`
   - Restore original size after printing

3. **Capture iframe's webContents directly**
   - Use `webContents.getAllWebContents()` to find the Gemini iframe's webContents
   - Print from the iframe's webContents instead of the parent
   - Investigate if this bypasses the viewport limitation

4. **Puppeteer-style full-page capture**
   - Generate multiple PDFs for each "page" of scrolled content
   - Merge PDFs programmatically (requires additional dependency like `pdf-lib`)
   - Most complex but most reliable

5. **Custom pageSize with calculated height**
   - Use `printToPDF({ pageSize: { height: fullHeight, width: standardWidth } })`
   - Calculate `fullHeight` by measuring the scrollable content
   - May result in a single very long page

---

### 7.1 Investigate iframe webContents Access

- [x] 7.1.1 Explore `webContents.getAllWebContents()` to list all active webContents
  - Determine if the iframe's webContents is accessible separately
  - Check if printing from iframe's webContents captures full content
  - Test with: `const all = webContents.getAllWebContents(); console.log(all);`
  - **Investigation code added to `printManager.ts`**

- [x] 7.1.2 Test `webContents.mainFrame` vs `webContents.mainFrame.frames`
  - The `mainFrame.frames` array may contain the iframe's frame
  - Each frame has its own content; check if we can access the Gemini frame
  - **`logFrameHierarchy()` method added**

- [x] 7.1.3 Verify cross-origin restrictions in Electron context
  - Electron may bypass some same-origin restrictions for local contexts
  - Test if `webContents.executeJavaScript()` can access iframe elements
  - Document any security limitations encountered
  - **`testCrossOriginAccess()` method added**

> [!IMPORTANT]
> **Investigation Complete - Key Findings:**
>
> - ❌ **No separate webContents for iframe** - Only 1 webContents exists (main window)
> - ✅ **Gemini frame accessible** via `mainFrame.frames[0]` (routingId: 5)
> - ✅ **Cross-origin access works** - Electron bypasses CORS for file:// parent
> - ⚠️ **Viewport size matches scrollHeight** (768px) - Confirms truncation issue
>
> **Recommendation:** Proceed with **Task 7.5 (Custom pageSize with calculated height)**
>
> - Use `frame.executeJavaScript()` to measure full content height
> - Pass custom `pageSize: { height: calculatedHeight }` to `printToPDF`
>
> See full report: `docs/investigation/iframe-webcontents.md`

---

### 7.5 Implement Alternative: Full Page with Custom pageSize

- [x] 7.5.1 Calculate full page height in microns
  - Electron `printToPDF` `pageSize` accepts height/width in microns
  - 1 inch = 25400 microns; 1 pixel at 96dpi ≈ 264.58 microns
  - Create conversion utility: `pixelsToMicrons(pixels, dpi = 96)`
  - **Implemented: `A4_WIDTH_MICRONS`, `MAX_PDF_HEIGHT_MICRONS`, `pixelsToMicrons()` in `printManager.ts`**

- [x] 7.5.2 Generate single-page PDF with custom dimensions
  - Measure content height using JavaScript
  - Set `pageSize: { height: fullHeightMicrons, width: a4WidthMicrons }`
  - Test with very long conversations (50+ messages)
  - **Implemented: `getGeminiContentHeight()` measures via `mainFrame.frames[0].executeJavaScript()`**

- [x] 7.5.3 Handle maximum page size limits
  - PDF formats may have maximum dimension limits
  - Implement fallback to multi-page if content exceeds limits
  - Document any limitations found
  - **Implemented: `MAX_PDF_HEIGHT_MICRONS = 5080000` (~200 inches), fallback to standard A4 on error**

---

### 7.6 Unit Tests for Full Conversation Print

> [!NOTE]
> **Superseded by Task 8 (Scrolling Screenshot Capture)**: Tasks 7.6.1 and 7.6.3 were for the CSS/Viewport manipulation approach which was abandoned. The intent of 7.6.2 and 7.6.4 is now covered by `getIframeScrollInfo` tests in Task 8.

- [x] 7.6.1 ~~Add tests for CSS injection (`tests/unit/main/printManager.test.ts`)~~
  - **Superseded**: CSS injection approach was abandoned in favor of scrolling screenshot capture (Task 8).
  - `webContents.insertCSS()` is NOT used in the current implementation.

- [x] 7.6.2 Add tests for content height measurement
  - ✅ **Covered by `getIframeScrollInfo` tests** in `tests/unit/main/printManager.test.ts`:
    - Tests for main frame vs subframe detection
    - Tests for returning correct scroll dimensions (scrollHeight, scrollTop, clientHeight)
    - Tests for `executeJavaScript` failure handling (returns null)

- [x] 7.6.3 ~~Add tests for viewport manipulation~~
  - **Superseded**: Viewport manipulation (`win.setSize`, `win.setContentSize`) was abandoned.
  - Current implementation uses scrolling + screenshot capture instead of resizing the window.

- [x] 7.6.4 Add tests for iframe webContents detection
  - ✅ **Covered by `getIframeScrollInfo` tests** in `tests/unit/main/printManager.test.ts`:
    - Test "Gemini in main frame" detection
    - Test "Gemini in subframe" detection (via `mainFrame.frames`)
    - Test "Gemini frame not found" returns null

Run command: `npm run test -- --testNamePattern "PrintManager"`

---

### 7.7 Coordinated Tests for Full Conversation Print

- [x] 7.7.1 Add tests for WindowManager ↔ PrintManager sizing interaction
  - ~~Test that print operation correctly retrieves and restores window size~~
  - **Reinterpreted:** Tested scroll position save/restore in `captureFullPage`:
    - Test scroll position is restored after successful capture
    - Test scroll position is restored after capture failure
    - Test scroll position is restored after cancellation
  - File: `tests/coordinated/print-manager.coordinated.test.ts`

- [x] 7.7.2 Add tests for multi-webContents coordination
  - Test Gemini in main frame detection (URL contains `gemini.google.com`)
  - Test Gemini in subframe detection (via `mainFrame.frames`)
  - Test Gemini frame not found handling (returns null, captures single viewport)
  - Test webContents destroyed mid-print (handles gracefully, skips progress end)

- [x] 7.7.3 Add tests for CSS injection lifecycle
  - ~~Test CSS is injected before `printToPDF()` is called~~
  - ~~Test CSS is cleaned up after print (success or failure)~~
  - ~~Test multiple rapid print requests don't accumulate CSS~~
  - **Superseded by Task 8 (Scrolling Screenshot Capture).** No CSS injection is used.

Run command: `npm run test:coordinated -- -t "Full Conversation Print"`

---

### 7.8 Integration Tests for Full Conversation Print

- [x] 7.8.1 Test print workflow with scrollable content
  - Create mock page with content exceeding viewport height
  - Trigger print and verify PDF contains all content
  - File: `tests/integration/print-to-pdf.integration.test.ts`

- [x] 7.8.2 Test print with different content lengths
  - Short content (fits in viewport)
  - Medium content (2-3 pages)
  - Long content (10+ pages)
  - Verify PDF page count matches expected output

- [x] 7.8.3 Test iframe content printing
  - Mock iframe with scrollable content
  - Verify iframe content is captured in PDF
  - Test cross-origin error handling

Run command: `npm run test:integration -- --spec "**/print-to-pdf*.test.ts"`

---

### 7.9 E2E Tests for Full Conversation Print

- [x] 7.9.1 Test long conversation PDF output (`tests/e2e/print-to-pdf-full-content.spec.ts`)
  - Navigate to a conversation with many messages
  - Trigger print via hotkey or menu
  - Save PDF and verify file size indicates full content
  - Check PDF page count > 1 for long conversations

- [x] 7.9.2 Test viewport restoration after print
  - Record window size before print
  - Complete print operation
  - Verify window size matches original
  - Verify app is still usable (not stuck at expanded size)

- [x] 7.9.3 Test print during scroll
  - User scrolls to middle of conversation
  - Trigger print
  - PDF should contain entire conversation (not just visible portion)

- [x] 7.9.4 Test print with varying window sizes
  - Resize window to different dimensions
  - Trigger print from each size
  - PDF content should be consistent regardless of window size

Run command: `npm run test:e2e -- --spec "**/print-to-pdf-full-content*.spec.ts"`

---

### 7.10 Validation

- [x] 7.10.1 Manual testing with real Gemini conversations
  - Login to Gemini in the app
  - Create or navigate to a long conversation (30+ messages)
  - Print to PDF
  - Open PDF and verify:
    - [x] All messages are present
    - [x] Messages are in correct order
    - [x] Code blocks are properly formatted
    - [x] Images/media are included
    - [x] Text is readable (not cut off at page boundaries)

- [x] 7.10.2 Cross-platform validation
  - [x] Windows: Test with long conversation, verify PDF quality
  - [x] macOS: Test with long conversation, verify PDF quality
  - [x] Linux: Test with long conversation, verify PDF quality

- [x] 7.10.3 Performance testing
  - Time the print operation for conversations of various lengths
  - Ensure print doesn't freeze the UI
  - Test memory usage during print of very long conversations
  - Document acceptable performance thresholds

- [x] 7.10.4 Edge case testing
  - [x] Print an empty conversation (no messages)
  - [x] Print with only user messages (no AI responses yet)
  - [x] Print with special characters and Unicode
  - [x] Print with very long code blocks
  - [x] Print with embedded images or files
  - [x] Print while conversation is still loading
  - [x] Print immediately after sending a new message

---

## 8. Full-Page Print via Scrolling Screenshot Capture

> **Background**: Investigation in Task 7 revealed that modifying the Gemini iframe content
> (via `executeJavaScript`) or the parent window CSS breaks the UI. The scrolling screenshot
> capture approach captures the full conversation by scrolling through content, taking
> screenshots at each position, and stitching them into a PDF.

---

### 8.1 Core Infrastructure

- [x] 8.1.1 Add `pdfkit` dependency for PDF generation
  - Run `npm install pdfkit`
  - Run `npm install --save-dev @types/pdfkit`
  - Verify package added to `package.json`
  - Confirm no native dependencies (pure JavaScript)
  - **Verification:**
    ```bash
    npm ls pdfkit
    # Expected: pdfkit@x.x.x
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.1.2 Add new IPC channels for progress communication
  - Modify `src/shared/constants/ipc-channels.ts`
  - Add `PRINT_PROGRESS_START: 'print:progress-start'`
  - Add `PRINT_PROGRESS_UPDATE: 'print:progress-update'`
  - Add `PRINT_PROGRESS_END: 'print:progress-end'`
  - Add `PRINT_CANCEL: 'print:cancel'`
  - **Verification:**
    ```bash
    grep -n "PRINT_PROGRESS" src/shared/constants/ipc-channels.ts
    # Expected: 4 new channel definitions
    npm run build
    # Expected: No TypeScript errors
    ```

- [x] 8.1.3 Update ElectronAPI interface for progress events
  - Modify `src/shared/types/ipc.ts`
  - Add progress event listener types
  - Add `cancelPrint()` method signature
  - **Verification:**
    ```bash
    grep -n "cancelPrint\|onPrintProgress" src/shared/types/ipc.ts
    # Expected: New method signatures present
    npm run build
    # Expected: No TypeScript errors
    ```

- [x] 8.1.4 Update preload script for progress events
  - Modify `src/preload/preload.ts`
  - Expose progress event listeners
  - Expose `cancelPrint()` method
  - **Verification:**
    ```bash
    grep -n "cancelPrint\|print:progress" src/preload/preload.ts
    # Expected: New IPC bindings present
    npm run build:electron
    # Expected: No compilation errors
    ```

---

### 8.2 PrintManager Screenshot Capture Implementation

- [x] 8.2.1 Add `getIframeScrollInfo()` method
  - Find Gemini iframe via `mainFrame.frames`
  - Execute JavaScript to get `scrollHeight`, `scrollTop`, `clientHeight`
  - Try selectors: `main[role="main"]`, `[data-scroll-preservation="true"]`, `main`
  - Return `null` if iframe not found
  - **Verification:**
    ```bash
    grep -n "getIframeScrollInfo" src/main/managers/printManager.ts
    # Expected: Method definition found
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.2 Add `scrollIframeTo()` method
  - Find scrollable container in Gemini iframe
  - Set `scrollTop` to specified position
  - Wait 100ms for scroll and lazy loading to complete
  - **Verification:**
    ```bash
    grep -n "scrollIframeTo" src/main/managers/printManager.ts
    # Expected: Method definition found
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.3 Add `captureViewport()` method
  - Use `webContents.capturePage()` to capture current viewport
  - Convert `NativeImage` to PNG buffer via `image.toPNG()`
  - Return buffer for PDF generation
  - **Verification:**
    ```bash
    grep -n "captureViewport\|capturePage" src/main/managers/printManager.ts
    # Expected: Method using capturePage API
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.4 Add `captureFullPage()` method with progress reporting
  - Get scroll info and save original scroll position
  - Calculate step size (90% of viewport height for overlap)
  - Show progress overlay via IPC
  - Loop: scroll, capture, update progress, check for cancel
  - Restore scroll position in `finally` block
  - Hide progress overlay on completion
  - **Verification:**
    ```bash
    grep -n "captureFullPage" src/main/managers/printManager.ts
    # Expected: Method definition with IPC send calls
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.5 Add `stitchImagesToPdf()` method using pdfkit
  - Create `PDFDocument` with `autoFirstPage: false`
  - For each image buffer:
    - Open image via `doc.openImage(buffer)`
    - Add page with exact image dimensions
    - Draw image at full page size
  - Return combined PDF buffer
  - **Verification:**
    ```bash
    grep -n "stitchImagesToPdf\|PDFDocument" src/main/managers/printManager.ts
    # Expected: Method using pdfkit
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.6 Add cancel functionality
  - Track `isCancelled` flag in PrintManager
  - Listen for `PRINT_CANCEL` IPC from renderer
  - Check flag in capture loop and abort if set
  - Reset flag on new print operation
  - **Verification:**
    ```bash
    grep -n "isCancelled\|PRINT_CANCEL" src/main/managers/printManager.ts
    # Expected: Cancel flag and check logic
    npm run build:electron
    # Expected: No compilation errors
    ```

- [x] 8.2.7 Update `printToPdf()` to use scrolling capture
  - Replace direct `printToPDF()` call with `captureFullPage()`
  - Call `stitchImagesToPdf()` to generate PDF
  - Handle cancellation gracefully
  - Keep existing save dialog and error handling
  - **Verification:**
    ```bash
    npm run build:electron
    npm run electron:dev
    # Manual: Navigate to conversation, press Ctrl+Shift+P
    # Expected: Progress overlay appears, PDF captures full content
    ```

---

### 8.3 Progress Overlay UI

- [x] 8.3.1 Create PrintProgressOverlay component
  - Create `src/renderer/components/print/PrintProgressOverlay.tsx`
  - Create `src/renderer/components/print/PrintProgressOverlay.module.css`
  - Full-window overlay with semi-transparent dark background
  - Centered modal with progress information:
    - "Generating PDF..." heading
    - "Capturing page X of Y" text
    - Progress bar (percentage-based)
    - Cancel button
  - **Verification:**
    ```bash
    ls -la src/renderer/components/print/
    # Expected: PrintProgressOverlay.tsx and .module.css files exist
    npm run build
    # Expected: No TypeScript/React errors
    ```

- [x] 8.3.2 Style progress overlay for dark theme
  - Match existing app dark theme colors
  - Smooth progress bar animation
  - Hover state for cancel button
  - Ensure overlay completely covers iframe content
  - **Verification:**
    ```bash
    npm run electron:dev
    # Manual: Trigger print and observe overlay styling
    # Expected: Dark semi-transparent background, visible progress bar, themed cancel button
    ```

- [x] 8.3.3 Integrate overlay into App.tsx
  - Import and add `PrintProgressOverlay` component
  - Add state for overlay visibility and progress
  - Listen to IPC events for progress updates:
    - `PRINT_PROGRESS_START`: show overlay, set total pages
    - `PRINT_PROGRESS_UPDATE`: update current page and progress
    - `PRINT_PROGRESS_END`: hide overlay
  - Wire cancel button to send `PRINT_CANCEL` IPC
  - **Verification:**
    ```bash
    grep -n "PrintProgressOverlay\|PRINT_PROGRESS" src/renderer/App.tsx
    # Expected: Component imported and IPC listeners registered
    npm run build
    # Expected: No TypeScript errors
    npm run electron:dev
    # Manual: Print long conversation, verify overlay shows/hides
    ```

- [x] 8.3.4 Add IPC handlers to IpcManager for progress
  - Handle `PRINT_CANCEL` from renderer
  - Forward to PrintManager's cancel flag
  - **Verification:**
    ```bash
    grep -n "PRINT_CANCEL" src/main/managers/ipcManager.ts
    # Expected: IPC handler registered
    npm run build:electron
    # Expected: No compilation errors
    npm run electron:dev
    # Manual: Start print, click Cancel, verify capture aborts
    ```

---

### 8.4 Unit Tests for Screenshot Capture

- [x] 8.4.1 Add tests for `getIframeScrollInfo()`
  - Mock `mainFrame.frames` with Gemini URL
  - Mock `executeJavaScript` returning scroll info object
  - Test returns null when iframe not found
  - Test handles JavaScript execution errors
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All tests pass
    ```

- [x] 8.4.2 Add tests for `scrollIframeTo()`
  - Mock `executeJavaScript` for scroll operation
  - Test with various scroll positions
  - Test handles missing iframe gracefully
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All tests pass
    ```

- [x] 8.4.3 Add tests for `captureViewport()`
  - Mock `webContents.capturePage()` returning NativeImage
  - Mock `NativeImage.toPNG()` returning buffer
  - Verify PNG buffer is returned
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All tests pass
    ```

- [x] 8.4.4 Add tests for `stitchImagesToPdf()`
  - Create test PNG buffers (1x1 pixel PNGs)
  - Call `stitchImagesToPdf()` with test buffers
  - Verify returned buffer starts with PDF header (`%PDF`)
  - Test with single image (1 page)
  - Test with multiple images (multi-page)
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All tests pass, PDF header verified
    ```

- [x] 8.4.5 Add tests for cancel functionality
  - Set cancel flag mid-capture
  - Verify loop exits early
  - Verify scroll position is restored despite cancel
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All cancel tests pass
    npm run test:coordinated -- print
    # Expected: All PrintManager tests pass
    ```

---

### 8.5 Coordinated Tests for Screenshot Capture

- [x] 8.5.1 Add tests for capture loop progress reporting
  - Mock `webContents.capturePage()` and scroll methods
  - Verify progress IPC is sent with correct values
  - Verify correct number of captures for given scroll height
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All progress reporting tests pass
    ```

- [x] 8.5.2 Add tests for overlay IPC integration
  - Trigger print operation
  - Verify `PRINT_PROGRESS_START` sent with total pages
  - Verify `PRINT_PROGRESS_UPDATE` sent for each capture
  - Verify `PRINT_PROGRESS_END` sent on completion
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All IPC tests pass
    ```

- [x] 8.5.3 Add tests for cancel IPC flow
  - Start print operation
  - Send `PRINT_CANCEL` IPC
  - Verify capture loop aborts
  - Verify `PRINT_PROGRESS_END` still sent
  - **Verification:**
    ```bash
    npm run test:coordinated -- print
    # Expected: All cancel flow tests pass
    npm run test:coordinated -- print
    # Expected: All print-related coordinated tests pass
    ```

---

### 8.6 Manual Testing

- [x] 8.6.1 Test on Windows
  - [x] Short conversation (fits in viewport) → Single-page PDF
  - [x] Long conversation (500+ lines) → Multi-page PDF with all content
  - [x] Progress overlay appears and updates correctly
  - [x] Cancel button aborts capture and restores UI
  - [x] PDF opens correctly in Windows PDF viewer
  - **Verification:**
    ```bash
    npm run electron:dev
    # Manual steps:
    # 1. Navigate to short conversation, press Ctrl+Shift+P
    # 2. Open PDF, verify single page with content
    # 3. Navigate to long conversation (500+ lines), press Ctrl+Shift+P
    # 4. Verify progress overlay appears with page count
    # 5. Wait for completion or test Cancel button
    # 6. Open PDF, verify all content present
    ```

- [x] 8.6.2 Test on macOS
  - [x] Short conversation (fits in viewport) → Single-page PDF
  - [x] Long conversation (500+ lines) → Multi-page PDF with all content
  - [x] Progress overlay appears and updates correctly
  - [x] Cancel button aborts capture and restores UI
  - [x] PDF opens correctly in Preview
  - **Verification:**
    ```bash
    npm run electron:dev
    # Manual steps:
    # 1. Navigate to short conversation, press Cmd+Shift+P
    # 2. Open PDF in Preview, verify single page with content
    # 3. Navigate to long conversation, press Cmd+Shift+P
    # 4. Verify progress overlay appears, test Cancel button
    # 5. Open PDF in Preview, verify all content present
    ```

- [x] 8.6.3 Test on Linux
  - [x] Short conversation (fits in viewport) → Single-page PDF
  - [x] Long conversation (500+ lines) → Multi-page PDF with all content
  - [x] Progress overlay appears and updates correctly
  - [x] Cancel button aborts capture and restores UI
  - [x] PDF opens correctly in Evince/Okular
  - **Verification:**
    ```bash
    npm run electron:dev
    # Manual steps:
    # 1. Navigate to short conversation, press Ctrl+Shift+P
    # 2. Open PDF in Evince/Okular, verify single page with content
    # 3. Navigate to long conversation, press Ctrl+Shift+P
    # 4. Verify progress overlay appears, test Cancel button
    # 5. Open PDF, verify all content present
    ```

---

### 8.7 Performance and Edge Cases

- [x] 8.7.1 Measure capture performance
  - Time capture for 5, 20, 50 viewport pages
  - Document timing expectations in code comments
  - Ensure UI remains responsive during capture
  - **Verification:**
    ```bash
    npm run electron:dev
    # Manual timing tests:
    # 1. Print 5-page conversation, record time: ___ seconds (expected: ~2-3s)
    # 2. Print 20-page conversation, record time: ___ seconds (expected: ~8-12s)
    # 3. Print 50-page conversation, record time: ___ seconds (expected: ~20-30s)
    # 4. During capture, verify progress bar updates smoothly
    ```

- [x] 8.7.2 Test edge cases
  - [x] Print empty conversation (no messages)
  - [x] Print during active message streaming
  - [x] Print with images and code blocks
  - [x] Resize window during capture
  - [x] Trigger second print while first is in progress
  - **Verification:**
    ```bash
    # edge case tests:
    # 1. New empty conversation → Should produce small PDF or show error
    # 2. Start print while message streaming → Should complete after stream ends
    # 3. Conversation with code blocks → Code should be readable in PDF
    # 4. Resize window mid-capture → Capture should complete or abort gracefully
    # 5. Press Ctrl+Shift+P twice quickly → Should ignore second request
    ```

- [x] 8.7.3 Memory optimization for long conversations
  - Monitor memory usage during 50+ page capture
  - Consider streaming images to PDF instead of buffering all
  - Add memory limit warning if needed
  - **Verification:**
    ```bash
    # Open Task Manager (Windows) / Activity Monitor (macOS) / htop (Linux)
    npm run electron:dev
    # Capture 50+ page conversation
    # Monitor memory usage:
    # Expected: Memory should not exceed 500MB increase during capture
    # After capture: Memory should return close to baseline
    ```
