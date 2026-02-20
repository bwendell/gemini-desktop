# QA Hardening Plan: Test Runtime Optimization Plan Update

> REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## TL;DR

> **Quick Summary**: Perform a senior-QA rewrite of `docs/plans/2026-02-20-test-runtime-optimization.md` so it is evidence-driven, measurable, and safe against false speedups.
>
> **Deliverables**:
>
> - Updated implementation plan with CI baseline metrics from run `22217430068`
> - Explicit guardrails for artifact integrity, retry policy, and scope control
> - Additional optimization avenues for integration/release runtime not covered today
> - Agent-executable acceptance criteria and telemetry checks
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1 -> T3 -> T5 -> T10

---

## Context

### Original Request

User asked for a senior QA critical review of `docs/plans/2026-02-20-test-runtime-optimization.md`, with emphasis on decreasing integration and release test runtime, then updating the plan with feedback based on the real CI run.

### Interview and Research Summary

**Key findings from repository + CI evidence**:

- `_test.yml` currently gates coordinated/integration/E2E/release-E2E on `unit-tests`, reducing downstream parallel start.
- `_build.yml` already produces `frontend-dist` and `electron-dist`, and test jobs download them.
- `SKIP_BUILD` support exists in WDIO base configs, but CI jobs do not currently set it for E2E.
- `wdio.integration.conf.js` currently rebuilds in `onPrepare` and needs a `SKIP_BUILD` fast path.
- Referenced run `22217430068` confirms integration/release are longest suites; Windows variants are worst.

### Metis Review (addressed)

Metis emphasized adding explicit runtime targets, artifact integrity validation, anti-scope-creep guardrails, and telemetry-backed acceptance checks. This plan incorporates those controls.

---

## Work Objectives

### Core Objective

Upgrade the existing runtime optimization implementation plan so it is execution-ready, test-safe, and proves runtime improvement with hard data rather than assumptions.

### Concrete Deliverables

- Updated `docs/plans/2026-02-20-test-runtime-optimization.md` sections for baseline, phased changes, validation, and risk controls.
- New guardrails/anti-pattern guidance to avoid false speedups.
- New optimization avenues for integration/release bottlenecks with explicit rollout and rollback checks.

### Definition of Done

- [ ] Plan contains measured baseline values from run `22217430068`.
- [ ] Every optimization includes risk, verification, and fallback behavior.
- [ ] Additional integration/release optimization opportunities are documented with acceptance criteria.
- [ ] Validation checklist is fully agent-executable and evidence-based.

### Must Have

- No reduction in test coverage scope unless explicitly marked as optional policy choice.
- Explicit handling of stale/missing artifact risk when using `SKIP_BUILD`.
- Explicit runtime success targets and comparison method.
- Must use superpowers:executing-plans to implement this plan task-by-task.
- Must be using a git worktree to avoid modifying the main work area.

### Must NOT Have (Guardrails)

- No ambiguous claims like "should be faster" without metric criteria.
- No blanket retry increases that only mask flakes.
- No undocumented scope expansion beyond runtime-plan hardening.

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION**: Verification must be command/tool-driven.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests in this work item**: None (document update task)
- **Primary verification**: static plan validation + CI evidence extraction

### QA Policy

Each task includes executable QA scenarios to validate:

- expected plan sections were updated,
- references are correct,
- baseline/runtime metrics are machine-checkable,
- no regression in scope/coverage language.

Evidence path format:

- `.sisyphus/evidence/task-{N}-{scenario}.txt`
- `.sisyphus/evidence/task-{N}-{scenario}.json`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation and evidence, parallel):

- T1 Baseline metrics and bottleneck extraction
- T2 CI graph and artifact-flow reality section
- T3 Phase 1 hardening (SKIP_BUILD + integration build reuse + integrity checks)
- T4 Phase 2 hardening (dependency graph parallelism + guardrails)

Wave 2 (optimization expansion, parallel where non-overlapping sections):

- T5 Phase 3 weighted E2E sharding strategy
- T6 Phase 4 cache strategy hardening
- T7 Phase 5 retry/flake strategy hardening
- T8 New integration/release optimization avenues

Wave 3 (safety and completion):

- T9 QA guardrails + anti-patterns section
- T10 Validation checklist + rollout/rollback criteria

Critical Path: T1 -> T3 -> T5 -> T10

### Dependency Matrix

- **T1**: none -> T5, T10
- **T2**: none -> T4, T9
- **T3**: T1 -> T6, T8, T10
- **T4**: T2 -> T8, T10
- **T5**: T1 -> T10
- **T6**: T3 -> T10
- **T7**: none -> T10
- **T8**: T3, T4 -> T10
- **T9**: T2 -> T10
- **T10**: T1, T3, T4, T5, T6, T7, T8, T9 -> Final Verification

### Agent Dispatch Summary

- **Wave 1**: 4 agents
    - T1 `unspecified-high`
    - T2 `writing`
    - T3 `unspecified-high`
    - T4 `unspecified-high`
- **Wave 2**: 4 agents
    - T5 `unspecified-high`
    - T6 `unspecified-high`
    - T7 `deep`
    - T8 `deep`
- **Wave 3**: 2 agents
    - T9 `writing`
    - T10 `unspecified-high`
- **Final**: 4 review agents (F1-F4)

---

## TODOs

- [ ]   1. Populate baseline and bottleneck metrics from run `22217430068`

    **What to do**:
    - Extract durations for build, unit, coordinated (slowest OS), integration (slowest OS), E2E slowest group, and release E2E.
    - Add concrete values to the `Baseline Metrics` table in `docs/plans/2026-02-20-test-runtime-optimization.md`.
    - Add a short note identifying top per-step bottlenecks for integration/release jobs.

    **Must NOT do**:
    - Do not estimate durations manually.
    - Do not use a different CI run unless explicitly labeled as supplemental.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: requires accurate CI data extraction and transformation into plan content.
    - **Skills**: [`git-master`]
        - `git-master`: useful for controlled plan edits and evidence-backed changes.
    - **Skills Evaluated but Omitted**:
        - `writing-plans`: omitted because this task is primarily evidence extraction.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 1 (with T2, T3, T4)
    - **Blocks**: T5, T10
    - **Blocked By**: None

    **References**:
    - `.github/workflows/_test.yml:159` - Integration job definition for mapping duration rows correctly.
    - `.github/workflows/_test.yml:406` - Release E2E job definition tied to bottleneck focus.
    - `docs/plans/2026-02-20-test-runtime-optimization.md:238` - Existing baseline table to populate.

    **Acceptance Criteria**:
    - [ ] Baseline table in target plan has non-empty values for all listed rows.
    - [ ] Added note explicitly identifies the longest integration and release jobs in the referenced run.

    **QA Scenarios**:

    ```
    Scenario: Baseline table populated from run data
      Tool: Bash (gh)
      Preconditions: gh authenticated with repo read access
      Steps:
        1. Run: gh run view 22217430068 --repo bwendell/gemini-desktop --json jobs > .sisyphus/evidence/task-1-jobs.json
        2. Parse durations and compare with plan table entries.
        3. Assert each table row has a concrete duration value.
      Expected Result: All six baseline rows are populated and traceable to run data.
      Failure Indicators: Empty cells, missing rows, or non-matching values.
      Evidence: .sisyphus/evidence/task-1-baseline-validation.txt

    Scenario: Bottleneck note correctness
      Tool: Bash
      Preconditions: Plan updated
      Steps:
        1. Search target plan for "bottleneck" section text.
        2. Assert it mentions integration windows and release windows (or exact measured winners).
      Expected Result: Bottleneck note matches extracted run evidence.
      Evidence: .sisyphus/evidence/task-1-bottleneck-check.txt
    ```

    **Commit**: NO

- [ ]   2. Add CI graph and artifact-flow reality section

    **What to do**:
    - Add a short section describing current job graph (`build -> unit-tests -> downstream matrix jobs`).
    - Document current artifact production/consumption (`frontend-dist`, `electron-dist`) and where they are downloaded.
    - Include why this matters for runtime optimization and risk control.

    **Must NOT do**:
    - Do not propose speculative architecture not present in repo.
    - Do not duplicate large workflow blocks verbatim.

    **Recommended Agent Profile**:
    - **Category**: `writing`
        - Reason: concise technical synthesis task in markdown.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: keeps section concise and decision-oriented.
    - **Skills Evaluated but Omitted**:
        - `deep`: omitted; no deep algorithmic reasoning required.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 1 (with T1, T3, T4)
    - **Blocks**: T4, T9
    - **Blocked By**: None

    **References**:
    - `.github/workflows/_build.yml:58` - Source of `frontend-dist` artifact.
    - `.github/workflows/_build.yml:66` - Source of `electron-dist` artifact.
    - `.github/workflows/_test.yml:69` - First artifact download usage pattern.
    - `.github/workflows/_test.yml:107` - Unit-test gating dependency for downstream jobs.

    **Acceptance Criteria**:
    - [ ] Target plan includes one section mapping current graph and artifact flow.
    - [ ] Section includes at least four exact file references to workflow definitions.

    **QA Scenarios**:

    ```
    Scenario: Graph section presence
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search for section heading containing "graph" or "artifact flow".
        2. Assert lines include `build`, `unit-tests`, and at least one matrix job.
      Expected Result: Current graph and artifact flow are explicitly documented.
      Evidence: .sisyphus/evidence/task-2-graph-section.txt

    Scenario: Reference integrity
      Tool: Bash
      Preconditions: Section present
      Steps:
        1. Extract file references from section.
        2. Verify referenced files/lines exist.
      Expected Result: All references resolve and are relevant.
      Evidence: .sisyphus/evidence/task-2-reference-check.txt
    ```

    **Commit**: NO

- [ ]   3. Harden Phase 1 with safe build-skip and artifact-integrity controls

    **What to do**:
    - Update Phase 1 text to include `SKIP_BUILD` for E2E and integration explicitly.
    - Add integration-config requirement to honor `SKIP_BUILD` in `wdio.integration.conf.js`.
    - Add artifact integrity verification requirement (build SHA/hash marker) before using skipped builds.
    - Add fallback behavior when artifact missing/mismatch is detected.

    **Must NOT do**:
    - Do not describe build skipping without integrity validation.
    - Do not remove existing coverage guarantees.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: combines CI safety, runtime optimization, and QA risk controls.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: converts technical constraints into implementable steps.
    - **Skills Evaluated but Omitted**:
        - `test-driven-development`: omitted because this is plan-edit work, not feature code.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 1 (with T1, T2, T4)
    - **Blocks**: T6, T8, T10
    - **Blocked By**: T1 (for evidence references)

    **References**:
    - `config/wdio/wdio.base.conf.js:57` - Existing `onPrepare` skip pattern to mirror.
    - `config/wdio/wdio.integration.conf.js:64` - Integration config currently always rebuilds.
    - `.github/workflows/_test.yml:159` - Integration job where `SKIP_BUILD` behavior must be documented.
    - `docs/plans/2026-02-20-test-runtime-optimization.md:56` - Existing Phase 1 integration artifact task to harden.

    **Acceptance Criteria**:
    - [ ] Phase 1 explicitly requires `SKIP_BUILD` + integration parity.
    - [ ] Phase 1 includes integrity check and fallback branch for missing/mismatched artifacts.

    **QA Scenarios**:

    ```
    Scenario: Phase 1 contains safe-skip requirements
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search Phase 1 for `SKIP_BUILD` mentions.
        2. Assert text includes integration job/config and artifact integrity terms (`checksum`, `sha`, or equivalent).
      Expected Result: Build skipping is documented as safe and verifiable.
      Evidence: .sisyphus/evidence/task-3-safe-skip.txt

    Scenario: Fallback behavior defined
      Tool: Bash
      Preconditions: Phase 1 updated
      Steps:
        1. Locate fallback condition text for missing artifacts.
        2. Assert fallback path is explicit (rebuild or fail-fast with error).
      Expected Result: No ambiguous behavior when artifact reuse is unsafe.
      Evidence: .sisyphus/evidence/task-3-fallback-check.txt
    ```

    **Commit**: NO

- [ ]   4. Harden Phase 2 parallelization changes with dependency guardrails

    **What to do**:
    - Update Phase 2 to describe safe `needs` decoupling from `unit-tests` where artifact readiness is guaranteed.
    - Add guardrails so quality gating semantics remain explicit (what can run earlier vs what must block merge).
    - Add rollback trigger if decoupling increases flaky failure rate or artifact races.

    **Must NOT do**:
    - Do not imply removal of quality gate semantics.
    - Do not propose dependency changes without verification checks.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: CI graph safety and quality-gate behavior need precise wording.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: required for clear guardrail language.
    - **Skills Evaluated but Omitted**:
        - `git-master`: omitted because no git-history analysis needed.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 1 (with T1, T2, T3)
    - **Blocks**: T8, T10
    - **Blocked By**: T2

    **References**:
    - `.github/workflows/_test.yml:107` - Current `coordinated-tests` dependency.
    - `.github/workflows/_test.yml:161` - Current `integration-tests` dependency.
    - `.github/workflows/_test.yml:220` - Current E2E Windows dependency pattern.
    - `docs/plans/2026-02-20-test-runtime-optimization.md:108` - Existing dependency-removal phase to harden.

    **Acceptance Criteria**:
    - [ ] Phase 2 includes explicit preconditions for safe dependency changes.
    - [ ] Phase 2 includes observable rollback criteria.

    **QA Scenarios**:

    ```
    Scenario: Dependency guardrails present
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search Phase 2 for terms `precondition`, `artifact`, and `rollback`.
        2. Assert each appears in actionable checklist form.
      Expected Result: Phase 2 is not a blind dependency removal instruction.
      Evidence: .sisyphus/evidence/task-4-guardrails.txt

    Scenario: Quality gate semantics preserved
      Tool: Bash
      Preconditions: Phase 2 updated
      Steps:
        1. Locate language defining what still blocks merge/release.
        2. Assert no wording suggests reduced coverage or skipped suites.
      Expected Result: Parallelization does not weaken quality policy.
      Evidence: .sisyphus/evidence/task-4-quality-gate.txt
    ```

    **Commit**: NO

- [ ]   5. Redesign Phase 3 sharding using measured bottleneck weighting

    **What to do**:
    - Update E2E split guidance so heavy Windows groups (`update`, `stability`, `auth`, `window`) are balanced by historical duration.
    - Keep total coverage unchanged and document deterministic group membership.
    - Add acceptance rule on longest-group duration target after split.

    **Must NOT do**:
    - Do not split groups randomly without timing evidence.
    - Do not remove slow specs from matrix.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: requires metric-driven sharding policy and risk-aware doc updates.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: structures split strategy and acceptance gates.
    - **Skills Evaluated but Omitted**:
        - `artistry`: omitted; no unconventional design needed.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 2 (with T6, T7, T8)
    - **Blocks**: T10
    - **Blocked By**: T1

    **References**:
    - `docs/plans/2026-02-20-test-runtime-optimization.md:124` - Existing sharding phase to revise.
    - `config/wdio/wdio.group.update.conf.js:5` - Current heavy update grouping.
    - `config/wdio/wdio.group.window.conf.js:5` - Current heavy window grouping.
    - `.github/workflows/_test.yml:229` - Current matrix group names across OS.

    **Acceptance Criteria**:
    - [ ] Phase 3 includes weighted balancing rationale tied to run evidence.
    - [ ] Group split instructions preserve all existing specs.

    **QA Scenarios**:

    ```
    Scenario: Weighted sharding guidance present
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search Phase 3 for explicit mention of using historical durations.
        2. Assert Windows heavy groups are named and split guidance is deterministic.
      Expected Result: Split strategy is evidence-driven and reproducible.
      Evidence: .sisyphus/evidence/task-5-weighted-sharding.txt

    Scenario: Coverage preserved
      Tool: Bash
      Preconditions: Phase 3 updated
      Steps:
        1. Compare original vs revised listed groups/spec intent.
        2. Assert revised text states no spec removals.
      Expected Result: Same test scope, better balancing.
      Evidence: .sisyphus/evidence/task-5-coverage-preserved.txt
    ```

    **Commit**: NO

- [ ]   6. Expand Phase 4 caching with correct boundaries and observability

    **What to do**:
    - Extend cache guidance to include Electron/electron-builder + npm cache boundaries.
    - Add explicit "do not cache node_modules" rule.
    - Require composite cache keys and cache-hit reporting in logs.

    **Must NOT do**:
    - Do not add cache strategies that risk cross-OS contamination.
    - Do not describe caching without invalidation/key strategy.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: caching policy needs precision and CI-specific caveats.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: encode clear cache rules and validation.
    - **Skills Evaluated but Omitted**:
        - `backend-dev-guidelines`: omitted; this is workflow-level, not service architecture.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 2 (with T5, T7, T8)
    - **Blocks**: T10
    - **Blocked By**: T3

    **References**:
    - `docs/plans/2026-02-20-test-runtime-optimization.md:192` - Existing cache phase to strengthen.
    - `.github/workflows/_build.yml:41` - Current setup-node caching baseline.
    - `.github/workflows/_test.yml:177` - Test-job setup-node cache baseline.
    - `package.json:96` - Electron/electron-builder versions tied to cache key strategy.

    **Acceptance Criteria**:
    - [ ] Phase 4 explicitly defines cache paths, key strategy, and anti-pattern exclusions.
    - [ ] Phase 4 requires reporting cache hit/miss outcomes for verification.

    **QA Scenarios**:

    ```
    Scenario: Cache boundary policy completeness
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search Phase 4 for `electron`, `electron-builder`, `npm`, and `node_modules` policy text.
        2. Assert `node_modules` caching is explicitly disallowed.
      Expected Result: Cache strategy is safe and explicit.
      Evidence: .sisyphus/evidence/task-6-cache-boundaries.txt

    Scenario: Cache observability requirement
      Tool: Bash
      Preconditions: Phase 4 updated
      Steps:
        1. Search for required cache hit/miss logging language.
        2. Assert telemetry/checkpoint instruction exists.
      Expected Result: Cache performance is measurable, not assumed.
      Evidence: .sisyphus/evidence/task-6-cache-telemetry.txt
    ```

    **Commit**: NO

- [ ]   7. Rework retry strategy for runtime reduction without flake masking

    **What to do**:
    - Update Phase 5 to recommend `specFileRetriesDeferred` and branch-sensitive retry values.
    - Add a flake-observability rule: retries may pass jobs, but flake counts must be reported.
    - Add rollback criteria if lowered retries materially hurt signal quality.

    **Must NOT do**:
    - Do not frame retries as the primary runtime optimization.
    - Do not hide flaky behavior behind retries without telemetry.

    **Recommended Agent Profile**:
    - **Category**: `deep`
        - Reason: balancing runtime and reliability requires nuanced policy language.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: ensures the policy is actionable and testable.
    - **Skills Evaluated but Omitted**:
        - `test-fixing`: omitted; this is policy and planning, not fixing specific failures.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 2 (with T5, T6, T8)
    - **Blocks**: T10
    - **Blocked By**: None

    **References**:
    - `config/wdio/wdio.base.conf.js:52` - Current spec retry baseline.
    - `config/wdio/wdio.base.conf.js:54` - Current deferred retry setting (`false`).
    - `config/wdio/wdio.integration.conf.js:56` - Integration retry baseline.
    - `docs/plans/2026-02-20-test-runtime-optimization.md:219` - Existing retry phase to rewrite.

    **Acceptance Criteria**:
    - [ ] Phase 5 distinguishes runtime optimization from quality-risk management.
    - [ ] Phase 5 includes required flake telemetry and rollback triggers.

    **QA Scenarios**:

    ```
    Scenario: Retry policy includes deferred mode and branch-specific values
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search revised Phase 5 for `specFileRetriesDeferred` and branch conditions.
        2. Assert both PR and main/default branch behavior are documented.
      Expected Result: Retry policy is explicit and environment-aware.
      Evidence: .sisyphus/evidence/task-7-retry-policy.txt

    Scenario: Flake reporting requirement exists
      Tool: Bash
      Preconditions: Phase 5 updated
      Steps:
        1. Search for `flake`, `retry count`, and `telemetry` terms.
        2. Assert at least one acceptance criterion requires publishing flake data.
      Expected Result: Retries cannot silently mask instability.
      Evidence: .sisyphus/evidence/task-7-flake-observability.txt
    ```

    **Commit**: NO

- [ ]   8. Add missing optimization avenues for integration and release bottlenecks

    **What to do**:
    - Add a new phase or subsection for additional avenues not in current plan, focused on integration/release:
        - optional packaged-test tiering policy (PR smoke vs main full),
        - per-spec duration telemetry for weighted balancing,
        - optional changed-files/path-filter gate as policy-level toggle.
    - Mark each avenue as required vs optional and list risk/benefit.

    **Must NOT do**:
    - Do not silently reduce coverage by default.
    - Do not introduce optional avenues without explicit opt-in language.

    **Recommended Agent Profile**:
    - **Category**: `deep`
        - Reason: requires trade-off analysis and risk disclosure.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: supports clear distinction between mandatory and optional items.
    - **Skills Evaluated but Omitted**:
        - `product-manager-toolkit`: omitted; this is engineering execution policy, not product prioritization.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 2 (with T5, T6, T7)
    - **Blocks**: T10
    - **Blocked By**: T3, T4

    **References**:
    - `docs/plans/2026-02-20-test-runtime-optimization.md:13` - Current phase structure baseline.
    - `.github/workflows/test.yml:38` - Existing concurrency policy context.
    - `.github/workflows/_test.yml:406` - Release E2E job context for tiering options.
    - `config/wdio/wdio.release.conf.js:72` - Release-spec scope context.

    **Acceptance Criteria**:
    - [ ] New avenues section exists and labels each item as mandatory or optional.
    - [ ] Optional items include explicit risk/benefit and opt-in trigger.

    **QA Scenarios**:

    ```
    Scenario: New avenues section is explicit and scoped
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Locate new section in target plan.
        2. Assert each avenue has `Required` or `Optional` label with rationale.
      Expected Result: Additional avenues are actionable without scope ambiguity.
      Evidence: .sisyphus/evidence/task-8-avenues-scope.txt

    Scenario: No implicit coverage reduction
      Tool: Bash
      Preconditions: New section added
      Steps:
        1. Search for terms indicating skipped suites on PR by default.
        2. Assert any such behavior is explicitly optional and gated.
      Expected Result: Coverage policy remains explicit and conservative by default.
      Evidence: .sisyphus/evidence/task-8-coverage-guard.txt
    ```

    **Commit**: NO

- [ ]   9. Add explicit QA guardrails and anti-patterns section

    **What to do**:
    - Add a section listing hard guardrails to avoid false speedups:
        - stale artifact usage,
        - retry masking,
        - accidental suite omission,
        - cache poisoning/cross-OS misuse.
    - Add anti-pattern examples and direct remediation guidance.

    **Must NOT do**:
    - Do not keep guardrails implicit or scattered.
    - Do not use vague anti-pattern phrasing without concrete examples.

    **Recommended Agent Profile**:
    - **Category**: `writing`
        - Reason: policy-language quality and clarity are central.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: structured guardrail writing.
    - **Skills Evaluated but Omitted**:
        - `internal-comms`: omitted; audience is implementation executor, not broad org update.

    **Parallelization**:
    - **Can Run In Parallel**: YES
    - **Parallel Group**: Wave 3 (with T10)
    - **Blocks**: T10
    - **Blocked By**: T2

    **References**:
    - `docs/plans/2026-02-20-test-runtime-optimization.md:251` - Existing validation section to extend.
    - `.github/workflows/_test.yml:220` - E2E dependency context relevant to accidental omission risk.
    - `config/wdio/wdio.base.conf.js:52` - Retry behavior anchor for masking risk.

    **Acceptance Criteria**:
    - [ ] Target plan has a dedicated guardrails/anti-patterns section.
    - [ ] Section includes at least four concrete anti-patterns with mitigation.

    **QA Scenarios**:

    ```
    Scenario: Guardrails section completeness
      Tool: Bash
      Preconditions: Target plan updated
      Steps:
        1. Search for heading containing `Guardrails`.
        2. Count listed guardrails and anti-patterns.
      Expected Result: At least four concrete anti-patterns with mitigation language.
      Evidence: .sisyphus/evidence/task-9-guardrails.txt

    Scenario: Risks map to real workflow/config behavior
      Tool: Bash
      Preconditions: Guardrails section present
      Steps:
        1. Validate each anti-pattern references a real failure mode tied to workflow/config.
        2. Assert no fabricated risk examples are included.
      Expected Result: Guardrails are grounded in repository reality.
      Evidence: .sisyphus/evidence/task-9-grounding.txt
    ```

    **Commit**: NO

- [ ]   10. Finalize measurable success criteria, telemetry, and rollout/rollback protocol

    **What to do**:
    - Replace generic validation checklist with measurable criteria:
        - runtime deltas vs baseline,
        - flake/retry rates,
        - cache hit rates,
        - artifact integrity pass rate.
    - Add explicit rollout sequence and rollback triggers for each high-risk change.
    - Ensure checklist is fully agent-executable with concrete commands and expected outputs.

    **Must NOT do**:
    - Do not leave non-verifiable checklist items.
    - Do not omit rollback criteria for dependency or retry changes.

    **Recommended Agent Profile**:
    - **Category**: `unspecified-high`
        - Reason: requires combining QA metrics, CI behavior, and execution safety.
    - **Skills**: [`writing-plans`]
        - `writing-plans`: keeps acceptance and rollout language testable.
    - **Skills Evaluated but Omitted**:
        - `verification-before-completion`: omitted as a runtime skill; this task writes the verification protocol itself.

    **Parallelization**:
    - **Can Run In Parallel**: NO
    - **Parallel Group**: Sequential (Wave 3 close-out)
    - **Blocks**: Final Verification Wave
    - **Blocked By**: T1, T3, T4, T5, T6, T7, T8, T9

    **References**:
    - `docs/plans/2026-02-20-test-runtime-optimization.md:251` - Checklist location to rewrite.
    - `.github/workflows/test.yml:38` - Concurrency baseline to consider in rollout validation.
    - `.github/workflows/_test.yml:159` - Integration target job for runtime criteria.
    - `.github/workflows/_test.yml:406` - Release E2E target job for runtime criteria.

    **Acceptance Criteria**:
    - [ ] Validation checklist has only objective, command-verifiable items.
    - [ ] Rollout/rollback protocol exists and includes trigger thresholds.
    - [ ] Success metrics include both runtime and quality (flake/signal) measures.

    **QA Scenarios**:

    ```
    Scenario: Checklist executability
      Tool: Bash
      Preconditions: Target plan finalized
      Steps:
        1. Extract every checklist item under validation/success sections.
        2. Assert each item maps to a concrete command/assertion pair.
      Expected Result: No manual-only verification items remain.
      Evidence: .sisyphus/evidence/task-10-checklist-executable.txt

    Scenario: Rollback protocol sanity check
      Tool: Bash
      Preconditions: Rollout/rollback section added
      Steps:
        1. Search for thresholds and rollback triggers (flake increase, artifact mismatch, runtime regression).
        2. Assert each trigger maps to a specific rollback action.
      Expected Result: High-risk changes have explicit reversal paths.
      Evidence: .sisyphus/evidence/task-10-rollback-sanity.txt
    ```

    **Commit**: YES
    - Message: `docs(plan): harden test runtime optimization with QA controls`
    - Files: `docs/plans/2026-02-20-test-runtime-optimization.md`
    - Pre-commit: `npm run lint`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** (`oracle`)
      Validate updated plan content against requested QA objectives, guardrails, and baseline evidence requirements.

- [ ] F2. **Code/Doc Quality Review** (`unspecified-high`)
      Validate clarity, consistency, absence of contradictory instructions, and executable acceptance criteria.

- [ ] F3. **Execution Simulation QA** (`unspecified-high`)
      Simulate execution of validation commands and verify they are runnable and deterministic.

- [ ] F4. **Scope Fidelity Check** (`deep`)
      Verify no unrequested scope expansion and no test-coverage reduction hidden in wording.

---

## Commit Strategy

- Single documentation commit for plan hardening changes:
    - `docs(plan): harden runtime optimization plan with QA guardrails and measurable criteria`

---

## Success Criteria

### Verification Commands

```bash
# Confirm baseline metrics table contains target rows
grep -n "Baseline Metrics" docs/plans/2026-02-20-test-runtime-optimization.md

# Confirm SKIP_BUILD guidance present for E2E and integration
grep -n "SKIP_BUILD" docs/plans/2026-02-20-test-runtime-optimization.md

# Confirm guardrails/anti-patterns section exists
grep -n "Guardrails\|Anti-pattern" docs/plans/2026-02-20-test-runtime-optimization.md
```

### Final Checklist

- [ ] Baseline captured from referenced CI run and embedded.
- [ ] Integration/release bottlenecks addressed with concrete, testable actions.
- [ ] Guardrails prevent false speedups (stale artifacts, retry masking, accidental coverage loss).
- [ ] Added avenues are risk-scored with clear verification and rollback criteria.
