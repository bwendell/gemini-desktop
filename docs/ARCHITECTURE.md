# Architecture Reference

This document is the durable architecture map for Gemini Desktop. It is written for contributors and AI agents who need a trustworthy view of the live runtime boundaries, data flows, and source-of-truth files.

Use this document to understand how the application is organized. Use the code paths linked in each section when you need implementation detail.

## System Overview

Gemini Desktop is an Electron application with three primary runtime boundaries:

- The main process composes managers, owns native integrations, and coordinates application lifecycle.
- The preload bridge exposes a typed `window.electronAPI` surface to renderer code.
- The renderer hosts a React shell that manages tabs and embeds Gemini inside iframe-based tab panels.

```text
+----------------------------- Gemini Desktop ------------------------------+
|                                                                          |
|  Main Process                                                            |
|  - main.ts boots the app                                                 |
|  - ApplicationContext holds manager graph                                |
|  - IpcManager registers domain handlers                                  |
|  - Window/Tray/Menu/Hotkey/Update/Badge/Notification managers            |
|  - ExportManager and LlmManager own feature backends                     |
|                                                                          |
|          ipcMain / BrowserWindow / session / platform adapters           |
|                                ^                                         |
|                                |                                         |
|                      contextBridge via preload                            |
|                                |                                         |
|                                v                                         |
|  Preload Bridge                                                          |
|  - preload.ts exposes window.electronAPI                                 |
|  - typed invoke/send/on wrappers                                          |
|  - subscriptions return cleanup functions                                |
|                                                                          |
|                                ^                                         |
|                                |                                         |
|                         window.electronAPI                                |
|                                |                                         |
|                                v                                         |
|  Renderer                                                                 |
|  - App.tsx composes Theme/Toast/Update/Tab providers                     |
|  - TabContext owns in-memory tab UI state                                |
|  - TabBar and TabPanel render iframe-based Gemini tabs                   |
|  - Quick Chat and options UI use the preload bridge                      |
|                                                                          |
+--------------------------------------------------------------------------+
                                 |
                                 v
                      Google Gemini web app (`gemini.google.com`)
```

## Runtime Boundaries

### Main Process

The main process owns native behavior and long-lived services: app startup, BrowserWindow lifecycle, tray integration, hotkeys, updates, notifications, export, local persistence, and platform-specific behavior.

### Preload Bridge

The preload layer is the only sanctioned bridge between the sandboxed renderer and Electron APIs. Renderer code does not import Node.js modules directly.

### Renderer

The renderer is a React application. It owns visual state, tab interactions, option panels, toast UI, and iframe embedding, while deferring native effects to the preload bridge and main process.

### Shared Contracts

`src/shared/` defines the stable contracts that keep the boundaries aligned: IPC channel names, shared types, URL constants, and tab helpers.

### External Dependency

The application embeds the Gemini web app in iframes and keeps authentication in Chromium session storage. There is no separate Gemini Desktop backend service.

## Main-Process Composition

### Manager Architecture

The main process uses dependency injection rather than global mutable singletons. `src/main/main.ts` constructs the manager graph, stores it in `ApplicationContext`, and wires late-bound services after the app is ready.

### Composition Root

- `src/main/main.ts` is the composition root.
- `src/main/ApplicationContext.ts` defines the live manager container.
- Core managers are created first: `WindowManager`, `HotkeyManager`, `TrayManager`, `BadgeManager`, `UpdateManager`, `LlmManager`, `ExportManager`, and `IpcManager`.
- Ready-only managers are attached later: `MenuManager` and `NotificationManager`.

### Core Manager Families

| Family                   | Responsibility                                                    | Primary files                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windowing                | Create and coordinate main, options, quick chat, and auth windows | `src/main/managers/windowManager.ts`, `src/main/windows/`                                                                                         |
| Native shell integration | Tray, menu, hotkeys, app lifecycle, badges                        | `src/main/managers/trayManager.ts`, `src/main/managers/menuManager.ts`, `src/main/managers/hotkeyManager.ts`, `src/main/managers/badgeManager.ts` |
| Background services      | Auto-update checks, local LLM lifecycle, export orchestration     | `src/main/managers/updateManager.ts`, `src/main/managers/llmManager.ts`, `src/main/managers/exportManager.ts`                                     |
| Notifications            | Native response notifications and badge coordination              | `src/main/managers/notificationManager.ts`                                                                                                        |
| IPC                      | Register and dispose typed handler families                       | `src/main/managers/ipcManager.ts`, `src/main/managers/ipc/`                                                                                       |
| Persistence              | JSON-backed settings stores used by managers and handlers         | `src/main/store.ts`                                                                                                                               |
| Platform abstraction     | Centralize OS-specific behavior                                   | `src/main/platform/`                                                                                                                              |

### Startup Sequence

1. `main.ts` performs sandbox and platform initialization before creating windows.
2. `initializeManagers()` builds the core manager graph and stores it in `ApplicationContext`.
3. `app.whenReady()` applies session-level security, registers IPC handlers, builds the menu, and creates the main window.
4. Once the main window exists, `BadgeManager` receives its window reference and `NotificationManager` is created.
5. `NotificationManager` is injected back into `IpcManager` because response notification IPC depends on a service that is only available after the main window exists.
6. Tray creation, hotkey registration, text prediction initialization, and periodic update checks happen after the app is ready.

### Late-Bound Managers and Runtime Wiring

- `MenuManager` depends on `TabStateIpcHandler`, so it is created after `IpcManager.setupIpcHandlers()` makes that handler available.
- `NotificationManager` lives in the main process and subscribes to the main window's `response-complete` event. It is not a renderer component.
- `IpcManager.setNotificationManager()` handles the late injection needed by `ResponseNotificationIpcHandler`.

### Cleanup and Disposal

`main.ts` centralizes shutdown through `cleanupAllManagers()`. Cleanup unregisters hotkeys, destroys the tray, stops update timers, disposes the LLM manager, unregisters IPC handlers, removes `response-complete` listeners, disposes `NotificationManager`, and clears the application context.

### Where to Look in Code

- `src/main/main.ts`
- `src/main/ApplicationContext.ts`
- `src/main/managers/`
- `src/main/windows/`
- `src/main/store.ts`

## IPC Architecture

`IpcManager` is the orchestrator for renderer-to-main communication. It creates handler instances with a shared dependency object, registers them, optionally initializes them, and unregisters them during disposal.

### IPC Handler Pattern

All handler classes extend `BaseIpcHandler` and follow the same lifecycle:

1. `register()` adds `ipcMain.handle` and `ipcMain.on` listeners.
2. `initialize()` is optional for handlers that need startup work after registration.
3. `unregister()` removes listeners during shutdown.

`BaseIpcHandler` also provides:

- `getWindowFromEvent()` for safe sender window lookup.
- `broadcastToAllWindows()` for fan-out state sync.
- `handleError()` for consistent logging.

### Handler Families

| Handler family         | Responsibility                                              | Primary files                                             |
| ---------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| Window                 | Minimize, maximize, close, show, fullscreen                 | `src/main/managers/ipc/WindowIpcHandler.ts`               |
| Theme                  | Theme preference get/set and cross-window sync              | `src/main/managers/ipc/ThemeIpcHandler.ts`                |
| Zoom                   | Zoom level get/set and broadcast                            | `src/main/managers/ipc/ZoomIpcHandler.ts`                 |
| Always on top          | Window pinning state                                        | `src/main/managers/ipc/AlwaysOnTopIpcHandler.ts`          |
| Hotkeys                | Hotkey enablement, accelerators, and status                 | `src/main/managers/ipc/HotkeyIpcHandler.ts`               |
| App                    | Open settings, auth windows, app-level actions              | `src/main/managers/ipc/AppIpcHandler.ts`                  |
| Auto-update            | User-triggered checks, install flow, status events          | `src/main/managers/ipc/AutoUpdateIpcHandler.ts`           |
| Quick Chat             | Submit, hide, cancel, and execute flow into the main window | `src/main/managers/ipc/QuickChatIpcHandler.ts`            |
| Text prediction        | Local LLM enablement, model status, inference               | `src/main/managers/ipc/TextPredictionIpcHandler.ts`       |
| Response notifications | Response notification preference bridge                     | `src/main/managers/ipc/ResponseNotificationIpcHandler.ts` |
| Launch at startup      | Login-item state and start-minimized settings               | `src/main/managers/ipc/LaunchAtStartupIpcHandler.ts`      |
| Export                 | PDF and Markdown export triggers from UI and menu events    | `src/main/managers/ipc/ExportIpcHandler.ts`               |
| Tab state              | Tab persistence, title sync, reload flow                    | `src/main/managers/ipc/TabStateIpcHandler.ts`             |
| Shell                  | Reveal files in the OS file browser                         | `src/main/managers/ipc/ShellIpcHandler.ts`                |

### Dependency Injection Model

Handlers receive a shared dependency object containing the logger, settings store, `WindowManager`, and optional manager references such as `HotkeyManager`, `UpdateManager`, `ExportManager`, `LlmManager`, and `NotificationManager`.

### NotificationManager Injection

`NotificationManager` is created after the main window exists, so `IpcManager` starts with a null notification dependency and receives the real manager later through `setNotificationManager()`. This is a key part of the current architecture and should be preserved when changing response notification behavior.

### Where to Look in Code

- `src/main/managers/ipcManager.ts`
- `src/main/managers/ipc/BaseIpcHandler.ts`
- `src/main/managers/ipc/`
- `src/shared/constants/ipc-channels.ts`

## Preload Bridge and Security Boundary

The preload layer exposes a typed `window.electronAPI` object to renderer code using `contextBridge.exposeInMainWorld`.

### Bridge Shape

The bridge follows three stable patterns:

- `invoke` for request/response calls.
- `send` for fire-and-forget commands.
- `on*` subscription wrappers that strip the raw Electron event and return cleanup functions for React effects.

`src/shared/types/ipc.ts` is the canonical type definition for this API surface, and `src/shared/constants/ipc-channels.ts` is the canonical channel inventory shared across processes.

### Security Model

- The renderer remains sandboxed with `contextIsolation: true` and no direct Node.js access.
- The preload bridge does not expose raw `ipcRenderer`.
- Channel names are centralized in shared constants rather than duplicated ad hoc.
- The renderer talks to Electron only through `window.electronAPI`.

### Where to Look in Code

- `src/preload/preload.ts`
- `src/shared/types/ipc.ts`
- `src/shared/constants/ipc-channels.ts`

## Renderer Architecture

`src/renderer/App.tsx` composes the root provider stack and the main shell:

- `ThemeProvider`
- `ToastProvider`
- `UpdateToastProvider`
- `TabProvider`

Inside that shell, `MainLayout` renders the tab bar and the active tab panel. `TabPanel` mounts one iframe per tab and shows the active iframe while keeping the tab shell in React. Quick Chat integration also lives at this boundary: the renderer listens for Gemini navigation requests from the main process and signals readiness back through the preload bridge.

Global UI state is handled with React contexts rather than a single global store. Current high-value contexts include theme, toast/update notifications, individual hotkeys, and tabs.

Styling is plain CSS imported by components such as `App.tsx` and `TabBar.tsx`. The architecture does not use CSS Modules as a primary styling pattern.

### Where to Look in Code

- `src/renderer/App.tsx`
- `src/renderer/context/`
- `src/renderer/hooks/`
- `src/renderer/components/`

## Quick Chat Flow

Quick Chat is a cross-boundary workflow rather than a standalone renderer feature.

1. The floating quick chat window collects prompt text.
2. `QuickChatIpcHandler` hides the quick chat window, focuses the main window, creates a correlated request ID and target tab ID, and sends `gemini:navigate` to the renderer.
3. The renderer creates or activates the requested tab and waits for the iframe in that tab to load.
4. Once the target iframe is ready, the renderer sends `gemini:ready` back to the main process.
5. `QuickChatIpcHandler` finds the target iframe frame by `getTabFrameName(tabId)` and injects the prompt into Gemini, optionally auto-submitting outside of E2E buffering modes.

This flow is why Quick Chat, tab identity, iframe naming, and preload IPC need to stay aligned.

### Where to Look in Code

- `src/main/managers/ipc/QuickChatIpcHandler.ts`
- `src/main/windows/quickChatWindow.ts`
- `src/renderer/App.tsx`
- `src/renderer/hooks/useQuickChatNavigation.ts`
- `src/shared/types/tabs.ts`

## Tabs Architecture

Tabs are a first-class system, not just a visual affordance.

### State Ownership

- The renderer owns live tab UI state in `TabContext`.
- The main process owns persisted tab state through `TabStateIpcHandler` and its dedicated `tabs-state` store.

### Hydration and Persistence

On startup, `TabContext` loads persisted `TabsState` through `window.electronAPI.getTabState()`. After hydration, it saves tab changes back to the main process with a debounced `saveTabState()` call.

### Frame Naming and Iframe Ownership

Each tab iframe is named with `getTabFrameName(tabId)` from `src/shared/types/tabs.ts`. The main process relies on that naming convention to find the correct iframe frame for title extraction and reload requests.

### Title Synchronization Flow

`TabStateIpcHandler` polls the active Gemini iframe, extracts the current conversation title, persists it, and broadcasts `TABS_TITLE_UPDATED` to renderer windows. The renderer also exposes `updateTabTitle()` for explicit title updates when needed.

### Active-Tab Reload Flow

Renderer code can request a reload through `window.electronAPI.reloadTabs()`. `TabStateIpcHandler` resolves the active tab, finds the matching iframe frame in the main window, reloads it, enforces a cooldown, and schedules a delayed title sync pass.

### Shortcut Integration

`useTabKeyboardShortcuts()` handles both local keyboard shortcuts and tab shortcut events delivered over the preload bridge.

### Where to Look in Code

- `src/renderer/context/TabContext.tsx`
- `src/renderer/components/tabs/TabBar.tsx`
- `src/renderer/components/tabs/TabPanel.tsx`
- `src/renderer/hooks/useTabKeyboardShortcuts.ts`
- `src/main/managers/ipc/TabStateIpcHandler.ts`
- `src/shared/types/tabs.ts`

## Export Flow

Export is owned by the main process.

- `ExportManager` extracts chat content from a Gemini frame, converts it into Markdown or rendered HTML, and writes the chosen output file.
- `ExportIpcHandler` exposes renderer-driven export triggers and also listens for window-level export events such as print-to-PDF.
- The extraction path is intentionally constrained to allowed Gemini domains.

The current shipped export formats are:

- Markdown
- PDF

### Where to Look in Code

- `src/main/managers/exportManager.ts`
- `src/main/managers/ipc/ExportIpcHandler.ts`
- `src/preload/preload.ts`

## Launch-at-Startup Flow

Launch-at-startup spans renderer UI, preload, IPC, and platform login-item APIs.

- `StartupSettings` in the renderer loads the current settings and lets the user toggle launch-at-startup and start-minimized behavior.
- The preload bridge exposes `getLaunchAtStartup`, `setLaunchAtStartup`, `getStartMinimized`, and `setStartMinimized`.
- `LaunchAtStartupIpcHandler` persists the settings in the main-process preferences store and applies login-item configuration through Electron.
- On platforms that support it, start-minimized is expressed by launching the app with `--hidden`; macOS also maps this into `openAsHidden`.

### Where to Look in Code

- `src/renderer/components/options/StartupSettings.tsx`
- `src/preload/preload.ts`
- `src/main/managers/ipc/LaunchAtStartupIpcHandler.ts`

## Platform Abstraction

Platform-specific behavior is centralized under `src/main/platform/`.

- `PlatformAdapter` defines the cross-platform contract.
- `platformAdapterFactory.ts` selects the active adapter for Windows, macOS, Linux X11, or Linux Wayland.
- Adapters own platform-specific behavior for app configuration, hotkey strategy, badge behavior, tray/window behavior, menu differences, update support, and notification guidance.

This layer exists so the rest of the main process can depend on stable abstractions instead of scattering `process.platform` checks throughout the codebase.

### Where to Look in Code

- `src/main/platform/PlatformAdapter.ts`
- `src/main/platform/platformAdapterFactory.ts`
- `src/main/platform/adapters/`

## Data Persistence

Gemini Desktop uses local persistence only.

### Settings and Feature State

`SettingsStore` writes JSON files under Electron's user data directory. Current architectural uses include:

- user preferences managed by `IpcManager`
- update settings managed by `UpdateManager`
- notification settings managed by `NotificationManager`
- tab state managed by `TabStateIpcHandler`

### Chromium Session Persistence

Authentication and Gemini session state are separate from `SettingsStore`. They live in Chromium's session/cookie storage, including the `persist:gemini` partition used by the embedded Gemini experience.

### Boundaries to Remember

- There is no external database.
- There is no backend service.
- Settings persistence and Chromium session persistence are separate concerns.

### Where to Look in Code

- `src/main/store.ts`
- `src/main/managers/ipc/TabStateIpcHandler.ts`
- `src/main/managers/updateManager.ts`
- `src/main/managers/notificationManager.ts`
- `src/main/main.ts`

## Testing and Verification Map

The repo uses multiple test layers to validate different boundaries.

| Area                       | Primary verification       | Relevant paths                                                         |
| -------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Renderer UI and hooks      | `npm run test`             | `src/renderer/`, `tests/unit/renderer/`                                |
| Main process and preload   | `npm run test:electron`    | `src/main/`, `src/preload/`, `tests/unit/main/`, `tests/unit/preload/` |
| Multi-window coordination  | `npm run test:coordinated` | `tests/coordinated/`                                                   |
| Cross-boundary integration | `npm run test:integration` | `tests/integration/`                                                   |
| End-to-end behavior        | `npm run test:e2e`         | `tests/e2e/`                                                           |

For command details and scope-specific expectations, use the verification matrix in `AGENTS.md` as the operational source of truth.

## Maintaining This Doc

This file should change whenever the architecture meaningfully changes. Do not treat it as a one-time snapshot.

### Update This Document When

- `src/main/main.ts` changes how managers are composed or cleaned up.
- `src/main/ApplicationContext.ts` changes the manager graph.
- `src/main/managers/ipc/` gains, removes, or materially changes handler families.
- `src/preload/preload.ts` or `src/shared/types/ipc.ts` changes the bridge surface.
- `src/renderer/context/TabContext.tsx` or `src/renderer/components/tabs/` changes tab ownership or flows.
- `src/main/platform/` changes platform abstraction responsibilities.
- Export, launch-at-startup, update, notification, or persistence flows move across boundaries.

### Source-of-Truth Map

| Architecture area        | Source-of-truth files                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main-process composition | `src/main/main.ts`, `src/main/ApplicationContext.ts`                                                                                              |
| IPC architecture         | `src/main/managers/ipcManager.ts`, `src/main/managers/ipc/`                                                                                       |
| Preload bridge           | `src/preload/preload.ts`, `src/shared/types/ipc.ts`, `src/shared/constants/ipc-channels.ts`                                                       |
| Renderer shell           | `src/renderer/App.tsx`, `src/renderer/context/`, `src/renderer/hooks/`                                                                            |
| Tabs architecture        | `src/renderer/context/TabContext.tsx`, `src/renderer/components/tabs/`, `src/main/managers/ipc/TabStateIpcHandler.ts`, `src/shared/types/tabs.ts` |
| Platform abstraction     | `src/main/platform/`                                                                                                                              |
| Persistence              | `src/main/store.ts`, manager-specific store usage in `src/main/managers/`                                                                         |

### Documentation Rules

- Do not use line-number references in this file.
- Prefer durable file paths and runtime responsibilities over implementation trivia.
- Remove or rewrite claims that cannot be tied back to live code.
- Keep AGENTS and contributor docs aligned with this file when they depend on it for architectural guidance.
