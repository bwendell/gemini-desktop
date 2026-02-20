# Test Runtime Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce CI test wall-clock time without reducing test coverage by removing redundant builds, improving parallelization, and reusing correct build artifacts across jobs.

**Architecture:** Keep the existing test suites and coverage thresholds unchanged. Optimize CI orchestration by (1) reusing build artifacts, (2) skipping duplicated build steps in WDIO, (3) decoupling job dependencies for parallelism, and (4) sharding long E2E groups. Add caching for Electron binaries and electron-builder to reduce setup time.

**Tech Stack:** GitHub Actions, npm scripts, Vitest, WebdriverIO (wdio-electron-service), Electron, Vite.

---

## CI Graph and Artifact-Flow Reality

The current CI pipeline follows a sequential-bottleneck pattern where most testing jobs are gated by unit tests, despite having all necessary artifacts available immediately after the build phase.

### Current Dependency Graph

1. **Build** (`.github/workflows/_build.yml`): Compiles frontend and electron source.
2. **Unit Tests** (`.github/workflows/_test.yml:unit-tests`): Runs Vitest suites. **CRITICAL BOTTLENECK**: All downstream jobs currently `needs: unit-tests`.
3. **Downstream Matrix Jobs**:
    - `coordinated-tests` (`.github/workflows/_test.yml:107`)
    - `integration-tests` (`.github/workflows/_test.yml:161`)
    - `e2e-tests-*` (`.github/workflows/_test.yml:220, 279, 338`)
    - `release-e2e-tests` (`.github/workflows/_test.yml:409`)

### Artifact Flow & Provenance

To ensure testing integrity and optimize runtime, we leverage GitHub Actions artifacts to pass the production-ready build between workflows:

- **Frontend Dist**: Produced in `.github/workflows/_build.yml:58-63`, downloaded by all test jobs (e.g., `.github/workflows/_test.yml:68, 131, 185`).
- **Electron Dist**: Produced in `.github/workflows/_build.yml:65-70`, downloaded by all test jobs (e.g., `.github/workflows/_test.yml:74, 137, 191`).

### Why This Matters

- **Runtime Optimization**: By removing the `needs: unit-tests` gate from downstream jobs, we can parallelize ~40 matrix jobs immediately after the 1-minute build completes, rather than waiting for the 1.5-minute unit test suite.
- **Risk Control**: Reusing the exact same `frontend-dist` and `electron-dist` artifacts across all jobs ensures that E2E failures are not caused by environmental build discrepancies, but by actual regression in the code that passed unit tests.

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

### Task 1.1: Skip WDIO rebuilds for E2E group jobs (with integrity verification)

**Prerequisite:** This task requires `SKIP_BUILD` to be set **only after** verifying artifact integrity.

**Files:**

- Modify: `.github/workflows/_test.yml`

**Step 1: Add artifact integrity verification (pre-skip safety)**
Before setting `SKIP_BUILD`, verify the downloaded artifacts match the expected checksum manifest generated in the build job. Add a step to verify build integrity:

```yaml
- name: Verify Build Artifact Integrity
  id: verify-artifacts
  run: |
      # Check for existence of checksum manifest
      if [ ! -f "dist/checksum-manifest.txt" ] || [ ! -f "dist-electron/checksum-manifest-electron.txt" ]; then
        echo "MISSING_ARTIFACTS=1" >> $GITHUB_OUTPUT
        echo "::warning::Integrity manifest missing - will require rebuild"
        exit 0
      fi

      # Verify artifacts match manifest (checksum-verified)
      if (cd dist && sha256sum -c checksum-manifest.txt) && (cd dist-electron && sha256sum -c checksum-manifest-electron.txt); then
        echo "ARTIFACTS_VERIFIED=1" >> $GITHUB_OUTPUT
        echo "Build artifacts verified for reuse via checksum manifest"
      else
        echo "MISSING_ARTIFACTS=1" >> $GITHUB_OUTPUT
        echo "::warning::Checksum mismatch - will require rebuild"
      fi
```

**Step 2: Set SKIP_BUILD for E2E group jobs (conditional)**
Add to env for `e2e-tests-ubuntu`, `e2e-tests-windows`, `e2e-tests-macos`:

```yaml
env:
    # Only skip build if artifacts are present and verified
    SKIP_BUILD: ${{ steps.verify-artifacts.outputs.ARTIFACTS_VERIFIED == '1' && 'true' || 'false' }}
```

**Step 3: Ensure artifacts are still downloaded**
Confirm the existing Download Frontend/Electron Build steps remain and execute before the verify step.

**Step 4: Add fallback behavior for missing/mismatched artifacts**
Add explicit fallback in workflow:

```yaml
- name: Fallback - Build if artifacts missing
  if: steps.verify-artifacts.outputs.MISSING_ARTIFACTS == '1'
  run: |
      echo "::warning::Artifacts missing or checksum mismatch - rebuilding..."
      npm run build
      npm run build:electron
```

**Step 5: Validate behavior**
The WDIO `onPrepare` should log "Skipping build (SKIP_BUILD is set)..." in job logs when artifacts are verified.
If artifacts are missing, fallback build should execute and WDIO should proceed with fresh build.

**Expected Outcome:**

- No more rebuilds per E2E group when artifacts are verified intact
- Safe fallback to rebuild if artifacts are missing or corrupted
- Clear logging of which path was taken (skip vs rebuild)

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

### Task 2.1: Remove unit-test gating for other jobs (WITH GUARDRAILS)

**Files:**

- Modify: `.github/workflows/_test.yml`

**Prerequisites (MUST complete before decoupling):**

1. **Artifact Availability Verification**: All downstream jobs must verify `frontend-dist` and `electron-dist` artifacts exist and are non-empty before execution.
2. **Unit-Test Status Reporting (Non-Gating)**: Unit tests must report status via `needs: unit-tests` output, but this status should NOT gate job start—only merge/release decisions.
3. **Baseline Metrics Captured**: Wall-clock time, flake rate, and artifact download success rate must be baselined before changes.

**Step 1: Safe dependency decoupling**
For `coordinated-tests`, `integration-tests`, `e2e-tests-*`, `release-e2e-tests`:

- Replace `needs: unit-tests` with `needs: build` to enable parallel execution.
- Add explicit artifact verification step before test execution (see Phase 1 Task 1.1 pattern).
- Preserve unit-test status access via job outputs for merge-time quality gates.

**Step 2: Confirm artifact availability with integrity checks**
Jobs must verify artifacts exist AND match expected checksums via the build-generated manifest:

```yaml
- name: Verify Build Artifact Integrity
  id: verify-artifacts
  run: |
      # Verify artifacts match manifest (checksum-verified)
      (cd dist && sha256sum -c checksum-manifest.txt) && (cd dist-electron && sha256sum -c checksum-manifest-electron.txt) || {
        echo "::error::Artifact checksum mismatch or manifest missing - aborting"
        exit 1
      }
      echo "ARTIFACTS_VERIFIED=1" >> $GITHUB_OUTPUT
```

**Step 3: Maintain quality gate semantics**

- Unit tests STILL block merge/release decisions via required status checks.
- Downstream jobs START in parallel with unit tests (no delay waiting for unit-tests completion).
- Coverage thresholds remain unchanged and enforced at merge time.

**Rollback Triggers (IMMEDIATE action required):**

- **Flake rate increase >20%**: If flaky failure rate in any test category increases by more than 20% relative to baseline (measured over 5 consecutive runs), revert to `needs: unit-tests` gating.
- **Artifact race/missing artifacts**: If any job fails due to missing or corrupted artifacts (verified by integrity check failure), immediately investigate artifact upload/download race conditions and consider reverting dependency changes.
- **Coverage regression**: If coverage drops below existing thresholds due to parallelization timing issues, revert immediately.

**Expected Outcome:**

- Parallel execution after build; overall wall-clock time reduced.
- Quality gates preserved: unit-tests still block merge/release.
- Rollback path defined for safety.

---

## Phase 3 — E2E Sharding to Reduce Longest Job

> **Evidence Basis (CI Run 22217430068):** The slowest E2E group is `update` on Windows at **7.8 minutes**. Windows-heavy groups (`update`, `stability`, `auth`, `window`) are the bottleneck contributors. This phase uses measured duration weighting to balance shards, targeting the longest group duration.

### Weighted Sharding Strategy

The following groups are identified as Windows-heavy and require split based on run `22217430068` duration evidence:

| Group       | Measured Duration (Windows) | Split Required                                    |
| ----------- | --------------------------- | ------------------------------------------------- |
| `update`    | 7.8 min (slowest E2E)       | Yes - split into 2                                |
| `stability` | ~7.6 min (close second)     | Follow-up weighted split (trigger: duration > 8m) |
| `auth`      | ~4+ min (estimated)         | Follow-up weighted split (trigger: duration > 8m) |
| `window`    | ~4+ min (estimated)         | Yes - split into 2                                |

**Deterministic Split Rules:**

1. Sort specs within each group by file size (line count) descending
2. Assign first N specs to shard A where cumulative duration <= 50% of group total
3. Remaining specs go to shard B
4. Use alphabetical tiebreaker for deterministic ordering

### Task 3.1: Split heavy E2E groups

**Files:**

- Create: `config/wdio/wdio.group.update-a.conf.js`
- Create: `config/wdio/wdio.group.update-b.conf.js`
- Create: `config/wdio/wdio.group.window-a.conf.js`
- Create: `config/wdio/wdio.group.window-b.conf.js`
- Modify: `package.json`
- Modify: `.github/workflows/_test.yml`

**Step 1: Split specs using weighted approach**

Split `update` group (7.8 min target) into two shards of approximately 3.9 min each:

```js
// wdio.group.update-a.conf.js (target: ~3.9 min)
specs: [
    '../../tests/e2e/auto-update-error-recovery.spec.ts',
    '../../tests/e2e/auto-update-startup.spec.ts',
    '../../tests/e2e/auto-update-happy-path.spec.ts',
];

// wdio.group.update-b.conf.js (target: ~3.9 min)
specs: [
    '../../tests/e2e/auto-update-interactions.spec.ts',
    '../../tests/e2e/auto-update-persistence.spec.ts',
    '../../tests/e2e/auto-update-platform.spec.ts',
    '../../tests/e2e/auto-update-toggle.spec.ts',
    '../../tests/e2e/auto-update-tray.spec.ts',
];
```

Split `window` group similarly:

```js
// wdio.group.window-a.conf.js
specs: [
    '../../tests/e2e/always-on-top.spec.ts',
    '../../tests/e2e/boss-key.spec.ts',
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

**Coverage Preservation Rule:** No spec files are removed from the test matrix. All existing specs are redistributed across new shards. Total test coverage remains unchanged.

**Acceptance Rule:** After splitting, the longest E2E group duration on any OS must be **<= 5.0 minutes** (measured from CI run after implementation). If longest group exceeds 5.0 min, additional splitting or further balancing is required.

**Expected Outcome:** Shorter max job duration per OS without reducing tests. Target: longest group <= 5.0 min vs baseline 7.8 min.

---

## Phase 4 — Add Electron/Electron-Builder Cache

### Task 4.1: Cache Electron binaries and electron-builder artifacts

**Files:**

- Modify: `.github/workflows/_build.yml`
- Modify: `.github/workflows/_test.yml`

**Step 1: Define cache boundaries**

The npm package cache is already handled by `actions/setup-node` with `cache: 'npm'`. This phase targets only Electron-specific caches to avoid redundancy and ensure proper isolation. The two caches serve different purposes:

- **npm cache** (`~/.npm`): Handled by setup-node; caches npm registry downloads for node_modules
- **Electron cache** (`~/.cache/electron`, `~/.cache/electron-builder`): This phase; caches Electron binaries and builder artifacts

Cache targets (whitelist approach):

- `~/.cache/electron` — Electron binary downloads
- `~/.cache/electron-builder` — electron-builder output/cache

Explicitly excluded:

- `node_modules` — Never cache; handled by npm ci + setup-node cache
- `dist/` — Build artifacts; handled by actions/upload-artifact
- `dist-electron/` — Build artifacts; handled by actions/upload-artifact

**Anti-pattern:** Do not cache node_modules. Caching node_modules causes more problems than it solves due to native module rebuilds, platform-specific binaries, and inconsistent behavior across OS versions. The combination of `npm ci` (clean install from lockfile) and setup-node's npm cache provides sufficient speedup without the fragility of caching node_modules.

**Step 2: Add composite cache key strategy**

The cache key must be specific enough to avoid cache poisoning but flexible enough to allow partial hits. Use OS + lockfile hash + Electron version cues:

```yaml
- name: Cache Electron and electron-builder
  uses: actions/cache@v4
  with:
      path: |
          ~/.cache/electron
          ~/.cache/electron-builder
      key: ${{ runner.os }}-electron-v${{ hashFiles('package-lock.json') }}-${{ hashFiles('package.json', 'electron') }}
      restore-keys: |
          ${{ runner.os }}-electron-v${{ hashFiles('package-lock.json') }}-
          ${{ runner.os }}-electron-
```

The key components:

- `${{ runner.os }}` — Required for cross-OS safety; Electron binaries are platform-specific
- `${{ hashFiles('package-lock.json') }}` — Captures all dependency changes
- `${{ hashFiles('package.json', 'electron') }}` — Subset hash on package.json focusing on electron-related fields (electron version, electron-builder version); can be simplified to `hashFiles('package.json')` if electron fields are not isolated

**Cross-OS safety caveat:** The `runner.os` prefix is mandatory. Without it, cache restores on Linux runners could incorrectly use Windows-cached Electron binaries, causing test failures or silent corruption. This is a critical requirement — always include `${{ runner.os }}` in the cache key.

**Step 3: Add cache hit/miss telemetry and verification**

Log cache outcomes for observability and debugging. Include explicit verification checkpoints:

```yaml
- name: Cache Electron and electron-builder
  id: cache-electron
  uses: actions/cache@v4
  with:
      path: |
          ~/.cache/electron
          ~/.cache/electron-builder
      key: ${{ runner.os }}-electron-v${{ hashFiles('package-lock.json') }}-${{ hashFiles('package.json', 'electron') }}
      restore-keys: |
          ${{ runner.os }}-electron-v${{ hashFiles('package-lock.json') }}-
          ${{ runner.os }}-electron-

- name: Report cache outcome
  run: |
      if [ "${{ steps.cache-electron.outputs.cache-hit }}" = "true" ]; then
        echo "::notice::Cache HIT for Electron/electron-builder - skipping download"
        echo "ELECTRON_CACHE_STATUS=hit" >> $GITHUB_ENV
      else
        echo "::warning::Cache MISS for Electron/electron-builder - downloading binaries"
        echo "ELECTRON_CACHE_STATUS=miss" >> $GITHUB_ENV
      fi
```

**Verification checkpoints:**

1. **CI Log Inspection:** The cache outcome message appears in job logs under "Report cache outcome".
    - Expected HIT output: `::notice::Cache HIT for Electron/electron-builder - skipping download`
    - Expected MISS output: `::warning::Cache MISS for Electron/electron-builder - downloading binaries`

2. **Timing Verification:** Compare job duration with baseline:
    - Cache HIT: ~30-60s faster per job (Electron download + unpacking avoided)
    - Cache MISS: Baseline duration (normal on first run or after dependency changes)

3. **Artifact Verification:** On cache MISS, verify `~/.cache/electron-builder` contains downloaded artifacts after the build step completes.

**Expected Outcome:** Reduced Electron download and packaging times across jobs. Cache hit provides ~30-60s savings per job; the telemetry ensures cache effectiveness is observable in CI logs.

---

## Phase 5 — Retry Strategy Tune (Optional, Safety-First)

### Task 5.1: Defer spec retries to reduce wasted time (not a primary speedup lever)

**Intent:** Runtime optimization only. Reliability safeguards remain separate. Retries must never hide flakes; they must surface as signal with explicit telemetry.

**Files:**

- Modify: `config/wdio/wdio.base.conf.js`
- Modify: `config/wdio/wdio.integration.conf.js`
- Modify: `.github/workflows/_test.yml`

**Step 1: Enable deferred retries (behavioral change only)**
Set `specFileRetriesDeferred: true` in both configs so retries are deferred until the end of the run (reduces wasted time from immediate re-runs without changing coverage).

**Step 2: Branch-sensitive retry policy (PR vs main)**
Set `WDIO_SPEC_FILE_RETRIES` in `_test.yml` with explicit branch behavior:

- **Pull Requests:** `WDIO_SPEC_FILE_RETRIES=1`
- **Main/Release:** `WDIO_SPEC_FILE_RETRIES=2`

Example expression:

```yaml
env:
    WDIO_SPEC_FILE_RETRIES: ${{ github.event_name == 'pull_request' && '1' || '2' }}
```

**Step 3: Mandatory flake observability (required even on pass)**
Add a requirement to emit retry telemetry **for every job**, including passing runs:

- Publish **retry attempt counts** and **flaky-pass counts** (specs that only passed after retry).
- Emit these metrics in job summaries and persist them as artifacts (e.g., `retry-metrics.json`) so they can be aggregated later.
- Explicitly distinguish between **runtime optimization metrics** (deferred retry impact) and **reliability signals** (flaky-pass counts).

**Step 4: Reliability safeguards remain distinct from runtime optimization**

- Keep existing `WDIO_TEST_RETRIES` unchanged (reliability guardrail).
- Retries are not the primary speedup lever; they are a bounded safety net with telemetry.

**Rollback Triggers (signal-quality protection):**

- **Flaky-pass count increases >20%** over baseline across 5 consecutive CI runs after reducing PR retries.
- **Flaky failure rate increases >15%** on PRs (re-runs pass without code change), indicating reduced signal quality.

**Rollback Action (concrete):**

- Revert to `WDIO_SPEC_FILE_RETRIES=2` for PRs and set `specFileRetriesDeferred: false` until root-cause analysis is complete.
- Keep telemetry publishing enabled to validate recovery.

**Expected Outcome:**

- Deferred retries reduce wasted time without masking flakes.
- PR vs main retry policy is explicit and branch-sensitive.
- Retry telemetry is always visible, even on successful jobs.

---

## Phase 6 — Integration/Release Bottleneck Avenues (Policy Only)

> **Scope:** Integration + Release E2E runtime only. **Default coverage is preserved** (full suites run unless an explicit opt-in policy is enabled).

### Avenue 6.1: Per-spec duration telemetry for weighted balancing — **Required**

- **Policy:** Capture per-spec duration for integration and release E2E runs and store it as CI metadata to drive future weighted balancing.
- **Guardrail:** Instrumentation only; **no suite reduction** or sharding changes are implied without a separate, explicit plan change.
- **Benefit:** Enables evidence-based balancing to reduce longest job time without coverage loss.

### Avenue 6.2: Packaged-test tiering policy (PR smoke vs main full) — **Optional (opt-in)**

- **Policy (opt-in toggle):** Allow a PR-tier “smoke” subset for packaged release E2E, while **main** and **release** branches always run the full packaged suite.
- **Opt-in language:** Disabled by default; requires an explicit toggle/label or workflow input to enable for PRs.
- **Risk:** Lower PR signal for packaged-only regressions if smoke tier misses edge cases.
- **Benefit:** Faster PR feedback while preserving full coverage on main/release.

### Avenue 6.3: Changed-files/path-filter gate for integration/release — **Optional (opt-in)**

- **Policy (opt-in toggle):** Allow a path-based gate to skip **only** integration/release jobs when changes are clearly outside runtime or packaging scope.
- **Opt-in language:** Disabled by default; must be explicitly enabled and documented with allowed paths.
- **Risk:** False negatives if path filters are incomplete or if changes have indirect runtime impact.
- **Benefit:** Avoids paying integration/release runtime cost for docs-only or non-runtime changes.
- **Coverage guardrail:** Full integration/release coverage remains the default; path-gated skips are an explicit, reversible policy choice.

---

## Phase 7 — QA Guardrails & Anti-patterns

To maintain long-term CI health and prevent runtime optimizations from eroding test signal quality, the following guardrails and anti-patterns are established.

### 7.1 Mandatory QA Guardrails

1. **Explicit Artifact Verification**: Every job that reuses a build artifact (via `SKIP_BUILD`) must first perform a checksum-based integrity check. If verification fails, the job must fallback to a full build or exit with a clear error.
2. **Deterministic Sharding**: Test shards must be defined explicitly in config files (e.g., `wdio.group.update-a.conf.js`) rather than via dynamic shell expansion to ensure every spec is accounted for in the CI matrix.
3. **Flake-Rate Circuit Breakers**: If the flaky-pass rate (tests passing only after retry) increases by >20% relative to the baseline across 5 consecutive runs, parallelization or retry optimizations must be reverted.
4. **OS-Isolated Caching**: Caches (Electron binaries, npm modules) must include `runner.os` in their keys to prevent cross-OS binary corruption.

### 7.2 Anti-patterns and Remediation

| Anti-pattern                  | Risk to This Repo                                                                                                | Mitigation / Remediation                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stale Artifact Usage**      | `dist/` or `dist-electron/` containing old files from previous job steps or incomplete downloads.                | Always clear the target directory before `download-artifact`. Use Phase 1 checksum verification.                                                  |
| **Retry Masking**             | High `specFileRetries` hiding genuine environment-specific regressions (e.g., Windows Defender race conditions). | Set `specFileRetriesDeferred: true` to surface flakes at the end of the run. Implement mandatory retry telemetry in job summaries.                |
| **Accidental Suite Omission** | A new spec file added to `tests/e2e/` but not included in any `wdio.group.*.conf.js` shard.                      | Every shard addition must be cross-referenced with a full `ls tests/e2e/` check. (Future: Implement a CI check to validate full suite inclusion). |
| **Cache Poisoning**           | Reusing a macOS Electron binary cache on a Windows runner, causing "Invalid format" errors.                      | Strict cache keys: `${{ runner.os }}-electron-${{ hashFiles('package-lock.json') }}`. Never share cache across different `os` matrix entries.     |

---

## Baseline Metrics (from run 22217430068)

| Job                            | Current Duration | Notes                                                           |
| ------------------------------ | ---------------- | --------------------------------------------------------------- |
| build                          | 0.8 min          | Single build job                                                |
| unit-tests                     | 1.3 min          | Fast; runs first in sequence                                    |
| coordinated-tests (slowest OS) | 2.9 min          | Windows (2.9 min) vs macOS (1.1 min) vs Ubuntu (1.4 min)        |
| integration-tests (slowest OS) | 19.1 min         | Windows (19.1 min) vs macOS (9.7 min) vs Ubuntu (9.8 min)       |
| e2e-tests (slowest group)      | 7.8 min          | Windows / update (7.8 min) - Windows stability close at 7.6 min |
| release-e2e-tests              | 15.2 min         | Windows (15.2 min) vs macOS (11.3 min) vs Ubuntu (11.6 min)     |

### Key Bottlenecks Identified

From run `22217430068`, the **Windows integration tests** (19.1 min) and **Windows release E2E tests** (15.2 min) are the primary wall-clock blockers. Windows E2E groups (particularly `update` and `stability` at ~7-8 min each) also contribute significantly to overall runtime. These Windows-specific bottlenecks suggest platform-specific optimization opportunities in WDIO config, Electron startup, or artifact download times.

---

## Validation Checklist (Command-Verifiable)

> **Variable Setup:** For all commands below, set these variables first:
>
> ```bash
> RUN_ID=$(gh run list --workflow "CI" --status completed --json id --jq '.[0].id')
> # Optional baseline for comparison:
> # BASELINE_RUN_ID=$(gh run list --workflow "CI" --status completed --json id --jq '.[5].id')
> ```

### Success Metrics & Thresholds

| Metric                    | Source                      | Threshold               | Baseline (run 22217430068) |
| ------------------------- | --------------------------- | ----------------------- | -------------------------- |
| Integration tests runtime | GitHub Actions job duration | ≤ 15.3 min (-20%)       | 19.1 min (Windows)         |
| Release-E2E tests runtime | GitHub Actions job duration | ≤ 12.9 min (-15%)       | 15.2 min (Windows)         |
| Longest E2E group runtime | GitHub Actions job duration | ≤ 5.85 min (-25%)       | 7.8 min (update, Windows)  |
| Flake/retry rate          | WDIO JSON reporter          | ≤ 5% specs with retries | ~2% (baseline)             |
| Cache hit rate (Electron) | Job log                     | ≥ 70%                   | N/A (new)                  |
| Artifact integrity pass   | File existence checks       | 100%                    | N/A (new)                  |

### Rollout Sequence

| Phase                    | Risk   | Verification Runs    | Rollback Window |
| ------------------------ | ------ | -------------------- | --------------- |
| Phase 1: Build Reuse     | Low    | 1 consecutive pass   | 3 runs          |
| Phase 2: Parallelization | Low    | 1 consecutive pass   | 3 runs          |
| Phase 3: E2E Sharding    | Medium | 1 consecutive pass   | 3 runs          |
| Phase 4: Electron Cache  | Low    | 2 consecutive runs   | 3 runs          |
| Phase 5: Retry Strategy  | Medium | 3 consecutive passes | 5 runs          |

### Command-Verifiable Acceptance Criteria

#### Phase 1: Build Reuse

- [ ] **Criterion:** SKIP_BUILD=true for E2E jobs when artifacts verified
    - **Command:** gh run view $RUN_ID --job e2e-tests-ubuntu --log | grep -i "SKIP_BUILD.\*true"
    - **Assertion:** Output contains SKIP_BUILD=true

- [ ] **Criterion:** Integration tests use dist-integration artifact
    - **Command:** gh run view $RUN_ID --job integration-tests --log | grep -i "frontend-dist-integration"
    - **Assertion:** Output shows download of frontend-dist-integration

- [ ] **Criterion:** No rebuild logs in E2E jobs after artifact download
    - **Command:** gh run view $RUN_ID --job e2e-tests-ubuntu --log | grep -i "skipping build"
    - **Assertion:** Output shows skip confirmation

#### Phase 2: Parallelization

- [ ] **Criterion:** Downstream jobs start before unit-tests complete
    - **Command:** gh run view $RUN_ID --json jobs | jq '[.jobs[] | select(.name | contains("e2e-tests-ubuntu")) | .startedAt] as $e2eStarts | [.jobs[] | select(.name == "unit-tests") | .completedAt] as $unitComplete | {e2eEarliest: $e2eStarts[0], unitCompleted: $unitComplete[0], parallel: ($e2eStarts[0] < $unitComplete[0])}'
    - **Assertion:** parallel == true

- [ ] **Criterion:** Unit tests still required for merge
    - **Command:** gh api repos/$GITHUB_REPOSITORY/commits/$GITHUB_SHA/status | jq '.state'
    - **Assertion:** state == "success"

#### Phase 3: E2E Sharding

- [ ] **Criterion:** Longest E2E group duration <= 5.0 minutes
    - **Command:** gh run view $RUN_ID --json jobs | jq '[.jobs[] | select(.name | contains("e2e")) | {name: .name, durationSec: ((.completedAt | fromdate) - (.startedAt | fromdate))}] | max_by(.durationSec) | .durationSec <= 300'
    - **Assertion:** true (max duration <= 300 seconds)

- [ ] **Criterion:** All specs covered across shards
    - **Command:** ls config/wdio/wdio.group.\*.conf.js 2>/dev/null | wc -l
    - **Assertion:** Count >= original groups × 2 (e.g., >= 4 for update + window split)

- [ ] **Criterion:** Coverage unchanged
    - **Command:** git diff --name-only HEAD~5..HEAD -- tests/e2e/\*.spec.ts 2>/dev/null | wc -l
    - **Assertion:** 0 files removed

#### Phase 4: Electron Cache

- [ ] **Criterion:** Cache hit rate ≥ 70%
    - **Command:** gh run view $RUN_ID --job build --log | grep -i "cache.\*hit" | wc -l
    - **Assertion:** At least 1 HIT per OS

- [ ] **Criterion:** Cache hit logged
    - **Command:** gh run view $RUN_ID --job build --log | grep -E "::(notice|warning)::.\*[Cc]ache"
    - **Assertion:** Contains Cache HIT or MISS

- [ ] **Criterion:** No cross-OS cache poisoning
    - **Command:** gh run view $RUN_ID --job build --log | grep -i "runner.os" | grep -i "key"
    - **Assertion:** Cache keys include OS prefix

#### Phase 5: Retry Strategy

- [ ] **Criterion:** Flake/pass rate ≤ 5%
    - **Command:** gh run view $RUN_ID --job e2e-tests-ubuntu --log | grep -i "passed on retry" || echo "0"
    - **Assertion:** Count ≤ 5% of total specs

- [ ] **Criterion:** Deferred retries enabled
    - **Command:** grep -r "specFileRetriesDeferred.\*true" config/wdio/ || echo "NOT_FOUND"
    - **Assertion:** specFileRetriesDeferred: true in base config

- [ ] **Criterion:** Branch-sensitive retry policy
    - **Command:** gh run view $RUN_ID --log | grep "WDIO_SPEC_FILE_RETRIES" | head -1
    - **Assertion:** Shows PR=1 or main/release=2

#### Overall Coverage & Quality

- [ ] **Criterion:** Vitest coverage thresholds unchanged
    - **Command:** cat coverage/coverage-summary.json | jq '.total.lines.pct'
    - **Assertion:** ≥ 70%

- [ ] **Criterion:** All jobs complete without artifact errors
    - **Command:** gh run view $RUN_ID --json jobs | jq '[.jobs[].conclusion] | all(. == "success")'
    - **Assertion:** true

- [ ] **Criterion:** CI wall-clock reduced
    - **Command:** gh run view $RUN_ID --json run | jq '.run | {createdAt, updatedAt, durationMin: ((.updatedAt | fromdate) - (.createdAt | fromdate)) / 60 | floor}'
    - **Assertion:** durationMin < 47

### Rollback Triggers & Actions

#### Trigger: Runtime Regression (>10% increase)

- **Detection:** Compare job durations via `gh run view $RUN_ID --json jobs`
- **Action:** `git revert HEAD --no-commit` then selectively stage and commit specific workflow files

#### Trigger: Cache Hit Rate <30%

- **Detection:** 3 consecutive runs with <30% hit (check job logs)
- **Action:** Use `git revert` to undo cache-related workflow changes, or manually edit workflow to comment cache steps

#### Trigger: Flake Rate Increase >20%

- **Detection:** 5 runs with >20% increase (monitor retry metrics)
- **Action:** `git revert` to undo retry changes, or edit config/wdio/\*.conf.js to set specFileRetriesDeferred: false and increase WDIO_SPEC_FILE_RETRIES

#### Trigger: Artifact Integrity Failure

- **Detection:** MISSING_ARTIFACTS=1 in job logs
- **Action:** `git log --oneline -1` to identify the problematic commit, then `git revert` to undo artifact-related changes

#### Trigger: Coverage Regression

- **Detection:** Coverage drops below threshold (check coverage summary)
- **Action:** `git revert HEAD` to undo changes; if coverage was in baseline, restore from `git show HEAD~5:path/to/coverage-summary.json`

### Safe Rollback Verification

1. **Artifact flow verified:**

    ```bash
    gh run view $RUN_ID --job build --log | grep -E "(Upload|Download).*artifact"
    ```

    Expected: Shows artifact upload in build and download in downstream jobs

2. **Sequential gating restored (if rollback triggered):**

    ```bash
    grep -E "^[[:space:]]+needs:" .github/workflows/_test.yml | head -5
    ```

    Expected: Each downstream job shows `needs: unit-tests` (original sequential pattern)

3. **No partial state:**
    ```bash
    git status --porcelain
    ```
    Expected: Clean working tree after revert
