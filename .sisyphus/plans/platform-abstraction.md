# Platform Adapter Abstraction (main.ts + hotkeyManager.ts)

## TL;DR

> **Quick Summary**: Introduce a PlatformAdapter interface plus concrete adapters (LinuxWayland/LinuxX11/Windows/Mac) and a factory to centralize platform-specific behavior in `main.ts` and `hotkeyManager.ts`, while preserving existing behavior and keeping the design extensible for future platform refactors.
>
> **Deliverables**:
>
> - `src/main/platform/PlatformAdapter.ts` + `src/main/platform/types.ts`
> - `src/main/platform/platformAdapterFactory.ts`
> - `src/main/platform/adapters/{LinuxWayland,LinuxX11,Windows,Mac}Adapter.ts`
> - `src/main/main.ts` refactor to use adapter
> - `src/main/managers/hotkeyManager.ts` refactor to use adapter
> - Unit + coordinated tests updated/added (no integration/E2E updates)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO — sequential due to shared interfaces and tests
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request

“Abstract platform-specific logic into a PlatformAdapter interface (LinuxWaylandAdapter, LinuxX11Adapter, WindowsAdapter, MacAdapter). Eliminate scattered checks for isLinux/isWayland/XDG_SESSION_TYPE in main.ts and hotkeyManager.ts. Scope is source code only; defer integration/E2E tests. Make the abstraction extensible for future expansion.”

### Interview Summary

- Scope limited to `src/main/main.ts` and `src/main/managers/hotkeyManager.ts`.
- Adapter should own **higher-level behaviors** (not just boolean checks).
- Adapter selection via a `PlatformAdapterFactory` in `src/main/platform/`.
- Tests: **TDD**, **unit + coordinated only** (no integration/E2E updates).

### Research Findings

- `main.ts` uses `isLinux`, `isWindows`, and `getWaylandPlatformStatus()` for Linux app identity setup and Wayland portal detection (lines ~40–81).
- `hotkeyManager.ts` branches between non-Linux globalShortcut registration and Linux Wayland/X11 logic in `registerShortcuts()` (lines ~456–489) and uses Linux checks in `setIndividualEnabled()` (lines ~402–408) and `getPlatformHotkeyStatus()` (lines ~785–797).
- `constants.ts` exports `isMacOS/isWindows/isLinux/isWayland` and `getWaylandPlatformStatus()` (lines ~304–317); tests verify these exports remain.
- `waylandDetector.ts` encapsulates Wayland detection (`getWaylandStatus()`), which should not be reimplemented.

### Metis Review (Gaps Addressed)

- **Guardrails**: Preserve `sandboxInit` import order in `main.ts`; do not modify `waylandDetector.ts`/`dbusFallback.ts`; keep `constants.ts` exports intact.
- **Factory caching**: Provide a cache + test-only reset to avoid stale adapters in tests.
- **Logging**: Preserve startup environment logs and Wayland diagnostic logging.
- **Tests**: Update unit + coordinated tests that currently mock constants to instead mock the adapter factory.

---

## Work Objectives

### Core Objective

Replace platform branching in `main.ts` and `hotkeyManager.ts` with a single, extensible `PlatformAdapter` abstraction and concrete adapters that preserve current behavior.

### Concrete Deliverables

- New platform adapter contract + factory under `src/main/platform/`.
- Four adapters: LinuxWayland, LinuxX11, Windows, Mac.
- `main.ts` updated to use adapter to apply platform-specific app configuration and Windows AppUserModelId.
- `hotkeyManager.ts` updated to use adapter for registration strategy and platform hotkey status.
- Unit + coordinated tests added/updated (no integration/E2E changes).

### Definition of Done

- [ ] Unit tests (electron config) pass for new platform adapter tests.
- [ ] Coordinated tests still pass for hotkey coordination suites.
- [ ] `npm run test` and `npm run test:coordinated` pass.
- [ ] `npm run lint` and `npm run build` pass.
- [ ] No integration or E2E tests were modified.

### Must Have

- Adapter owns **higher-level behaviors** (app configuration + hotkey strategy), not just checks.
- `constants.ts` exports remain intact and backward compatible.
- `sandboxInit` remains the first import in `main.ts`.
- Factory caches adapter but exposes a test-only reset for determinism.

### Must NOT Have (Guardrails)

- No changes to `waylandDetector.ts` or `dbusFallback.ts`.
- No changes to integration or E2E tests.
- No refactor of other managers/utilities (BadgeManager, NotificationManager, MenuManager, mainWindow, paths, security, sandboxDetector) in this plan.
- No new feature work (telemetry, new hotkeys, etc.).

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL verification is agent-executed via tests/commands. No human steps.

### Test Decision

- **Infrastructure exists**: YES (Vitest + coordinated)
- **Automated tests**: YES (TDD)
- **Framework**: Vitest (electron + coordinated configs)

### TDD Workflow

Each task follows **RED → GREEN → REFACTOR** with concrete commands and expected results.

### Agent-Executed QA Scenarios

Every task includes at least one scenario with **concrete commands**, **expected output**, and **evidence capture** in `.sisyphus/evidence/`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately)
└── Task 1: Adapter contract + factory tests (RED)

Wave 2 (After Wave 1)
└── Task 2: Linux adapters + tests

Wave 3 (After Wave 2)
└── Task 3: Windows/Mac adapters + tests

Wave 4 (After Wave 3)
└── Task 4: main.ts refactor + unit tests

Wave 5 (After Wave 4)
└── Task 5: hotkeyManager refactor + unit/coordinated tests

Wave 6 (After Wave 5)
└── Task 6: Full verification
```

### Dependency Matrix

| Task | Depends On | Blocks  | Can Parallelize With |
| ---- | ---------- | ------- | -------------------- |
| 1    | None       | 2,3,4,5 | None                 |
| 2    | 1          | 3,4,5   | None                 |
| 3    | 2          | 4,5     | None                 |
| 4    | 3          | 5       | None                 |
| 5    | 4          | 6       | None                 |
| 6    | 5          | None    | None                 |

---

## TODOs

### Task 1: Define PlatformAdapter contract + factory tests (RED)

**What to do**:

- Create test file to define expected adapter selection and caching behavior.
- Define types needed by the adapter contract (platform ID, registration mode/plan).
- Keep tests failing until factory + adapters exist.

**Files**:

- Create: `tests/unit/main/platform/platformAdapterFactory.test.ts`
- Create (later in GREEN step): `src/main/platform/types.ts`
- Create (later in GREEN step): `src/main/platform/PlatformAdapter.ts`
- Create (later in GREEN step): `src/main/platform/platformAdapterFactory.ts`

**References**:

- `src/main/utils/constants.ts:304-317` — platform booleans + `getWaylandPlatformStatus()` (used for factory selection)
- `src/shared/types/hotkeys.ts:154-189` — `WaylandStatus` and `PlatformHotkeyStatus`
- `tests/unit/main/utils/constants.test.ts:71-139` — existing platform export expectations

**TDD Steps**:

1. **RED** — Write failing tests for adapter factory selection
    - Linux + `isWayland=true` → `LinuxWaylandAdapter`
    - Linux + `isWayland=false` → `LinuxX11Adapter`
    - `win32` → `WindowsAdapter`
    - `darwin` → `MacAdapter`
    - Cache behavior: repeated calls return same instance; reset clears cache
2. **RED** — Run test:
    - `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/platformAdapterFactory.test.ts`
    - Expect FAIL (missing modules)

**Contract Sketch (implement in GREEN step)**:

```ts
// src/main/platform/types.ts
export type PlatformId = 'linux-wayland' | 'linux-x11' | 'windows' | 'mac';

export type HotkeyRegistrationMode = 'native' | 'wayland-dbus' | 'disabled';

export interface HotkeyRegistrationPlan {
    mode: HotkeyRegistrationMode;
    waylandStatus: WaylandStatus; // non-Linux uses default {isWayland:false,...}
}

// src/main/platform/PlatformAdapter.ts
export interface PlatformAdapter {
    readonly id: PlatformId;
    applyAppConfiguration(app: Electron.App, logger: ReturnType<typeof createLogger>): void;
    applyAppUserModelId(app: Electron.App): void; // Windows only; others no-op
    getHotkeyRegistrationPlan(): HotkeyRegistrationPlan;
    getWaylandStatus(): WaylandStatus; // for PlatformHotkeyStatus composition
    shouldQuitOnWindowAllClosed(): boolean; // macOS false, others true
}
```

**Factory expectations**:

- `getPlatformAdapter()` returns cached singleton
- `resetPlatformAdapterForTests()` clears cache for test isolation

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
    - Reason: multi-file refactor + test setup
- **Skills**: `electron-pro`, `test-driven-development`, `typescript-pro`
    - `electron-pro`: main-process patterns
    - `test-driven-development`: required TDD flow
    - `typescript-pro`: type-safe adapter interface
- **Skills Evaluated but Omitted**:
    - `frontend-design`: not UI work

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 1
- **Blocks**: Tasks 2–5
- **Blocked By**: None

**Acceptance Criteria**:

- [ ] Test file created with failing assertions for selection + caching behavior.
- [ ] Test run fails due to missing adapter factory (expected in RED stage).

**Agent-Executed QA Scenarios**:

Scenario: Factory tests fail before implementation
Tool: Bash
Preconditions: None
Steps: 1. Run: `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/platformAdapterFactory.test.ts | tee .sisyphus/evidence/task-1-factory-red.txt` 2. Assert: Output contains “Cannot find module” or failing assertions
Expected Result: Test fails (RED)
Evidence: `.sisyphus/evidence/task-1-factory-red.txt`

---

### Task 2: Implement Linux adapters (Wayland + X11) + unit tests

**What to do**:

- Implement `LinuxWaylandAdapter` and `LinuxX11Adapter` that own:
    - **App configuration** (Linux app name + class + desktop name + Wayland logging)
    - **Hotkey registration plan** (Wayland → D-Bus direct vs disabled for portal unavailable)
    - **PlatformHotkeyStatus** composition (Linux uses real WaylandStatus)
- Ensure adapters import `getWaylandPlatformStatus()` instead of reimplementing detection.

**Files**:

- Create: `src/main/platform/adapters/LinuxWaylandAdapter.ts`
- Create: `src/main/platform/adapters/LinuxX11Adapter.ts`
- Modify: `src/main/platform/PlatformAdapter.ts`
- Modify: `src/main/platform/types.ts`
- Test: `tests/unit/main/platform/linuxAdapters.test.ts`

**References**:

- `src/main/main.ts:40-71` — Linux app identity setup + Wayland logging
- `src/main/managers/hotkeyManager.ts:456-489` — current Wayland/X11 branching behavior
- `src/main/utils/constants.ts:312-317` — `getWaylandPlatformStatus()` caching
- `src/main/utils/waylandDetector.ts:60-79` — actual Wayland detection (do not reimplement)
- `src/shared/types/hotkeys.ts:154-189` — Wayland status + PlatformHotkeyStatus

**TDD Steps**:

1. **RED** — Write tests covering:
    - LinuxWaylandAdapter: returns `mode='wayland-dbus'` when `portalAvailable=true`.
    - LinuxWaylandAdapter: returns `mode='disabled'` when Wayland but portal unavailable.
    - LinuxX11Adapter: always `mode='disabled'`.
    - `applyAppConfiguration()` calls `app.setName('gemini-desktop')`, `app.commandLine.appendSwitch('class', 'gemini-desktop')`, and `app.setDesktopName()` if available.
2. **RED** — Run tests; expect FAIL.
3. **GREEN** — Implement Linux adapters + interface.
4. **GREEN** — Re-run tests; expect PASS.

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
- **Skills**: `electron-pro`, `test-driven-development`, `typescript-pro`
- **Skills Evaluated but Omitted**:
    - `frontend-design`

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Tasks 3–5
- **Blocked By**: Task 1

**Acceptance Criteria**:

- [ ] `LinuxWaylandAdapter` and `LinuxX11Adapter` exist and compile.
- [ ] Linux adapter tests pass:
    - `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/linuxAdapters.test.ts` → PASS

**Agent-Executed QA Scenarios**:

Scenario: Wayland portal available → Wayland D-Bus mode
Tool: Bash
Preconditions: Mocks return `waylandStatus.portalAvailable=true`
Steps: 1. Run: `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/linuxAdapters.test.ts -t "portal available" | tee .sisyphus/evidence/task-2-linux-wayland.txt` 2. Assert: Output shows PASS for “portal available” test
Expected Result: Adapter returns `mode='wayland-dbus'`
Evidence: `.sisyphus/evidence/task-2-linux-wayland.txt`

Scenario: X11 → hotkeys disabled (negative)
Tool: Bash
Preconditions: LinuxX11Adapter selected
Steps: 1. Run: `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/linuxAdapters.test.ts -t "X11" | tee .sisyphus/evidence/task-2-linux-x11.txt` 2. Assert: Output shows PASS for “X11 disables hotkeys” test
Expected Result: `mode='disabled'`
Evidence: `.sisyphus/evidence/task-2-linux-x11.txt`

---

### Task 3: Implement Windows + Mac adapters + unit tests

**What to do**:

- Implement `WindowsAdapter` and `MacAdapter` to own:
    - **App configuration** (set name to `Gemini Desktop`)
    - **Windows AppUserModelId** application
    - **Hotkey registration plan**: `mode='native'`
    - **PlatformHotkeyStatus** composition with default WaylandStatus

**Files**:

- Create: `src/main/platform/adapters/WindowsAdapter.ts`
- Create: `src/main/platform/adapters/MacAdapter.ts`
- Test: `tests/unit/main/platform/windowsMacAdapters.test.ts`

**References**:

- `src/main/main.ts:73-81` — non-Linux name + Windows AppUserModelId
- `src/shared/types/hotkeys.ts:154-189` — default WaylandStatus shape

**TDD Steps**:

1. **RED** — Tests for:
    - `applyAppConfiguration()` sets name to `Gemini Desktop`.
    - `applyAppUserModelId()` calls `app.setAppUserModelId(APP_ID)` in WindowsAdapter; MacAdapter no-ops.
    - `getHotkeyRegistrationPlan()` returns `mode='native'`.
2. **GREEN** — Implement adapters.
3. **GREEN** — Run tests.

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
- **Skills**: `electron-pro`, `test-driven-development`, `typescript-pro`

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 3
- **Blocks**: Tasks 4–5
- **Blocked By**: Task 2

**Acceptance Criteria**:

- [ ] Windows/Mac adapter tests pass:
    - `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/windowsMacAdapters.test.ts` → PASS

**Agent-Executed QA Scenarios**:

Scenario: Windows adapter applies AppUserModelId
Tool: Bash
Preconditions: WindowsAdapter unit test mocks app
Steps: 1. Run: `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/platform/windowsMacAdapters.test.ts -t "AppUserModelId" | tee .sisyphus/evidence/task-3-win-appid.txt` 2. Assert: Output shows PASS
Expected Result: `app.setAppUserModelId(APP_ID)` called
Evidence: `.sisyphus/evidence/task-3-win-appid.txt`

---

### Task 4: Refactor main.ts to use PlatformAdapter

**What to do**:

- Replace `isLinux/isWindows` branches with adapter calls.
- Preserve startup environment logging in `main.ts` (lines ~30–38).
- Ensure `sandboxInit` remains the first import.
- Use adapter to apply app configuration + Windows AppUserModelId.
- Replace `process.platform !== 'darwin'` branch in `window-all-closed` with adapter’s `shouldQuitOnWindowAllClosed()`.

**Files**:

- Modify: `src/main/main.ts`
- Modify: `tests/unit/main/main.test.ts`

**References**:

- `src/main/main.ts:10-16` — sandboxInit import ordering
- `src/main/main.ts:30-81` — environment logs + Linux/Windows branches
- `tests/unit/main/main.test.ts:59-67` — constants mocking (will need adapter factory mock)
- `src/main/main.ts:473-477` — window-all-closed behavior (macOS exception)

**TDD Steps**:

1. **RED** — Update `main.test.ts` to mock the adapter factory and assert:
    - `applyAppConfiguration()` invoked on startup
    - `applyAppUserModelId()` invoked when Windows adapter is selected
2. **RED** — Run `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/main.test.ts` → FAIL
3. **GREEN** — Refactor `main.ts` to use adapter methods
4. **GREEN** — Re-run tests → PASS

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
- **Skills**: `electron-pro`, `test-driven-development`, `typescript-pro`

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: Task 5
- **Blocked By**: Task 3

**Acceptance Criteria**:

- [ ] `main.ts` no longer imports `isLinux/isWindows/getWaylandPlatformStatus` directly.
- [ ] `main.test.ts` passes with adapter factory mocks.
- [ ] Environment logging remains unchanged.
- [ ] window-all-closed uses adapter instead of direct platform check.

**Agent-Executed QA Scenarios**:

Scenario: main.ts uses adapter on startup
Tool: Bash
Preconditions: Unit test mocks adapter factory
Steps: 1. Run: `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/main.test.ts | tee .sisyphus/evidence/task-4-main-adapter.txt` 2. Assert: PASS
Expected Result: Adapter methods invoked as expected
Evidence: `.sisyphus/evidence/task-4-main-adapter.txt`

---

### Task 5: Refactor hotkeyManager to use PlatformAdapter + update unit/coordinated tests

**What to do**:

- Replace `isLinux` and `getWaylandPlatformStatus()` usage with adapter methods.
- Use `adapter.getHotkeyRegistrationPlan()` to decide:
    - `mode='native'` → current non-Linux globalShortcut path
    - `mode='disabled'` → set `_globalHotkeysEnabled=false`, log warning, return
    - `mode='wayland-dbus'` → `_registerViaDBusDirect(waylandStatus)`
- Update `getPlatformHotkeyStatus()` to delegate to adapter.
- Update `setIndividualEnabled()` to skip registration based on adapter-supported capability (not `isLinux`).
- Update tests that currently mock `constants.ts` to instead mock adapter factory or inject test adapter.
- Ensure adapter is injectable for tests (constructor param or factory override) to avoid brittle globals.

**Files**:

- Modify: `src/main/managers/hotkeyManager.ts`
- Modify: `tests/unit/main/hotkeyManager.test.ts`
- Modify: `tests/coordinated/hotkey-coordination.coordinated.test.ts`
- Modify: `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`

**References**:

- `src/main/managers/hotkeyManager.ts:402-489` — Linux checks + registerShortcuts logic
- `src/main/managers/hotkeyManager.ts:785-797` — PlatformHotkeyStatus composition
- `tests/unit/main/hotkeyManager.test.ts:53-73` — constants mocks (replace with adapter factory mock)
- `tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts:38-50` — constants + wayland mocks

**TDD Steps**:

1. **RED** — Update unit + coordinated tests to mock adapter selection and expected behavior:
    - Linux Wayland (portal available) → D-Bus registration path
    - Linux X11 → hotkeys disabled
    - Windows/Mac → native registration
2. **RED** — Run unit tests for hotkeyManager → FAIL
3. **GREEN** — Refactor hotkeyManager to use adapter
4. **GREEN** — Re-run unit + coordinated tests → PASS

**Recommended Agent Profile**:

- **Category**: `unspecified-high`
- **Skills**: `electron-pro`, `test-driven-development`, `typescript-pro`

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 5
- **Blocks**: Task 6
- **Blocked By**: Task 4

**Acceptance Criteria**:

- [ ] HotkeyManager logic uses adapter plan (no direct `isLinux` checks).
- [ ] Unit tests pass:
    - `npx vitest --config config/vitest/vitest.electron.config.ts tests/unit/main/hotkeyManager.test.ts` → PASS
- [ ] Coordinated tests pass:
    - `npx vitest --config config/vitest/vitest.coordinated.config.ts tests/coordinated/hotkey-coordination.coordinated.test.ts`
    - `npx vitest --config config/vitest/vitest.coordinated.config.ts tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts`

**Agent-Executed QA Scenarios**:

Scenario: Wayland portal path uses D-Bus (positive)
Tool: Bash
Preconditions: Adapter mocked to LinuxWayland + portal available
Steps: 1. Run: `npx vitest --config config/vitest/vitest.coordinated.config.ts tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts -t "portal" | tee .sisyphus/evidence/task-5-wayland-portal.txt` 2. Assert: PASS
Expected Result: D-Bus path exercised, no globalShortcut registration
Evidence: `.sisyphus/evidence/task-5-wayland-portal.txt`

Scenario: X11 disables global hotkeys (negative)
Tool: Bash
Preconditions: Adapter mocked to LinuxX11
Steps: 1. Run: `npx vitest --config config/vitest/vitest.coordinated.config.ts tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts -t "X11" | tee .sisyphus/evidence/task-5-x11-disabled.txt` 2. Assert: PASS
Expected Result: No registration attempts, `_globalHotkeysEnabled=false`
Evidence: `.sisyphus/evidence/task-5-x11-disabled.txt`

---

### Task 6: Full verification (unit + coordinated + lint + build)

**What to do**:

- Run unit tests, coordinated tests, lint, and build.

**Commands**:

- `npm run test`
- `npm run test:coordinated`
- `npm run lint`
- `npm run build`

**Recommended Agent Profile**:

- **Category**: `quick`
- **Skills**: `test-fixing`
    - `test-fixing`: handle any failures systematically

**Parallelization**:

- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 6
- **Blocked By**: Task 5

**Acceptance Criteria**:

- [ ] All commands succeed with zero failures

**Agent-Executed QA Scenarios**:

Scenario: Full verification suite
Tool: Bash
Preconditions: All tasks complete
Steps: 1. Run: `npm run test | tee .sisyphus/evidence/task-6-unit.txt` 2. Run: `npm run test:coordinated | tee .sisyphus/evidence/task-6-coordinated.txt` 3. Run: `npm run lint | tee .sisyphus/evidence/task-6-lint.txt` 4. Run: `npm run build | tee .sisyphus/evidence/task-6-build.txt`
Expected Result: All commands exit 0
Evidence: `.sisyphus/evidence/task-6-*.txt`

---

## Commit Strategy

| After Task | Message                                          | Files                         | Verification                 |
| ---------- | ------------------------------------------------ | ----------------------------- | ---------------------------- |
| 1          | `refactor(platform): add adapter contract tests` | tests/unit/main/platform/\*   | npx vitest (electron config) |
| 2          | `feat(platform): add linux adapters`             | src/main/platform/adapters/\* | linux adapter tests          |
| 3          | `feat(platform): add windows/mac adapters`       | src/main/platform/adapters/\* | windows/mac tests            |
| 4          | `refactor(main): use platform adapter`           | src/main/main.ts + tests      | main.test.ts                 |
| 5          | `refactor(hotkeys): use platform adapter`        | hotkeyManager + tests         | unit + coordinated tests     |

---

## Success Criteria

### Verification Commands

```bash
npm run test
npm run test:coordinated
npm run lint
npm run build
```

### Final Checklist

- [ ] PlatformAdapter and all adapters exist and are used by main.ts + hotkeyManager.ts
- [ ] Unit + coordinated tests pass (no integration/E2E changes)
- [ ] Linux Wayland/X11 behavior preserved
- [ ] Windows AppUserModelId still set
- [ ] `constants.ts` exports unchanged
- [ ] `sandboxInit` import ordering preserved
