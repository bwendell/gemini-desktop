# Test Runtime Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce CI test wall-clock time without reducing test coverage by removing redundant builds, improving parallelization, and reusing correct build artifacts across jobs.

**Architecture:** Keep the existing test suites and coverage thresholds unchanged. Optimize CI orchestration by (1) reusing build artifacts, (2) skipping duplicated build steps in WDIO, (3) decoupling job dependencies for parallelism, and (4) sharding long E2E groups. Add caching for Electron binaries and electron-builder to reduce setup time.

**Tech Stack:** GitHub Actions, npm scripts, Vitest, WebdriverIO (wdio-electron-service), Electron, Vite.

---

## Phase 0 — Baseline & Visibility (No behavior changes)

### Task 0.1: Record baseline CI timings

**Files:**

- Modify: `docs/plans/2026-02-20-test-runtime-optimization.md` (append results)

**Step 1: Collect timing data**

- Open the example run in GitHub Actions and note durations for: build, unit-tests, coordinated-tests, integration-tests, e2e group longest, release-e2e.
- (Optional) Add `ACTIONS_STEP_DEBUG` via repository settings if deeper step timing is needed.

**Step 2: Record baseline**

- Append a small table to this plan under “Baseline Metrics”.

**Expected Outcome:** A baseline table to compare improvements.

---

## Phase 1 — Eliminate Redundant Builds (Highest impact)

### Task 1.1: Skip WDIO rebuilds for E2E group jobs

**Files:**

- Modify: `.github/workflows/_test.yml`

**Step 1: Set SKIP_BUILD for E2E group jobs**
Add to env for `e2e-tests-ubuntu`, `e2e-tests-windows`, `e2e-tests-macos`:

```yaml
env:
    SKIP_BUILD: 'true'
```

**Step 2: Ensure artifacts are still downloaded**
Confirm the existing Download Frontend/Electron Build steps remain.

**Step 3: Validate behavior**
The WDIO `onPrepare` should log “Skipping build (SKIP_BUILD is set)...” in job logs.

**Expected Outcome:** No more rebuilds per E2E group; builds rely on prebuilt artifacts.

---

### Task 1.2: Add integration-mode build artifact and reuse it

**Files:**

- Modify: `.github/workflows/_build.yml`
- Modify: `.github/workflows/_test.yml`
- Modify: `config/wdio/wdio.integration.conf.js`

**Step 1: Produce integration dist in build job**
In `_build.yml`, after the production build, add:

```yaml
- name: Build Frontend (integration)
  run: vite build --mode integration --outDir dist-integration

- name: Upload Frontend Build (integration)
  uses: actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f
  with:
      name: frontend-dist-integration
      path: dist-integration/
      retention-days: 1
```

**Step 2: Download integration artifact in integration-tests job**
In `_test.yml` integration job, add:

```yaml
- name: Download Frontend Build (integration)
  uses: actions/download-artifact@37930b1c2abaa49bbe596cd826c3c89aef350131
  with:
      name: frontend-dist-integration
      path: dist-integration/
```

**Step 3: Use integration dist in WDIO and skip build**
Update `wdio.integration.conf.js`:

- On `onPrepare`, if `process.env.SKIP_BUILD === 'true'`, return early.
- Ensure Vite loads `dist-integration` by setting `process.env.VITE_TEST_MODE` or another existing hook used by your app (confirm in codebase) and document it.

**Step 4: Set SKIP_BUILD for integration job**
In `_test.yml` integration job, set:

```yaml
env:
    SKIP_BUILD: 'true'
```

**Expected Outcome:** Integration tests use integration build artifacts instead of rebuilding per OS.

---

## Phase 2 — Parallelize Post-Build Testing

### Task 2.1: Remove unit-test gating for other jobs

**Files:**

- Modify: `.github/workflows/_test.yml`

**Step 1: Remove dependencies**
For `coordinated-tests`, `integration-tests`, `e2e-tests-*`, `release-e2e-tests`:

- Replace `needs: unit-tests` with `needs: build` (or no `needs` if build artifacts are still downloaded).

**Step 2: Confirm artifact availability**
Jobs should still download artifacts from build.

**Expected Outcome:** Parallel execution after build; overall wall-clock time reduced.

---

## Phase 3 — E2E Sharding to Reduce Longest Job

### Task 3.1: Split heavy E2E groups

**Files:**

- Create: `config/wdio/wdio.group.update-a.conf.js`
- Create: `config/wdio/wdio.group.update-b.conf.js`
- Create: `config/wdio/wdio.group.window-a.conf.js`
- Create: `config/wdio/wdio.group.window-b.conf.js`
- Modify: `package.json`
- Modify: `.github/workflows/_test.yml`

**Step 1: Split specs**
Rebalance the existing `update` and `window` specs across new group files. Example:

```js
// wdio.group.update-a.conf.js
specs: [
    '../../tests/e2e/auto-update-error-recovery.spec.ts',
    '../../tests/e2e/auto-update-happy-path.spec.ts',
    '../../tests/e2e/auto-update-startup.spec.ts',
];

// wdio.group.update-b.conf.js
specs: [
    '../../tests/e2e/auto-update-interactions.spec.ts',
    '../../tests/e2e/auto-update-persistence.spec.ts',
    '../../tests/e2e/auto-update-platform.spec.ts',
    '../../tests/e2e/auto-update-toggle.spec.ts',
    '../../tests/e2e/auto-update-tray.spec.ts',
];
```

```js
// wdio.group.window-a.conf.js
specs: [
    '../../tests/e2e/always-on-top.spec.ts',
    '../../tests/e2e/peek-and-hide.spec.ts',
    '../../tests/e2e/window-controls.spec.ts',
];

// wdio.group.window-b.conf.js
specs: [
    '../../tests/e2e/dependent-windows.spec.ts',
    '../../tests/e2e/window-bounds.spec.ts',
    '../../tests/e2e/window-management-edge-cases.spec.ts',
    '../../tests/e2e/window-state.spec.ts',
    '../../tests/e2e/window-titlebar.spec.ts',
];
```

**Step 2: Add npm scripts**
In `package.json`, add:

```json
"test:e2e:group:update-a": "wdio run config/wdio/wdio.group.update-a.conf.js",
"test:e2e:group:update-b": "wdio run config/wdio/wdio.group.update-b.conf.js",
"test:e2e:group:window-a": "wdio run config/wdio/wdio.group.window-a.conf.js",
"test:e2e:group:window-b": "wdio run config/wdio/wdio.group.window-b.conf.js",
```

**Step 3: Update CI matrices**
In `_test.yml`, replace `update` and `window` with `update-a`, `update-b`, `window-a`, `window-b` in all E2E matrices.

**Expected Outcome:** Shorter max job duration per OS without reducing tests.

---

## Phase 4 — Add Electron/Electron-Builder Cache

### Task 4.1: Cache Electron binaries

**Files:**

- Modify: `.github/workflows/_build.yml`
- Modify: `.github/workflows/_test.yml`

**Step 1: Add cache steps**
Add to each workflow job where Electron is used:

```yaml
- name: Cache Electron
  uses: actions/cache@v4
  with:
      path: |
          ~/.cache/electron
          ~/.cache/electron-builder
      key: ${{ runner.os }}-electron-${{ hashFiles('package-lock.json') }}
      restore-keys: |
          ${{ runner.os }}-electron-
```

**Expected Outcome:** Reduced install and packaging times across jobs.

---

## Phase 5 — Retry Strategy Tune (Optional)

### Task 5.1: Defer spec retries to reduce wasted time

**Files:**

- Modify: `config/wdio/wdio.base.conf.js`
- Modify: `config/wdio/wdio.integration.conf.js`
- Modify: `.github/workflows/_test.yml`

**Step 1: Enable deferred retries**
Set `specFileRetriesDeferred: true` in both configs.

**Step 2: Add retry env in CI**
Set `WDIO_SPEC_FILE_RETRIES` in `_test.yml` to 1 for PRs, 2 for main.

**Expected Outcome:** Shorter job time in cases of flake retries while keeping coverage.

---

## Baseline Metrics (Fill in after Phase 0)

| Job                            | Current Duration | Notes |
| ------------------------------ | ---------------- | ----- |
| build                          |                  |       |
| unit-tests                     |                  |       |
| coordinated-tests (slowest OS) |                  |       |
| integration-tests (slowest OS) |                  |       |
| e2e-tests (slowest group)      |                  |       |
| release-e2e-tests              |                  |       |

---

## Validation Checklist

- [ ] CI run completes with full coverage unchanged (Vitest thresholds unchanged).
- [ ] WDIO logs show “Skipping build (SKIP_BUILD is set)” for E2E/integration jobs.
- [ ] Integration tests use `dist-integration` artifact (verify in logs).
- [ ] CI wall-clock time reduced relative to baseline.
