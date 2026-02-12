## 2026-02-09 Task: initialize

- No issues yet.

## 2026-02-09 Task: Audit Tests for Missing Fatal/Corner Cases in Wayland KDE Global Hotkey Enablement

### EXECUTIVE SUMMARY

Comprehensive audit of test coverage for Wayland KDE global hotkey enablement. Found **11 missing fatal/corner cases** across detection, registration, D-Bus fallback, and error handling paths.

---

### FATAL/CORNER CASES NOT COVERED

#### 1. Wayland Detection Layer (waylandDetector.ts)

| #                                                                 | Missing Test Case                              | Code Location                       | Impact                                      | Rationale                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1.1                                                               | **Malformed XDG_SESSION_TYPE values**          | `detectWaylandSession()` lines 6-12 | Could crash on malformed env                | No test for values like `wayland                                                                      |
| `, ` wayland `(whitespace),`wayland;echo hack`, unicode injection |
| 1.2                                                               | **Race condition in getWaylandStatus caching** | `constants.ts` lines 311-316        | Inconsistent detection across app lifecycle | `_waylandStatus` is lazily cached once; no test verifies behavior if env vars change after first call |
| 1.3                                                               | **Empty/whitespace KDE_SESSION_VERSION**       | `detectDEVersion()` lines 30-41     | Version parsing failure                     | Only tests null and "unexpected", not ` ` (single space), `\t`, or `\n`                               |
| 1.4                                                               | **Extremely long DE version strings**          | `isSupportedDE()` lines 43-58       | Potential DoS via parseInt                  | No test for version strings like `"5".repeat(10000)` causing perf issues                              |

#### 2. Hotkey Manager Layer (hotkeyManager.ts)

| #   | Missing Test Case                                                       | Code Location                            | Impact                       | Rationale                                                                                           |
| --- | ----------------------------------------------------------------------- | ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 2.1 | **Partial D-Bus registration failure (one hotkey succeeds, one fails)** | `_registerViaDBusDirect()` lines 546-575 | Silent partial failure       | Tests cover all-success or all-failure, not mixed results like `quickChat=success, bossKey=denied`  |
| 2.2 | **D-Bus callback execution during \_registerViaDBusDirect**             | Lines 584-593                            | Action callbacks may be lost | Tests verify callbacks are passed but don't verify they actually get invoked when shortcut triggers |
| 2.3 | **Hotkey registration during active D-Bus session**                     | `registerShortcuts()` lines 456-490      | Session leak or collision    | No test for calling `registerShortcuts()` twice without `destroySession()` in between               |
| 2.4 | **Concurrent hotkey enable/disable during registration**                | `setIndividualEnabled()` lines 387-417   | Race condition               | No test for toggling hotkey state while `_registerViaDBusDirect` async operation is in flight       |

#### 3. D-Bus Fallback Layer (dbusFallback.ts)

| #   | Missing Test Case                               | Code Location                           | Impact                 | Rationale                                                                                           |
| --- | ----------------------------------------------- | --------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| 3.1 | **Portal Response signal timeout edge case**    | `waitForPortalResponse()` lines 298-325 | Hang or resource leak  | Tests use immediate `process.nextTick()` resolution; no test for actual timeout expiration handling |
| 3.2 | **BindShortcuts user dismissal (code=1)**       | `registerViaDBus()` lines 559-564       | Wrong failure reported | Tests mock success (code=0); no test verifies code=1 path (user clicked "Deny") vs code>1 (error)   |
| 3.3 | **Activated signal with malformed shortcutId**  | `activatedMessageHandler` lines 467-494 | Potential crash        | No test for Activated signal with null, undefined, or non-string shortcutId in msg.body             |
| 3.4 | **D-Bus disconnect during active registration** | `registerViaDBus()` lines 394-603       | Resource leak or crash | No test for connection dropping mid-registration (after CreateSession, before BindShortcuts)        |

#### 4. Integration/E2E Layer

| #   | Missing Test Case                             | Code Location                                      | Impact                           | Rationale                                                                                   |
| --- | --------------------------------------------- | -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| 4.1 | **Real KDE Plasma portal dialog interaction** | `wayland-hotkey-registration.spec.ts` lines 54-107 | No E2E coverage of actual portal | Tests skip when portal unavailable; no CI environment tests actual user approval flow       |
| 4.2 | **Hotkey collision with system shortcuts**    | E2E tests                                          | User confusion                   | No test for registering shortcuts already bound by OS (e.g., KDE's Ctrl+Alt+T for terminal) |

---

### RECOMMENDED TEST ADDITIONS

#### Priority 1 (Critical/Fatal)

```typescript
// 1. Partial D-Bus registration failure
it('should handle partial D-Bus registration failure', async () => {
    mockDbusFallback.registerViaDBus.mockResolvedValue([
        { hotkeyId: 'quickChat', success: true },
        { hotkeyId: 'bossKey', success: false, error: 'Shortcut already bound' },
    ]);
    // Assert: UI should show partial failure, quickChat should work, bossKey disabled
});

// 2. D-Bus disconnect during registration
it('should handle D-Bus disconnect mid-registration', async () => {
    mockCreateSession.mockImplementation(async () => {
        simulateDisconnect();
        throw new Error('Connection closed');
    });
    // Assert: Should cleanup, not crash, report failure
});
```

#### Priority 2 (Corner Cases)

```typescript
// 3. Malformed env var values
it('should handle malformed XDG_SESSION_TYPE gracefully', () => {
    process.env.XDG_SESSION_TYPE = 'wayland\n;rm -rf /'; // injection attempt
    expect(() => detectWaylandSession()).not.toThrow();
    expect(detectWaylandSession()).toBe(false);
});

// 4. BindShortcuts user dismissal
it('should distinguish user dismissal from portal error', async () => {
    mockBindShortcuts.mockImplementation(async (options) => {
        const handleToken = options?.handle_token?.value || 'token';
        const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
        simulatePortalResponse(requestPath, 1, {}); // code=1 = user dismissed
        return requestPath;
    });
    const results = await dbusFallback.registerViaDBus(testShortcuts);
    expect(results[0].error).toContain('user dismissed');
});
```

#### Priority 3 (Integration)

```typescript
// 5. Hotkey enable during async registration
it('should queue or reject hotkey enable during in-flight registration', async () => {
    let resolveRegistration: () => void;
    const registrationPromise = new Promise<void>((resolve) => {
        resolveRegistration = resolve;
    });
    mockDbusFallback.registerViaDBus.mockReturnValue(registrationPromise);

    hotkeyManager.registerShortcuts();
    hotkeyManager.setIndividualEnabled('bossKey', false); // Toggle while in-flight

    // Assert: Should not cause race condition or double-registration
});
```

---

### FILES REQUIRING ADDITIONAL TESTS

| File                                                                | Current Coverage               | Missing Cases                                                                           |
| ------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `tests/unit/main/utils/waylandDetector.test.ts`                     | Good basic coverage            | 4 edge cases (malformed env, caching, whitespace version, long strings)                 |
| `tests/unit/main/hotkeyManager.test.ts`                             | Good Linux/Wayland scenarios   | 4 cases (partial failure, callback invocation, re-registration race, concurrent toggle) |
| `tests/unit/main/utils/dbusFallback.test.ts`                        | Good happy path + basic errors | 4 cases (timeout handling, code=1, malformed signal, disconnect mid-flight)             |
| `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts` | Good coordination coverage     | 2 cases (partial results propagation, callback execution)                               |
| `tests/e2e/wayland-hotkey-registration.spec.ts`                     | Environment-dependent          | 2 cases (real portal dialog, system shortcut collision)                                 |

---

### CROSS-REFERENCES

- Implementation: `src/main/utils/waylandDetector.ts`, `src/main/managers/hotkeyManager.ts`, `src/main/utils/dbusFallback.ts`
- Types: `src/shared/types/hotkeys.ts` lines 132-189
- Tests analyzed: `tests/unit/main/utils/waylandDetector.test.ts`, `tests/unit/main/hotkeyManager.test.ts`, `tests/unit/main/utils/dbusFallback.test.ts`, `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`, `tests/e2e/wayland-hotkey-registration.spec.ts`

## 2026-02-09 Task: Identify newly added tests and map coverage to hotkey enablement flow

### Test Gaps Identified

1. **KDE Portal D-Bus Integration Gap**
    - **Location**: No test file directly tests against real KDE GlobalShortcuts portal
    - **Impact**: D-Bus fallback logic is fully mocked; real portal behavior differences may not be caught
    - **Suggestion**: Add integration test that can run on KDE systems to verify real portal communication

2. **Chromium Flag Injection Verification Gap**
    - **Location**: No explicit test for `app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal')`
    - **Impact**: Flag injection could regress without test failure
    - **Suggestion**: Add unit test in main.test.ts or coordinated test verifying flag injection on Wayland+KDE

3. **Multi-Desktop Environment Coverage Gap**
    - **Location**: Tests only explicitly cover KDE; other DEs return 'unknown'
    - **Impact**: No explicit test that GNOME/XFCE/etc. correctly trigger unsupported path
    - **Suggestion**: Add parameterized tests for various DE values in waylandDetector.test.ts

4. **Hotkey Conflict Scenario Gap**
    - **Location**: No test for when another application has registered the same hotkey
    - **Impact**: Conflict resolution behavior is undefined in tests
    - **Suggestion**: Add E2E test simulating hotkey conflict with another Electron app

5. **Session Persistence Gap**
    - **Location**: No test for hotkey behavior after system sleep/wake
    - **Impact**: Hotkeys may not re-register after resume
    - **Suggestion**: Add integration test for power events (if testable in CI)

6. **Toast Timeout Edge Case Gap**
    - **Location**: LinuxHotkeyNotice.test.tsx uses fixed 1000ms delay
    - **Impact**: Race conditions between toast display and hotkey registration may not be caught
    - **Suggestion**: Add test with variable timing to ensure race condition safety

---

### Implementation Notes

- All tests follow the existing patterns in the codebase
- dbus-next is fully mocked; no real D-Bus communication in tests
- Environment variable manipulation is properly isolated per-test
- Cross-platform tests use `vi.stubGlobal('process', ...)` approach
- E2E tests properly skip on non-Linux platforms

## 2026-02-09 Task: Issues/Concerns from Code Review

### 1. LIMITED DESKTOP ENVIRONMENT SUPPORT

**Issue**: Only KDE Plasma 5+ is supported; GNOME and other DEs are explicitly unsupported.

**Evidence**:

```typescript
// waylandDetector.ts
export type DesktopEnvironment = 'kde' | 'unknown';
export function isSupportedDE(de: DesktopEnvironment, version: string | null): boolean {
    if (de !== 'kde') return false;
    // ...
}
```

**Impact**: Users on GNOME, Sway, Hyprland, etc. will not get global hotkeys even if their compositor supports the portal.

**Recommendation**: Consider expanding support if other DEs implement the GlobalShortcuts portal.

---

### 2. NO CHROMIUM FALLBACK PATH ACTIVELY USED

**Issue**: The `portalMethod: 'chromium-flag'` is defined in types but never used.

**Evidence**:

```typescript
// main.ts - explicit comment
// We intentionally do NOT enable Chromium's GlobalShortcutsPortal feature flag.
// Chromium's globalShortcut.register() reports false positive success on KDE Plasma 6
```

**Impact**: The D-Bus direct path is the only working path. If it fails, there's no alternative.

---

### 3. D-BUS CONNECTION LIFECYCLE CONCERN

**Issue**: D-Bus connection is held for app lifetime but there's no explicit reconnection logic.

**Evidence**:

```typescript
// dbusFallback.ts
let connection: DBusConnection | null = null;
// Connection established in registerViaDBus(), cleaned up in destroySession()
```

**Concern**: If D-Bus daemon restarts or connection drops, shortcuts will stop working without notification.

**Mitigation**: The `Activated` signal handler would stop receiving messages; user would need to restart app.

---

### 4. ASYNC INITIALIZATION RACE CONDITION

**Issue**: `HotkeyManager.registerShortcuts()` is synchronous but `_registerViaDBusDirect()` is async.

**Evidence**:

```typescript
// hotkeyManager.ts
registerShortcuts(): void {  // synchronous signature
    // ...
    this._registerViaDBusDirect(waylandStatus);  // called but not awaited
}

private async _registerViaDBusDirect(waylandStatus: WaylandStatus): Promise<void> {
    // async implementation
}
```

**Impact**: `registerShortcuts()` returns before D-Bus registration completes. If registration fails, the failure is logged but caller may not know.

**Mitigation**: The `getPlatformHotkeyStatus()` method provides eventual consistency check.

---

### 5. DEBUG LOGGING GATED BUT NOT DOCUMENTED

**Issue**: `DEBUG_DBUS` environment variable gates verbose logging but isn't documented in code comments at module level.

**Evidence**:

```typescript
// dbusFallback.ts line 91
const DEBUG_DBUS = process.env.DEBUG_DBUS === '1' || process.env.DEBUG_DBUS === 'true';
```

**Recommendation**: Add to README or troubleshooting docs for support scenarios.

---

### 6. WM_CLASS SET BUT NOT VERIFIED

**Issue**: `app.commandLine.appendSwitch('class', 'gemini-desktop')` sets WM_CLASS but there's no verification this works correctly on all KDE versions.

**Impact**: If WM_CLASS doesn't match, KDE portal dialogs may show incorrect app name.

---

### 7. MISSING CLEANUP ON APP QUIT

**Issue**: No explicit cleanup of D-Bus session on app quit.

**Evidence**: `destroySession()` exists but not called from app quit handler.

**Impact**: Potential D-Bus resource leak, though likely minor since session bus cleans up on disconnect.

---

### 8. TEST FILE DELETIONS

**Issue**: Many test files were deleted in this branch:

- `tests/unit/main/sandboxDetector.test.ts` (deleted)
- `tests/unit/main/utils/dbusFallback.test.ts` (deleted)
- `tests/unit/main/utils/waylandDetector.test.ts` (deleted)
- `tests/e2e/release/sandbox-appimage.spec.ts` (deleted)

**Concern**: New functionality may lack test coverage despite having test infrastructure.
