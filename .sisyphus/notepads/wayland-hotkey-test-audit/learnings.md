## 2026-02-09 Task: initialize

- No learnings yet.

## 2026-02-09 Task: Identify newly added tests and map coverage to hotkey enablement flow

### Summary of New/Modified Test Files on feat/linux-hotkeys Branch

**New Test Files (16):**

1. `tests/coordinated/sandbox-detection.coordinated.test.ts`
2. `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`
3. `tests/e2e/release/sandbox-appimage.spec.ts`
4. `tests/e2e/wayland-hotkey-registration.spec.ts`
5. `tests/integration/sandbox-detection.integration.test.ts`
6. `tests/integration/wayland-platform-status.integration.test.ts`
7. `tests/unit/main/main.test.ts`
8. `tests/unit/main/sandboxDetector.test.ts`
9. `tests/unit/main/sandboxInit.test.ts`
10. `tests/unit/main/test/dbus-next-mock.ts`
11. `tests/unit/main/utils/constants.test.ts`
12. `tests/unit/main/utils/dbusFallback.test.ts`
13. `tests/unit/main/utils/waylandDetector.test.ts`
14. `tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx`
15. `tests/unit/renderer/utils/platform.test.ts`
16. `tests/unit/shared/platform-status.test.ts`

**Modified Test Files (9):**

1. `tests/e2e/helpers/e2eConstants.ts`
2. `tests/e2e/helpers/hotkeyHelpers.ts`
3. `tests/e2e/hotkeys.spec.ts`
4. `tests/integration/toast-provider.integration.test.ts`
5. `tests/integration/toast-state.integration.test.ts`
6. `tests/unit/main/constants.test.ts`
7. `tests/unit/main/hotkeyManager.test.ts`
8. `tests/unit/main/test/electron-mock.ts`
9. `tests/unit/preload/preload.test.ts`

---

### Hotkey Enablement Flow Coverage Map

The hotkey enablement flow consists of these steps:

1. **Platform Detection** - Detect Linux, Wayland, Desktop Environment
2. **Portal Detection** - Check if XDG Desktop Portal is available
3. **Sandbox Detection** - Detect AppImage/sandbox restrictions
4. **Registration Strategy** - Choose registration method (Chromium flag, D-Bus direct, D-Bus fallback)
5. **Hotkey Registration** - Actually register the shortcuts
6. **Status Reporting** - Report registration status to renderer
7. **UI Feedback** - Display LinuxHotkeyNotice toast if needed

---

#### Test File → Flow Step Mapping

| Test File                                         | Flow Step                      | Coverage Details                                                                                                                                                                   |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `waylandDetector.test.ts`                         | **Step 1: Platform Detection** | Full coverage of `detectWaylandSession()`, `detectDesktopEnvironment()`, `detectDEVersion()`, `isSupportedDE()`, `getWaylandStatus()`                                              |
| `sandboxDetector.test.ts`                         | **Step 3: Sandbox Detection**  | Full coverage of `isAppImage()`, `hasAppArmorRestriction()`, `hasUserNamespaceRestriction()`, `hasUserNamespaceSupport()`, `hasSuidSandboxPermissions()`, `shouldDisableSandbox()` |
| `sandboxInit.test.ts`                             | **Step 3: Sandbox Init**       | Tests side-effect module that calls `app.commandLine.appendSwitch('no-sandbox')`                                                                                                   |
| `sandbox-detection.coordinated.test.ts`           | **Step 3 → Window Config**     | Tests sandbox state propagation to `getBaseWebPreferences()` and window configs                                                                                                    |
| `sandbox-detection.integration.test.ts`           | **Step 3: Real Environment**   | Integration tests verifying sandbox behavior in real Electron process                                                                                                              |
| `sandbox-appimage.spec.ts`                        | **Step 3: Release Build**      | E2E tests for AppImage sandbox detection in packaged app                                                                                                                           |
| `dbusFallback.test.ts`                            | **Step 4: D-Bus Strategy**     | Full coverage of D-Bus fallback module: `isDBusFallbackAvailable()`, `registerViaDBus()`, `destroySession()`, `electronAcceleratorToXdg()`                                         |
| `hotkeyManager.test.ts`                           | **Step 4, 5, 6**               | Tests Linux/Wayland registration logic, D-Bus direct path, registration results, `getPlatformHotkeyStatus()`                                                                       |
| `wayland-hotkey-coordination.coordinated.test.ts` | **Steps 1-6 Coordination**     | Tests coordination between WaylandDetector → HotkeyManager → D-Bus fallback → IPC                                                                                                  |
| `wayland-platform-status.integration.test.ts`     | **Step 6: IPC Status**         | Integration tests for `getPlatformHotkeyStatus()` IPC round-trip between main and renderer                                                                                         |
| `platform.test.ts`                                | **Step 6: Renderer Utils**     | Tests renderer-side platform utilities: `getPlatformHotkeyStatus()`, `isWaylandWithPortal()`, `areGlobalHotkeysEnabled()`                                                          |
| `platform-status.test.ts`                         | **Type Definitions**           | Validates TypeScript types: `WaylandStatus`, `PlatformHotkeyStatus`, `HotkeyRegistrationResult`, `PortalMethod`, `DesktopEnvironment`                                              |
| `LinuxHotkeyNotice.test.tsx`                      | **Step 7: UI Feedback**        | Tests toast display logic: silent success, partial failure handling, no-portal warning, duplicate prevention                                                                       |
| `wayland-hotkey-registration.spec.ts`             | **End-to-End Flow**            | Full E2E tests: platform status query, Wayland+KDE registration, X11 disable, toast behavior, graceful degradation                                                                 |

---

### Coverage Analysis by Flow Step

#### Step 1: Platform Detection (Wayland/DE) ✅ WELL COVERED

- **Unit Tests**: `waylandDetector.test.ts` (376 lines)
    - Wayland session detection via `XDG_SESSION_TYPE`
    - Desktop environment detection via `XDG_CURRENT_DESKTOP`
    - KDE version detection via `KDE_SESSION_VERSION`
    - Support matrix (KDE 5.27+, KDE 6+, unsupported versions)
- **Coordinated Tests**: `wayland-hotkey-coordination.coordinated.test.ts`
    - Integration with HotkeyManager decision logic
- **Integration Tests**: `wayland-platform-status.integration.test.ts`
    - Real environment status shape validation

#### Step 2: Portal Detection ✅ COVERED

- Covered indirectly via `waylandDetector.test.ts` through `portalAvailable` field
- Integration tests verify portal fields are populated correctly

#### Step 3: Sandbox Detection ✅ WELL COVERED

- **Unit Tests**: `sandboxDetector.test.ts` (417 lines)
    - AppImage detection via `APPIMAGE` env var
    - AppArmor restriction detection
    - Kernel user namespace restriction detection
    - SUID sandbox binary permission checks
    - Composite `shouldDisableSandbox()` logic
- **Unit Tests**: `sandboxInit.test.ts` (60 lines)
    - Side-effect module testing (appendSwitch calls)
- **Coordinated Tests**: `sandbox-detection.coordinated.test.ts` (137 lines)
    - Sandbox state propagation to window configurations
- **Integration Tests**: `sandbox-detection.integration.test.ts` (124 lines)
    - Real Electron process sandbox behavior
- **E2E Tests**: `sandbox-appimage.spec.ts` (232 lines)
    - Release build sandbox verification

#### Step 4: Registration Strategy Selection ✅ WELL COVERED

- **Unit Tests**: `dbusFallback.test.ts` (662 lines)
    - D-Bus availability checking
    - Electron accelerator to XDG format conversion
    - Session lifecycle management
- **Unit Tests**: `hotkeyManager.test.ts` (1129 lines, modified)
    - Strategy selection logic (Chromium flag vs D-Bus direct vs D-Bus fallback)
    - `portalMethod` field setting ('chromium-flag', 'dbus-direct', 'dbus-fallback', 'none')
- **Coordinated Tests**: `wayland-hotkey-coordination.coordinated.test.ts` (402 lines)
    - Strategy coordination between components

#### Step 5: Hotkey Registration ✅ COVERED

- **Unit Tests**: `dbusFallback.test.ts`
    - `registerViaDBus()` with shortcut batching
    - Action callback passing and invocation
    - Error handling for D-Bus failures
- **Unit Tests**: `hotkeyManager.test.ts`
    - D-Bus direct path registration
    - Registration result tracking
    - Disabled hotkey filtering
- **Coordinated Tests**: `wayland-hotkey-coordination.coordinated.test.ts`
    - Cross-platform behavior verification (darwin, win32, linux)

#### Step 6: Status Reporting (IPC) ✅ WELL COVERED

- **Unit Tests**: `hotkeyManager.test.ts`
    - `getPlatformHotkeyStatus()` return value
    - Registration results population
- **Integration Tests**: `wayland-platform-status.integration.test.ts` (163 lines)
    - IPC round-trip testing via `window.electronAPI.getPlatformHotkeyStatus()`
    - PlatformHotkeyStatus shape validation
    - Response time verification (< 5s)
- **Unit Tests**: `platform.test.ts` (82 lines)
    - Renderer-side status querying
    - Utility functions for status interpretation

#### Step 7: UI Feedback (LinuxHotkeyNotice) ✅ WELL COVERED

- **Unit Tests**: `LinuxHotkeyNotice.test.tsx` (344 lines)
    - Silent success (no toast when all hotkeys registered)
    - Partial failure toast with failed shortcut names
    - No-portal warning toast
    - X11 warning toast
    - IPC failure handling
    - Duplicate prevention (strict mode safety)
- **E2E Tests**: `wayland-hotkey-registration.spec.ts` (324 lines)
    - Real toast behavior verification
    - Environmental graceful degradation

---

### Test Helper Utilities

| Helper File         | Purpose                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `hotkeyHelpers.ts`  | E2E helpers: `getPlatformHotkeyStatus()`, `checkGlobalShortcutRegistration()`, hotkey definitions |
| `dbus-next-mock.ts` | Centralized mock for dbus-next library used across tests                                          |

---

### Identified Test Gaps / Suggestions

1. **KDE Portal D-Bus Integration Test**: No direct test for the KDE GlobalShortcuts portal D-Bus interface. The D-Bus fallback is mocked, but no integration test exists against a real portal.

2. **Chromium Flag Injection Test**: No explicit test verifying `--enable-features=GlobalShortcutsPortal` flag injection (mentioned in commit history but not verified in tests).

3. **Multi-DE Support**: Tests only cover KDE. Other DEs (GNOME, etc.) are marked as unsupported but have no explicit negative tests.

4. **Hotkey Conflict Resolution**: No tests for handling when another app has already registered the same global hotkey.

5. **Session Restore After Sleep/Resume**: No tests for hotkey behavior after system sleep/wake cycle.

---

### Test Count Summary

| Test Category     | New Files | Modified Files | Approx Test Cases |
| ----------------- | --------- | -------------- | ----------------- |
| Unit Tests        | 8         | 3              | ~150+             |
| Integration Tests | 2         | 2              | ~15               |
| Coordinated Tests | 2         | 0              | ~20               |
| E2E Tests         | 2         | 1              | ~20               |
| **Total**         | **14**    | **6**          | **~205+**         |

## 2026-02-09 Task: Review source code changes for Wayland/KDE global hotkeys

### Summary of Branch Changes (feat/linux-hotkeys)

**Key Insight**: This branch transitions from "disable all Linux hotkeys" to "smart enablement via D-Bus portal for supported Wayland DEs (KDE Plasma 5+)".

---

### 1. CORE ARCHITECTURE CHANGES

#### waylandDetector.ts (NEW FILE - 79 lines)

- **Purpose**: Detect Wayland session, desktop environment, and portal availability
- **Key Functions**:
    - `detectWaylandSession()`: Checks `XDG_SESSION_TYPE === 'wayland'`
    - `detectDesktopEnvironment()`: Parses `XDG_CURRENT_DESKTOP` for 'kde'
    - `detectDEVersion()`: Reads `KDE_SESSION_VERSION`
    - `isSupportedDE()`: KDE Plasma 5+ is supported
    - `getWaylandStatus()`: Aggregates all detection into `WaylandStatus` object

**Portal Detection Logic**:

```
isWayland = XDG_SESSION_TYPE === 'wayland'
portalAvailable = isWayland && isSupportedDE(desktopEnvironment, deVersion)
// Only KDE Plasma 5+ currently supported
```

#### dbusFallback.ts (NEW FILE - 641 lines)

- **Purpose**: Direct D-Bus communication with XDG Desktop Portal GlobalShortcuts
- **Key Design**:
    - Dynamic import of `dbus-next` (only loaded when needed)
    - Bus-level message listening for `Activated`/`Deactivated` signals
    - XDG accelerator format conversion (Electron → XDG spec)
    - User approval dialog handling (30s timeout for KDE dialog)

**Critical Accelerator Conversion**:

- `CommandOrControl+Shift+Space` → `CTRL+SHIFT+space`
- Electron format → XKB keysym names for portal compatibility

**Signal Handling**:

- Uses low-level `bus.on('message')` instead of proxy interface signals (more reliable)
- Listens for `org.freedesktop.portal.GlobalShortcuts.Activated`
- Callbacks mapped by `HotkeyId` from actionCallbacks Map

#### sandboxDetector.ts (NEW FILE - 134 lines)

- **Purpose**: Detect when Electron sandbox will fail and auto-disable
- **Scenarios Covered**:
    - AppImages on Ubuntu 24.04+ (AppArmor restricts user namespaces)
    - Local development (chrome-sandbox lacks SUID permissions)
    - CI environments with restricted namespaces

**Detection Logic**:

```
shouldDisableSandbox() = !hasUserNamespaceSupport() && !hasSuidSandboxPermissions()
```

**Checks**:

- `/proc/sys/kernel/apparmor_restrict_unprivileged_userns` (Ubuntu 24.04+)
- `/proc/sys/kernel/unprivileged_userns_clone` (kernel-level restriction)
- `chrome-sandbox` binary ownership (must be root, mode 4755)

#### sandboxInit.ts (NEW FILE - 19 lines)

- **Purpose**: Side-effect module imported FIRST in main.ts
- **Critical Ordering**: Must execute before `constants.ts` reads sandbox state
- **Action**: Calls `app.commandLine.appendSwitch('no-sandbox')` when needed

#### constants.ts (MODIFIED - LAZY EVALUATION)

- **Change**: `BASE_WEB_PREFERENCES` → `getBaseWebPreferences()` (lazy function)
- **Why**: Allows sandboxInit.ts to set `--no-sandbox` before preferences are read
- **New Exports**:
    - `isWayland`: Simple env check
    - `getWaylandPlatformStatus()`: Cached WaylandStatus with lazy initialization

---

### 2. HOTKEY MANAGER CHANGES (hotkeyManager.ts)

**Removed**:

- `ENABLE_GLOBAL_HOTKEYS_ON_LINUX = false` blanket disable flag

**Added**:

- `_registrationResults: Map<HotkeyId, HotkeyRegistrationResult>`: Tracks per-hotkey status
- `_globalHotkeysEnabled: boolean`: Runtime flag based on platform support

**New Registration Flow**:

```
registerShortcuts():
  IF not Linux:
    → Use standard Electron globalShortcut API
  ELSE:
    → Get WaylandStatus
    IF Wayland + portalAvailable:
      → _registerViaDBusDirect()  // D-Bus direct path
    ELSE:
      → Disable hotkeys, log warning
```

**D-Bus Registration Methods**:

1. `_registerViaDBusDirect()`: Primary registration via D-Bus portal
2. `_attemptDBusFallbackIfNeeded()`: Fallback if Chromium flag registration fails
3. `_buildActionCallbacksMap()`: Maps HotkeyId → action callbacks for D-Bus signals

**Portal Method Tracking**:

- `'dbus-direct'`: Registered directly via D-Bus
- `'dbus-fallback'`: Fallback after Chromium registration failure
- `'chromium-flag'`: Would use Chromium's built-in (currently NOT used - see main.ts)
- `'none'`: No portal method available

**Key Fix in Latest Commit (a149593)**:

- Distinguishes `dbus-direct` from `dbus-fallback` in `waylandStatus.portalMethod`
- Gates verbose D-Bus debug logging behind `DEBUG_DBUS` env var
- Clears stale `_registrationResults` before new registration attempts

---

### 3. MAIN PROCESS CHANGES (main.ts)

**New Import Order**:

```
import './utils/sandboxInit';  // MUST BE FIRST (side-effect)
// ... other imports
```

**Linux-Specific Setup**:

```
app.setName('gemini-desktop');
app.commandLine.appendSwitch('class', 'gemini-desktop');  // WM_CLASS for KDE
app.setDesktopName('gemini-desktop');  // Portal integration
```

**Critical Comment** (intentional Chromium flag DISABLE):

```
// We intentionally do NOT enable Chromium's GlobalShortcutsPortal feature flag.
// Chromium's globalShortcut.register() reports false positive success on KDE Plasma 6
// and interferes with our direct D-Bus portal session.
```

**Wayland Detection at Startup**:

```
const waylandStatus = getWaylandPlatformStatus();
IF Wayland + portalAvailable:
  → Log: "Will use D-Bus portal for global shortcuts"
ELSE IF Wayland:
  → Warn: "Wayland detected but portal unavailable"
```

---

### 4. RENDERER/UI CHANGES

#### LinuxHotkeyNotice.tsx (MODIFIED)

**Behavior Change**: From "always show on Linux" to "conditional/silent success"

**New Logic**:

```
IF status.globalHotkeysEnabled:
  IF all registrationResults.success:
    → No toast (silent success)
  ELSE:
    → Show partial failure toast with specific hotkey names
ELSE:
  → Show "Global keyboard shortcuts unavailable" toast
```

**Timing**: Increased delay from 500ms → 1000ms to allow IPC response

#### IPC Bridge (preload.ts + HotkeyIpcHandler.ts)

**New Channels**:

- `PLATFORM_HOTKEY_STATUS_GET`: Request current status
- `PLATFORM_HOTKEY_STATUS_CHANGED`: Subscribe to status updates

**Types Added** (shared/types/hotkeys.ts):

- `WaylandStatus`: Session detection + portal availability
- `HotkeyRegistrationResult`: Per-hotkey success/failure
- `PlatformHotkeyStatus`: Aggregated status for renderer
- `DesktopEnvironment`: 'kde' | 'unknown'
- `PortalMethod`: 'chromium-flag' | 'dbus-direct' | 'dbus-fallback' | 'none'

---

### 5. DEPENDENCY CHANGES

**Added**:

- `dbus-next: ^0.10.2` - D-Bus communication library

**Removed** (per git diff):

- Many test files deleted (cleanup of obsolete tests)
- `scripts/electron-launch.cjs` deleted
- `scripts/dbus-hotkey-test.mjs` deleted

---

### 6. KEY LOGIC FLOW

**Startup Sequence**:

1. `sandboxInit.ts` runs (before any other imports)
2. If sandbox restricted → `app.commandLine.appendSwitch('no-sandbox')`
3. `main.ts` imports constants → `getBaseWebPreferences()` evaluates sandbox state
4. Linux setup: Set app name, WM_CLASS, desktop name
5. Wayland detection → log status
6. `HotkeyManager.registerShortcuts()` called
7. If Wayland + portal → `_registerViaDBusDirect()`
8. D-Bus session created, shortcuts bound, Activated listener attached

**Hotkey Activation Flow**:

1. User presses global shortcut
2. KDE/portal captures shortcut, emits D-Bus `Activated` signal
3. `dbusFallback.ts` bus listener receives signal
4. Callback looked up from `actionCallbacks` Map by `HotkeyId`
5. Action executed (e.g., toggle Quick Chat)

---

### 7. PLATFORM SUPPORT MATRIX

| Platform | Session | DE            | Portal    | Method             | Status      |
| -------- | ------- | ------------- | --------- | ------------------ | ----------- |
| Windows  | N/A     | N/A           | N/A       | globalShortcut API | ✅ Enabled  |
| macOS    | N/A     | N/A           | N/A       | globalShortcut API | ✅ Enabled  |
| Linux    | X11     | Any           | N/A       | None               | ❌ Disabled |
| Linux    | Wayland | KDE Plasma 5+ | Available | D-Bus direct       | ✅ Enabled  |
| Linux    | Wayland | KDE Plasma <5 | N/A       | None               | ❌ Disabled |
| Linux    | Wayland | GNOME         | N/A       | None               | ❌ Disabled |
| Linux    | Wayland | Other         | N/A       | None               | ❌ Disabled |

---

### 8. CORNER CASES & FATAL SCENARIOS IDENTIFIED

**FATAL: AppImage Sandbox Crash (Ubuntu 24.04+)**

- Ubuntu 24.04+ AppArmor restricts user namespaces
- Without `sandboxInit.ts` + `--no-sandbox`, Electron crashes on startup
- **Mitigation**: Auto-detection + auto-disable in sandboxInit.ts

**CORNER: User Dismisses KDE Approval Dialog**

- KDE shows system dialog for shortcut approval
- User can dismiss/ignore it
- **Result**: BindShortcuts returns code=1, shortcuts fail gracefully
- **UI**: Partial failure toast shows which hotkeys unavailable

**CORNER: D-Bus Response Timeout**

- User leaves approval dialog open >30s
- **Result**: Timeout error logged, shortcuts marked as failed
- **Recovery**: App remains functional, can retry on next launch

**CORNER: Partial Shortcut Registration**

- Some shortcuts conflict with system shortcuts
- **Result**: `registrationResults` contains mix of success/failure
- **UI**: Toast lists specific failed hotkeys

**CORNER: Chromium False Positive Registration**

- Original code used `globalShortcut.register()` which reported success on KDE but callbacks never fired
- **Fix**: Skip `globalShortcut.register()` entirely on Wayland, use D-Bus direct
- **Tracking**: `portalMethod` distinguishes direct vs fallback

**CORNER: Stale Registration Results**

- Previous registrations persist across `registerShortcuts()` calls
- **Fix**: Clear `_registrationResults` at start of registration (commit a149593)

## 2026-02-09 Task: Audit Learnings

### TEST COVERAGE PATTERNS OBSERVED

#### Well-Covered Areas

1. **Basic Wayland detection** - All standard env var combinations tested
2. **Desktop environment detection** - KDE/unknown cases, colon-separated values
3. **Version parsing** - KDE 5/6/7, null, missing env
4. **Happy path D-Bus registration** - CreateSession → BindShortcuts flow
5. **Global vs Application hotkey scoping** - Separate handling verified
6. **Error containment** - D-Bus errors caught and don't propagate

#### Testing Strategy Used

- Extensive mocking of D-Bus via `vi.mock('dbus-next')`
- Mock `sessionBus` with controlled `getProxyObject` responses
- Simulated Response signals via `process.nextTick()`
- Mocked `globalShortcut` for Electron API isolation

#### Gaps in Testing Strategy

1. **Timing simulation** - `process.nextTick()` is not realistic async
2. **Partial results** - Binary success/failure assumed, not mixed
3. **State mutation** - No tests for rapid state changes during async ops
4. **Edge case fuzzing** - No malformed input testing
5. **Real integration** - No tests against actual D-Bus (understandable for CI)

---

### ARCHITECTURAL OBSERVATIONS

#### Strengths

- Clean separation: `waylandDetector` → `hotkeyManager` → `dbusFallback`
- Defensive programming: try/catch around all D-Bus operations
- User-friendly: Graceful degradation with toast notifications
- Cache-friendly: `getWaylandPlatformStatus()` memoized

#### Potential Risks

- **Singleton state**: `dbusFallback.ts` uses module-level variables (`connection`, `sessionPath`)
- **Async gap**: `registerShortcuts()` calls async `_registerViaDBusDirect()` but method signature is sync
- **No cancellation**: In-flight registrations can't be cancelled if user toggles setting
- **Portal version compatibility**: Only tests current KDE Plasma 5.27+ behavior

---

### EXTERNAL REFERENCES CONSULTED

1. **XDG Desktop Portal GlobalShortcuts Spec**
    - https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html
    - Referenced in: `src/main/utils/dbusFallback.ts:20`

2. **D-Bus Message Types**
    - Signal type = 4 (DBUS_MESSAGE_TYPE_SIGNAL)
    - Used in: `src/main/utils/dbusFallback.ts:98`

3. **XKB Keysym Names**
    - https://xkbcommon.org/doc/current/xkbcommon-keysyms_8h.html
    - Referenced in: `src/main/utils/dbusFallback.ts:147`

4. **XDG Shortcuts Spec**
    - https://specifications.freedesktop.org/shortcuts-spec/latest/
    - Referenced in: `src/main/utils/dbusFallback.ts:122`

## 2026-02-09 Task: Draft P0/P1 Test Plan for Wayland KDE Global Hotkey Enablement

### Summary

Drafted comprehensive P0/P1 test plan covering 5 critical test cases identified from code review gaps:

**P0 (Blocking) Cases**:

1. P0-1: Partial D-Bus registration failure (one hotkey succeeds, one fails)
2. P0-2: D-Bus connection drop during mid-registration

**P1 (High Priority) Cases**: 3. P1-1: User dismissal (code=1) vs system error (code>1) distinction 4. P1-2: Hotkey toggle during in-flight async registration (race condition) 5. P1-3: Re-registration without cleanup (session leak detection)

### Plan Structure

- **Overview & Goal**: Targets silent failures, partial registration, race conditions
- **Scope**: Covers HotkeyManager, D-Bus fallback, state consistency
- **Preconditions**: D-Bus fully mocked via `dbus-next-mock.ts`, env vars stubbed
- **Test Execution**: Unit, coordinated, and E2E guidance with specific test file paths
- **Mocking Strategy**: Each test case includes detailed mock setup and helper functions
- **Assertions**: State checks, callback verification, IPC validation, side-effect confirmation
- **Acceptance Criteria**: Detailed per-case acceptance criteria

### Key Insights

- Mocking uses `process.nextTick()` for immediate async + `setTimeout()` for race conditions
- Portal response codes: 0=success, 1=user dismissed, 2+=error (must distinguish)
- Partial failure requires individual hotkey result tracking, not binary success/failure
- Race condition prevention: D-Bus session creation should clear stale `_registrationResults`
- Session leak prevention: Verify no duplicate D-Bus listeners or handles after re-registration

### Implementation Notes

- Tests should use existing `dbus-next-mock.ts` centralized mock
- Each test verifies both happy path and failure recovery
- Logging assertions verify correct error messages logged
- Resource leak checks: verify D-Bus connections and message listeners cleaned up

### Output Files

- **Test Plan**: `docs/TEST_PLAN_WAYLAND_HOTKEY_P0_P1.md`
- **This Notepad**: Append summary with timestamp

### Ready for Next Phase

Plan is implementation-ready for another AI agent. Includes exact mock structures, test templates, and assertion patterns. All 5 cases have specific code paths, preconditions, steps, expected results, and mocking strategies documented.

## 2026-02-09 Task: Fix Invalid Hotkey IDs in TEST_PLAN_WAYLAND_HOTKEY_P0_P1.md

### Summary

Fixed all invalid references to `focusWindow` hotkey ID in the test plan document. `focusWindow` does not exist in the valid hotkey type definitions; replaced with valid IDs from `src/shared/types/hotkeys.ts`.

### Changes Made

1. **Line 41 (Assumptions)**: Updated hotkey IDs comment to clarify valid IDs and scope
    - **Before**: `'quickChat', 'bossKey', 'focusWindow' (standard app hotkeys)`
    - **After**: `'quickChat', 'bossKey' (Wayland global hotkeys); 'alwaysOnTop', 'printToPdf' are application hotkeys (out of scope for Wayland global registration)`
    - **Note**: Explicitly states that application hotkeys (`alwaysOnTop`, `printToPdf`) are out of scope for Wayland global shortcut registration

2. **Lines 111-129 (P0-1 Preconditions & Expected Results)**: Fixed preconditions and test scenario
    - **Before**: 3 hotkeys with `focusWindow`
    - **After**: 3 hotkeys with `alwaysOnTop` (valid application hotkey)
    - Updated expected results to reference `alwaysOnTop` instead of `focusWindow`

3. **Line 282 (P1-2 Mock Result)**: Updated expected results array
    - **Before**: `{ hotkeyId: 'focusWindow', success: true }`
    - **After**: `{ hotkeyId: 'alwaysOnTop', success: true }`

4. **Line 344 (P1-3 Re-Registration Results)**: Updated registration results mock
    - **Before**: `focusWindow: { success: true }`
    - **After**: `alwaysOnTop: { success: true }`

5. **Added P0-2 Section**: Restored missing "P0-2: D-Bus Connection Drop" test case section
    - Was previously merged into P0-1 content
    - Now has proper section header with full preconditions, steps, expected results, and mocking strategy

### Valid Hotkey IDs Reference (from src/shared/types/hotkeys.ts)

- `quickChat` - Global (Wayland supported)
- `bossKey` - Global (Wayland supported)
- `alwaysOnTop` - Application scoped
- `printToPdf` - Application scoped

### Test Plan Scope Clarification

Documented that test plan focuses on **Wayland global hotkeys** (`quickChat`, `bossKey`). Application-scoped hotkeys (`alwaysOnTop`, `printToPdf`) are out of scope for Wayland global shortcut registration via XDG Desktop Portal GlobalShortcuts. They use standard Electron Menu accelerators instead.

### Impact

- Test plan now uses only valid hotkey IDs that exist in type definitions
- No compilation errors or runtime type mismatches when implementing tests
- Clear separation between global and application hotkey scopes
- P0-2 test case now has proper visibility in document structure

### Timestamp

2026-02-09 17:30 UTC

## 2026-02-09 Task: Align Test Plan to Wayland Global Hotkeys Only (P0/P1)

### Summary

Removed all application-scoped hotkeys from P0/P1 test cases. Test plan now focuses exclusively on Wayland global hotkeys (`quickChat`, `bossKey`) for D-Bus registration testing.

### Changes Made

1. **P0-1 Preconditions** (line 111):
    - **Before**: 3 hotkeys including `alwaysOnTop`
    - **After**: 2 hotkeys `quickChat`, `bossKey` only
    - Added note: "(Wayland global hotkeys only)"

2. **P0-1 Steps** (line 117):
    - **Before**: Mock returns for 3 hotkeys with `alwaysOnTop`
    - **After**: Mock returns for 2 hotkeys only

3. **P0-1 Expected Results** (lines 125-127):
    - **Before**: Included `_registrationResults['alwaysOnTop']`
    - **After**: Removed, only `quickChat` and `bossKey` tracked

4. **P0-1 Mocking Strategy** (line 158):
    - **Before**: "For bossKey/alwaysOnTop failure"
    - **After**: "For bossKey failure"

5. **P1-2 Preconditions** (line 293):
    - **Before**: 3 hotkeys with `alwaysOnTop`
    - **After**: 2 hotkeys `quickChat`, `bossKey` only
    - Added note: "(Wayland global hotkeys only)"

6. **P1-2 Expected Results Mock** (lines 342-345):
    - **Before**: 3-item array with `alwaysOnTop`
    - **After**: 2-item array `quickChat` and `bossKey` only

7. **P1-3 Expected Results Mock** (lines 403-406):
    - **Before**: 3-item object with `alwaysOnTop`
    - **After**: 2-item object `quickChat` and `bossKey` only

### What Was Preserved

- **Line 41 Assumptions**: Kept explicit note that `alwaysOnTop` and `printToPdf` are "out of scope for Wayland global registration"
- All P0-2 and P1-1 cases (already used global hotkeys only)
- Traceability map and acceptance criteria (no app hotkey references there)

### Rationale

P0/P1 cases test D-Bus portal registration flow, which only applies to global hotkeys. Application hotkeys use standard Electron Menu accelerators, not D-Bus, so they don't belong in Wayland-specific test scenarios.

### Result

Test plan now cleanly separates concerns:

- **P0/P1 D-Bus Tests**: `quickChat`, `bossKey` (global hotkeys via XDG Desktop Portal)
- **Out of Scope**: `alwaysOnTop`, `printToPdf` (application accelerators, different registration path)

### Timestamp

2026-02-09 17:35 UTC
