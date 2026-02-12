# Wayland KDE Global Hotkey Test Coverage Plan

**Version**: 2.0 (Execution-Ready)  
**Created**: 2026-02-09  
**Updated**: 2026-02-10  
**Status**: Ready for Implementation  
**Objective**: Ensure comprehensive test coverage for Wayland KDE global hotkey enablement with proper skip behavior on non-Wayland/CI environments.

---

## Table of Contents

1. [Scope & Constraints](#1-scope--constraints)
2. [Coverage Matrix](#2-coverage-matrix)
3. [Error-Case Catalog](#3-error-case-catalog)
4. [Defensive Programming Checklist](#4-defensive-programming-checklist)
5. [Local Execution Guide](#5-local-execution-guide)
6. [Explicit Skip/Gating Strategy](#6-explicit-skipgating-strategy)
7. [Step-by-Step Implementation Tasks](#7-step-by-step-implementation-tasks)
8. [References](#8-references)

---

## 1. Scope & Constraints

### 1.1 In Scope

| Component         | Files                                         | Test Layers                         |
| ----------------- | --------------------------------------------- | ----------------------------------- |
| Wayland Detection | `src/main/utils/waylandDetector.ts`           | Unit, Coordinated                   |
| Hotkey Manager    | `src/main/managers/hotkeyManager.ts`          | Unit, Coordinated, Integration, E2E |
| D-Bus Fallback    | `src/main/utils/dbusFallback.ts`              | Unit, Coordinated, Integration      |
| Platform Status   | `src/shared/types/hotkeys.ts`                 | Unit, Coordinated, Integration      |
| UI Components     | `LinuxHotkeyNotice.tsx`, `HotkeySettings.tsx` | Unit, E2E                           |
| IPC Handlers      | `HotkeyIpcHandler.ts`                         | Integration, Coordinated            |

### 1.2 Out of Scope

| Item                        | Rationale                                             |
| --------------------------- | ----------------------------------------------------- |
| Real KDE portal E2E in CI   | CI environment limitations (no Wayland+KDE runners)   |
| Multi-DE support beyond KDE | Documented as unsupported (GNOME, sway future work)   |
| Chromium flag fallback      | Intentionally disabled; not under test                |
| Actual D-Bus system bus     | Mocked via `dbus-next` mock in automated tests        |
| Non-Linux platforms         | Uses `globalShortcut` API (covered by existing tests) |

### 1.3 Constraints

| Constraint                   | Impact                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| **CI Environment**           | GitHub Actions uses X11, no native Wayland sessions available |
| **Container Limitations**    | KDE+Wayland container possible but complex to set up          |
| **Portal Dialog Testing**    | User approval dialog cannot be automated in CI                |
| **Real Keypress Simulation** | Requires OS-level automation (xdotool) which is flaky         |
| **D-Bus Availability**       | CI environments may not have D-Bus daemon running             |

### 1.4 Assumptions

| Assumption                                          | Justification                                     |
| --------------------------------------------------- | ------------------------------------------------- |
| D-Bus is fully mocked in unit tests                 | Uses `vi.mock('dbus-next')` + `dbus-next-mock.ts` |
| Test environment mimics Linux Wayland KDE 5.27+     | Mocked return values controlled via test setup    |
| Hotkey IDs: `quickChat`, `bossKey` (Wayland global) | Other hotkeys use application-level registration  |
| Portal method: `dbus-direct` only                   | `chromium-flag` intentionally disabled            |
| Electron accelerator → XDG format conversion        | Tested via unit tests with known mappings         |

---

## 2. Coverage Matrix

### 2.1 Scenarios → Test Layers Mapping

| Scenario ID | Scenario Description                            | Unit | Coordinated | Integration | E2E | Priority |
| ----------- | ----------------------------------------------- | ---- | ----------- | ----------- | --- | -------- |
| **WAY-001** | Wayland session detection                       | ✅   | ✅          | ⚠️          | ❌  | P0       |
| **WAY-002** | KDE DE detection & version parsing              | ✅   | ✅          | ⚠️          | ❌  | P0       |
| **WAY-003** | Portal availability check                       | ✅   | ✅          | ✅          | ❌  | P0       |
| **REG-001** | Successful D-Bus registration                   | ✅   | ✅          | ✅          | ⚠️  | P0       |
| **REG-002** | Partial registration failure                    | ✅   | ✅          | ❌          | ❌  | P0       |
| **REG-003** | Complete registration failure                   | ✅   | ✅          | ✅          | ⚠️  | P0       |
| **REG-004** | D-Bus connection drop mid-registration          | ✅   | ✅          | ❌          | ❌  | P0       |
| **REG-005** | User dismissal (portal code=1)                  | ✅   | ✅          | ❌          | ❌  | P1       |
| **REG-006** | System error (portal code>1)                    | ✅   | ✅          | ❌          | ❌  | P1       |
| **REG-007** | Re-registration without cleanup                 | ✅   | ✅          | ❌          | ❌  | P1       |
| **RAC-001** | Hotkey toggle during in-flight registration     | ✅   | ✅          | ❌          | ❌  | P1       |
| **ACT-001** | Hotkey activation signal handling               | ✅   | ✅          | ✅          | ⚠️  | P0       |
| **ACT-002** | Signal tracking (test-only)                     | ✅   | ✅          | ✅          | ✅  | P1       |
| **IPC-001** | getPlatformHotkeyStatus() IPC                   | ✅   | ✅          | ✅          | ✅  | P0       |
| **IPC-002** | setHotkeyEnabled() IPC                          | ✅   | ✅          | ✅          | ✅  | P0       |
| **IPC-003** | getActivationSignalStats() IPC (test-only)      | ✅   | ✅          | ✅          | ✅  | P1       |
| **UI-001**  | LinuxHotkeyNotice toast display                 | ✅   | ❌          | ❌          | ✅  | P0       |
| **UI-002**  | Toast behavior matrix (success/partial/failure) | ✅   | ❌          | ❌          | ✅  | P0       |
| **STE-001** | Session persistence >30s                        | ❌   | ❌          | ❌          | ❌  | P2       |
| **STE-002** | D-Bus daemon restart recovery                   | ❌   | ❌          | ❌          | ❌  | P2       |

**Legend:**

- ✅ = Covered
- ⚠️ = Partially covered / environment-dependent
- ❌ = Not covered / not applicable
- **P0** = Blocking/Critical
- **P1** = High Priority
- **P2** = Medium Priority

### 2.2 Test File Locations

| Test Layer  | File Path                                                           | Line Count | Coverage Focus   |
| ----------- | ------------------------------------------------------------------- | ---------- | ---------------- |
| Unit        | `tests/unit/main/utils/waylandDetector.test.ts`                     | 200+       | Detection logic  |
| Unit        | `tests/unit/main/utils/dbusFallback.test.ts`                        | 400+       | D-Bus operations |
| Unit        | `tests/unit/main/hotkeyManager.test.ts`                             | 1000+      | Manager logic    |
| Unit        | `tests/unit/renderer/components/LinuxHotkeyNotice.test.tsx`         | 300+       | UI states        |
| Coordinated | `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts` | 498        | Cross-module     |
| Integration | `tests/integration/wayland-platform-status.integration.test.ts`     | 163        | IPC/data flow    |
| E2E         | `tests/e2e/wayland-hotkey-registration.spec.ts`                     | 324        | Full workflow    |

### 2.3 Coverage Gap Analysis

| Gap ID    | Description                      | Severity | Current State       | Target                  |
| --------- | -------------------------------- | -------- | ------------------- | ----------------------- |
| **GAP-1** | Real Wayland environment testing | CRITICAL | No CI coverage      | Local-only E2E guide    |
| **GAP-2** | Hotkey activation E2E            | CRITICAL | Unit only           | Document limitation     |
| **GAP-3** | Portal dialog UX testing         | HIGH     | Unit only           | Manual testing protocol |
| **GAP-4** | Session persistence              | MEDIUM   | None                | Future work             |
| **GAP-5** | Error recovery paths             | MEDIUM   | Partial unit        | Expand unit tests       |
| **GAP-6** | Skip logic masking failures      | MEDIUM   | Conditional returns | Use explicit skip       |

---

## 3. Error-Case Catalog

### 3.1 D-Bus Errors

| Error Code                                  | Error Name        | Test Case | Expected Behavior                          |
| ------------------------------------------- | ----------------- | --------- | ------------------------------------------ |
| 0                                           | Success           | REG-001   | Registration succeeds, callback registered |
| 1                                           | User Dismissed    | REG-005   | Toast shows "user dismissed" message       |
| 2                                           | System Error      | REG-006   | Toast shows "portal error" message         |
| `org.freedesktop.DBus.Error.NotConnected`   | Connection Drop   | REG-004   | Cleanup called, all hotkeys marked failed  |
| `org.freedesktop.DBus.Error.ServiceUnknown` | Portal Missing    | REG-003   | Fallback to disabled state                 |
| `org.freedesktop.DBus.Error.NoReply`        | Timeout           | REG-004   | Timeout error logged                       |
| `org.freedesktop.DBus.Error.AccessDenied`   | Permission Denied | REG-006   | Access denied message shown                |

### 3.2 State Machine Error Transitions

```
[Unregistered] ──► [Registering] ──► [Registered]
                      │                  │
                      ▼                  ▼
                 [Failed] ◄───────── [Unregistering]
```

| Transition                   | Trigger                            | Test Coverage        |
| ---------------------------- | ---------------------------------- | -------------------- |
| Unregistered → Registering   | `registerShortcuts()` called       | ✅ Unit, Coordinated |
| Registering → Registered     | D-Bus response code=0              | ✅ Unit, Coordinated |
| Registering → Failed         | D-Bus response code>0 or exception | ✅ Unit, Coordinated |
| Registered → Unregistering   | `destroySession()` or app quit     | ✅ Unit              |
| Unregistering → Unregistered | Cleanup complete                   | ✅ Unit              |
| Registered → Registering     | Re-registration without cleanup    | ✅ Unit, Coordinated |

### 3.3 Race Condition Scenarios

| Scenario | Description                                  | Handling                   | Test Coverage |
| -------- | -------------------------------------------- | -------------------------- | ------------- |
| **RC-1** | `setIndividualEnabled()` during registration | Queue or reject with error | ✅ RAC-001    |
| **RC-2** | Rapid enable/disable toggles                 | Debounce or state lock     | ✅ Unit       |
| **RC-3** | App quit during registration                 | Graceful cleanup           | ✅ Unit       |
| **RC-4** | Multiple `registerShortcuts()` calls         | Clear previous results     | ✅ REG-007    |

---

## 4. Defensive Programming Checklist

### 4.1 Test Implementation Guidelines

#### Unit Tests

- [ ] Mock D-Bus completely via `vi.mock('dbus-next')`
- [ ] Use `dbus-next-mock.ts` for centralized mock behavior
- [ ] Fresh `HotkeyManager` instance per test
- [ ] Stub environment variables via `vi.stubGlobal('process.env', {...})`
- [ ] Verify both happy path and failure paths
- [ ] Check log output for correct error messages
- [ ] Assert no resource leaks (listeners, sessions)

#### Coordinated Tests

- [ ] Initialize both main and renderer processes
- [ ] Use controlled mock return values
- [ ] Verify IPC message contracts
- [ ] Test cross-platform behavior (darwin, win32, linux)
- [ ] Validate state propagation timing

#### Integration Tests

- [ ] Use real IPC channels (not mocked)
- [ ] Verify PlatformHotkeyStatus shape
- [ ] Test round-trip latency
- [ ] Handle non-Wayland environment gracefully
- [ ] Skip with explicit reason if not Linux

#### E2E Tests

- [ ] **NEVER use conditional early returns** - use `it.skip()` with reason
- [ ] Verify actual DOM state, not assumed results
- [ ] Use Page Objects for maintainability
- [ ] Apply Golden Rule: "Would this test fail if code was broken?"
- [ ] Handle race conditions explicitly with logging
- [ ] Clean up app state after each test

### 4.2 Skip Pattern Requirements

#### ❌ Forbidden Pattern

```typescript
// BAD: Silent pass on skip
if (!isWayland()) {
    console.log('Skipping - not Wayland');
    return; // Test passes without assertions!
}
```

#### ✅ Required Pattern

```typescript
// GOOD: Explicit skip with reason
import { isLinux, isWayland } from './helpers/platform';

describe('Wayland Hotkey Registration', () => {
    beforeEach(async () => {
        // Skip entire suite if not Linux
        if (!isLinux()) {
            console.log('[SKIP] Linux-only tests');
            return;
        }
    });

    it('should register on Wayland+KDE', async function () {
        // Skip individual test with explicit reason
        if (!isWayland()) {
            this.skip('Not a Wayland session');
        }
        // ... test code ...
    });

    it.skip('CI: Wayland portal dialog interaction', async function () {
        // Permanently skipped with annotation
        // Reason: Requires real KDE portal, not available in CI
    });
});
```

### 4.3 Error Handling Checklist

| Check    | Description             | Test Verification                            |
| -------- | ----------------------- | -------------------------------------------- |
| **EH-1** | All async errors caught | `expect().rejects` or `try/catch` assertions |
| **EH-2** | Cleanup on failure      | `destroySession()` called via spy            |
| **EH-3** | State consistency       | Post-failure state matches expected          |
| **EH-4** | Log context             | Error includes D-Bus error type, hotkey ID   |
| **EH-5** | No uncaught exceptions  | Test runner doesn't crash                    |
| **EH-6** | Resource cleanup        | No leaked message listeners                  |
| **EH-7** | UI feedback             | Toast shows appropriate message              |

---

## 5. Local Execution Guide

### 5.1 Prerequisites

| Requirement      | Command to Verify                                 |
| ---------------- | ------------------------------------------------- |
| Linux OS         | `uname -a`                                        |
| Wayland session  | `echo $XDG_SESSION_TYPE` (should print "wayland") |
| KDE Plasma 5.27+ | `plasmashell --version`                           |
| D-Bus running    | `dbus-daemon --version`                           |
| Node.js 18+      | `node --version`                                  |
| npm 9+           | `npm --version`                                   |

### 5.2 Environment Setup

```bash
# 1. Clone and install
git clone https://github.com/bwendell/gemini-desktop.git
cd gemini-desktop
npm install

# 2. Build the application
npm run build && npm run build:electron

# 3. Verify Wayland environment
echo "Session type: $XDG_SESSION_TYPE"
echo "Desktop: $XDG_CURRENT_DESKTOP"
echo "KDE Version: $KDE_SESSION_VERSION"
```

### 5.3 Running Tests Locally

#### Unit Tests (All Platforms)

```bash
# All unit tests
npm run test

# Specific hotkey tests
npx vitest tests/unit/main/hotkeyManager.test.ts
npx vitest tests/unit/main/utils/dbusFallback.test.ts
npx vitest tests/unit/main/utils/waylandDetector.test.ts

# With debug logging
DEBUG_DBUS=1 npx vitest tests/unit/main/utils/dbusFallback.test.ts --reporter=verbose
```

#### Coordinated Tests

```bash
# All coordinated tests
npm run test:coordinated

# Specific Wayland coordination
npx vitest tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts
```

#### Integration Tests

```bash
# All integration tests
npm run test:integration

# Specific Wayland integration
npm run test:integration -- --spec="tests/integration/wayland-platform-status.integration.test.ts"
```

#### E2E Tests (Local Wayland Only)

```bash
# Build first (required)
npm run build && npm run build:electron

# Run all E2E tests
npm run test:e2e

# Run specific Wayland E2E spec
npm run test:e2e:spec -- --spec=tests/e2e/wayland-hotkey-registration.spec.ts

# With D-Bus debug logging
DEBUG_DBUS=1 npm run test:e2e:spec -- --spec=tests/e2e/wayland-hotkey-registration.spec.ts

# Skip build (if recently built)
SKIP_BUILD=true npm run test:e2e:spec -- --spec=tests/e2e/wayland-hotkey-registration.spec.ts
```

### 5.4 Manual Testing Protocol

Since automated E2E cannot test actual hotkey activation:

| Step | Action                      | Expected Result                          |
| ---- | --------------------------- | ---------------------------------------- |
| 1    | Launch app on KDE Wayland   | App starts, no immediate errors          |
| 2    | Check Settings → Hotkeys    | Hotkeys shown as "Global (KDE Wayland)"  |
| 3    | Press `Ctrl+Shift+Space`    | Quick Chat window appears                |
| 4    | Type "test" and press Enter | Quick Chat closes, text injected to main |
| 5    | Press `Ctrl+Alt+E`          | App minimizes to tray (boss key)         |
| 6    | Disable hotkey in Settings  | Toast shows "Global Hotkeys Disabled"    |
| 7    | Re-enable hotkeys           | Portal dialog may appear (first time)    |
| 8    | Change hotkey binding       | New binding works immediately            |

### 5.5 Troubleshooting

| Issue                        | Diagnostic                          | Solution                                         |
| ---------------------------- | ----------------------------------- | ------------------------------------------------ |
| "Not a Wayland session"      | Check `$XDG_SESSION_TYPE`           | Log out, select Wayland session                  |
| "Portal not available"       | Check `xdg-desktop-portal` running  | `systemctl --user start xdg-desktop-portal`      |
| "D-Bus connection failed"    | Check `DBUS_SESSION_BUS_ADDRESS`    | Restart D-Bus: `dbus-run-session`                |
| Hotkeys don't activate       | Check if another app holds shortcut | Change binding in Settings                       |
| Portal dialog doesn't appear | Check KDE portal backend            | `systemctl --user status xdg-desktop-portal-kde` |

---

## 6. Explicit Skip/Gating Strategy

### 6.1 CI Environment Detection

```typescript
// tests/e2e/helpers/platform.ts

export function isLinux(): boolean {
    return process.platform === 'linux';
}

export function isWayland(): boolean {
    if (!isLinux()) return false;
    const sessionType = process.env.XDG_SESSION_TYPE?.toLowerCase() || '';
    return sessionType === 'wayland';
}

export function isKDE(): boolean {
    if (!isLinux()) return false;
    const desktop = process.env.XDG_CURRENT_DESKTOP?.toLowerCase() || '';
    return desktop.includes('kde');
}

export function isCI(): boolean {
    return !!process.env.CI;
}

export function canRunWaylandTests(): boolean {
    return isLinux() && isWayland() && isKDE() && !isCI();
}
```

### 6.2 Skip Patterns by Test Layer

#### Unit Tests

```typescript
// No skips needed - fully mocked
describe('Wayland Detection', () => {
    // All tests run on all platforms
});
```

#### Integration Tests

```typescript
describe('Wayland Platform Status', () => {
    beforeAll(function () {
        if (!isLinux()) {
            console.log('[SKIP] Linux-only integration tests');
            this.skip();
        }
    });

    it('should return platform status via IPC', async () => {
        // Test runs on all Linux (Wayland or not)
        // Test verifies IPC contract, not Wayland-specific behavior
    });
});
```

#### E2E Tests

```typescript
describe('Wayland Hotkey Registration', () => {
    // Skip entire suite at describe level
    beforeAll(function () {
        if (!isLinux()) {
            console.log('[SKIP SUITE] Linux-only E2E tests');
            this.skip();
        }
    });

    it('should detect Wayland status', async () => {
        // Runs on all Linux
    });

    it('should register hotkeys on Wayland+KDE', async function () {
        // Skip this specific test if not Wayland
        if (!isWayland()) {
            this.skip('Not a Wayland session');
        }
        // ... test code ...
    });

    it('should NOT register on X11', async function () {
        // Skip if Wayland (test is for X11 specifically)
        if (isWayland()) {
            this.skip('This test is for X11 only');
        }
        // ... test code ...
    });

    // Permanently skipped - requires real portal dialog interaction
    it.skip('CI: handles portal approval dialog', async () => {
        // Reason: Cannot automate KDE portal dialog in CI
        // Local testing: Manually verify dialog appears and responds
    });
});
```

### 6.3 Skip Annotation Standards

| Annotation     | Meaning                       | Example                     |
| -------------- | ----------------------------- | --------------------------- |
| `[SKIP SUITE]` | Entire describe block skipped | Wrong platform              |
| `[SKIP TEST]`  | Individual test skipped       | Wrong environment           |
| `[CI]`         | Skipped in CI only            | Requires manual interaction |
| `[LOCAL]`      | Local-only test               | Requires real Wayland       |
| `[MANUAL]`     | Not automatable               | Portal dialog testing       |

### 6.4 Avoiding Silent Failures

| Anti-Pattern               | Problem                     | Solution                         |
| -------------------------- | --------------------------- | -------------------------------- |
| `if (!condition) return;`  | Test passes without running | Use `this.skip()` with reason    |
| `console.log('skipping');` | Hidden in logs              | Use standardized prefix `[SKIP]` |
| Multiple skip conditions   | Confusing test flow         | Centralize in `beforeAll`        |
| No skip reason             | Hard to debug               | Always provide skip message      |

---

## 7. Step-by-Step Implementation Tasks

### 7.1 Unit Test Tasks

| Task ID    | Description                                  | Target File             | Est. Effort |
| ---------- | -------------------------------------------- | ----------------------- | ----------- |
| **UT-001** | Add P0-1: Partial D-Bus registration failure | `hotkeyManager.test.ts` | 2h          |
| **UT-002** | Add P0-2: D-Bus connection drop handling     | `dbusFallback.test.ts`  | 2h          |
| **UT-003** | Add P1-1: User dismissal vs system error     | `dbusFallback.test.ts`  | 1.5h        |
| **UT-004** | Add P1-2: Hotkey toggle during registration  | `hotkeyManager.test.ts` | 2h          |
| **UT-005** | Add P1-3: Re-registration without cleanup    | `hotkeyManager.test.ts` | 1.5h        |
| **UT-006** | Expand error recovery path coverage          | `dbusFallback.test.ts`  | 3h          |
| **UT-007** | Add trigger format validation tests          | `dbusFallback.test.ts`  | 1h          |

### 7.2 Coordinated Test Tasks

| Task ID    | Description                           | Target File                                       | Est. Effort |
| ---------- | ------------------------------------- | ------------------------------------------------- | ----------- |
| **CT-001** | Expand P1-2: Race condition scenarios | `wayland-hotkey-coordination.coordinated.test.ts` | 2h          |
| **CT-002** | Add state propagation timing tests    | New file or expand existing                       | 2h          |
| **CT-003** | Add error state coordination tests    | `wayland-hotkey-coordination.coordinated.test.ts` | 2h          |
| **CT-004** | Cross-platform behavior validation    | `wayland-hotkey-coordination.coordinated.test.ts` | 1.5h        |

### 7.3 Integration Test Tasks

| Task ID    | Description                           | Target File                                   | Est. Effort |
| ---------- | ------------------------------------- | --------------------------------------------- | ----------- |
| **IT-001** | Add IPC error handling tests          | `wayland-platform-status.integration.test.ts` | 2h          |
| **IT-002** | Add signal tracking IPC tests         | `wayland-platform-status.integration.test.ts` | 1.5h        |
| **IT-003** | Add concurrent IPC call tests         | New file                                      | 2h          |
| **IT-004** | Add platform detection accuracy tests | New file                                      | 2h          |

### 7.4 E2E Test Tasks

| Task ID    | Description                              | Target File                           | Est. Effort |
| ---------- | ---------------------------------------- | ------------------------------------- | ----------- |
| **ET-001** | Refactor skip logic to use explicit skip | `wayland-hotkey-registration.spec.ts` | 1h          |
| **ET-002** | Improve race condition diagnostics       | `wayland-hotkey-registration.spec.ts` | 1.5h        |
| **ET-003** | Add signal tracking E2E verification     | `wayland-hotkey-registration.spec.ts` | 2h          |
| **ET-004** | Add documentation links to test file     | `wayland-hotkey-registration.spec.ts` | 0.5h        |
| **ET-005** | Create manual testing checklist          | `docs/WAYLAND_MANUAL_TESTING.md`      | 1h          |

### 7.5 Helper/Utility Tasks

| Task ID    | Description                                  | Target File                          | Est. Effort |
| ---------- | -------------------------------------------- | ------------------------------------ | ----------- |
| **HP-001** | Create centralized platform detection helper | `tests/e2e/helpers/platform.ts`      | 1h          |
| **HP-002** | Add E2E helper for hotkey status querying    | `tests/e2e/helpers/hotkeyHelpers.ts` | 1.5h        |
| **HP-003** | Create skip reason logging utility           | `tests/e2e/helpers/testUtils.ts`     | 1h          |
| **HP-004** | Document test-only signal tracking API       | `docs/TEST_ONLY_SIGNAL_TRACKING.md`  | 1h          |

### 7.6 Documentation Tasks

| Task ID     | Description                                    | Target File                         | Est. Effort |
| ----------- | ---------------------------------------------- | ----------------------------------- | ----------- |
| **DOC-001** | Update HOTKEY_DEBUG_HANDOFF.md with test notes | `HOTKEY_DEBUG_HANDOFF.md`           | 0.5h        |
| **DOC-002** | Create Wayland testing runbook                 | `docs/WAYLAND_TESTING_RUNBOOK.md`   | 2h          |
| **DOC-003** | Document known limitations                     | `docs/WAYLAND_KNOWN_LIMITATIONS.md` | 1h          |
| **DOC-004** | Update README with Wayland testing info        | `README.md`                         | 0.5h        |

### 7.7 Task Dependencies

```
UT-001 through UT-007 (Unit tests)
    │
    ▼
CT-001 through CT-004 (Coordinated tests)
    │
    ▼
IT-001 through IT-004 (Integration tests)
    │
    ▼
HP-001 through HP-004 (Helpers)
    │
    ▼
ET-001 through ET-005 (E2E tests)
    │
    ▼
DOC-001 through DOC-004 (Documentation)
```

---

## 8. References

### 8.1 Internal Documentation

| Document               | Location                                                   | Purpose                                      |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------- |
| P0/P1 Test Plan        | `docs/TEST_PLAN_WAYLAND_HOTKEY_P0_P1.md`                   | Detailed test cases for P0/P1 scenarios      |
| E2E Testing Guidelines | `docs/E2E_TESTING_GUIDELINES.md`                           | Golden Rule and E2E best practices           |
| Issues Audit           | `.sisyphus/notepads/wayland-kde-hotkey-tests/issues.md`    | Coverage gaps and audit findings             |
| Learnings              | `.sisyphus/notepads/wayland-kde-hotkey-tests/learnings.md` | Previous implementation notes                |
| HOTKEY_DEBUG_HANDOFF   | `HOTKEY_DEBUG_HANDOFF.md`                                  | Known issues and debugging notes (if exists) |

### 8.2 Source Code

| Component           | Path                                                  | Test Target                      |
| ------------------- | ----------------------------------------------------- | -------------------------------- |
| Wayland Detector    | `src/main/utils/waylandDetector.ts`                   | WAY-001, WAY-002                 |
| D-Bus Fallback      | `src/main/utils/dbusFallback.ts`                      | REG-001 through REG-007, ACT-001 |
| Hotkey Manager      | `src/main/managers/hotkeyManager.ts`                  | All registration scenarios       |
| Hotkey Types        | `src/shared/types/hotkeys.ts`                         | Type validation                  |
| Linux Hotkey Notice | `src/renderer/components/toast/LinuxHotkeyNotice.tsx` | UI-001, UI-002                   |
| IPC Handler         | `src/main/ipc/HotkeyIpcHandler.ts`                    | IPC-001 through IPC-003          |

### 8.3 External References

| Resource                | URL                                                                                               | Purpose                        |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ |
| D-Bus Portal Spec       | https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.GlobalShortcuts.html | Portal API reference           |
| D-Bus Message Types     | https://dbus.freedesktop.org/doc/dbus-daemon.1.html                                               | Signal types (Type 4 = SIGNAL) |
| Electron globalShortcut | https://www.electronjs.org/docs/latest/api/global-shortcut                                        | Non-Wayland hotkeys            |
| WebdriverIO             | https://webdriver.io/docs/api                                                                     | E2E framework                  |
| Vitest                  | https://vitest.dev/guide/                                                                         | Unit test framework            |

### 8.4 Key Implementation Notes

#### D-Bus Response Codes

| Code | Meaning        | Handling                                     |
| ---- | -------------- | -------------------------------------------- |
| 0    | Success        | Enable hotkeys, register callbacks           |
| 1    | User Dismissed | Show "user dismissed" message, don't retry   |
| 2+   | Error          | Show error message, may retry on next toggle |

#### IPC Channels

| Channel                    | Direction       | Purpose                        |
| -------------------------- | --------------- | ------------------------------ |
| `hotkey:getPlatformStatus` | Renderer → Main | Get current hotkey status      |
| `hotkey:setEnabled`        | Renderer → Main | Enable/disable specific hotkey |
| `hotkey:activationSignals` | Main → Renderer | Test-only: signal tracking     |
| `hotkey:signalStats`       | Renderer → Main | Test-only: get signal stats    |

#### Test-Only Signal Tracking

Enabled when: `NODE_ENV === 'test' || DEBUG_DBUS === '1'`

```typescript
// In dbusFallback.ts
const TEST_ONLY_SIGNAL_TRACKING_ENABLED = process.env.NODE_ENV === 'test' || process.env.DEBUG_DBUS === '1';

// Tracked signals stored in bounded array (MAX_TEST_SIGNALS = 100)
// Accessible via IPC for test verification
```

---

## 9. Summary

### 9.1 Current State

| Test Layer  | Status     | Coverage                  |
| ----------- | ---------- | ------------------------- |
| Unit        | ✅ Strong  | 100+ tests, fully mocked  |
| Coordinated | ✅ Good    | 498 lines, cross-module   |
| Integration | ⚠️ Partial | 163 lines, IPC only       |
| E2E         | ❌ Weak    | 324 lines, mostly skipped |

### 9.2 Critical Gaps

1. **GAP-1**: Real Wayland environment testing (no CI coverage)
2. **GAP-2**: Hotkey activation E2E (unit tests only)
3. **GAP-3**: Portal dialog testing (manual only)
4. **GAP-6**: Skip logic masking (conditional returns vs explicit skip)

### 9.3 Implementation Priority

| Phase       | Tasks              | Deliverable                       |
| ----------- | ------------------ | --------------------------------- |
| **Phase 1** | UT-001 to UT-007   | Complete P0/P1 unit test coverage |
| **Phase 2** | CT-001 to CT-004   | Expanded coordinated tests        |
| **Phase 3** | IT-001 to IT-004   | Integration test improvements     |
| **Phase 4** | HP-001 to HP-004   | Test helpers and utilities        |
| **Phase 5** | ET-001 to ET-005   | E2E test refactoring              |
| **Phase 6** | DOC-001 to DOC-004 | Documentation and runbooks        |

### 9.4 Success Criteria

- [ ] All P0 test scenarios covered in unit tests
- [ ] All P1 test scenarios covered in unit/coordinated tests
- [ ] Integration tests use explicit skip with reasons
- [ ] E2E tests use `it.skip()` / `this.skip()` patterns
- [ ] Local execution guide validated on KDE Wayland
- [ ] Documentation references all related files
- [ ] No conditional early returns in E2E tests

---

**End of Test Coverage Plan**
