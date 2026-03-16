> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Integration tests run with WebdriverIO against a real Electron app instance to verify cross-boundary behavior without the broader user-flow scope of full E2E coverage.
Use this directory when you need to prove main/preload/renderer contracts, window state transitions, or platform behavior together.

Primary files and folders:

- `tests/integration/*.integration.test.ts` — integration specs
- `tests/integration/helpers/integrationUtils.ts` — app boot, IPC listener, and window-handle helpers
- `tests/integration/helpers/windowHelpers.ts` — main-window and Quick Chat visibility helpers
- `tests/integration/tsconfig.json` — integration TypeScript scope

## When to Use Integration Tests

Choose integration tests over unit tests when behavior crosses process or window boundaries, but you do not need the full end-user workflow depth of `tests/e2e/`.
Choose coordinated tests when mocked Electron/Vitest coverage is enough; choose E2E when you must validate the real user-facing workflow from UI action through outcome.

## Canonical Patterns

- Reuse helpers from `tests/integration/helpers/` before adding spec-local setup code.
- Prefer deterministic waits (`browser.waitUntil`, app-state polling, shared wait utilities) over fixed pauses.
- Treat Electron app startup as expensive: keep setup focused, reuse handles, and avoid reopening windows unnecessarily.
- Route shared wait/timing changes to `tests/shared/index.ts` and `tests/shared/wait-utilities.ts` instead of inventing integration-only copies.

## Canonical Examples

- `tests/integration/peek-and-hide.integration.test.ts`
    - Representative real-app integration coverage across window visibility, hotkeys, and IPC.
- `tests/integration/helpers/integrationUtils.ts`
    - Canonical helper layer for app boot, IPC listeners, and cross-window setup.

## Common Mistakes

- Treating these as unit tests and over-mocking internal boundaries
- Using fixed delays instead of deterministic waits
- Recreating helpers inside a spec instead of reusing `tests/integration/helpers/`
- Paying the app setup cost repeatedly when a helper or shared setup can do the work once

## Running Integration Tests

- If you are working in a newly created git worktree, run `npm install` in that worktree first so WebdriverIO and Electron exist locally.
- Full suite: `npm run test:integration`
- Single spec: `npm run test:integration -- --spec=tests/integration/<file>.integration.test.ts`
- Type scope check: `npx tsc --noEmit -p tests/integration/tsconfig.json`

## Minimum Verification

- Run the single affected integration spec whenever you change files in this directory.
- If you changed shared helpers used by multiple specs, run the relevant focused specs plus `npm run lint`.
