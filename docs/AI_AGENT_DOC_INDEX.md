# AI Agent Documentation Index

Use this file when you know the task but do not yet know which repository doc to read next.
Start with [root AGENTS.md](../AGENTS.md), then use the routing table below to load only the docs that match the task.

## Start Here

- **Repository rules, commands, and verification matrix** → [AGENTS.md](../AGENTS.md)
- **Cross-boundary architecture and source-of-truth files** → [docs/ARCHITECTURE.md](./ARCHITECTURE.md)
- **Need help choosing a verification command?** → the **Verification Matrix** in [AGENTS.md](../AGENTS.md)

## If You Need To Do X, Read Y Next

| If you are changing...                                                                       | Read next                                                                                                                                                                     | Why                                                                   |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/shared/types/ipc.ts`, `src/shared/constants/ipc-channels.ts`, or other shared contracts | [src/shared/AGENTS.md](../src/shared/AGENTS.md) → [docs/ARCHITECTURE.md](./ARCHITECTURE.md)                                                                                   | Shared contracts must stay aligned across main, preload, and renderer |
| Main-process managers or IPC handlers                                                        | [src/main/AGENTS.md](../src/main/AGENTS.md)                                                                                                                                   | Canonical manager and handler patterns live there                     |
| Preload bridge APIs                                                                          | [src/preload/AGENTS.md](../src/preload/AGENTS.md)                                                                                                                             | Security boundary and `window.electronAPI` rules                      |
| Renderer contexts, hooks, or window UI                                                       | [src/renderer/AGENTS.md](../src/renderer/AGENTS.md)                                                                                                                           | Renderer-only patterns and cleanup rules                              |
| A `tests/integration/*.integration.test.ts` failure                                          | [tests/integration/AGENTS.md](../tests/integration/AGENTS.md)                                                                                                                 | Integration-suite role, helper layer, and single-spec command         |
| Coordinated multi-window or IPC coverage                                                     | [tests/coordinated/AGENTS.md](../tests/coordinated/AGENTS.md)                                                                                                                 | Coordinated tests own cross-boundary Vitest coverage                  |
| Shared wait utilities, timing constants, or WDIO shared infra                                | [tests/shared/AGENTS.md](../tests/shared/AGENTS.md) → [tests/shared/index.ts](../tests/shared/index.ts) → [tests/shared/wait-utilities.ts](../tests/shared/wait-utilities.ts) | `tests/shared/` is the canonical shared test infrastructure surface   |
| E2E specs or deterministic wait usage in `tests/e2e/`                                        | [tests/e2e/AGENTS.md](../tests/e2e/AGENTS.md) → [docs/E2E_TESTING_GUIDELINES.md](./E2E_TESTING_GUIDELINES.md) → [docs/E2E_WAIT_PATTERNS.md](./E2E_WAIT_PATTERNS.md)           | E2E behavior and wait strategy are documented separately              |
| Shared mock factories or test harness helpers                                                | [tests/unit/AGENTS.md](../tests/unit/AGENTS.md) → [tests/helpers/README.md](../tests/helpers/README.md)                                                                       | Mock-factory catalog and harness patterns live there                  |
| Browser-only styling validation                                                              | [docs/BROWSER_UI_VALIDATION.md](./BROWSER_UI_VALIDATION.md)                                                                                                                   | Explains what browser-mode validation can and cannot prove            |
| ARM Linux or headless Linux test execution                                                   | [docs/ARM_LINUX_TESTING.md](./ARM_LINUX_TESTING.md)                                                                                                                           | Platform runbook for Linux package prerequisites and automation notes |
| Wayland automation or manual hotkey validation                                               | [docs/WAYLAND_TESTING_RUNBOOK.md](./WAYLAND_TESTING_RUNBOOK.md) or [docs/WAYLAND_MANUAL_TESTING.md](./WAYLAND_MANUAL_TESTING.md)                                              | Separates automation-friendly guidance from manual-only verification  |

## Boundary Guides

- [src/main/AGENTS.md](../src/main/AGENTS.md)
- [src/renderer/AGENTS.md](../src/renderer/AGENTS.md)
- [src/preload/AGENTS.md](../src/preload/AGENTS.md)
- [src/shared/AGENTS.md](../src/shared/AGENTS.md)
- [tests/unit/AGENTS.md](../tests/unit/AGENTS.md)
- [tests/integration/AGENTS.md](../tests/integration/AGENTS.md)
- [tests/coordinated/AGENTS.md](../tests/coordinated/AGENTS.md)
- [tests/shared/AGENTS.md](../tests/shared/AGENTS.md)
- [tests/e2e/AGENTS.md](../tests/e2e/AGENTS.md)

## Testing and Operations References

- **E2E strategy** → [docs/E2E_TESTING_GUIDELINES.md](./E2E_TESTING_GUIDELINES.md)
- **Deterministic wait migration** → [docs/E2E_WAIT_PATTERNS.md](./E2E_WAIT_PATTERNS.md)
- **Shared test helper catalog** → [tests/helpers/README.md](../tests/helpers/README.md)
- **Browser-only UI checks** → [docs/BROWSER_UI_VALIDATION.md](./BROWSER_UI_VALIDATION.md)
- **ARM/headless Linux runbook** → [docs/ARM_LINUX_TESTING.md](./ARM_LINUX_TESTING.md)
- **Wayland automation runbook** → [docs/WAYLAND_TESTING_RUNBOOK.md](./WAYLAND_TESTING_RUNBOOK.md)
- **Wayland manual checklist** → [docs/WAYLAND_MANUAL_TESTING.md](./WAYLAND_MANUAL_TESTING.md)

## Maintenance Rule

If you rename a documented boundary, move a source-of-truth file, change verification commands, or add a new high-value agent-facing doc, update this index in the same change.
