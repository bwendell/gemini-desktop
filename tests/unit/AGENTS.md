> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Unit tests run on Vitest across renderer and Electron-focused modules.

Coverage areas in this directory:

- `tests/unit/main/` — main process behavior
- `tests/unit/renderer/` — renderer behavior
- `tests/unit/preload/` — preload bridge behavior
- `tests/unit/shared/` — shared utilities/types
- `tests/unit/e2e/` — unit tests for E2E helpers

Environment split:

- Renderer-oriented tests use jsdom
- Main/preload/shared tests run under electron-focused node environment (`npm run test:electron`)

## Mock Pattern

Use `vi.hoisted()` for mock declarations that must exist before imports.
Mock Electron APIs via `vi.mock('electron', ...)`.
Prefer shared mock factories and harness helpers from `tests/helpers/`.
For the canonical mock catalog, read `tests/helpers/README.md`.

## Test Structure Pattern

Mirror class/module boundaries with `describe` blocks.
Use `beforeEach` for `vi.clearAllMocks()` and mock reset helpers.
Cover setup/registration, happy path, error handling, and edge cases.

## Canonical Example

- `tests/unit/main/ipc/ThemeIpcHandler.test.ts` — `describe('ThemeIpcHandler', ...)`
    - Shows `vi.hoisted()` Electron mocking, shared factories, registration assertions, captured handler invocation, broadcast checks, and validation/error paths.
    - Pairs with `src/main/managers/ipc/ThemeIpcHandler.ts`.

## Also Covers: Coordinated Tests

`tests/coordinated/` exercises cross-boundary coordination behavior (for example, multi-window synchronization).
Run with `npm run test:coordinated`.

## Running Unit and Related Tests

- If you are working in a newly created git worktree, run `npm install` in that worktree first so Vitest, Electron, and related binaries exist locally.
- Renderer unit tests: `npm run test`
- Electron-focused unit tests: `npm run test:electron`
- All unit tests (renderer + electron): `npm run test && npm run test:electron`
- Single renderer test: `npm run test -- tests/unit/renderer/<path>`
- Single main/preload/shared test: `npm run test:electron -- tests/unit/<path>`
- Watch mode: `npm run test:watch`
- Coordinated tests: `npm run test:coordinated`

## Common Mistakes

- Forgetting `vi.clearAllMocks()` in `beforeEach`
- Defining module-level mocks without `vi.hoisted()` when import timing matters
- Recreating ad-hoc mocks instead of using shared factories in `tests/helpers/`
- Testing only happy paths and missing failure scenarios
