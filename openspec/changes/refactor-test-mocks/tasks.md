# Tasks: Refactor Test Mock Infrastructure

## 1. Logger Mock Extraction

**Files to create/modify:**

- [NEW] `tests/helpers/mocks/main/logger.ts`
- [NEW] `tests/helpers/mocks/index.ts`
- [MODIFY] `config/vitest/vitest.coordinated.config.ts`
- [MODIFY] All 37 coordinated test files (remove inline logger mocks)
- [MODIFY] `tests/unit/main/*.test.ts` files with logger mocks

**Verification:** `npm run test:coordinated && npm run test:electron`

**References:**

- [print-manager.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-manager.coordinated.test.ts) - Current logger mock pattern (lines 12-23)
- [vitest.coordinated.config.ts](file:///c:/Users/bwend/repos/gemini/config/vitest/vitest.coordinated.config.ts) - Vitest config

**Tasks:**

- [x] 1.1 Create `tests/helpers/mocks/main/logger.ts` with mock logger factory
  - Export `createMockLogger()` returning `{ log: vi.fn(), error: vi.fn(), warn: vi.fn() }`
  - Export `mockLoggerModule` for use with `vi.mock()`
  - Include `_reset()` method to clear all mock calls
  - **Acceptance:** File compiles, exports are importable

- [x] 1.2 Create `tests/helpers/mocks/index.ts` barrel export
  - Re-export all mocks from subdirectories
  - **Acceptance:** `import { createMockLogger } from 'tests/helpers/mocks'` works

- [x] 1.3 Add `setupFilesAfterEnv` to `vitest.coordinated.config.ts`
  - Create `tests/helpers/setup/coordinated.ts` that auto-mocks logger
  - Add to vitest config: `setupFilesAfterEnv: ['./tests/helpers/setup/coordinated.ts']`
  - **Acceptance:** Logger mock automatically applied to all coordinated tests

- [x] 1.4 Create `__mocks__/logger.ts` for automatic vitest module mocking
  - Create `src/main/utils/__mocks__/logger.ts` with exported mockLogger and createLogger
  - This follows vitest's manual mock pattern - vitest auto-uses files in `__mocks__` directories
  - Tests can then import mockLogger directly from the mocked module for assertions
  - **Acceptance:** File exists, exports mockLogger and createLogger, vitest uses it automatically

- [x] 1.5 Update print tests to use `__mocks__/logger.ts` (batch 1)
  - Update these files to remove inline vi.mock and import mockLogger from mocked module:
    - `print-manager.coordinated.test.ts`
    - `print-to-pdf-ipc.coordinated.test.ts`
    - `print-to-pdf-settings.coordinated.test.ts`
    - `print-manager-menu.coordinated.test.ts`
    - `print-manager-errors.coordinated.test.ts`
    - `print-hotkey-coordination.coordinated.test.ts`
  - **Acceptance:** `npm run test:coordinated` passes, print tests use shared mock

- [x] 1.6 Update window/manager tests to use `__mocks__/logger.ts` (batch 2)
  - Update these files to remove inline vi.mock and import mockLogger from mocked module:
    - `window-visibility-fallback.coordinated.test.ts`
    - `window-lifecycle.coordinated.test.ts`
    - `window-tray-menu-coordination.coordinated.test.ts`
    - `multi-window-coordination.coordinated.test.ts`
    - `manager-initialization.coordinated.test.ts`
    - `main-lifecycle.coordinated.test.ts`
  - **Acceptance:** `npm run test:coordinated` passes

- [x] 1.7 Update IPC/auth tests to use `__mocks__/logger.ts` (batch 3)
  - Remove inline logger mocks from:
    - `ipc-manager-coordination.coordinated.test.ts`
    - `ipc-roundtrip.coordinated.test.ts`
    - `ipc-sanitization.coordinated.test.ts`
    - `auth-coordination.coordinated.test.ts`
    - `auth-session-coordination.coordinated.test.ts`
  - **Acceptance:** `npm run test:coordinated -- --testPathPattern="ipc|auth"` passes

- [x] 1.8 Update hotkey/menu tests to use `__mocks__/logger.ts` (batch 4)
  - Remove inline logger mocks from:
    - `hotkey-coordination.coordinated.test.ts`
    - `hotkey-collision-coordination.coordinated.test.ts`
    - `menu-manager.coordinated.test.ts`
    - `menu-manager-platform.coordinated.test.ts`
  - **Acceptance:** `npm run test:coordinated -- --testPathPattern="hotkey|menu"` passes

- [x] 1.9 Update remaining tests to use `__mocks__/logger.ts` (batch 5)
  - Remove inline logger mocks from:
    - `navigation-security.coordinated.test.ts`
    - `security-headers.coordinated.test.ts`
    - `settings-persistence.coordinated.test.ts`
    - `shutdown-sequence.coordinated.test.ts`
    - `cross-window-sync.coordinated.test.ts`
    - `badge-manager.coordinated.test.ts`
    - `auto-update-restart.coordinated.test.ts`
    - `update-notification-chain.coordinated.test.ts`
    - `update-notification-flow.coordinated.test.ts`
    - `quick-chat-injection-flow.coordinated.test.ts`
  - **Acceptance:** `npm run test:coordinated` all 44 tests pass

- [x] 1.10 Update unit tests to use shared logger mock
  - Add setup file for electron unit tests: `tests/helpers/setup/electron.ts`
  - Update `vitest.electron.config.ts` to use setup file
  - Remove inline logger mocks from:
    - `tests/unit/main/ipcManager.test.ts`
    - `tests/unit/main/hotkeyManager.test.ts`
    - `tests/unit/main/updateManager.test.ts`
    - `tests/unit/main/llmManager.test.ts`
    - `tests/unit/main/printManager.test.ts`
  - **Acceptance:** `npm run test:electron` passes

---

## 2. Manager Mock Factories

**Files to create/modify:**

- [NEW] `tests/helpers/mocks/main/managers.ts`
- [MODIFY] `tests/unit/main/ipcManager.test.ts`
- [MODIFY] `tests/unit/main/hotkeyManager.test.ts`
- [MODIFY] Coordinated tests using `mockWindowManager` or `mockStore`

**Verification:** `npm run test:electron && npm run test:coordinated`

**References:**

- [ipcManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/ipcManager.test.ts) - Current mockWindowManager pattern (lines 109-128)
- [hotkeyManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/hotkeyManager.test.ts) - Another mockWindowManager pattern

**Tasks:**

- [x] 2.1 Create `tests/helpers/mocks/main/managers.ts` with mock factories
  - Export `createMockWindowManager(overrides?)` with all WindowManager methods
  - Export `createMockStore(defaults?, overrides?)` with get/set/has methods
  - Export `createMockUpdateManager(overrides?)` with update methods
  - Export `createMockPrintManager(overrides?)` with print methods
  - Export `createMockLlmManager(overrides?)` with LLM methods
  - Export `createMockHotkeyManager(overrides?)` with hotkey methods
  - **Acceptance:** All factories compile, return correctly typed mocks

- [ ] 2.2 Update `ipcManager.test.ts` to use shared factories
  - Replace inline `mockWindowManager` definition with `createMockWindowManager()`
  - Replace inline `mockStore` definition with `createMockStore()`
  - Replace inline `mockUpdateManager` definition with `createMockUpdateManager()`
  - Replace inline `mockPrintManager` definition with `createMockPrintManager()`
  - Customize using overrides where tests need specific behavior
  - **Acceptance:** `npm run test:electron -- --testPathPattern="ipcManager"` passes, file size reduced by 30%+

- [ ] 2.3 Update `hotkeyManager.test.ts` to use shared factories
  - Replace inline `mockWindowManager` with `createMockWindowManager()`
  - **Acceptance:** `npm run test:electron -- --testPathPattern="hotkeyManager"` passes

- [ ] 2.4 Update coordinated tests to use shared manager factories (batch 1)
  - Update `app-lifecycle.coordinated.test.ts` to use `createMockWindowManager()`
  - Update `print-manager.coordinated.test.ts` to use shared factories where applicable
  - **Acceptance:** Updated tests pass

- [ ] 2.5 Update remaining unit tests to use shared manager factories
  - Search for remaining `mockWindowManager` definitions in `tests/unit/`
  - Replace with factory calls
  - **Acceptance:** `npm run test:electron` passes

---

## 3. WebContents Factory Consolidation

**Files to create/modify:**

- [NEW] `tests/helpers/mocks/main/webContents.ts`
- [MODIFY] `tests/unit/main/test/setup.ts`
- [MODIFY] `tests/unit/main/test/electron-mock.ts`
- [MODIFY] `tests/coordinated/print-manager.coordinated.test.ts`
- [MODIFY] `tests/coordinated/print-to-pdf-ipc.coordinated.test.ts`
- [MODIFY] `tests/coordinated/print-manager-errors.coordinated.test.ts`

**Verification:** `npm run test:electron && npm run test:coordinated`

**References:**

- [tests/unit/main/test/setup.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/test/setup.ts) - Basic createMockWebContents (lines 33-39)
- [tests/unit/main/test/electron-mock.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/test/electron-mock.ts) - Full createMockWebContents (lines 34-67)
- [print-manager.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-manager.coordinated.test.ts) - createMockWebContentsForCapture (lines 93-126)

**Tasks:**

- [ ] 3.1 Create `tests/helpers/mocks/main/webContents.ts` with unified factory
  - Export `createMockWebContents(options?)` with configurable capabilities:
    - `options.withScrollCapture?: boolean` - Include scrolling capture mocks
    - `options.scrollHeight?: number` - Mock scroll height (default: 800)
    - `options.clientHeight?: number` - Mock client height (default: 1000)
    - `options.isDestroyed?: () => boolean` - Custom isDestroyed behavior
  - Include all common methods: `send`, `on`, `once`, `capturePage`, `printToPDF`, `getURL`, `isDestroyed`, `mainFrame`
  - **Acceptance:** Factory supports all use cases from existing 3 implementations

- [ ] 3.2 Update `tests/unit/main/test/setup.ts` to use shared factory
  - Import from shared location
  - Re-export for backward compatibility
  - **Acceptance:** Existing unit tests continue to pass

- [ ] 3.3 Update `tests/unit/main/test/electron-mock.ts` to use shared factory
  - Replace inline implementation with import from shared factory
  - Configure BrowserWindow to use shared factory
  - **Acceptance:** `npm run test:electron` passes

- [ ] 3.4 Update print coordinated tests to use shared webContents factory
  - Replace `createMockWebContentsForCapture()` in:
    - `print-manager.coordinated.test.ts`
    - `print-to-pdf-ipc.coordinated.test.ts`
    - `print-manager-errors.coordinated.test.ts`
  - Use `createMockWebContents({ withScrollCapture: true })` instead
  - **Acceptance:** `npm run test:coordinated -- --testPathPattern="print"` passes

---

## 4. ElectronAPI Mock Factory

**Files to create/modify:**

- [NEW] `tests/helpers/mocks/renderer/electronAPI.ts`
- [MODIFY] `tests/unit/renderer/TextPredictionSettings.test.tsx`
- [MODIFY] `tests/coordinated/text-prediction-settings.coordinated.test.tsx`
- [MODIFY] `tests/unit/renderer/components/options/HotkeyAcceleratorInput.test.tsx`

**Verification:** `npm run test && npm run test:coordinated`

**References:**

- [TextPredictionSettings.test.tsx](file:///c:/Users/bwend/repos/gemini/tests/unit/renderer/TextPredictionSettings.test.tsx) - Current electronAPI mock pattern
- [text-prediction-settings.coordinated.test.tsx](file:///c:/Users/bwend/repos/gemini/tests/coordinated/text-prediction-settings.coordinated.test.tsx) - Another electronAPI mock pattern (lines 85-102)

**Tasks:**

- [ ] 4.1 Create `tests/helpers/mocks/renderer/electronAPI.ts` with mock factory
  - Export `createMockElectronAPI(overrides?)` with all ElectronAPI methods
  - Include window controls: `minimizeWindow`, `maximizeWindow`, `closeWindow`, `isMaximized`
  - Include theme methods: `getTheme`, `setTheme`, `onThemeChanged`
  - Include text prediction methods: `getTextPredictionStatus`, `setTextPredictionEnabled`, etc.
  - Include all other ElectronAPI methods from `src/shared/types/ipc.ts`
  - Export `setupMockElectronAPI(overrides?)` to assign to `window.electronAPI`
  - **Acceptance:** Factory covers all methods in ElectronAPI interface

- [ ] 4.2 Update `TextPredictionSettings.test.tsx` to use shared factory
  - Replace inline `window.electronAPI = { ... }` with `setupMockElectronAPI({ ... })`
  - Use overrides for test-specific mock implementations
  - **Acceptance:** `npm run test -- --testPathPattern="TextPredictionSettings"` passes

- [ ] 4.3 Update `text-prediction-settings.coordinated.test.tsx` to use shared factory
  - Replace inline electronAPI setup with factory call
  - Keep test-specific callback captures as overrides
  - **Acceptance:** `npm run test:coordinated -- --testPathPattern="text-prediction"` passes

- [ ] 4.4 Update `HotkeyAcceleratorInput.test.tsx` to use shared factory
  - Replace all inline `window.electronAPI` assignments
  - **Acceptance:** `npm run test -- --testPathPattern="HotkeyAcceleratorInput"` passes

---

## 5. Test Harness Utilities

**Files to create/modify:**

- [NEW] `tests/helpers/harness/timers.ts`
- [NEW] `tests/helpers/harness/platform.ts`
- [NEW] `tests/helpers/harness/index.ts`
- [MODIFY] Tests using `vi.useFakeTimers()` patterns
- [MODIFY] Tests using platform stubbing patterns

**Verification:** `npm run test:coordinated && npm run test:electron`

**References:**

- [print-manager.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-manager.coordinated.test.ts) - Fake timers pattern (lines 159-165)
- [print-manager.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-manager.coordinated.test.ts) - Platform stubbing pattern (lines 322-343)

**Tasks:**

- [ ] 5.1 Create `tests/helpers/harness/timers.ts` with timer utilities
  - Export `useFakeTimers(date?: string | Date)` - Sets up fake timers with optional date
  - Export `advanceTimers(ms: number)` - Advances timers by milliseconds
  - Export `runAllTimers()` - Runs all pending timers
  - Include automatic cleanup in `afterEach`
  - **Acceptance:** Utilities work in vitest tests

- [ ] 5.2 Create `tests/helpers/harness/platform.ts` with platform utilities
  - Export `stubPlatform(platform: 'darwin' | 'win32' | 'linux')` - Stubs process.platform
  - Export `stubPlatformAll(platforms: Platform[], testFn: (platform) => void)` - Run test on all platforms
  - Include automatic cleanup in `afterEach`
  - **Acceptance:** Platform stubs work correctly

- [ ] 5.3 Create `tests/helpers/harness/index.ts` barrel export
  - Re-export from timers.ts and platform.ts
  - **Acceptance:** All harness utilities importable from single location

- [ ] 5.4 Update print tests to use harness utilities
  - Replace inline `vi.useFakeTimers()` / `vi.useRealTimers()` patterns
  - Replace inline platform stubbing patterns
  - **Acceptance:** `npm run test:coordinated -- --testPathPattern="print"` passes

- [ ] 5.5 Update remaining tests to use harness utilities where applicable
  - Search for `vi.useFakeTimers` and `vi.stubGlobal('process'` patterns
  - Update to use shared utilities
  - **Acceptance:** All tests pass with reduced boilerplate

---

## 6. Documentation and Cleanup

**Files to create/modify:**

- [NEW] `tests/helpers/README.md`
- [DELETE] Duplicate code left after refactoring (if any)

**Verification:** `npm run test:all`

**Tasks:**

- [ ] 6.1 Create `tests/helpers/README.md` documentation
  - Document all available mock factories with examples
  - Document harness utilities with usage patterns
  - Include migration guide for adding new tests
  - **Acceptance:** README is clear and comprehensive

- [ ] 6.2 Run full test suite to verify no regressions
  - Run `npm run test:all`
  - Fix any failing tests
  - **Acceptance:** All tests pass

- [ ] 6.3 Remove any remaining duplicate mock code
  - Search for patterns that should now use shared mocks
  - Update any missed files
  - **Acceptance:** No duplicate mock definitions remain
