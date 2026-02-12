# PlatformAdapter Migration — Remaining Source Files

## TL;DR

> **Quick Summary**: Migrate remaining platform-specific branches in main-process source files to the PlatformAdapter while preserving existing APIs and behavior. Focus on constants/paths/updateManager/security/notificationManager, and explicitly exclude sandbox detection/init to avoid circular dependencies.
>
> **Deliverables**:
>
> - Extended PlatformAdapter interface + adapter implementations for remaining platform behaviors
> - Refactors: `constants.ts` (limited), `paths.ts`, `updateManager.ts`, `security.ts`, `notificationManager.ts`
> - Unit + coordinated test updates (no integration/E2E changes)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO — shared adapter interface + tests
> **Critical Path**: Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

---

## Context

### Original Request

Continue migrating remaining **source code** platform refactors to PlatformAdapter, then create a separate test migration plan.

### Remaining Source Candidates

- `src/main/utils/constants.ts` (platform flags + `getTitleBarStyle()`)
- `src/main/utils/paths.ts` (icon filename + Flatpak icon path env)
- `src/main/managers/updateManager.ts` (platform-specific update disable logic)
- `src/main/utils/security.ts` (macOS microphone permission request)
- `src/main/managers/notificationManager.ts` (Linux libnotify guidance)
- **Exclude**: `sandboxDetector.ts` + `sandboxInit.ts` (Linux-only, used before adapter selection)

### Key Constraints

- **No integration/E2E updates** in this source plan.
- **Do not break existing APIs** (keep constants exports intact).
- **Avoid circular dependencies**: do not make `constants.ts` depend on `PlatformAdapter`.

---

## Work Objectives

### Core Objective

Centralize remaining platform-specific logic behind PlatformAdapter while preserving existing external APIs and behavior.

### Concrete Deliverables

- PlatformAdapter methods for: title bar style, icon filename, update-disable logic, macOS mic permissions, Linux notification guidance.
- Updated adapters (Linux Wayland/X11, Windows, Mac) with consistent method signatures.
- Refactored source files to use adapter **without changing function signatures**.

### Definition of Done

- [ ] Unit tests for each migrated file pass
- [ ] `npm run test` and `npm run test:coordinated` pass
- [ ] `npm run lint` and `npm run build` pass
- [ ] No integration/E2E tests modified

---

## Guardrails (Non-Negotiable)

- **EXCLUDE** `sandboxDetector.ts` and `sandboxInit.ts` (used prior to adapter selection; circular risk).
- **KEEP** `constants.ts` exports (`isMacOS`, `isWindows`, `isLinux`, `isWayland`) as-is.
- **DO NOT** remove or rename existing public functions.
- **DO NOT** introduce new dependencies or refactor logic beyond platform routing.
- **TDD**: tests first for each file before implementation.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**

### Test Decision

- **Infrastructure exists**: YES (Vitest + coordinated)
- **Automated tests**: YES (TDD)

---

## Execution Strategy

```
Wave 1: Adapter contract extensions + adapter tests
Wave 2: constants.ts + paths.ts migration
Wave 3: updateManager.ts migration
Wave 4: security.ts migration
Wave 5: notificationManager.ts migration
Wave 6: Full verification
```

---

## TODOs

### Task 1: Extend PlatformAdapter contract + adapter implementations (TDD)

**Add to PlatformAdapter** (new methods):

- `getTitleBarStyle(): 'hidden' | undefined` (macOS only)
- `getAppIconFilename(): 'icon.ico' | 'icon.png'`
- `shouldDisableUpdates(env: NodeJS.ProcessEnv): boolean`
- `requestMediaPermissions(logger: Logger): Promise<void>` (macOS only)
- `getNotificationSupportHint(): string | undefined` (Linux-only libnotify guidance)

**Files**:

- Modify: `src/main/platform/PlatformAdapter.ts`
- Modify: `src/main/platform/types.ts` (if new types needed)
- Modify: `src/main/platform/adapters/LinuxWaylandAdapter.ts`
- Modify: `src/main/platform/adapters/LinuxX11Adapter.ts`
- Modify: `src/main/platform/adapters/WindowsAdapter.ts`
- Modify: `src/main/platform/adapters/MacAdapter.ts`
- Add/Modify tests: `tests/unit/main/platform/*`

**Guardrails**:

- Implement all new methods in **all adapters** (no stub throws).
- Non-applicable platforms must be **no-op** or return safe defaults.
- Avoid logging in adapter methods unless current behavior logs there already.

**Additional Risk Mitigation**:

- Add per-platform contract tests (Linux Wayland/X11 vs Windows/macOS) for every new adapter method.
- Include env-matrix tests for update disable logic (APPIMAGE, PORTABLE_EXECUTABLE_DIR).

**Acceptance Criteria**:

- [ ] New adapter tests pass for all methods
- [ ] No changes to existing adapter behavior (existing tests still pass)

---

### Task 2: Migrate constants.ts + paths.ts

**What to do**:

- **constants.ts**: keep `isMacOS/isWindows/isLinux/isWayland` as-is; update `getTitleBarStyle()` to delegate to adapter **only if it does not introduce circular dependency**.
    - If adapter import causes a circular dependency, leave `getTitleBarStyle()` unchanged and document why in code comments.
- **paths.ts**: replace `isWindows` check with adapter `getAppIconFilename()` (keep Flatpak env logic intact).

**Files**:

- Modify: `src/main/utils/constants.ts`
- Modify: `src/main/utils/paths.ts`
- Modify: `tests/unit/main/utils/constants.test.ts`
- Modify: `tests/unit/main/paths.test.ts`

**Acceptance Criteria**:

- [ ] `npx vitest run tests/unit/main/utils/constants.test.ts` passes
- [ ] `npx vitest run tests/unit/main/paths.test.ts` passes
- [ ] No circular dependency introduced (verify with `npx madge --circular src/main/utils/constants.ts`)
- [ ] No new circular dependencies in main process (verify with `npx madge --circular src/main`)

**Fallback (if adapter import causes circular dependency)**:

- Introduce a neutral adapter access wrapper (e.g., `src/main/platform/adapterAccess.ts`) OR
- Keep `getTitleBarStyle()` inline and document rationale with a TODO to revisit.

---

### Task 3: Migrate updateManager.ts

**What to do**:

- Move platform-specific logic in `shouldDisableUpdates()` to adapter method `shouldDisableUpdates(env)`.
- Keep **test-mode bypass** (`VITEST`, `--test-auto-update`) in UpdateManager, not adapter.

**Files**:

- Modify: `src/main/managers/updateManager.ts`
- Modify: `tests/unit/main/managers/updateManager.test.ts`

**Acceptance Criteria**:

- [ ] `npx vitest run tests/unit/main/managers/updateManager.test.ts` passes
- [ ] Update disable logic unchanged for Linux non-AppImage + Windows portable
- [ ] Environment-matrix tests cover APPIMAGE + PORTABLE_EXECUTABLE_DIR combinations

---

### Task 4: Migrate security.ts (macOS media permissions)

**What to do**:

- Replace inline macOS check with adapter `requestMediaPermissions(logger)`.
- Keep dynamic import of `systemPreferences` inside adapter’s macOS implementation.

**Files**:

- Modify: `src/main/utils/security.ts`
- Modify: `tests/unit/main/security.test.ts`

**Acceptance Criteria**:

- [ ] `npx vitest run tests/unit/main/security.test.ts` passes
- [ ] macOS permission request remains async and no-ops on other platforms

---

### Task 5: Migrate notificationManager.ts (Linux libnotify guidance)

**What to do**:

- Replace `isLinux` branch with adapter `getNotificationSupportHint()`.
- If hint is returned, log it; otherwise log generic “not supported”.

**Files**:

- Modify: `src/main/managers/notificationManager.ts`
- Modify: `tests/unit/main/managers/notificationManager.test.ts`

**Acceptance Criteria**:

- [ ] `npx vitest run tests/unit/main/managers/notificationManager.test.ts` passes
- [ ] Linux guidance message preserved; non-Linux behavior unchanged

---

### Task 6: Full verification

**Commands**:

- `npm run test`
- `npm run test:coordinated`
- `npm run lint`
- `npm run build`
- `npx madge --circular src/main`

**Acceptance Criteria**:

- [ ] All commands succeed with zero failures

---

## Success Criteria

- [ ] Remaining platform-specific logic in listed source files routed through PlatformAdapter
- [ ] No circular dependencies or API breaks
- [ ] All unit + coordinated tests pass
