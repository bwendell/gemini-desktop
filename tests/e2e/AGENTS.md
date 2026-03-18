> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

E2E tests run with WebdriverIO against a real Electron app instance.
This directory contains feature specs, page objects, and helpers for deterministic end-to-end flows.

Primary structure:

- `tests/e2e/*.spec.ts` — E2E specs
- `tests/e2e/pages/` — page object layer
- `tests/e2e/helpers/` — workflows, assertions, waits
- `tests/e2e/release/`, `tests/e2e/screenshots/`

## Deterministic Wait Pattern (CRITICAL)

Never use `browser.pause()` directly in specs for state synchronization.
Use wait helpers from the canonical shared library `tests/shared/wait-utilities.ts`.
`tests/e2e/helpers/waitUtilities.ts` is kept only as a compatibility re-export for existing imports.
Use these shared helpers especially:

- `waitForUIState()`
- `waitForIPCRoundTrip()`
- `waitForAnimationSettle()`
- `waitForWindowCount()`

For migration rationale and patterns, see `docs/E2E_WAIT_PATTERNS.md`.

## Test Structure Pattern

Use page objects from `tests/e2e/pages/`.
Use `beforeEach` with `waitForAppReady()` and `afterEach` with `ensureSingleWindow()` to preserve isolation.
Group specs by feature behavior, not by helper implementation detail.

For hotkey customization flows, keep E2E focused on the user-visible recorder UX, rendered accelerator text, and high-level registration state. Leave native Windows system-menu suppression to unit/integration coverage unless the host environment is a stable Windows automation target.

## Canonical Examples

- `tests/e2e/theme.spec.ts`
    - Shows page objects, deterministic wait helpers, and multi-window assertions.
- `tests/shared/wait-utilities.ts`
    - Canonical shared wait-library implementation used by E2E and integration suites.

## Running E2E Tests

- If you are working in a newly created git worktree, run `npm install` in that worktree first so WebdriverIO, Electron, and related binaries exist locally.
- Full suite: `npm run test:e2e`
- Single spec: `npm run test:e2e:spec -- --spec=tests/e2e/<file>`
- Grouped suites: `npm run test:e2e:group:<name>`
- Windows installer validation specs run only on Windows hosts through `npm run test:e2e:release:installer`.
- For branch-safe release-path verification, trigger `gh workflow run manual-release.yml --ref "$(git branch --show-current)" -f publish=false` so `_release.yml` runs the x64 and `windows-11-arm` installer validation jobs without publishing release assets.

## Common Mistakes

- Using `browser.pause()` instead of deterministic waits
- Missing `ensureSingleWindow()` in `afterEach`
- Hardcoding ad-hoc timeouts instead of wait utility constants/options
- Duplicating WDIO config instead of extending `wdio.base.conf.js`
