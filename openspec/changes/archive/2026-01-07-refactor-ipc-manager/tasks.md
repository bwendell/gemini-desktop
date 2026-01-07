# Tasks: Refactor IpcManager into Domain-Specific Handlers

> [!IMPORTANT]
> Each phase follows a **Refactor → Validate → Test → Verify** cycle. All tests (unit, coordinated, integration, E2E) must pass before proceeding to the next phase.

---

## Phase 1: Foundation & Simple Handlers

### 1.1 Create Base Infrastructure

**Files:**

- [NEW] `src/main/managers/ipc/types.ts` - Shared types and interfaces
- [NEW] `src/main/managers/ipc/BaseIpcHandler.ts` - Abstract base class
- [NEW] `src/main/managers/ipc/index.ts` - Barrel exports

**Context:**

- Review [ipcManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts) for patterns to extract
- See `design.md` for `IpcHandlerDependencies` interface specification

**Acceptance Criteria:**

- `IpcHandlerDependencies` interface defined with all manager types
- `BaseIpcHandler` abstract class implemented with:
    - Constructor accepting `IpcHandlerDependencies`
    - Abstract `register(): void` method
    - Optional `initialize?(): void | Promise<void>` method
    - Protected `getWindowFromEvent()` helper (extracted from current `_getWindowFromEvent`)
    - Protected `broadcastToAllWindows()` helper (consolidating 8+ duplicate patterns)
    - Protected `handleError()` helper for consistent logging
- Barrel file exports all public types

**Subtasks:**

- [x] 1.1.1 Create `src/main/managers/ipc/` directory
- [x] 1.1.2 Create `types.ts` with `IpcHandlerDependencies` interface
    - Include: store, logger, windowManager, hotkeyManager?, updateManager?, printManager?, llmManager?
- [x] 1.1.3 Create `BaseIpcHandler.ts` abstract class with constructor
    - Accept `IpcHandlerDependencies` and store as protected property
- [x] 1.1.4 Add abstract `register(): void` method to BaseIpcHandler
- [x] 1.1.5 Add optional `initialize?(): void | Promise<void>` method signature
- [x] 1.1.6 Implement protected `getWindowFromEvent()` helper
    - Extract pattern from ipcManager.ts:270-277
- [x] 1.1.7 Implement protected `broadcastToAllWindows()` helper
    - Consolidate duplicate broadcast pattern (appears 8+ times)
    - Handle destroyed windows gracefully
- [x] 1.1.8 Implement protected `handleError()` helper for consistent logging
- [x] 1.1.9 Create `index.ts` barrel file exporting all types and BaseIpcHandler
- [x] 1.1.10 Write unit test for `getWindowFromEvent()` returning null for destroyed window
- [x] 1.1.11 Write unit test for `broadcastToAllWindows()` skipping destroyed windows
- [x] 1.1.12 Write unit test for `handleError()` logging with context

**Verification:**

```bash
npm run typecheck
npm run lint
npm run test -- BaseIpcHandler
```

---

### 1.2 Create ShellIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/ShellIpcHandler.ts` - Shell operations handler
- [NEW] `tests/unit/main/ipc/ShellIpcHandler.test.ts` - Unit tests

**Context:**

- Extract `_setupShellHandlers()` from [ipcManager.ts:1231-1248](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L1231-L1248)
- Simplest handler - only `shell:show-item-in-folder` channel, no dependencies

**Acceptance Criteria:**

- Handler registers `shell:show-item-in-folder` channel
- Input validation for empty/invalid file paths
- Error logging matches current behavior exactly

**Subtasks:**

- [x] 1.2.1 Create ShellIpcHandler class extending BaseIpcHandler
- [x] 1.2.2 Implement `register()` with shell:show-item-in-folder handler
- [x] 1.2.3 Write unit test: valid file path calls shell.showItemInFolder
- [x] 1.2.4 Write unit test: empty string path is rejected with warning
- [x] 1.2.5 Write unit test: non-string path is rejected with warning
- [x] 1.2.6 Write unit test: shell.showItemInFolder error is logged

**Verification:**

```bash
npm run test -- ShellIpcHandler
```

---

### 1.3 Create WindowIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/WindowIpcHandler.ts` - Window control handler
- [NEW] `tests/unit/main/ipc/WindowIpcHandler.test.ts` - Unit tests

**Context:**

- Extract `_setupWindowHandlers()` from [ipcManager.ts:284-355](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L284-L355)
- Handles: minimize, maximize, close, show, isMaximized

**Acceptance Criteria:**

- All 5 window IPC channels registered
- Null/destroyed window checks for all operations
- Error logging for window operation failures

**Subtasks:**

- [x] 1.3.1 Create WindowIpcHandler class extending BaseIpcHandler
- [x] 1.3.2 Implement minimize handler with destroyed window check
- [x] 1.3.3 Implement maximize/unmaximize toggle handler
- [x] 1.3.4 Implement close handler with destroyed window check
- [x] 1.3.5 Implement show handler (delegates to windowManager.restoreFromTray)
- [x] 1.3.6 Implement isMaximized handler returning boolean
- [x] 1.3.7 Write unit test: minimize on null window does not throw
- [x] 1.3.8 Write unit test: minimize on destroyed window does not throw
- [x] 1.3.9 Write unit test: maximize toggles to unmaximize when maximized
- [x] 1.3.10 Write unit test: maximize maximizes when not maximized
- [x] 1.3.11 Write unit test: close on destroyed window does not throw
- [x] 1.3.12 Write unit test: show calls windowManager.restoreFromTray
- [x] 1.3.13 Write unit test: isMaximized returns false for null window
- [x] 1.3.14 Write unit test: isMaximized returns correct state for valid window
- [x] 1.3.15 Write unit test: error during minimize is logged

**Verification:**

```bash
npm run test -- WindowIpcHandler
```

---

### 1.4 Integrate Phase 1 Handlers into IpcManager

**Files:**

- [MODIFY] `src/main/managers/ipcManager.ts` - Import and use new handlers

**Context:**

- Keep existing handler code in place (commented or alongside)
- Add handler array and registration loop

**Acceptance Criteria:**

- ShellIpcHandler and WindowIpcHandler instantiated in constructor
- Handlers registered during `setupIpcHandlers()`
- Original `_setupShellHandlers()` and `_setupWindowHandlers()` removed/replaced
- No behavioral changes - all existing tests pass

**Subtasks:**

- [x] 1.4.1 Import handler classes and types
- [x] 1.4.2 Add private `handlers: BaseIpcHandler[]` array
- [x] 1.4.3 Create handler instances in constructor
- [x] 1.4.4 Add handler registration loop in `setupIpcHandlers()`
- [x] 1.4.5 Remove `_setupShellHandlers()` method (functionality moved)
- [x] 1.4.6 Remove `_setupWindowHandlers()` method (functionality moved)

**Verification:**

```bash
npm run typecheck
npm run test
npm run test:coordinated
npm run test:integration
npm run test:e2e
```

---

### [x] 1.5 Phase 1 Validation

**Files:**

- No new files - validation only

**Acceptance Criteria:**

- All unit tests pass
- All coordinated tests pass
- All integration tests pass
- All E2E tests pass
- No performance regression (app starts in similar time)

**Verification:**

```bash
npm run test:all
npm run build && npm run electron:dev
```

---

## Phase 2: State Management Handlers

### 2.1 Create ThemeIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/ThemeIpcHandler.ts` - Theme management handler
- [NEW] `tests/unit/main/ipc/ThemeIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/ThemeIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupThemeHandlers()` and `_broadcastThemeChange()` from [ipcManager.ts:362-431](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L362-L431)
- Also extract `_initializeNativeTheme()` for handler initialization

**Acceptance Criteria:**

- theme:get handler returns preference and effectiveTheme
- theme:set handler validates input, persists, updates nativeTheme, broadcasts
- Invalid theme values are logged and rejected
- Broadcast errors are logged but don't affect other windows

**Subtasks:**

- [x] 2.1.1 Create ThemeIpcHandler class with nativeTheme dependency
- [x] 2.1.2 Implement `initialize()` to set nativeTheme on startup
- [x] 2.1.3 Implement theme:get handler
- [x] 2.1.4 Implement theme:set handler with validation
- [x] 2.1.5 Implement `_broadcastThemeChange()` using base helper
- [x] 2.1.6 Write unit test: get returns stored preference and effective theme
- [x] 2.1.7 Write unit test: get defaults to 'system' if not set
- [x] 2.1.8 Write unit test: set with 'light' updates store and nativeTheme
- [x] 2.1.9 Write unit test: set with 'dark' updates store and nativeTheme
- [x] 2.1.10 Write unit test: set with 'system' updates store and nativeTheme
- [x] 2.1.11 Write unit test: set with invalid value is rejected
- [x] 2.1.12 Write unit test: broadcast is called after successful set
- [x] 2.1.13 Write coordinated test: theme persists to store
- [x] 2.1.14 Write coordinated test: all windows receive broadcast

**Verification:**

```bash
npm run test -- ThemeIpcHandler
npm run test:coordinated -- ThemeIpcHandler
```

---

### 2.2 Create ZoomIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/ZoomIpcHandler.ts` - Zoom level handler
- [NEW] `tests/unit/main/ipc/ZoomIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/ZoomIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupZoomHandlers()`, `_initializeZoomLevel()`, `_handleZoomLevelChanged()`, `_broadcastZoomLevelChange()` from [ipcManager.ts:773-865](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L773-L865)

**Acceptance Criteria:**

- zoom:get-level returns current zoom from windowManager
- zoom:zoom-in/zoom-out delegate to windowManager and return new level
- Zoom level changes are persisted and broadcast
- Error cases return safe defaults (100%)

**Subtasks:**

- [x] 2.2.1 Create ZoomIpcHandler class with windowManager dependency
- [x] 2.2.2 Implement `initialize()` to restore zoom level from store
- [x] 2.2.3 Subscribe to windowManager `zoom-level-changed` event
- [x] 2.2.4 Implement zoom:get-level handler
- [x] 2.2.5 Implement zoom:zoom-in handler
- [x] 2.2.6 Implement zoom:zoom-out handler
- [x] 2.2.7 Implement `_handleZoomLevelChanged()` for persistence/broadcast
- [x] 2.2.8 Write unit test: get-level returns windowManager.getZoomLevel()
- [x] 2.2.9 Write unit test: get-level returns 100 on error
- [x] 2.2.10 Write unit test: zoom-in calls windowManager.zoomIn()
- [x] 2.2.11 Write unit test: zoom-out calls windowManager.zoomOut()
- [x] 2.2.12 Write unit test: zoom change persists to store
- [x] 2.2.13 Write unit test: zoom change broadcasts to all windows
- [x] 2.2.14 Write coordinated test: initialization applies stored zoom

**Verification:**

```bash
npm run test -- ZoomIpcHandler
npm run test:coordinated -- ZoomIpcHandler
```

---

### [x] 2.3 Create AlwaysOnTopIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/AlwaysOnTopIpcHandler.ts` - Always-on-top handler
- [NEW] `tests/unit/main/ipc/AlwaysOnTopIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/AlwaysOnTopIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupAlwaysOnTopHandlers()`, `_initializeAlwaysOnTop()`, `_handleAlwaysOnTopChanged()`, `_broadcastAlwaysOnTopChange()` from [ipcManager.ts:689-771](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L689-L771)

**Acceptance Criteria:**

- always-on-top:get returns current state from store
- always-on-top:set validates boolean, delegates to windowManager
- State changes are persisted and broadcast
- Invalid enabled values are logged and rejected

**Subtasks:**

- [x] 2.3.1 Create AlwaysOnTopIpcHandler class
- [x] 2.3.2 Implement `initialize()` to restore state from store
- [x] 2.3.3 Subscribe to windowManager `always-on-top-changed` event
- [x] 2.3.4 Implement always-on-top:get handler
- [x] 2.3.5 Implement always-on-top:set handler with validation
- [x] 2.3.6 Implement `_handleAlwaysOnTopChanged()` for persistence/broadcast
- [x] 2.3.7 Write unit test: get returns stored state
- [x] 2.3.8 Write unit test: get defaults to false if not set
- [x] 2.3.9 Write unit test: set with true calls windowManager.setAlwaysOnTop(true)
- [x] 2.3.10 Write unit test: set with false calls windowManager.setAlwaysOnTop(false)
- [x] 2.3.11 Write unit test: set with non-boolean is rejected
- [x] 2.3.12 Write unit test: change event persists to store
- [x] 2.3.13 Write coordinated test: state broadcasts to all windows

**Verification:**

```bash
npm run test -- AlwaysOnTopIpcHandler
npm run test:coordinated -- AlwaysOnTopIpcHandler
```

---

### [x] 2.4 Integrate Phase 2 Handlers into IpcManager

**Files:**

- [MODIFY] `src/main/managers/ipcManager.ts` - Add Phase 2 handlers

**Acceptance Criteria:**

- ThemeIpcHandler, ZoomIpcHandler, AlwaysOnTopIpcHandler instantiated
- Handlers registered and initialized during setup
- Original methods removed
- All existing tests pass

**Subtasks:**

- [x] 2.4.1 Import Phase 2 handler classes
- [x] 2.4.2 Add handler instances to constructor
- [x] 2.4.3 Remove `_setupThemeHandlers()`, `_initializeNativeTheme()` methods
- [x] 2.4.4 Remove `_setupZoomHandlers()`, `_initializeZoomLevel()`, `_handleZoomLevelChanged()`, `_broadcastZoomLevelChange()` methods
- [x] 2.4.5 Remove `_setupAlwaysOnTopHandlers()`, `_initializeAlwaysOnTop()`, `_handleAlwaysOnTopChanged()`, `_broadcastAlwaysOnTopChange()` methods

**Verification:**

```bash
npm run test:all
```

---

### 2.5 Phase 2 Validation

**Acceptance Criteria:**

- All tests pass
- Theme switching works in UI
- Zoom controls work via menu and shortcuts
- Always-on-top toggle works

**Verification:**

```bash
npm run test:all
npm run build && npm run electron:dev
```

---

## Phase 3: Manager-Dependent Handlers

### [x] 3.1 Create PrintIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/PrintIpcHandler.ts` - Print operations handler
- [NEW] `tests/unit/main/ipc/PrintIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/PrintIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupPrintHandlers()` from [ipcManager.ts:1028-1073](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L1028-L1073)
- Handles IPC trigger, cancel, and local event from windowManager

**Acceptance Criteria:**

- print:trigger handler calls printManager.printToPdf
- print:cancel handler calls printManager.cancel
- Subscribes to windowManager `print-to-pdf-triggered` event
- Null printManager is handled gracefully
- Null/destroyed main window is handled for local trigger

**Subtasks:**

- [x] 3.1.1 Create PrintIpcHandler with printManager/windowManager dependencies
- [x] 3.1.2 Implement print:trigger handler
- [x] 3.1.3 Implement print:cancel handler
- [x] 3.1.4 Subscribe to `print-to-pdf-triggered` event in register()
- [x] 3.1.5 Write unit test: trigger without printManager logs error
- [x] 3.1.6 Write unit test: trigger calls printManager.printToPdf
- [x] 3.1.7 Write unit test: cancel calls printManager.cancel
- [x] 3.1.8 Write unit test: local trigger without main window logs warning
- [x] 3.1.9 Write unit test: printToPdf error is caught and logged
- [x] 3.1.10 Write coordinated test: IPC trigger invokes correct flow

**Verification:**

```bash
npm run test -- PrintIpcHandler
npm run test:coordinated -- PrintIpcHandler
```

---

### [x] 3.2 Create HotkeyIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/HotkeyIpcHandler.ts` - Hotkey settings handler
- [NEW] `tests/unit/main/ipc/HotkeyIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/HotkeyIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupIndividualHotkeyHandlers()`, `_setupAcceleratorHandlers()` from [ipcManager.ts:438-687](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L438-L687)
- Also extract helper methods: `_getIndividualHotkeySettings()`, `_setIndividualHotkeySetting()`, `_getHotkeyAccelerators()`, `_setHotkeyAccelerator()`, `_getFullHotkeySettings()`, and broadcast methods
- Combine individual hotkey and accelerator handlers (related domain)

**Acceptance Criteria:**

- All hotkey IPC channels registered (6 channels)
- Invalid hotkey IDs are rejected
- Accelerator validation (non-empty string)
- HotkeyManager updated when settings change
- Broadcasts sent on changes

**Subtasks:**

- [x] 3.2.1 Create HotkeyIpcHandler with hotkeyManager dependency
- [x] 3.2.2 Implement `initialize()` to sync settings from store to hotkeyManager
- [x] 3.2.3 Implement hotkeys:individual:get handler
- [x] 3.2.4 Implement hotkeys:individual:set handler with validation
- [x] 3.2.5 Implement hotkeys:accelerator:get handler
- [x] 3.2.6 Implement hotkeys:accelerator:set handler with validation
- [x] 3.2.7 Implement hotkeys:full-settings:get handler
- [x] 3.2.8 Implement broadcast methods for individual and accelerator changes
- [x] 3.2.9 Write unit test: individual:get returns all hotkey states
- [x] 3.2.10 Write unit test: individual:set with invalid ID is rejected
- [x] 3.2.11 Write unit test: individual:set with non-boolean is rejected
- [x] 3.2.12 Write unit test: accelerator:set with empty string is rejected
- [x] 3.2.13 Write unit test: accelerator:set with non-string is rejected
- [x] 3.2.14 Write unit test: hotkeyManager.setIndividualEnabled called on valid set
- [x] 3.2.15 Write unit test: hotkeyManager.setAccelerator called on valid set
- [x] 3.2.16 Write coordinated test: settings persist to store
- [x] 3.2.17 Write coordinated test: changes broadcast to all windows

**Verification:**

```bash
npm run test -- HotkeyIpcHandler
npm run test:coordinated -- HotkeyIpcHandler
```

---

### [x] 3.3 Create AppIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/AppIpcHandler.ts` - App-level operations handler
- [NEW] `tests/unit/main/ipc/AppIpcHandler.test.ts` - Unit tests

**Context:**

- Extract `_setupAppHandlers()` from [ipcManager.ts:867-895](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L867-L895)
- Handles options window opening and Google sign-in

**Acceptance Criteria:**

- open-options handler opens options window (optionally to specific tab)
- open-google-signin handler opens auth window and waits for close
- Errors are logged

**Subtasks:**

- [x] 3.3.1 Create AppIpcHandler with windowManager dependency
- [x] 3.3.2 Implement open-options handler with optional tab parameter
- [x] 3.3.3 Implement open-google-signin handler returning Promise
- [x] 3.3.4 Write unit test: open-options calls windowManager.createOptionsWindow
- [x] 3.3.5 Write unit test: open-options passes tab parameter
- [x] 3.3.6 Write unit test: open-google-signin calls windowManager.createAuthWindow
- [x] 3.3.7 Write unit test: open-google-signin resolves when window closes
- [x] 3.3.8 Write unit test: error during createOptionsWindow is logged

**Verification:**

```bash
npm run test -- AppIpcHandler
```

---

### 3.4 Integrate Phase 3 Handlers into IpcManager

**Files:**

- [MODIFY] `src/main/managers/ipcManager.ts` - Add Phase 3 handlers

**Acceptance Criteria:**

- PrintIpcHandler, HotkeyIpcHandler, AppIpcHandler instantiated
- Handlers registered and initialized
- Original methods removed
- All existing tests pass

**Subtasks:**

- [x] 3.4.1 Import Phase 3 handler classes
- [x] 3.4.2 Add handler instances to constructor
- [x] 3.4.3 Remove print handler methods
- [x] 3.4.4 Remove hotkey handler methods (individual + accelerator)
- [x] 3.4.5 Remove app handler methods

**Verification:**

```bash
npm run test:all
```

---

### 3.5 Phase 3 Validation

**Acceptance Criteria:**

- All tests pass
- Print to PDF works
- Hotkey settings can be changed in Options
- Options window opens correctly

**Verification:**

```bash
npm run test:all
npm run build && npm run electron:dev
```

---

## Phase 4: Complex Handlers

### 4.1 Create AutoUpdateIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/AutoUpdateIpcHandler.ts` - Auto-update handler
- [NEW] `tests/unit/main/ipc/AutoUpdateIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/AutoUpdateIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupAutoUpdateHandlers()` from [ipcManager.ts:1075-1224](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L1075-L1224)
- Handles auto-update settings, triggers, dev testing channels

**Acceptance Criteria:**

- All auto-update IPC channels registered (10+ channels)
- Boolean validation for enabled state
- UpdateManager delegation with null checks
- Dev test channels work for manual testing

**Subtasks:**

- [x] 4.1.1 Create AutoUpdateIpcHandler with updateManager dependency
- [x] 4.1.2 Implement auto-update:get-enabled handler
- [x] 4.1.3 Implement auto-update:set-enabled handler with validation
- [x] 4.1.4 Implement auto-update:check handler
- [x] 4.1.5 Implement auto-update:get-last-check handler
- [x] 4.1.6 Implement auto-update:install handler
- [x] 4.1.7 Implement dev test channels (badge, emit, mock platform)
- [x] 4.1.8 Implement tray:get-tooltip handler
- [x] 4.1.9 Write unit test: get-enabled without updateManager uses store
- [x] 4.1.10 Write unit test: get-enabled with updateManager delegates
- [x] 4.1.11 Write unit test: set-enabled validates boolean
- [x] 4.1.12 Write unit test: set-enabled persists to store
- [x] 4.1.13 Write unit test: check calls updateManager.checkForUpdates
- [x] 4.1.14 Write unit test: install calls updateManager.quitAndInstall
- [x] 4.1.15 Write unit test: null updateManager is handled gracefully
- [x] 4.1.16 Write coordinated test: enabled state persists across handlers

**Verification:**

```bash
npm run test -- AutoUpdateIpcHandler
npm run test:coordinated -- AutoUpdateIpcHandler
```

---

### 4.2 Create QuickChatIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/QuickChatIpcHandler.ts` - Quick Chat handler
- [NEW] `tests/unit/main/ipc/QuickChatIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/QuickChatIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupQuickChatHandlers()` and `_injectTextIntoGeminiIframe()` from [ipcManager.ts:897-1026](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L897-L1026)
- Most complex injection logic with iframe handling

**Acceptance Criteria:**

- Quick chat submit, hide, cancel channels registered
- Gemini ready handler triggers text injection
- E2E mode flag disables auto-submit
- Null main window is handled
- Gemini iframe not found is handled

**Subtasks:**

- [x] 4.2.1 Create QuickChatIpcHandler with windowManager dependency
- [x] 4.2.2 Implement quick-chat:submit handler
- [x] 4.2.3 Implement quick-chat:hide handler
- [x] 4.2.4 Implement quick-chat:cancel handler
- [x] 4.2.5 Implement gemini:ready handler
- [x] 4.2.6 Implement `_injectTextIntoGeminiIframe()` method
- [x] 4.2.7 Write unit test: submit hides quick chat and focuses main window
- [x] 4.2.8 Write unit test: submit with no main window logs error
- [x] 4.2.9 Write unit test: hide calls windowManager.hideQuickChat
- [x] 4.2.10 Write unit test: cancel calls windowManager.hideQuickChat
- [x] 4.2.11 Write unit test: gemini:ready triggers injection
- [x] 4.2.12 Write unit test: injection with no Gemini iframe logs error
- [x] 4.2.13 Write unit test: E2E mode disables auto-submit
- [x] 4.2.14 Write unit test: injection script failure is logged
- [x] 4.2.15 Write coordinated test: full submit flow orchestration

**Verification:**

```bash
npm run test -- QuickChatIpcHandler
npm run test:coordinated -- QuickChatIpcHandler
```

---

### 4.3 Create TextPredictionIpcHandler

**Files:**

- [NEW] `src/main/managers/ipc/TextPredictionIpcHandler.ts` - Text prediction handler
- [NEW] `tests/unit/main/ipc/TextPredictionIpcHandler.test.ts` - Unit tests
- [NEW] `tests/coordinated/ipc/TextPredictionIpcHandler.coordinated.test.ts` - Coordinated tests

**Context:**

- Extract `_setupTextPredictionHandlers()` and related methods from [ipcManager.ts:1251-1494](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts#L1251-L1494)
- Also extract `initializeTextPrediction()` startup method
- Most complex handler with async operations, model download, status broadcasting

**Acceptance Criteria:**

- All text-prediction IPC channels registered (7 channels)
- Boolean validation for enabled/GPU settings
- LlmManager delegation with null checks
- CI environment detection for native module safety
- Status and download progress broadcasting
- LlmManager status change subscription

**Subtasks:**

- [x] 4.3.1 Create TextPredictionIpcHandler with llmManager dependency
- [x] 4.3.2 Implement text-prediction:get-enabled handler
- [x] 4.3.3 Implement text-prediction:set-enabled handler with model loading
- [x] 4.3.4 Implement text-prediction:get-gpu-enabled handler
- [x] 4.3.5 Implement text-prediction:set-gpu-enabled handler with model reload
- [x] 4.3.6 Implement text-prediction:get-status handler
- [x] 4.3.7 Implement text-prediction:predict handler
- [x] 4.3.8 Implement `initializeOnStartup()` public method
- [x] 4.3.9 Implement status change broadcast
- [x] 4.3.10 Implement download progress broadcast
- [x] 4.3.11 Subscribe to llmManager status changes in register()
- [x] 4.3.12 Write unit test: get-enabled returns stored value
- [x] 4.3.13 Write unit test: set-enabled validates boolean
- [x] 4.3.14 Write unit test: set-enabled downloads model if not downloaded
- [x] 4.3.15 Write unit test: set-enabled loads model if not loaded
- [x] 4.3.16 Write unit test: set-enabled(false) unloads model
- [x] 4.3.17 Write unit test: CI environment skips native operations
- [x] 4.3.18 Write unit test: set-gpu-enabled reloads model if loaded
- [x] 4.3.19 Write unit test: predict with null llmManager returns null
- [x] 4.3.20 Write unit test: predict with non-string input returns null
- [x] 4.3.21 Write unit test: status change broadcasts to all windows
- [x] 4.3.22 Write unit test: download progress broadcasts to all windows
- [x] 4.3.23 Write coordinated test: startup initialization flow
- [x] 4.3.24 Write coordinated test: full enable/disable cycle

**Verification:**

```bash
npm run test -- TextPredictionIpcHandler
npm run test:coordinated -- TextPredictionIpcHandler
```

---

### 4.4 Integrate Phase 4 Handlers into IpcManager

**Files:**

- [MODIFY] `src/main/managers/ipcManager.ts` - Add Phase 4 handlers, finalize orchestrator

**Acceptance Criteria:**

- AutoUpdateIpcHandler, QuickChatIpcHandler, TextPredictionIpcHandler instantiated
- All handlers registered and initialized
- Original methods removed
- IpcManager reduced to ~200 lines (orchestrator only)
- `initializeTextPrediction()` delegates to TextPredictionIpcHandler

**Subtasks:**

- [x] 4.4.1 Import Phase 4 handler classes
- [x] 4.4.2 Add handler instances to constructor
- [x] 4.4.3 Remove auto-update handler methods
- [x] 4.4.4 Remove quick chat handler methods including injection
- [x] 4.4.5 Remove text prediction handler methods
- [x] 4.4.6 Refactor `initializeTextPrediction()` to delegate to handler
- [x] 4.4.7 Remove now-unused private methods
- [x] 4.4.8 Clean up unused imports

**Verification:**

```bash
npm run test:all
```

---

### [x] 4.5 Final Cleanup and Validation

**Files:**

- [MODIFY] `src/main/managers/ipcManager.ts` - Final orchestrator cleanup
- [MODIFY] `src/main/managers/ipc/index.ts` - Export all handlers
- [DELETE] `tests/unit/main/ipcManager.test.ts` - Replace with handler tests (if appropriate)

**Acceptance Criteria:**

- IpcManager is ~200 lines or less
- All handlers are exported from barrel file
- All original IpcManager tests either pass or are migrated to handler tests
- No dead code remains

**Subtasks:**

- [x] 4.5.1 Verify IpcManager line count is ~200 or less (182 lines)
- [x] 4.5.2 Ensure all handlers exported from index.ts
- [x] 4.5.3 Migrate or remove old ipcManager tests as appropriate (tests are complementary)
- [x] 4.5.4 Remove any commented-out code (none found)
- [x] 4.5.5 Run final lint pass (IPC handlers: 0 errors, 2 warnings)

**Verification:**

```bash
npm run typecheck
npm run lint
npm run test:all
npm run build && npm run electron:dev
```

---

## Phase 5: Documentation & Final Verification

### [x] 5.1 Update Architecture Documentation

**Files:**

- [MODIFY] `docs/ARCHITECTURE.md` - Document new handler architecture

**Acceptance Criteria:**

- IPC Manager section updated to describe handler pattern
- Handler list documented with responsibilities
- `src/main/managers/ipc/` directory documented in project structure

**Subtasks:**

- [x] 5.1.1 Update IPC Manager description in ARCHITECTURE.md
- [x] 5.1.2 Add handler pattern explanation
- [x] 5.1.3 Update directory structure diagram

**Verification:**

```bash
# Manual review
```

---

### [x] 5.2 Final Test Suite Verification

**Files:**

- No changes - verification only

**Acceptance Criteria:**

- Test coverage for handlers is >= coverage of original ipcManager

**Verification:**

```bash
npm run test:coverage
```
