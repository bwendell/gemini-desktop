> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Preload is the security boundary between renderer (Chromium) and main process (Node.js).
This directory currently centers on `src/preload/preload.ts`, which exposes typed `electronAPI` via `contextBridge.exposeInMainWorld`.
Keep the exposed API surface minimal and explicit.

## Bridge Pattern

Preload APIs follow three patterns:

- `invoke` for request/response via `ipcRenderer.invoke()`
- `send` for fire-and-forget via `ipcRenderer.send()`
- `on*` subscriptions via `ipcRenderer.on()` that return cleanup functions

Subscription cleanup return functions are mandatory because renderer hooks call them during `useEffect` teardown.

## Canonical Example

- `src/preload/preload.ts` — Theme API section (`// Theme API`, lines 197-228)
    - `getTheme()` uses `invoke`
    - `setTheme()` uses `send`
    - `onThemeChanged()` wraps subscription and returns cleanup

Treat this get/set/onChange shape as the template for new bridge APIs.

## Security Rules

- Never expose raw `ipcRenderer` to renderer code
- Never expose raw `ipcRenderer.on` directly; always wrap and strip event object
- Keep surface area minimal to what renderer needs
- Define IPC channel names in `src/shared/constants/ipc-channels.ts`

See `docs/ARCHITECTURE.md` (Security Model) and Electron context isolation/security docs for deeper background.

## Common Mistakes

- Exposing Node.js modules (`fs`, `path`, `child_process`) through preload
- Forgetting to return cleanup functions from `on*` APIs
- Adding new channels without updating `src/shared/constants/ipc-channels.ts`

## When You Change This File

- Run `npm run test:electron`
- If adding or changing IPC channels, also run `npm run test:integration`
