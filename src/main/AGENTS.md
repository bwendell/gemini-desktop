> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Main process runs in Node.js and owns window lifecycle, IPC handlers, tray, updates, and global hotkeys.

Primary files and folders:

- `src/main/main.ts` — app entrypoint
- `src/main/ApplicationContext.ts` — dependency injection container
- `src/main/store.ts` — electron-store integration
- `src/main/managers/` — manager classes
- `src/main/windows/` — window creation/lifecycle
- `src/main/platform/` — OS-specific behavior
- `src/main/utils/` — main-process utilities

## Manager Pattern

All managers are injected via `ApplicationContext`. Do not use global mutable manager singletons.
For architecture details, see `docs/ARCHITECTURE.md` (Manager Architecture section).

## IPC Handler Pattern

Handlers extend `BaseIpcHandler` and follow lifecycle: `register()` → optional `initialize()` → `unregister()`.
Use `getWindowFromEvent()` for safe sender window lookup, `broadcastToAllWindows()` for sync, and `handleError()` for consistent error logging.
See `src/main/managers/ipc/BaseIpcHandler.ts` and `docs/ARCHITECTURE.md` (IPC Handler Pattern section).

## Canonical Examples

- IPC handler: `src/main/managers/ipc/ThemeIpcHandler.ts` — `class ThemeIpcHandler extends BaseIpcHandler` (lines 25-120)
    - Shows: `ipcMain.handle`/`ipcMain.on` registration, validation, store persistence, window broadcast, error handling.
- Unit test: `tests/unit/main/ipc/ThemeIpcHandler.test.ts` — `describe('ThemeIpcHandler', ...)` (lines 1-271)
    - Shows: `vi.hoisted()` Electron mocking, shared mock helpers, handler registration, async invocation, broadcast verification.

## Common Mistakes

- Using global mutable state for managers instead of DI via `ApplicationContext`
- Forgetting `unregister()` cleanup for IPC handlers
- Sending to destroyed windows without checking `isDestroyed()` first

## When You Change Files Here

- If you are working in a newly created git worktree, run `npm install` in that worktree first so Electron and other dependencies exist locally.
- Run `npm run test:electron`
- If IPC handlers are modified, also run `npm run test:integration`
