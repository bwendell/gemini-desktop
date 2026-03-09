> Extends [root AGENTS.md](../../AGENTS.md). Read that first.

## Boundary Definition

Renderer runs in Chromium sandbox with no direct Node.js access.
This layer contains React UI, contexts, hooks, and window-specific frontend behavior.

Primary files and folders:

- `src/renderer/App.tsx` — root component
- `src/renderer/main.tsx` — renderer entrypoint
- `src/renderer/components/` — UI components
- `src/renderer/context/` — global React contexts
- `src/renderer/hooks/` — custom hooks
- `src/renderer/windows/` — window-specific UI modules
- `src/renderer/utils/`, `src/renderer/types/`, `src/renderer/assets/`

## React Patterns

Use React Context for global UI state (Theme, Toast, Auth) and local state/reducers for component-local logic.
All system access must flow through preload bridge methods on `window.electronAPI`.
See renderer sections in `docs/ARCHITECTURE.md` for deeper rationale.

## IPC Communication from Renderer

Use only `window.electronAPI.*` APIs exposed by preload.
Subscription APIs return cleanup functions — always call them in `useEffect` cleanup.
For async initialization and subscriptions, use `AbortController` to prevent stale updates after unmount.

## Canonical Example

- `src/renderer/context/ThemeContext.tsx` — `ThemeProvider` and `useTheme`
    - Shows typed context API, `AbortController` guard, IPC subscription cleanup in `useEffect`, `useCallback` setter, and robust fallback/error handling.
    - Pattern aligns to preload `get → set → onChange` APIs.

## Common Mistakes

- Importing Node.js APIs directly in renderer code
- Forgetting to clean up IPC subscriptions in `useEffect` return
- Skipping `GeminiErrorBoundary` around risky UI areas
- Missing `AbortController.abort()` in async cleanup paths

## When You Change Files Here

- If you are working in a newly created git worktree, run `npm install` in that worktree first so local dependencies are present before running the commands below.
- Run `npm run test`
- Run `npm run lint`
