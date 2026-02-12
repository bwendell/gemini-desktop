## 2026-02-09 Task: initialize

- No problems yet.

## 2026-02-09 Task: Technical Gaps in Wayland KDE Global Hotkey Testing

### CRITICAL GAPS IDENTIFIED

#### Gap 1: Race Condition in Async Registration Path

**Problem**: `registerShortcuts()` calls `_registerViaDBusDirect()` which is async, but subsequent calls to `registerShortcuts()` or `setIndividualEnabled()` can occur before completion.

**Code Location**: `src/main/managers/hotkeyManager.ts:546-575`

**Why It Matters**: If user toggles a hotkey in Settings while registration is still in-flight with the portal, the state can become inconsistent.

**Test Gap**: No test simulates rapid registration/re-registration.

---

#### Gap 2: Partial Success Handling Missing

**Problem**: D-Bus portal can return mixed results (one hotkey granted, one denied).

**Code Location**: `src/main/managers/hotkeyManager.ts:565-574`

**Current Behavior**: `anySuccess` boolean treats partial success as full success.

**Test Gap**: Tests mock all-success or all-failure; no mixed-result scenarios.

---

#### Gap 3: User Dismissal Not Distinguished from Error

**Problem**: XDG Desktop Portal returns code=1 when user clicks "Deny" vs code>1 for errors.

**Code Location**: `src/main/utils/dbusFallback.ts:559-564`

**Current Behavior**: Both paths log generic warnings; UI shows same message for user-denied vs system error.

**Test Gap**: No test simulates code=1 specifically.

---

#### Gap 4: Malicious Environment Variables

**Problem**: No sanitization of `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`, `KDE_SESSION_VERSION`.

**Code Location**: `src/main/utils/waylandDetector.ts:6-41`

**Risk**: Injection attempts, DoS via extreme string lengths, unexpected behavior from unicode.

**Test Gap**: No fuzzing or malformed input tests.

---

#### Gap 5: D-Bus Signal Handler Leak on Timeout

**Problem**: If `waitForPortalResponse` times out, the message handler is removed, but if timeout occurs AFTER response fires but BEFORE Promise resolution, handler state is inconsistent.

**Code Location**: `src/main/utils/dbusFallback.ts:303-325`

**Test Gap**: Tests use `process.nextTick()` which doesn't simulate real async timing.

---

### RECOMMENDATIONS BY PRIORITY

#### P0 (Block Release)

1. Add test for partial D-Bus registration failure (one hotkey succeeds, one fails)
2. Add test for D-Bus connection drop mid-registration

#### P1 (High Priority)

3. Add test for user dismissal (portal code=1) vs error (code>1)
4. Add test for rapid enable/disable during in-flight registration
5. Add test for re-registration without cleanup (session leak)

#### P2 (Medium Priority)

6. Add test for malformed/edge-case environment variables
7. Add test for Activated signal with null/undefined shortcutId
8. Add test for timeout edge case (response arrives exactly at timeout)

#### P3 (Nice to Have)

9. Add E2E test with mock portal for CI environments
10. Add test for system shortcut collision handling

## 2026-02-09 Task: Open Problems from Code Review

### 1. NO RECONNECTION LOGIC FOR D-BUS

**Status**: Unresolved
**Problem**: If D-Bus session bus restarts, the connection is dead but app won't know.
**Workaround**: User must restart the application.

---

### 2. KDE-ONLY SUPPORT LIMITS USER BASE

**Status**: By Design, but limits adoption
**Problem**: Only KDE Plasma 5+ users benefit from global hotkeys on Wayland.
**GNOME Users**: No global hotkey support (GNOME uses different portal mechanisms).
**Other DEs**: Sway, Hyprland, etc. not supported.

---

### 3. STALE TEST FILE REFERENCES

**Status**: Needs cleanup
**Problem**: Test files reference deleted modules or have outdated paths.
**Example**: Tests import from deleted `dbus-next-mock.ts`.

---

### 4. UNVERIFIED WM_CLASS BEHAVIOR

**Status**: Unverified
**Problem**: `app.commandLine.appendSwitch('class', 'gemini-desktop')` sets WM_CLASS but not tested across KDE versions.
**Risk**: Portal dialogs may show wrong app name if WM_CLASS mismatch.

---

### 5. NO METRICS ON REGISTRATION SUCCESS RATES

**Status**: Unresolved
**Problem**: No telemetry/logging aggregation to understand how often D-Bus registration fails in the wild.
**Impact**: Hard to prioritize fixes for edge cases.
