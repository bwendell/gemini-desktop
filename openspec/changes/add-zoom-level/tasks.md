# Tasks: Add Zoom Level Control

## 1. Core Infrastructure

**Files to modify:**

- [MODIFY] `src/main/store.ts` - Add zoom level default to settings schema
- [MODIFY] `src/shared/constants/ipc-channels.ts` - Add zoom IPC channels (if needed for menu updates)

**Verification:** `npm run typecheck && npm run lint`

**References:**

- [store.ts](file:///c:/Users/bwend/repos/gemini/src/main/store.ts) - Settings persistence pattern
- [ipc-channels.ts](file:///c:/Users/bwend/repos/gemini/src/shared/constants/ipc-channels.ts) - IPC channel definitions

**Tasks:**

- [x] 1.1 Add `zoomLevel` to settings store defaults (default: 100)
    - **Acceptance:** `store.get('zoomLevel')` returns 100 for new installations

---

## 2. Zoom Control Logic

**Files to modify:**

- [MODIFY] `src/main/managers/windowManager.ts` - Add zoom control methods

**Verification:** `npm run test:electron -- windowManager`

**References:**

- [windowManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/windowManager.ts) - Window management patterns

**Tasks:**

- [x] 2.1 Define zoom level steps array: [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]
    - **Acceptance:** Array is defined as a constant in windowManager or a shared constants file

- [x] 2.2 Implement `getZoomLevel(): number` method
    - **Acceptance:** Returns current zoom level percentage from store

- [x] 2.3 Implement `setZoomLevel(level: number): void` method
    - **Acceptance:** Sets zoom on main window webContents and persists to store

- [x] 2.4 Implement `zoomIn(): void` method
    - **Acceptance:** Increases zoom to next step, capped at 200%

- [x] 2.5 Implement `zoomOut(): void` method
    - **Acceptance:** Decreases zoom to previous step, capped at 50%

- [x] 2.6 Add zoom level validation/sanitization on load
    - **Acceptance:** Invalid values (NaN, null, out-of-range) are corrected to valid values

- [x] 2.7 Add guard for missing/destroyed main window
    - **Acceptance:** Zoom operations silently return when window unavailable (no errors thrown)

- [x] 2.8 Handle non-standard zoom steps (snap to nearest)
    - **Acceptance:** When current zoom is not in step array, zoomIn/Out snaps to nearest valid step

- [x] 2.9 Add zoom level restored on main window creation
    - **Acceptance:** Main window applies stored zoom level when created

---

## 3. Menu Integration

**Files to modify:**

- [MODIFY] `src/main/managers/menuManager.ts` - Add zoom items to View menu

**Verification:** `npm run test:electron -- menuManager`

**References:**

- [menuManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/menuManager.ts) - Menu construction, especially `buildViewMenu()`

**Tasks:**

- [x] 3.1 Add "Zoom In" menu item with Ctrl+= accelerator
    - **Acceptance:** Menu item visible in View menu with correct accelerator label

- [x] 3.2 Add "Zoom Out" menu item with Ctrl+- accelerator
    - **Acceptance:** Menu item visible in View menu with correct accelerator label

- [x] 3.3 Display current zoom percentage in menu item labels
    - **Acceptance:** Menu items show "(100%)" when at default zoom

- [x] 3.4 Wire menu items to windowManager.zoomIn/zoomOut methods
    - **Acceptance:** Clicking menu items changes zoom level

- [x] 3.5 Rebuild menu after zoom level changes to update displayed percentage
    - **Acceptance:** Menu shows updated percentage after zoom change

---

## 4. Unit Tests

**Files to create:**

- [NEW] `tests/unit/main/zoom.test.ts` - Unit tests for zoom logic

**Verification:** `npm run test:electron`

**References:**

- [windowManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/windowManager.test.ts) - Existing window manager tests

**Tasks:**

- [x] 4.1 Test zoom level clamping at boundaries (50%, 200%)
    - **Acceptance:** Tests verify `setZoomLevel(30)` clamps to 50%, `setZoomLevel(250)` clamps to 200%

- [x] 4.2 Test zoom step progression
    - **Acceptance:** Tests verify `zoomIn()` from 100% → 110%, `zoomOut()` from 100% → 90%

- [x] 4.3 Test zoom level persistence via event
    - **Acceptance:** Tests verify `zoom-level-changed` event emitted with correct value when zoom changes

- [x] 4.4 Test invalid stored zoom values are sanitized
    - **Acceptance:** `initializeZoomLevel(NaN)`, `initializeZoomLevel(null)`, `initializeZoomLevel(undefined)`, `initializeZoomLevel(-50)` all result in valid zoom level

- [x] 4.5 Test zoom operations with missing main window
    - **Acceptance:** `setZoomLevel()`, `zoomIn()`, `zoomOut()` do not throw when `getMainWindow()` returns null

- [x] 4.6 Test snap to nearest step for non-standard zoom values
    - **Acceptance:** `zoomIn()` from 112% → 125%, `zoomOut()` from 112% → 110%

- [x] 4.7 Test `getZoomLevel()` returns current zoom level
    - **Acceptance:** Returns internal `_zoomLevel` value accurately

- [x] 4.8 Test `zoomIn()` does nothing at maximum (200%)
    - **Acceptance:** `zoomIn()` from 200% remains at 200%, no event emitted

- [x] 4.9 Test `zoomOut()` does nothing at minimum (50%)
    - **Acceptance:** `zoomOut()` from 50% remains at 50%, no event emitted

- [x] 4.10 Test `setZoomLevel()` with same value is no-op
    - **Acceptance:** `setZoomLevel(100)` when already at 100% does not emit event or apply zoom

- [x] 4.11 Test `_sanitizeZoomLevel()` handles Infinity and -Infinity
    - **Acceptance:** `Infinity` clamps to 200%, `-Infinity` clamps to 50%

- [x] 4.12 Test `_sanitizeZoomLevel()` handles string inputs
    - **Acceptance:** String values like `"100"` return default 100%

- [x] 4.13 Test `_findNearestZoomStep()` finds correct nearest step
    - **Acceptance:** 112% → 110%, 117% → 125%, 62% → 67%

- [x] 4.14 Test `applyZoomLevel()` calls webContents.setZoomFactor
    - **Acceptance:** `setZoomFactor(1.0)` called at 100%, `setZoomFactor(0.5)` at 50%

- [x] 4.15 Test zoom operations with destroyed main window
    - **Acceptance:** No errors when `window.isDestroyed()` returns true

---

## 5. Coordinated Tests

**Files to create:**

- [NEW] `tests/coordinated/zoom-control.coordinated.test.ts` - Tests for IpcManager-WindowManager integration

**Verification:** `npm run test:coordinated`

**References:**

- [settings-persistence.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/settings-persistence.coordinated.test.ts) - Persistence pattern

**Tasks:**

- [x] 5.1 Test IpcManager initializes zoom from store on setup
    - **Acceptance:** `windowManager.initializeZoomLevel()` called with stored value during `setupIpcHandlers()`

- [x] 5.2 Test `zoom-level-changed` event triggers store persistence
    - **Acceptance:** `store.set('zoomLevel', level)` called when WindowManager emits event

- [x] 5.3 Test invalid stored zoom values are sanitized on initialization
    - **Acceptance:** Store value of `NaN` results in zoom level of 100%

- [x] 5.4 Test cross-platform behavior (darwin, win32, linux)
    - **Acceptance:** Zoom persistence works identically on all platforms

- [x] 5.5 Test menu item click triggers zoom change (when menu integration complete)
    - **Acceptance:** Menu click results in correct zoom level being set

- [x] 5.6 Test menu label updates after zoom change (when menu integration complete)
    - **Acceptance:** Menu rebuilt with updated percentage after zoom

- [x] 5.7 Test zoom level applied after main window creation
    - **Acceptance:** `applyZoomLevel()` called after window is ready

- [x] 5.8 Test store persistence failure is logged but doesn't throw
    - **Acceptance:** When `store.set()` returns false, error is logged but no exception

---

## 6. Integration Tests

**Files to create:**

- [NEW] `tests/integration/zoom-control.integration.test.ts` - Real Electron integration tests

**Verification:** `npm run test:integration`

**References:**

- [options-window.integration.test.ts](file:///c:/Users/bwend/repos/gemini/tests/integration/options-window.integration.test.ts) - Integration test pattern

**Tasks:**

- [x] 6.1 Test zoom factor applied to main window webContents
    - **Acceptance:** `browser.electron.execute` confirms `webContents.getZoomFactor()` matches set level

- [x] 6.2 Test zoom level readable via WindowManager
    - **Acceptance:** `global.windowManager.getZoomLevel()` returns current zoom percentage

- [x] 6.3 Test `zoomIn()` increases actual webContents zoom factor
    - **Acceptance:** After `zoomIn()`, `webContents.getZoomFactor()` is higher

- [x] 6.4 Test `zoomOut()` decreases actual webContents zoom factor
    - **Acceptance:** After `zoomOut()`, `webContents.getZoomFactor()` is lower

- [x] 6.5 Test zoom level persists to settings file
    - **Acceptance:** Settings JSON file contains updated `zoomLevel` value

- [x] 6.6 Test zoom level restored after app restart
    - **Acceptance:** After setting zoom to 150%, restart, `getZoomLevel()` returns 150%

- [x] 6.7 Test zoom only affects main window (not Options or Quick Chat)
    - **Acceptance:** Options window and Quick Chat window `getZoomFactor()` remain at 1.0
    - **Note:** 3 multi-window tests skipped due to `browser.electron.execute()` serialization issue with non-main window webContents

---

## 7. E2E Tests (All Platforms)

**Files to create/modify:**

- [NEW] `tests/e2e/zoom-control.spec.ts` - End-to-end zoom tests (shared + macOS native menu)
- [NEW] `tests/e2e/zoom-titlebar.spec.ts` - Custom titlebar zoom tests (Windows/Linux only)

**Verification:** `npm run test:e2e`

**References:**

- [text-prediction-options.spec.ts](file:///c:/Users/bwend/repos/gemini/tests/e2e/text-prediction-options.spec.ts) - E2E test patterns
- [E2E_TESTING_GUIDELINES.md](file:///c:/Users/bwend/repos/gemini/docs/E2E_TESTING_GUIDELINES.md) - E2E testing rules

> [!IMPORTANT]
> MacOS uses the native menu bar (menuManager.ts). Windows and Linux use a custom titlebar menu (useMenuDefinitions.ts). Keyboard shortcuts work across all platforms, but menu interaction tests must be platform-specific.

### 7.1 Core Keyboard Shortcuts (All Platforms)

These tests verify keyboard shortcut functionality and should pass on all platforms:

- [x] 7.1.1 Test Ctrl+= zooms in via keyboard shortcut
    - **Acceptance:** Pressing Ctrl+= keys increases zoom, verified via API
    - **File:** `tests/e2e/zoom-control.spec.ts`

- [x] 7.1.2 Test Ctrl+- zooms out via keyboard shortcut
    - **Acceptance:** Pressing Ctrl+- keys decreases zoom, verified via API
    - **File:** `tests/e2e/zoom-control.spec.ts`

- [x] 7.1.3 Test multiple zoom in presses reach 200% cap
    - **Acceptance:** After multiple Ctrl+= presses, zoom stops at 200%
    - **File:** `tests/e2e/zoom-control.spec.ts`

- [x] 7.1.4 Test multiple zoom out presses reach 50% cap
    - **Acceptance:** After multiple Ctrl+- presses, zoom stops at 50%
    - **File:** `tests/e2e/zoom-control.spec.ts`

- [x] 7.1.5 Test zoom level persists across app restart
    - **Acceptance:** Set zoom to 150%, restart app, zoom is still 150%
    - **File:** `tests/e2e/zoom-control.spec.ts`

- [x] 7.1.6 Test zoom shortcuts work when main window has focus
    - **Acceptance:** Ctrl+= works only when app is focused, not globally
    - **File:** `tests/e2e/zoom-control.spec.ts`

### 7.2 Native Menu Tests (macOS Only)

These tests verify the native menu bar integration specific to macOS:

- [x] 7.2.1 Test View menu shows current zoom percentage
    - **Acceptance:** Menu item label contains "(100%)" at default zoom
    - **File:** `tests/e2e/zoom-control.spec.ts` (skip on Windows/Linux)

- [x] 7.2.2 Test clicking View > Zoom In menu item increases zoom
    - **Acceptance:** Clicking menu item changes zoom, verified by subsequent menu label
    - **File:** `tests/e2e/zoom-control.spec.ts` (skip on Windows/Linux)

- [x] 7.2.3 Test clicking View > Zoom Out menu item decreases zoom
    - **Acceptance:** Clicking menu item changes zoom, verified by subsequent menu label
    - **File:** `tests/e2e/zoom-control.spec.ts` (skip on Windows/Linux)

### 7.3 Custom Titlebar Menu Tests (Windows/Linux Only)

These tests verify the custom titlebar menu integration specific to Windows and Linux:

- [x] 7.3.1 Test custom titlebar View menu shows Zoom In item with percentage
    - **Acceptance:** Click View menu, Zoom In item visible with (100%) label
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.2 Test custom titlebar View menu shows Zoom Out item with percentage
    - **Acceptance:** Click View menu, Zoom Out item visible with (100%) label
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.3 Test clicking Zoom In menu item increases zoom
    - **Acceptance:** Click Zoom In, menu label updates to show higher percentage
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.4 Test clicking Zoom Out menu item decreases zoom
    - **Acceptance:** Click Zoom Out, menu label updates to show lower percentage
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.5 Test zoom label updates after zoom change
    - **Acceptance:** Menu item labels reflect new zoom percentage after change
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.6 Test custom titlebar zoom bounded at 200%
    - **Acceptance:** Multiple Zoom In clicks stop at 200%
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

- [x] 7.3.7 Test custom titlebar zoom bounded at 50%
    - **Acceptance:** Multiple Zoom Out clicks stop at 50%
    - **File:** `tests/e2e/zoom-titlebar.spec.ts` (skip on macOS)

### 7.4 Visual Verification (All Platforms)

- [x] 7.4.1 Test zoom change is visually reflected in Gemini iframe
    - **Acceptance:** Content appears larger/smaller after zoom change (visual verification)
    - **File:** `tests/e2e/zoom-control.spec.ts`

---

## 8. Documentation

**Files to modify:**

- [MODIFY] `docs/ARCHITECTURE.md` - Document zoom feature

**Verification:** Manual review

**Tasks:**

- [x] 8.1 Add zoom control to ARCHITECTURE.md View menu section
    - **Acceptance:** Documentation explains zoom feature and its scope (main window only)

---

## 9. Custom Titlebar Menu Integration (Windows/Linux)

**Files to modify:**

- [MODIFY] `src/renderer/components/titlebar/useMenuDefinitions.ts` - Add zoom items to View menu
- [MODIFY] `src/preload/preload.ts` - Expose zoom IPC methods
- [MODIFY] `src/main/managers/ipcManager.ts` - Add zoom IPC handlers

**Verification:** `npm run test:electron && npm run test:coordinated && npm run test:integration && npm run test:e2e`

**References:**

- [useMenuDefinitions.ts](file:///c:/Users/bwend/repos/gemini/src/renderer/components/titlebar/useMenuDefinitions.ts) - Custom titlebar menu definitions
- [preload.ts](file:///c:/Users/bwend/repos/gemini/src/preload/preload.ts) - Preload API exposure
- [ipcManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts) - IPC handler registration

**Tasks:**

### 9.1 Implementation

- [x] 9.1.1 Add zoom IPC handlers to ipcManager
    - **Acceptance:** `zoom:get-level`, `zoom:zoom-in`, `zoom:zoom-out` handlers registered

- [x] 9.1.2 Expose zoom methods in preload API
    - **Acceptance:** `window.electronAPI.getZoomLevel()`, `zoomIn()`, `zoomOut()`, `onZoomLevelChanged()` available

- [x] 9.1.3 Add Zoom In menu item to useMenuDefinitions View menu
    - **Acceptance:** "Zoom In (100%)" item with Ctrl+= shortcut visible in custom titlebar View menu

- [x] 9.1.4 Add Zoom Out menu item to useMenuDefinitions View menu
    - **Acceptance:** "Zoom Out (100%)" item with Ctrl+- shortcut visible in custom titlebar View menu

- [x] 9.1.5 Add zoom level state and update handler in useMenuDefinitions
    - **Acceptance:** Menu labels update dynamically when zoom level changes

### 9.2 Unit Tests

**File:** `tests/unit/renderer/hooks/useMenuDefinitions.test.tsx`

- [x] 9.2.1 Test zoom menu items are present in View menu
    - **Acceptance:** Menu definition includes Zoom In and Zoom Out items with correct IDs

- [x] 9.2.2 Test zoom menu items have correct shortcuts
    - **Acceptance:** Zoom In has "Ctrl+=" and Zoom Out has "Ctrl+-" shortcuts

- [x] 9.2.3 Test zoom menu items display current zoom percentage
    - **Acceptance:** Labels include "(100%)" when at default zoom

### 9.3 Coordinated Tests

**File:** `tests/coordinated/zoom-titlebar.coordinated.test.ts`

- [x] 9.3.1 Test zoom IPC handlers registered on setup
    - **Acceptance:** `ipcMain.handle` called for zoom:get-level, zoom:zoom-in, zoom:zoom-out

- [x] 9.3.2 Test zoom:get-level returns current zoom level
    - **Acceptance:** Handler returns `windowManager.getZoomLevel()` value

- [x] 9.3.3 Test zoom:zoom-in calls windowManager.zoomIn()
    - **Acceptance:** Handler invokes zoomIn and returns new level

- [x] 9.3.4 Test zoom:zoom-out calls windowManager.zoomOut()
    - **Acceptance:** Handler invokes zoomOut and returns new level

- [x] 9.3.5 Test zoom-level-changed event sent to renderer
    - **Acceptance:** IPC message sent when zoom changes

### 9.4 Integration Tests

**File:** `tests/integration/zoom-titlebar.integration.test.ts`

- [x] 9.4.1 Test window.electronAPI.getZoomLevel() returns current zoom
    - **Acceptance:** Renderer can read zoom level via IPC

- [x] 9.4.2 Test window.electronAPI.zoomIn() increases zoom
    - **Acceptance:** Calling zoomIn() from renderer increases actual zoom factor

- [x] 9.4.3 Test window.electronAPI.zoomOut() decreases zoom
    - **Acceptance:** Calling zoomOut() from renderer decreases actual zoom factor

- [x] 9.4.4 Test zoom level change event received in renderer
    - **Acceptance:** Renderer receives zoom-level-changed event after zoom operation
