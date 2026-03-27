> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

`src/shared/` is the alignment layer between main, preload, and renderer.
It holds the contracts that keep those boundaries synchronized: IPC channel names, shared types, URL constants, and tab helpers.

Primary files and folders:

- `src/shared/constants/ipc-channels.ts` — canonical IPC channel names
- `src/shared/types/ipc.ts` — typed preload/renderer contract (`ElectronAPI`)
- `src/shared/types/tabs.ts` — shared tab state and payload shapes
- `src/shared/types/` — cross-boundary payloads and state types
- `src/shared/utils/` — shared pure helpers safe to reuse across boundaries

## Contract Rules

Changes here must preserve cross-boundary consistency.
If you add, rename, or remove a channel or shared payload, update every consuming boundary in the same change:

- main-process handlers and broadcasts
- preload bridge methods
- renderer callers/subscriptions
- any tests that assert the contract

For architecture context, read [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md), especially the **Shared Contracts** section.

## Canonical Examples

- `src/shared/constants/ipc-channels.ts`
    - Central source of truth for channel names shared by main and preload.
    - Contract: `HOTKEY_RECORDER_KEY_CAPTURED` is the IPC channel for the hotkey recorder.
- `src/shared/utils/accelerators.ts`
    - Shared hotkey logic including `getDefaultAccelerators(platform)` and `LEGACY_QUICKCHAT_ACCELERATOR` for platform-specific defaults.
- `src/shared/types/ipc.ts`
    - Canonical typed contract for `window.electronAPI`.
- `src/shared/types/tabs.ts`
    - Example of stable payload/state definitions reused across boundaries.

## Common Mistakes

- Changing a shared contract without updating preload and main in the same change
- Hardcoding channel strings outside `src/shared/constants/ipc-channels.ts`
- Adding boundary-specific behavior to shared utilities instead of keeping them pure and reusable
- Renaming payload fields without updating the renderer and tests that consume them

- Hotkey defaults now include `getDefaultAccelerators(platform)` plus `LEGACY_QUICKCHAT_ACCELERATOR` for Windows migration.
- The recorder IPC contract is `IPC_CHANNELS.HOTKEY_RECORDER_KEY_CAPTURED` and must stay aligned with preload and renderer consumers.

## When You Change Files Here

- If you are working in a newly created git worktree, run `npm install` in that worktree first so local dependencies are present.
- Default verification: `npm run test:electron`
- Also run: `npm run lint`
- If channels or preload-facing contracts changed, also run: `npm run test:integration`
