> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

`tests/shared/` is the canonical shared test-infrastructure layer for WDIO-based suites.
It provides reusable wait utilities, timing constants, logging, and type shims consumed by both `tests/e2e/` and `tests/integration/`.

Primary files:

- `tests/shared/index.ts` — barrel export and first routing entrypoint
- `tests/shared/wait-utilities.ts` — canonical deterministic wait implementations
- `tests/shared/timing-constants.ts` — shared timing configuration re-exported by E2E helpers
- `tests/shared/test-logger.ts` — shared test logging utilities
- `tests/shared/wdio-types.d.ts` — shared WDIO type support

## Canonical Patterns

- Maintain implementations here, not in compatibility shims under `tests/e2e/helpers/`.
- Keep `tests/shared/index.ts` synchronized with any exported utility or type changes.
- Preserve cross-suite compatibility when changing shared waits or timing constants, because E2E helpers re-export these symbols.
- Route suite-specific setup to `tests/e2e/` or `tests/integration/`; keep this directory reusable across both.

## Canonical Examples

- `tests/shared/wait-utilities.ts`
    - Source of truth for shared deterministic waits.
- `tests/shared/index.ts`
    - Canonical routing point when you need to discover what shared infrastructure exists.

## Common Mistakes

- Editing `tests/e2e/helpers/waitUtilities.ts` instead of the shared implementation here
- Adding a new shared helper without exporting it from `tests/shared/index.ts`
- Baking E2E-only assumptions into utilities that integration tests also consume
- Changing timing contracts without validating both importing surfaces

## Running Verification

- If you are working in a newly created git worktree, run `npm install` in that worktree first so the local toolchain exists.
- Run `npm run lint`
- Run the most relevant integration spec: `npm run test:integration -- --spec=tests/integration/<file>.integration.test.ts`
- Run the most relevant E2E spec when shared WDIO behavior changes: `npm run test:e2e:spec -- --spec=tests/e2e/<file>.spec.ts`
