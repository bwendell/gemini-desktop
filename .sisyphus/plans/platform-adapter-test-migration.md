# PlatformAdapter Test Migration Plan (All Tests)

## TL;DR

> **Quick Summary**: Migrate test files that currently mock platform constants or `process.platform` to use PlatformAdapter-based mocking where appropriate, while preserving runtime platform checks in integration/E2E tests. Provide a shared test helper for adapter mocks and ensure cache reset between tests.
>
> **Deliverables**:
>
> - Test helper for adapter mocking
> - Updated unit + coordinated tests to use adapter mocks instead of constants/process.platform where the production code now depends on PlatformAdapter
> - Inventory + verification steps for integration/E2E tests (no behavior changes)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO (shared helper + widespread updates)
> **Critical Path**: Task 0 → Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request

“Create another plan for migrating all test files to using the PlatformAdapter. Momus and Ultrabrain review required.”

### Current Test Mocking Patterns (from inventory)

- **Unit**: hoisted getter mocks for `constants.ts`, direct `process.platform` stubs, adapter factory mocks
- **Coordinated**: matrix tests using `process.platform` getters, adapter factory mocks (Wayland scenarios)
- **Integration/E2E**: runtime platform detection via `browser.electron.execute` (should remain)

### Constraints & Interpretation

- The migration focuses on **tests that currently mock platform detection** for code that **uses PlatformAdapter** after source refactors.
- **Integration/E2E tests** that use real runtime platform detection should **remain** unchanged (adapter is runtime-dependent).

---

## Work Objectives

### Core Objective

Standardize test platform mocking around PlatformAdapter, reduce direct `constants.ts`/`process.platform` mocks where they no longer reflect production code.

### Definition of Done

- [ ] All unit + coordinated tests for PlatformAdapter-migrated code use adapter mocks
- [ ] Integration/E2E tests continue to use real platform detection
- [ ] Full test suite passes

---

## Guardrails (Non-Negotiable)

- **Do not modify production source code** in this test migration plan.
- **Do not change test behavior** (assertions remain the same).
- **Do not modify E2E tests** unless they explicitly mock `constants.ts` (rare).
- **Reset adapter cache** between tests using `resetPlatformAdapterForTests()`.

---

## Execution Strategy

```
Wave 0: OpenSpec proposal + validation
Wave 1: Create adapter mock helper + baseline verification
Wave 2: Unit test migrations (main/process managers)
Wave 3: Coordinated test migrations
Wave 4: Integration/E2E audit (documented no-op changes)
Wave 5: Full verification
```

---

## TODOs

### Task 0: OpenSpec change proposal + validation

**What to do**:

- Create OpenSpec change proposal for test migration.
- Validate with strict mode.

**Files**:

- Create: `openspec/changes/refactor-platform-adapter-tests/proposal.md`
- Create: `openspec/changes/refactor-platform-adapter-tests/tasks.md`
- Create: `openspec/changes/refactor-platform-adapter-tests/specs/<capability>/spec.md` (if required)

**Acceptance Criteria**:

- [ ] `openspec validate refactor-platform-adapter-tests --strict` passes

---

### Task 1: Create shared PlatformAdapter test helper

**What to do**:

- Add helper that builds adapter mocks and resets cached adapter between tests.
- Provide platform presets: `linux-wayland`, `linux-x11`, `windows`, `mac`.

**Files**:

- Create: `tests/helpers/platformAdapterMock.ts`

**Helper Responsibilities**:

- `createMockPlatformAdapter({ id, waylandStatus, hotkeyPlan, overrides })`
- `useMockPlatformAdapter(adapter)` — mocks factory to return adapter
- `resetPlatformAdapterForTests()` invoked in test `beforeEach`

**Cache Isolation Requirements**:

- Add `beforeEach`/`afterEach` guidance to reset adapter cache between tests
- Use `vi.resetModules()` for tests that rely on module-scoped adapter caching
- Add a small **sentinel test** that flips adapter values between tests to verify cache reset

**Acceptance Criteria**:

- [ ] Helper compiles and is used in at least one migrated test file

---

### Task 2: Unit test migrations (constants/process.platform → adapter)

**Targets** (examples — expand using inventory list):

- `tests/unit/main/badgeManager.test.ts`
- `tests/unit/main/mainWindow.test.ts`
- `tests/unit/main/windowManager.test.ts`
- `tests/unit/main/managers/notificationManager.test.ts`
- `tests/unit/main/managers/updateManager.test.ts`
- `tests/unit/main/paths.test.ts`
- `tests/unit/main/security.test.ts`

**What to do**:

- Replace `vi.mock(constants)` or `process.platform` stubs with adapter mocks.
- Ensure adapter cache reset in `beforeEach`.

**Acceptance Criteria**:

- [ ] `npx vitest run tests/unit/main/badgeManager.test.ts` passes
- [ ] `npx vitest run tests/unit/main/mainWindow.test.ts` passes
- [ ] `npx vitest run tests/unit/main/windowManager.test.ts` passes
- [ ] `npx vitest run tests/unit/main/managers/notificationManager.test.ts` passes
- [ ] `npx vitest run tests/unit/main/managers/updateManager.test.ts` passes
- [ ] `npx vitest run tests/unit/main/paths.test.ts` passes
- [ ] `npx vitest run tests/unit/main/security.test.ts` passes

---

### Task 3: Coordinated test migrations

**Targets** (examples — expand using inventory list):

- `tests/coordinated/badge-manager.coordinated.test.ts`
- `tests/coordinated/menu-manager-platform.coordinated.test.ts`
- `tests/coordinated/window-visibility-fallback.coordinated.test.ts`
- `tests/coordinated/update-notification-chain.coordinated.test.ts`

**What to do**:

- Replace `process.platform` getters with adapter mocks where tests are verifying platform behavior of code now using PlatformAdapter.
- Preserve `describe.each(['darwin','win32','linux'])` if the test is a platform matrix.
- Ensure adapter mock is set **per iteration** to avoid stale adapter across matrix runs.

**Acceptance Criteria**:

- [ ] `npx vitest run tests/coordinated/badge-manager.coordinated.test.ts` passes
- [ ] `npx vitest run tests/coordinated/menu-manager-platform.coordinated.test.ts` passes
- [ ] `npx vitest run tests/coordinated/window-visibility-fallback.coordinated.test.ts` passes
- [ ] `npx vitest run tests/coordinated/update-notification-chain.coordinated.test.ts` passes

---

### Task 4: Integration + E2E audit (no behavior change)

**What to do**:

- Identify tests that use real runtime platform detection (`browser.electron.execute` or helpers) and **leave unchanged**.
- Document that these tests intentionally bypass adapter mocking to validate runtime behavior.
- Explicitly list any integration/E2E tests that still stub platform values and justify exclusion.

**Acceptance Criteria**:

- [ ] Inventory documented in OpenSpec tasks.md (no code changes required)

---

### Task 5: Full verification

**Commands**:

- `npm run test`
- `npm run test:coordinated`
- `npm run lint`
- `npm run build`

**Acceptance Criteria**:

- [ ] All commands succeed with zero failures

---

## Success Criteria

- [ ] All unit + coordinated tests that previously mocked `constants.ts` or `process.platform` now use PlatformAdapter mocks.
- [ ] Integration/E2E tests remain unchanged and continue to validate runtime platform detection.
- [ ] Full test suite passes.
