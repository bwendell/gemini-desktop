# Draft: Test Runtime Optimization QA Review

## Requirements (confirmed)

- User wants a senior-QA critical review of `docs/plans/2026-02-20-test-runtime-optimization.md`.
- User wants best-practice checks plus additional avenues to reduce CI execution time, with focus on release and integration tests.
- User provided a reference CI run: `https://github.com/bwendell/gemini-desktop/actions/runs/22217430068`.
- User expects the implementation plan to be updated with review feedback.

## Technical Decisions

- Review will be evidence-driven using current repository workflows/config plus CI run data.
- Analysis will cover correctness, risk, and impact of each existing phase in the plan.
- Recommendations will keep functional coverage intact, with optional branch/path gating called out separately and explicitly.
- Plan updates will include QA guardrails to prevent false speedups (stale artifacts, retry masking, accidental test omission).

## Research Findings

- Current CI graph (from `.github/workflows/test.yml` + `.github/workflows/_test.yml`): `build -> unit-tests -> {coordinated, integration, e2e-matrix, release-e2e}`; non-unit jobs are gated on unit tests.
- Artifacts currently produced in `.github/workflows/_build.yml`: `frontend-dist`, `electron-dist`; consumed by all test jobs in `.github/workflows/_test.yml`.
- WDIO base configs support `SKIP_BUILD` (`config/wdio/wdio.base.conf.js`, `config/wdio/wdio.conf.js`), but CI jobs do not set it in `_test.yml`, so redundant rebuild risk remains.
- `config/wdio/wdio.integration.conf.js` currently always rebuilds in `onPrepare` (`vite build --mode integration && npm run build:electron`) and lacks `SKIP_BUILD` fast-path.
- Referenced run metrics (`run 22217430068`) show longest jobs are integration Windows (~19m) and release E2E Windows (~15m); integration and release suites are confirmed bottlenecks.
- Step-level timing from run API indicates dominant time in test execution steps: integration Windows `Run Real Integration Tests` ~1009s, release Windows `Run Release E2E Tests` ~611s, plus packaging overhead in release jobs.
- Retry settings across WDIO configs default to relatively high values (`WDIO_SPEC_FILE_RETRIES` 2 + mocha retries 2 + `specFileRetriesDeferred: false`), which can increase wall-clock on flaky specs.
- Linux setup (`apt-get update/install`) is repeated in multiple jobs and contributes fixed overhead.
- GitHub Actions best-practice synthesis (librarian): prefer build-artifact reuse for compiled outputs, cache package manager stores (not `node_modules`), use path filters/concurrency cancellation, and use dynamic/weighted sharding for matrix-heavy suites.
- Oracle QA review recommendations: enforce artifact integrity checks (SHA/build-id), add per-spec runtime/flake telemetry, avoid blanket retries, and preserve a periodic clean-cache baseline run to detect hidden cache coupling.
- Run 22217430068 timing evidence: top E2E bottlenecks are Windows groups `update`/`stability`/`auth`; integration Windows is dominant overall test bottleneck.
- WDIO/Electron best-practice research indicates strongest practical levers are: (1) CI sharding and weighted balancing, (2) `specFileRetriesDeferred` with constrained retries, (3) cached Electron/electron-builder directories, and (4) explicit flake containment telemetry.
- Step-level bottleneck decomposition from run API confirms many long Windows E2E jobs spend significant time in both dependency install and WDIO run step; optimization should target both setup and execution phases.

## Open Questions

- Whether to include advanced optimizations in plan now (e.g., changed-files test selection, dynamic matrix balancing) vs keeping strict full-matrix coverage on every PR.
- Whether release quality gate should keep separate `release-e2e-tests` in `_test.yml` once release workflow already runs packaging + release E2E.
- Whether to tier packaged-build coverage (smoke on PR, full packaged suite on main/nightly) as an optional speed optimization with explicit risk/benefit trade-off.

## Scope Boundaries

- INCLUDE: QA review, runtime optimization opportunities, plan updates.
- EXCLUDE: direct code/test implementation outside planning artifact updates.
