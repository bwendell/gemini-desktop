# Architecture Overview

This document serves as a critical, living template designed to equip agents with a rapid and comprehensive understanding of the codebase's architecture, enabling efficient navigation and effective contribution from day one. Update this document as the codebase evolves.

## 1. Project Structure

> This section provides a high-level overview of the project's directory and file structure, categorised by architectural layer or major functional area. It is essential for quickly navigating the codebase, locating relevant files, and understanding the overall organization and separation of concerns.

```
gemini-desktop/
├── src/                      # Main source code
│   ├── main/                 # Electron main process (Node.js context)
│   │   ├── main.ts           # Application entry point, lifecycle management
│   │   ├── managers/         # Core functionality managers
│   │   │   ├── windowManager.ts    # Window creation and state management
│   │   │   ├── ipcManager.ts       # IPC message handling between processes
│   │   │   ├── hotkeyManager.ts    # Global keyboard shortcut registration
│   │   │   ├── trayManager.ts      # System tray icon and menu
│   │   │   ├── menuManager.ts      # Application menu construction
│   │   │   ├── updateManager.ts    # Auto-update functionality
│   │   │   └── badgeManager.ts     # Update notification badges
│   │   ├── windows/          # Window class implementations
│   │   │   ├── baseWindow.ts       # Abstract base window class
│   │   │   ├── mainWindow.ts       # Primary application window
│   │   │   ├── optionsWindow.ts    # Settings/preferences window
│   │   │   ├── quickChatWindow.ts  # Spotlight-style floating prompt
│   │   │   └── authWindow.ts       # Google authentication window
│   │   ├── utils/            # Main process utilities
│   │   └── store.ts          # Settings persistence (electron-store pattern)
│   ├── preload/              # Electron preload scripts (bridge context)
│   │   └── preload.ts        # Secure API exposure via contextBridge
│   ├── renderer/             # React frontend (browser context)
│   │   ├── App.tsx           # Root React component
│   │   ├── main.tsx          # React DOM entry point
│   │   ├── components/       # Reusable UI components
│   │   │   ├── titlebar/     # Custom window title bar
│   │   │   ├── options/      # Settings panels and controls
│   │   │   ├── quickchat/    # Quick Chat input interface
│   │   │   ├── toast/        # Generic notification toasts [NEW]
│   │   │   ├── update-toast/ # Specialized update notifications
│   │   │   ├── layout/       # Layout components
│   │   │   └── common/       # Shared UI elements
│   │   ├── context/          # React context providers (theme, settings)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── windows/          # Window-specific root components
│   │   │   ├── options/      # Options window React app
│   │   │   └── quickchat/    # Quick Chat window React app
│   │   └── utils/            # Renderer utilities
│   └── shared/               # Code shared between main/renderer
│       ├── constants/        # IPC channel names, URLs
│       │   ├── ipc-channels.ts     # All IPC channel definitions
│       │   └── urls.ts             # External URL constants
│       ├── types/            # TypeScript type definitions
│       │   ├── ipc.ts              # ElectronAPI interface
│       │   ├── hotkeys.ts          # Hotkey configuration types
│       │   ├── theme.ts            # Theme preference types
│       │   └── updates.ts          # Auto-update event types
│       └── utils/            # Shared utility functions
├── tests/                    # Test suites by type
│   ├── unit/                 # Isolated unit tests (Vitest)
│   ├── coordinated/          # Multi-module integration tests (Vitest)
│   ├── integration/          # Electron process integration (WDIO)
│   └── e2e/                  # Full end-to-end tests (WDIO)
│       └── release/          # Tests for packaged builds
├── config/                   # Configuration files
│   ├── electron-builder.config.cjs  # Build/packaging config
│   ├── vitest/               # Vitest test configurations
│   └── wdio/                 # WebdriverIO test configurations
├── build/                    # Build assets (icons, installers)
├── scripts/                  # Build and automation scripts
├── .github/                  # GitHub configurations
│   └── workflows/            # CI/CD GitHub Actions
│       ├── test.yml          # Test pipeline (PR/push)
│       ├── release.yml       # Release pipeline (tags)
│       └── _*.yml            # Reusable workflow components
├── docs/                     # Project documentation
├── public/                   # Static assets
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite build configuration
└── eslint.config.js          # ESLint configuration
```

## 2. High-Level System Diagram

> Provide a simple block diagram (e.g., a C4 Model Level 1: System Context diagram, or a basic component diagram) or a clear text-based description of the major components and their interactions. Focus on how data flows, services communicate, and key architectural boundaries.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Gemini Desktop Application                       │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MAIN PROCESS (Node.js)                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │WindowManager │  │ HotkeyManager│  │  TrayManager │               │   │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘               │   │
│  │         │                                                           │   │
│  │  ┌──────┴───────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │  IpcManager  │  │UpdateManager │  │  MenuManager │               │   │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘               │   │
│  │         │                                                           │   │
│  │  ┌──────┴───────┐                                                   │   │
│  │  │SettingsStore │  (electron-store for persistence)                 │   │
│  │  └──────────────┘                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│              │                                                             │
│              │ IPC (contextBridge)                                         │
│              ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    PRELOAD (Bridge Context)                         │   │
│  │  preload.ts - Exposes window.electronAPI safely                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│              │                                                             │
│              │ window.electronAPI                                          │
│              ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  RENDERER PROCESS (Chromium/React)                  │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │   │
│  │  │ MainWindow │  │OptionsWin  │  │ QuickChat  │  │  AuthWindow  │   │   │
│  │  │  (iframe)  │  │  (React)   │  │  (React)   │  │  (Google)    │   │   │
│  │  └─────┬──────┘  └────────────┘  └────────────┘  └──────────────┘   │   │
│  │        │                                                            │   │
│  │        ▼                                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │              Embedded: https://gemini.google.com             │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
                    ┌──────────────────────────────┐
                    │     Google Gemini Web App    │
                    │     gemini.google.com/app    |
                    └──────────────────────────────┘
```

### Process Communication Flow

1. **User Input** → Renderer captures via React components
2. **Renderer → Main** → IPC invoke/send through `window.electronAPI`
3. **Main Process** → Handles via `IpcManager`, delegates to appropriate manager
4. **Main → Renderer** → IPC reply/emit through event channels
5. **Settings Changes** → Stored via `SettingsStore`, broadcast to all windows

## 3. Core Components

### 3.1. Frontend (Renderer Process)

**Name:** React UI Layer

**Description:** The renderer process hosts the React-based UI for all application windows. The main window embeds the Google Gemini web application in an iframe with stripped security headers. Secondary windows (Options, Quick Chat) are full React applications for settings management and quick prompts.

**Technologies:**

- React 19 with TypeScript
- Vite for development and building
- Framer Motion for animations
- CSS Modules for styling
- Custom hooks for IPC communication

**Key Components:**

- `src/renderer/components/titlebar/` - Custom window title bar with traffic lights
- `src/renderer/components/options/` - Settings panels for themes, hotkeys, updates
- `src/renderer/components/quickchat/` - Floating prompt input interface
- `src/renderer/context/` - React contexts for theme and settings state
- `src/renderer/components/toast/` - Generic toast notifications for successes, errors, and progress
- `src/renderer/context/ToastContext.tsx` - Central API for showing toasts via `useToast` hook

### 3.2. Backend Services (Main Process)

#### 3.2.1. Window Manager

**Name:** `WindowManager` (`src/main/managers/windowManager.ts`)

**Description:** Orchestrates the creation, lifecycle, and state of all application windows. Manages show/hide operations, tray minimization, and cross-window coordination. Maintains references to MainWindow, OptionsWindow, QuickChatWindow, and AuthWindow instances.

**Technologies:** Electron BrowserWindow API, TypeScript

#### 3.2.2. IPC Manager

**Name:** `IpcManager` (`src/main/managers/ipcManager.ts`)

**Description:** Central hub for all inter-process communication. Registers handlers for all IPC channels defined in `src/shared/constants/ipc-channels.ts`. Routes messages between renderer processes and the appropriate managers. Handles Quick Chat text injection, theme synchronization, and settings updates.

**Technologies:** Electron ipcMain API, TypeScript

#### 3.2.3. Hotkey Manager

**Name:** `HotkeyManager` (`src/main/managers/hotkeyManager.ts`)

**Description:** Registers and manages global keyboard shortcuts that work even when the application is not focused. Supports customizable accelerators for Quick Chat (`Ctrl+Shift+Space`), Stealth Mode (`Ctrl+Alt+E`), Always On Top (`Ctrl+Shift+T`), and Settings (`Ctrl+,`). Includes special handling for Linux/Wayland via `GlobalShortcutsPortal`.

**Technologies:** Electron globalShortcut API, TypeScript

#### 3.2.4. Tray Manager

**Name:** `TrayManager` (`src/main/managers/trayManager.ts`)

**Description:** Creates and manages the system tray icon and context menu. Provides quick access to show/hide the app, open settings, and quit. Shows update badges when new versions are available.

**Technologies:** Electron Tray API, TypeScript

#### 3.2.5. Update Manager

**Name:** `UpdateManager` (`src/main/managers/updateManager.ts`)

**Description:** Handles automatic update checking, downloading, and installation via electron-updater. Performs periodic background checks and notifies users of available updates. Integrates with BadgeManager for visual notifications.

**Technologies:** electron-updater, electron-log, TypeScript

#### 3.2.6. Menu Manager

**Name:** `MenuManager` (`src/main/managers/menuManager.ts`)

**Description:** Constructs the application menu bar with platform-specific layouts. Provides menu items for window controls, editing, view options, and help/about access.

**Technologies:** Electron Menu API, TypeScript

#### 3.2.7. Toast Utility (Main Process)

**Name:** `showToast` (`src/main/utils/toast.ts`)

**Description:** Provides a helper function for the main process to trigger toast notifications in any renderer window via the `toast:show` IPC channel. Used for system alerts, auth failures, and background task progress.

**Technologies:** Electron webContents.send, IPC, TypeScript

### 3.3. Toast System Architecture

The application uses a layered toast system to provide non-intrusive feedback:

1. **Toast Component**: Presentational component supporting multiple types (`success`, `error`, `info`, `warning`, `progress`).
2. **ToastContainer**: Manages a stack of up to 5 visible toasts in the bottom-left corner with enter/exit animations.
3. **ToastContext**: Context provider that manages the toast queue, auto-dismiss timers, and provides the `useToast` hook.
4. **IPC Integration**: Subscribes to `toast:show` events from the main process, allowing system-level events to be surfaced as UI toasts.

**Provider Nesting Order**: `ToastProvider` must be wrapped above `UpdateToastProvider` in the component tree:

```tsx
<ThemeProvider>
  <ToastProvider>
    <UpdateToastProvider>
      <App />
    </UpdateToastProvider>
  </ToastProvider>
</ThemeProvider>
```

**Toast Types and Auto-Dismiss Durations**:

| Type       | Color  | Auto-Dismiss | Use Case                           |
| ---------- | ------ | ------------ | ---------------------------------- |
| `success`  | Green  | 5 seconds    | Completed actions, saved changes   |
| `info`     | Accent | 5 seconds    | Updates available, feature tips    |
| `warning`  | Yellow | 7 seconds    | Session expiring, potential issues |
| `error`    | Red    | 10 seconds   | Auth failures, network errors      |
| `progress` | Accent | Never        | Download progress, long operations |

**ToastContext Public API** (`useToast` hook):

| Method                           | Description                                       |
| -------------------------------- | ------------------------------------------------- |
| `showToast(options)`             | Display toast with full options, returns toast ID |
| `showSuccess(message, options?)` | Convenience helper for success type               |
| `showError(message, options?)`   | Convenience helper for error type                 |
| `showInfo(message, options?)`    | Convenience helper for info type                  |
| `showWarning(message, options?)` | Convenience helper for warning type               |
| `dismissToast(id)`               | Remove a specific toast by ID                     |
| `dismissAll()`                   | Remove all active toasts                          |
| `toasts`                         | Current array of visible ToastItems               |

**ShowToastOptions**:

```ts
{
  id?: string;           // Custom ID (auto-generated if omitted)
  type: ToastType;       // 'success' | 'error' | 'info' | 'warning' | 'progress'
  title?: string;        // Optional bold header
  message: string;       // Toast body text
  duration?: number;     // Custom duration in ms (null = persistent)
  progress?: number;     // 0-100 for progress type
  actions?: ToastAction[]; // Action buttons {label, onClick, primary?}
  persistent?: boolean;  // If true, no auto-dismiss
}
```

### 3.4. Preload Script

**Name:** Preload Bridge (`src/preload/preload.ts`)

**Description:** The security boundary between Node.js and browser contexts. Uses Electron's `contextBridge` to expose a safe, limited API (`window.electronAPI`) to renderer processes. Implements the `ElectronAPI` interface defined in `src/shared/types/ipc.ts`. No Node.js APIs are directly accessible to renderer code.

**Technologies:** Electron contextBridge, ipcRenderer, TypeScript

## 4. Data Stores

> (List and describe the databases and other persistent storage solutions used.)

### 4.1. Settings Store

**Name:** `SettingsStore` (`src/main/store.ts`)

**Type:** File-based JSON storage (electron-store pattern)

**Purpose:** Persists user preferences and application settings locally. All data stays on the user's machine with no cloud synchronization.

**Key Data Stored:**

- `theme` - User theme preference (light/dark/system)
- `alwaysOnTop` - Window pin state
- `hotkeyAccelerators` - Custom keyboard shortcuts
- `individualHotkeys` - Per-hotkey enabled/disabled state
- `autoUpdateEnabled` - Auto-update preference
- `windowBounds` - Last window position and size

### 4.2. Session Storage

**Name:** Chromium Session Storage

**Type:** Encrypted cookie/session storage

**Purpose:** Stores Google authentication sessions. Uses Chromium's standard encrypted storage for secure persistence of login cookies. Session is shared across main window and auth window via `persist:gemini` partition.

**Location:** Standard Electron userData directory

## 5. External Integrations / APIs

### 5.1. Google Gemini Web App

**Service Name:** Google Gemini

**Purpose:** The core AI functionality. The main window embeds `https://gemini.google.com/app` in an iframe after stripping `X-Frame-Options` headers.

**Integration Method:** Embedded iframe with header stripping via Electron's `webRequest.onHeadersReceived`

### 5.2. Google Authentication

**Service Name:** Google OAuth

**Purpose:** User authentication for Gemini access. Handled entirely by Google's login flow in a dedicated auth window.

**Integration Method:** BrowserWindow loading Google sign-in pages, cookies shared via session partition

### 5.3. GitHub Releases

**Service Name:** GitHub Releases API

**Purpose:** Auto-update distribution. electron-updater checks for new releases at the project's GitHub releases page.

**Integration Method:** electron-updater with GitHub provider

## 6. Deployment & Infrastructure

**Distribution:** GitHub Releases (not cloud-hosted)

**Build Targets:**

- Windows: `.exe` installer (NSIS)
- macOS: `.dmg` for both Intel (x64) and Apple Silicon (arm64)
- Linux: `.AppImage` and `.deb` packages

**CI/CD Pipeline:** GitHub Actions

- `test.yml` - Runs on PRs and pushes; executes unit, coordinated, integration, and E2E tests
- `release.yml` - Runs on version tags; builds and publishes to GitHub Releases
- Reusable workflows (`_test.yml`, `_build.yml`, `_release.yml`) for DRY configuration

**Logging:** electron-log

- Logs written to user's app data directory
- Crash reports collected locally (no upload unless configured)

## 7. Security Considerations

**Authentication:** Google OAuth (handled by Google, not the app)

**Authorization:** N/A - User accesses their own Gemini account

**Process Isolation:**

- `contextIsolation: true` - Renderer cannot access Node.js
- `sandbox: true` - Renderer processes are sandboxed
- `nodeIntegration: false` - No Node.js in renderer

**IPC Security:**

- All IPC channels defined centrally in `src/shared/constants/ipc-channels.ts`
- Preload script exposes minimal, typed API via `contextBridge`
- No arbitrary code execution from renderer

**Data Security:**

- No telemetry or analytics collection
- Only connects to `*.google.com` domains
- All settings stored locally with standard OS encryption
- No passwords stored - auth handled by Google

**Header Stripping:** `X-Frame-Options` and `Content-Security-Policy: frame-ancestors` headers are stripped specifically for `gemini.google.com` to enable iframe embedding. This is necessary for the app to function but is applied narrowly.

## 8. Development & Testing Environment

**Local Setup:**

```bash
# Prerequisites: Node.js 18+, npm 9+
git clone https://github.com/bwendell/gemini-desktop.git
cd gemini-desktop
npm install
npm run electron:dev    # Start development
```

**Testing Frameworks:**

| Type                | Framework   | Config                                       | Command                    |
| ------------------- | ----------- | -------------------------------------------- | -------------------------- |
| Unit Tests          | Vitest      | `config/vitest/vitest.config.ts`             | `npm run test`             |
| Electron Unit Tests | Vitest      | `config/vitest/vitest.electron.config.ts`    | `npm run test:electron`    |
| Coordinated Tests   | Vitest      | `config/vitest/vitest.coordinated.config.ts` | `npm run test:coordinated` |
| Integration Tests   | WebdriverIO | `config/wdio/wdio.integration.conf.js`       | `npm run test:integration` |
| E2E Tests           | WebdriverIO | `config/wdio/wdio.e2e.conf.js`               | `npm run test:e2e`         |
| All Tests           | -           | -                                            | `npm run test:all`         |

**E2E Testing Principles:**

- Simulate real user actions only (clicks, typing, keypresses)
- Verify actual outcomes visible to users
- Test the full stack (Renderer → IPC → Main → Side effects)
- Avoid internal method calls or mocks in E2E tests

**Code Quality Tools:**

- ESLint for linting (`eslint.config.js`)
- Prettier for formatting (`.prettierrc`)
- TypeScript for type safety (`tsconfig.json`)

## 9. Future Considerations / Roadmap

- **Preload Bundling:** Currently preload script duplicates some constants from shared. A proper bundling step (Vite/esbuild) would allow true code sharing.
- **Linux Wayland Support:** Global shortcuts require `GlobalShortcutsPortal` on Wayland; further testing and refinement needed.
- **Deep Linking:** Potential for URL scheme handling (`gemini://`) for external integrations.

## 10. Project Identification

**Project Name:** Gemini Desktop

**Repository URL:** https://github.com/bwendell/gemini-desktop

**Primary Contact/Team:** Ben Wendell (github@benwendell.com)

**Date of Last Update:** 2026-01-01

## 11. Glossary / Acronyms

> Define any project-specific terms or acronyms.

| Term                 | Definition                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Main Process**     | The Node.js process that runs Electron's main script (`main.ts`). Has full system access. |
| **Renderer Process** | Chromium browser process running React UI. Sandboxed with no Node.js access.              |
| **Preload Script**   | Bridge script that runs before renderer, exposes safe APIs via `contextBridge`.           |
| **IPC**              | Inter-Process Communication - Electron's message passing between main and renderer.       |
| **Quick Chat**       | Spotlight-style floating prompt window for quick Gemini queries.                          |
| **Stealth Mode**     | Feature to instantly hide the app to system tray.                                         |
| **WDIO**             | WebdriverIO - Testing framework used for integration and E2E tests.                       |
| **contextBridge**    | Electron API for safely exposing Node.js functionality to renderer.                       |
| **electron-updater** | Library for auto-update functionality in Electron apps.                                   |
