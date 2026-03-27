> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Coordinated tests use Vitest with mocked Electron boundaries to verify multi-window, IPC, and cross-module contracts faster than WDIO-based integration or E2E coverage.
They are the preferred layer when you need strong cross-boundary confidence without launching the full browser-driven app.

Primary files and folders:

- `tests/coordinated/**/*.coordinated.test.ts{,x}` — coordinated specs
- `tests/coordinated/ipc/` — IPC-handler coordination coverage
- `tests/helpers/setup/coordinated.ts` — coordinated setup harness
- `config/vitest/vitest.coordinated.config.ts` — coordinated Vitest config

## When to Prefer Coordinated Tests

Prefer this directory over full WDIO coverage when validating:

- multi-window or manager-to-manager coordination
- IPC round trips with mocked Electron primitives
- renderer/main contract behavior that does not require a real browser session
- regressions that are expensive or flaky in E2E but deterministic in Vitest

Move to `tests/integration/` or `tests/e2e/` only when you need the real Electron runtime or full user workflow.

## Canonical Examples

- `tests/coordinated/hotkey-coordination.coordinated.test.ts`
    - Representative multi-window and settings-store coordination coverage.
- `tests/coordinated/ipc-roundtrip.coordinated.test.ts`
    - Canonical IPC round-trip and cross-module contract verification.
- `tests/helpers/setup/coordinated.ts`
    - Shared setup conventions for the coordinated harness.

## Common Mistakes

- Using coordinated tests when a simpler unit test would cover isolated logic
- Escalating immediately to WDIO when mocked Electron coordination is sufficient
- Repeating setup that already belongs in `tests/helpers/setup/coordinated.ts`
- Mixing coordinated-test ownership into `tests/unit/AGENTS.md` instead of treating this directory as the source of truth
- Hardcoding hotkey accelerator strings (e.g. `'CommandOrControl+Shift+Alt+Space'`) — always use `getDefaultAccelerators(process.platform).quickChat` from `src/shared/types/hotkeys` so platform-specific defaults (e.g. `'Alt+Space'` on Windows) are picked up automatically

## Running Coordinated Tests

- If you are working in a newly created git worktree, run `npm install` in that worktree first so Vitest and Electron mocks are available locally.
- Full suite: `npm run test:coordinated`
- Single spec: `npm run test:coordinated -- tests/coordinated/<file>.coordinated.test.ts`

## Minimum Verification

- Default verification: `npm run test:coordinated`
- If you changed only one coordinated spec, run that focused command first and then decide whether broader coordinated coverage is needed.
