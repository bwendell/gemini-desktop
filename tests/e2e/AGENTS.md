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
Use wait helpers from `tests/e2e/helpers/waitUtilities.ts`, especially:

- `waitForUIState()`
- `waitForIPCRoundTrip()`
- `waitForAnimationSettle()`
- `waitForWindowCount()`

For migration rationale and patterns, see `docs/E2E_WAIT_PATTERNS.md`.

## Test Structure Pattern

Use page objects from `tests/e2e/pages/`.
Use `beforeEach` with `waitForAppReady()` and `afterEach` with `ensureSingleWindow()` to preserve isolation.
Group specs by feature behavior, not by helper implementation detail.

## Canonical Examples

- `tests/e2e/theme.spec.ts`
    - Shows page objects, deterministic wait helpers, and multi-window assertions.
- `tests/e2e/helpers/waitUtilities.ts`
    - Central library for replacing non-deterministic timing waits.

## Running E2E Tests

- If you are working in a newly created git worktree, run `npm install` in that worktree first so WebdriverIO, Electron, and related binaries exist locally.
- Full suite: `npm run test:e2e`
- Single spec: `npm run test:e2e:spec -- --spec=tests/e2e/<file>`
- Grouped suites: `npm run test:e2e:group:<name>`

## Common Mistakes

- Using `browser.pause()` instead of deterministic waits
- Missing `ensureSingleWindow()` in `afterEach`
- Hardcoding ad-hoc timeouts instead of wait utility constants/options
- Duplicating WDIO config instead of extending `wdio.base.conf.js`
