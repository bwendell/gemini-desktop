# P0/P1 Test Plan: Wayland KDE Global Hotkey Enablement

**Document Version**: 1.0  
**Last Updated**: 2026-02-09  
**Status**: Ready for Implementation

---

## Overview & Goal

This test plan addresses critical gaps in coverage for Wayland KDE global hotkey enablement on the `feat/linux-hotkeys` branch. The goal is to systematically test P0 (blocking) and P1 (high-priority) scenarios that could cause silent failures, partial registration issues, or race conditions in production.

**Target Scope**: `src/main/managers/hotkeyManager.ts`, `src/main/utils/dbusFallback.ts`, `src/main/utils/waylandDetector.ts`

---

## Scope: In Scope & Out of Scope

### In Scope

- D-Bus registration partial failures (one hotkey succeeds, one fails)
- D-Bus connection drop scenarios (mid-registration)
- User dismissal handling (portal code=1 vs error code>1)
- Concurrent hotkey toggle during async registration
- Re-registration without proper cleanup (session leak detection)
- State consistency after failures

### Out of Scope

- Real KDE portal E2E tests (covered by existing E2E suite; CI environment limitations)
- Multi-DE support beyond KDE (documented as unsupported)
- Chromium flag fallback (intentionally disabled; not under test)
- Actual D-Bus system bus communication (mocked via `dbus-next` mock)

---

## Assumptions & Constraints

1. **D-Bus is fully mocked** in unit tests via `vi.mock('dbus-next')` and `dbus-next-mock.ts`
2. **Test environment**: Linux Wayland KDE Plasma 5.27+ (or mocked equivalent)
3. **Hotkey IDs used**: `quickChat`, `peekAndHide` (Wayland global hotkeys); `alwaysOnTop`, `printToPdf` are application hotkeys (out of scope for Wayland global registration)
4. **Portal method**: Only `dbus-direct` is currently active (`chromium-flag` is intentionally disabled)
5. **Electron accelerator format**: Converted to XDG keysym format (e.g., `CommandOrControl+Shift+Space` → `CTRL+SHIFT+space`)
6. **Test data**: All mocked responses mimic real D-Bus portal behavior

---

## Test Environments & Preconditions

### Unit Test Environment

- **Framework**: Vitest
- **Mocking**: `vi.mock('dbus-next')` with centralized `dbus-next-mock.ts`
- **Setup**: Fresh `HotkeyManager` instance per test
- **Environment Variables**: Stubbed via `vi.stubGlobal('process.env', {...})`

### Coordinated Test Environment

- **Framework**: Vitest with coordinated window simulation
- **Scope**: Multi-window state propagation
- **Precondition**: Both main and renderer processes initialized

### Mock Requirements

- `sessionBus` object with mocked `getProxyObject()` method
- `portalInterface` proxy with `CreateSession`, `BindShortcuts` methods
- Message listener on connection for `Activated` signal simulation
- Configurable response codes (0 = success, 1 = user dismissed, 2+ = error)

---

## Test Execution Guidance

### Running Individual Tests

```bash
# Unit tests for HotkeyManager
npx vitest tests/unit/main/hotkeyManager.test.ts -t "P0:"

# Unit tests for D-Bus fallback
npx vitest tests/unit/main/utils/dbusFallback.test.ts -t "P0:"

# Coordinated tests
npx vitest tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts -t "P0:"
```

### Debugging

```bash
# Enable verbose logging
DEBUG_DBUS=1 npx vitest tests/unit/main/utils/dbusFallback.test.ts -t "P0:" --reporter=verbose
```

### Assertion Strategy

- **State assertions**: Verify `_registrationResults` Map contains expected entries
- **Callback assertions**: Mock D-Bus listener invocation and verify action callbacks fire
- **IPC assertions**: Query `getPlatformHotkeyStatus()` and verify returned status matches expectations
- **Side-effect assertions**: Verify `destroySession()` called on cleanup

---

## P0 Test Cases (Blocking/Critical)

### P0-1: Partial D-Bus Registration Failure

**Objective**: Ensure app handles mixed success/failure when some hotkeys register and others fail (e.g., due to system shortcut conflicts).

**Preconditions**:

- HotkeyManager initialized with 2 hotkeys: `quickChat`, `peekAndHide` (Wayland global hotkeys only)
- Wayland detection returns `portalAvailable: true`
- D-Bus CreateSession succeeds (session path = `/org/freedesktop/portal/desktop/request/1_0/path1`)

**Steps**:

1. Mock `BindShortcuts` to return success (code=0) for `quickChat`, failure (code=2) for `peekAndHide`
2. Call `hotkeyManager.registerShortcuts()`
3. Simulate D-Bus `Response` signal for both shortcut groups (one success batch, one failure batch)
4. Wait for registration to complete (async)
5. Query `getPlatformHotkeyStatus()`

**Expected Results**:

- `_registrationResults['quickChat']` = `{ success: true }`
- `_registrationResults['peekAndHide']` = `{ success: false, error: 'System shortcut conflict' }`
- `globalHotkeysEnabled` = `true` (partial success still enables feature)
- `registrationResults` array returned to renderer lists both success and failures
- `anySuccess` flag = `true` (at least one hotkey succeeded)

**Target Test Files**:

- `tests/unit/main/hotkeyManager.test.ts`
- `tests/unit/main/utils/dbusFallback.test.ts`

**Mocking Strategy**:

```typescript
// Mock dbus-next
vi.mock('dbus-next', () => ({
    sessionBus: {
        getProxyObject: vi.fn().mockResolvedValue({
            getInterface: vi.fn().mockReturnValue({
                CreateSession: vi.fn().mockResolvedValue('/org/freedesktop/portal/desktop/request/1_0/path1'),
                BindShortcuts: vi.fn().mockImplementation(async (opts) => {
                    // Simulate batched response: quick success for quickChat
                    process.nextTick(() => {
                        simulateResponse('/org/freedesktop/portal/desktop/request/1_0/path1', 0, {});
                    });
                    return '/org/freedesktop/portal/desktop/request/1_0/path2';
                }),
            }),
        }),
    },
}));

// For peekAndHide failure, mock second BindShortcuts call
mockBindShortcuts.mockImplementationOnce(async (opts) => {
    process.nextTick(() => {
        simulateResponse('/org/freedesktop/portal/desktop/request/1_0/path2', 2, {});
    });
    return '/org/freedesktop/portal/desktop/request/1_0/path2';
});
```

---

### P0-2: D-Bus Connection Drop During Mid-Registration

**Objective**: Verify app gracefully handles D-Bus connection loss while registration is in-flight (after CreateSession, before BindShortcuts completes).

**Preconditions**:

- HotkeyManager initialized with 2 hotkeys: `quickChat`, `peekAndHide`
- Wayland detection returns `portalAvailable: true`
- D-Bus connection initially succeeds

**Steps**:

1. Mock `CreateSession` to succeed
2. Mock `BindShortcuts` to throw `Error('org.freedesktop.DBus.Error.NotConnected')`
3. Call `hotkeyManager.registerShortcuts()`
4. Simulate D-Bus connection drop (e.g., portal daemon restart)

**Expected Results**:

- Error is caught and logged (no uncaught exception)
- `_registrationResults` maps both hotkeys to failure
- `globalHotkeysEnabled` = `false`
- Status returned to renderer reflects failure
- App remains functional (no crash)
- `destroySession()` called (cleanup of partial session)

**Target Test Files**:

- `tests/unit/main/hotkeyManager.test.ts`
- `tests/unit/main/utils/dbusFallback.test.ts`

**Mocking Strategy**:

```typescript
mockCreateSession.mockResolvedValue('/org/freedesktop/portal/desktop/request/1_0/session1');
mockBindShortcuts.mockRejectedValue(new Error('org.freedesktop.DBus.Error.NotConnected'));

// Verify cleanup
expect(destroySession).toHaveBeenCalled();
expect(registrationResults.every((r) => !r.success)).toBe(true);
```

---

## P1 Test Cases (High Priority)

### P1-1: User Dismissal (Portal Code=1) vs System Error (Code>1)

**Objective**: Distinguish between user canceling portal approval dialog (code=1) vs actual system error (code=2+), allowing UI to show appropriate message.

**Preconditions**:

- HotkeyManager initialized with 1 hotkey: `quickChat`
- Wayland detection returns `portalAvailable: true`
- D-Bus CreateSession succeeds

**Steps - User Dismissal**:

1. Mock `BindShortcuts` to succeed in creating request
2. Simulate D-Bus `Response` signal with code=1 (user dismissed)
3. Call `hotkeyManager.registerShortcuts()`
4. Query `registrationResults`

**Expected Results (User Dismissal)**:

- `_registrationResults['quickChat'].error` contains "user dismissed" or "canceled"
- `success: false`
- Log message indicates user action, not system failure
- UI toast (via `LinuxHotkeyNotice`) shows "User dismissed portal dialog" or similar

**Steps - System Error**:

1. Mock `BindShortcuts` to succeed in creating request
2. Simulate D-Bus `Response` signal with code=2 (system error)
3. Call `hotkeyManager.registerShortcuts()`
4. Query `registrationResults`

**Expected Results (System Error)**:

- `_registrationResults['quickChat'].error` contains "system error" or "portal error"
- `success: false`
- Log message indicates system issue
- UI toast shows "Portal service unavailable" or similar

**Target Test Files**:

- `tests/unit/main/utils/dbusFallback.test.ts` (primary)
- `tests/unit/main/hotkeyManager.test.ts` (integration)

**Mocking Strategy**:

```typescript
// Helper function to simulate portal response
function simulatePortalResponse(requestPath: string, code: number, results: Record<string, any>) {
    process.nextTick(() => {
        connection.emit('message', {
            type: 4, // DBUS_MESSAGE_TYPE_SIGNAL
            interface: 'org.freedesktop.portal.Request',
            member: 'Response',
            path: requestPath,
            body: [code, results],
        });
    });
}

// Test user dismissal
it('should distinguish user dismissal (code=1) from error (code=2)', async () => {
    mockBindShortcuts.mockResolvedValue('/org/freedesktop/portal/desktop/request/1_0/req1');

    const results = await dbusFallback.registerViaDBus([...]);
    simulatePortalResponse('/org/freedesktop/portal/desktop/request/1_0/req1', 1, {});

    const result = await waitForResult();
    expect(result.error).toMatch(/user.*dismissal|canceled/i);
});
```

---

### P1-2: Hotkey Toggle During In-Flight Registration

**Objective**: Verify app handles `setIndividualEnabled()` calls while `registerShortcuts()` async operation is still pending (race condition prevention).

**Preconditions**:

- HotkeyManager initialized with 2 hotkeys: `quickChat`, `peekAndHide` (Wayland global hotkeys only)
- `registerShortcuts()` called but not yet completed
- Registration is stalled (awaiting BindShortcuts response)

**Steps**:

1. Mock `BindShortcuts` to delay response (use `setTimeout` instead of `process.nextTick()`)
2. Call `hotkeyManager.registerShortcuts()` (don't await)
3. Immediately call `hotkeyManager.setIndividualEnabled('peekAndHide', false)` while registration in-flight
4. Wait for registration to complete
5. Query final state

**Expected Results**:

- No race condition (no duplicate registration calls)
- `_registrationResults` reflects original registration attempt
- `setIndividualEnabled('peekAndHide', false)` either queued or rejected with clear error
- State is consistent (no partial updates or stale callbacks)
- If queued: second registration attempt respects disabled state

**Target Test Files**:

- `tests/unit/main/hotkeyManager.test.ts`
- `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`

**Mocking Strategy**:

```typescript
let resolveBindShortcuts: () => void;
const bindShortcutsPromise = new Promise<void>((resolve) => {
    resolveBindShortcuts = resolve;
});

mockBindShortcuts.mockReturnValue(bindShortcutsPromise);

// Start registration
hotkeyManager.registerShortcuts();

// Toggle while in-flight
hotkeyManager.setIndividualEnabled('peekAndHide', false);

// Verify no race
expect(hotkeyManager.getHotkeyState('peekAndHide').enabled).toBe(false);

// Complete registration
resolveBindShortcuts();

// Verify consistency
const results = hotkeyManager.getPlatformHotkeyStatus();
expect(results.registrationResults).toMatchObject([
    { hotkeyId: 'quickChat', success: true },
    { hotkeyId: 'peekAndHide', success: false, error: 'Disabled by user' },
]);
```

---

### P1-3: Re-Registration Without Cleanup (Session Leak)

**Objective**: Detect session leak when `registerShortcuts()` called twice without `destroySession()` cleanup between calls.

**Preconditions**:

- First registration completes successfully
- Second registration triggered (e.g., user re-enables hotkeys in settings)

**Steps**:

1. Call `hotkeyManager.registerShortcuts()` and wait for completion (D-Bus session created)
2. Call `hotkeyManager.registerShortcuts()` again WITHOUT calling `destroySession()` first
3. Monitor D-Bus session count and connection state
4. Query final registration results

**Expected Results**:

- Second registration clears `_registrationResults` before starting (commit a149593 behavior)
- Only one active D-Bus session exists (old session cleaned up or reused)
- No resource leak (session handle or message listener not duplicated)
- Both registration attempts complete successfully
- Final `registrationResults` reflect second attempt, not first

**Target Test Files**:

- `tests/unit/main/hotkeyManager.test.ts`
- `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`

**Mocking Strategy**:

```typescript
// Track session creation
const sessionPaths: string[] = [];
mockCreateSession.mockImplementation(async () => {
    const path = `/org/freedesktop/portal/desktop/request/1_0/session${sessionPaths.length}`;
    sessionPaths.push(path);
    return path;
});

// First registration
await hotkeyManager.registerShortcuts();
expect(sessionPaths).toHaveLength(1);

// Second registration WITHOUT cleanup
hotkeyManager.clearRegistrationResults(); // Verify this is called automatically
await hotkeyManager.registerShortcuts();

// Should not create duplicate session
expect(sessionPaths).toHaveLength(2); // Two separate attempts
expect(sessionPaths[0]).not.toBe(sessionPaths[1]);

// But _registrationResults should only reflect second attempt
expect(hotkeyManager._registrationResults).toMatchObject({
    quickChat: { success: true },
    peekAndHide: { success: true },
});
```

---

## Traceability Map

| Test ID | Test Name                         | P0/P1 | Code Path                                                      | Source File                        | Test File             |
| ------- | --------------------------------- | ----- | -------------------------------------------------------------- | ---------------------------------- | --------------------- |
| P0-1    | Partial D-Bus Registration        | P0    | `_registerViaDBusDirect() + BindShortcuts multi-batch`         | hotkeyManager.ts:546-574           | hotkeyManager.test.ts |
| P0-2    | D-Bus Connect Drop                | P0    | `registerViaDBus() error handling`                             | dbusFallback.ts:394-603            | dbusFallback.test.ts  |
| P1-1    | User Dismissal vs Error           | P1    | `waitForPortalResponse() code parsing`                         | dbusFallback.ts:559-564            | dbusFallback.test.ts  |
| P1-2    | Hotkey Toggle During Registration | P1    | `setIndividualEnabled() during async _registerViaDBusDirect()` | hotkeyManager.ts:387-417 + 546-575 | hotkeyManager.test.ts |
| P1-3    | Re-Registration Without Cleanup   | P1    | `registerShortcuts() clear state + session creation`           | hotkeyManager.ts:456-490           | hotkeyManager.test.ts |

---

## Acceptance Criteria

### For All P0/P1 Tests

- ✅ Test passes consistently (no flakiness)
- ✅ Mock behavior realistic vs actual D-Bus portal
- ✅ Assertions cover both happy and failure paths
- ✅ Log output verified (correct error messages logged)
- ✅ State consistency verified post-failure
- ✅ No resource leaks (D-Bus connections, message listeners)
- ✅ Code comments explain mocking strategy and expected behavior

### For Partial Failure (P0-1)

- ✅ Individual hotkey results tracked separately
- ✅ Partial success (anySuccess=true) enables feature for working shortcuts
- ✅ UI toast lists specific failed hotkeys

### For Connection Drop (P0-2)

- ✅ Error logged with context (D-Bus error type)
- ✅ All hotkeys marked as failed in results
- ✅ `destroySession()` called for cleanup
- ✅ App continues to function (no crash)

### For User Dismissal (P1-1)

- ✅ Code=1 path explicitly tested
- ✅ Error message distinguishes dismissal from system error
- ✅ Log includes timestamp and portal error code

### For Hotkey Toggle Race (P1-2)

- ✅ State is consistent after completion
- ✅ No duplicate callbacks registered
- ✅ Disabled hotkeys not included in final results

### For Re-Registration (P1-3)

- ✅ Old `_registrationResults` cleared on new `registerShortcuts()`
- ✅ Session handles don't leak
- ✅ Message listeners cleaned up or properly managed

---

## Implementation Notes for AI Agent

### Testing Libraries & Setup

- Use **Vitest** with `vi.mock()` for module mocking
- Use **process.nextTick()** for immediate async simulation
- Use **setTimeout()** with explicit clock control for race condition tests
- Centralize D-Bus mock in `tests/unit/main/test/dbus-next-mock.ts`

### Mock Structure

```typescript
// tests/unit/main/test/dbus-next-mock.ts
export const mockSessionBus = {
    getProxyObject: vi.fn(),
};

export const mockPortalInterface = {
    CreateSession: vi.fn(),
    BindShortcuts: vi.fn(),
};

export const mockConnection = new EventEmitter();

vi.mock('dbus-next', () => ({
    sessionBus: mockSessionBus,
}));
```

### Test Template

```typescript
describe('P0/P1: Wayland Hotkey Registration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        hotkeyManager = new HotkeyManager();
    });

    test('P0-1: Partial D-Bus registration', async () => {
        // Mock setup
        mockBindShortcuts.mockImplementation(async (opts) => {
            // Simulate partial response
        });

        // Execute
        hotkeyManager.registerShortcuts();
        await vi.runAllTimersAsync();

        // Assert
        expect(hotkeyManager._registrationResults.get('quickChat')?.success).toBe(true);
        expect(hotkeyManager._registrationResults.get('peekAndHide')?.success).toBe(false);
    });
});
```

### References

- **D-Bus Portal Spec**: https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html
- **Signal Types**: https://dbus.freedesktop.org/doc/dbus-daemon.1.html (Message Type 4 = SIGNAL)
- **Error Codes**: XDG portal returns 0 (success), 1 (user dismissed), 2+ (error)
- **Source Implementation**: `src/main/managers/hotkeyManager.ts`, `src/main/utils/dbusFallback.ts`

---

## Related Documentation

- **Feature Branch**: `feat/linux-hotkeys`
- **Type Definitions**: `src/shared/types/hotkeys.ts`
- **Existing Test Gaps**: `.sisyphus/notepads/wayland-hotkey-test-audit/issues.md`
- **Code Review Notes**: `.sisyphus/notepads/wayland-hotkey-test-audit/problems.md`

---

**End of Test Plan**
