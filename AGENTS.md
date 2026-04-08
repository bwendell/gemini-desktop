# Agent Instructions: Gemini Desktop

This guide is for agentic coding agents working in the Gemini Desktop repository. It details project-specific commands, conventions, and workflows.

## 🛠 Build, Lint, and Test Commands

The project uses **npm** for package management and **Vitest** + **WebdriverIO** for testing.

### Development & Build

- `npm install` - Install dependencies
- If you create a new git worktree, run `npm install` inside that worktree before any `npm run` command. Each worktree has its own `node_modules`, and Electron binaries will be missing until install completes.
- `npm run electron:dev` - Start the app in development mode
- `npm run build` - Full build (TypeScript + Vite)
- `npm run clean` - Clean build artifacts

### Linting & Formatting

- `npm run lint` - Run ESLint checks
- `npm run format` - Format code with Prettier

### Testing

- `npm run test` - Run unit tests (Vitest)
- `npm run test:watch` - Run unit tests in watch mode
- `npm run test:electron` - Run electron-specific unit tests
- `npm run test:coordinated` - Run coordinated multi-window tests
- `npm run test:e2e` - Run E2E tests sequentially
- `npm run test:all` - Run all test suites

**Running a Single Test:**

- **Vitest:** `npx vitest tests/unit/shared/hotkeys.test.ts` (or any path)
- **WDIO (E2E):** `npm run test:e2e:spec -- --spec=tests/e2e/auth.spec.ts`
- **WDIO (Integration):** `npm run test:integration -- --spec=tests/integration/your-test.integration.test.ts`

**Headless ARM Linux Notes:**

- On Linux, headless mode is detected when `DISPLAY` is unset; WDIO auto-manages Xvfb in this case. Do **not** force `DISPLAY` for headless runs.
- Use `CHROMEDRIVER_PATH` only if you need to override the chromedriver binary (e.g., custom ARM builds).
- See `docs/ARM_LINUX_TESTING.md` for package prerequisites and runbook steps.

---

## 🏗 Code Style & Guidelines

### 1. Languages & Frameworks

- **TypeScript** for all logic. Use strict typing.
- **React 19** for UI.
- **Electron** for the desktop wrapper.
- **Framer Motion** for animations.

### 2. Imports

Follow this order for imports:

1. React and third-party libraries.
2. Local components, contexts, and hooks.
3. Types and constants.
4. CSS/Styles.

```typescript
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { MainLayout } from './components';
import { useToast } from './context/ToastContext';
import { APP_ID } from './utils/constants';
import './App.css';
```

### 3. Naming Conventions

- **Components:** `PascalCase` (e.g., `ToastContainer.tsx`).
- **Hooks:** `camelCase` with `use` prefix (e.g., `useGeminiIframe.ts`).
- **Functions/Variables:** `camelCase`.
- **Constants:** `SCREAMING_SNAKE_CASE`.
- **Types/Interfaces:** `PascalCase`. Prefer `type` for simple definitions and `interface` for complex objects.

### 4. Error Handling & Logging

- Use the custom logger: `import { createLogger } from './utils/logger';`
- Always log errors with context: `logger.error('Failed to initialize tray:', error);`
- Use React **Error Boundaries** (`GeminiErrorBoundary`) to wrap risky UI sections.
- Main process: Handle `uncaughtException` and `unhandledRejection` (already implemented in `main.ts`).

### 5. Types

- Avoid `any`. Use `unknown` if the type is truly unknown.
- Define IPC channel names in `src/shared/constants/ipc-channels.ts`.
- Define shared types in `src/shared/types/`.

### 6. State Management

- Use **React Context** for global UI state (Theme, Toast, Auth).
- Use local `useState`/`useReducer` for component-specific state.
- Main process state should be managed via managers (e.g., `WindowManager`, `HotkeyManager`).

### 7. Formatting

- Use **Prettier** with the following settings (defined in `.prettierrc`):
    - `tabWidth: 4`
    - `singleQuote: true`
    - `printWidth: 120`
    - `semi: true`
- Run `npm run format` to apply formatting project-wide.

---

## 🗺 Project Structure

- `src/main/`: Electron main process logic and managers (Window, IPC, Tray, etc.).
- `src/renderer/`: React frontend code (Components, Hooks, Context, Styles).
- `src/preload/`: Electron preload scripts for secure bridge communication.
- `src/shared/`: Code shared between main and renderer (types, constants, utils).
- `tests/`:
    - `unit/`: Vitest unit tests for shared, renderer, and preload.
    - `integration/`: WDIO integration tests for real Electron cross-boundary behavior.
    - `coordinated/`: Vitest tests for multi-window coordination.
    - `shared/`: Shared WDIO test infrastructure (wait utilities, timing constants, logging).
    - `e2e/`: WDIO End-to-End tests.

For a full architecture deep-dive (managers, IPC handler pattern, data stores, security model), see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
If you need help deciding which doc to read next, use [docs/AI_AGENT_DOC_INDEX.md](docs/AI_AGENT_DOC_INDEX.md).

## 📂 Boundary-Specific Guides

Each subdirectory has its own AGENTS.md with boundary-specific conventions:

- [src/main/AGENTS.md](src/main/AGENTS.md) — Electron main process, IPC handlers, managers
- [src/renderer/AGENTS.md](src/renderer/AGENTS.md) — React frontend, contexts, hooks
- [src/preload/AGENTS.md](src/preload/AGENTS.md) — Preload bridge, security boundary
- [src/shared/AGENTS.md](src/shared/AGENTS.md) — Shared contracts, IPC channels, shared types
- [tests/integration/AGENTS.md](tests/integration/AGENTS.md) — Integration tests, helpers, single-spec WDIO usage
- [tests/coordinated/AGENTS.md](tests/coordinated/AGENTS.md) — Coordinated multi-window and IPC contract tests
- [tests/shared/AGENTS.md](tests/shared/AGENTS.md) — Shared WDIO test infrastructure and canonical wait utilities
- [tests/e2e/AGENTS.md](tests/e2e/AGENTS.md) — E2E tests, deterministic waits
- [tests/unit/AGENTS.md](tests/unit/AGENTS.md) — Unit tests, mock patterns

## ✅ Verification Matrix

Run the appropriate commands based on what you changed:

| Change Scope         | Test Command(s)                                                           | What It Runs                                |
| -------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| `src/renderer/`      | `npm run test`, `npm run lint`                                            | Vitest (jsdom) — renderer unit tests        |
| `src/main/`          | `npm run test:electron`, `npm run lint`                                   | Vitest (node) — main process unit tests     |
| `src/preload/`       | `npm run test:electron`, `npm run lint`                                   | Vitest (node) — preload unit tests          |
| `src/shared/`        | `npm run test:electron`, `npm run lint`                                   | Vitest (node) — shared utility tests        |
| `tests/integration/` | `npm run test:integration` or `npm run test:integration -- --spec=<path>` | WDIO integration tests                      |
| Cross-boundary (IPC) | `npm run test:electron`, `npm run test:integration`, `npm run lint`       | Unit + WDIO integration                     |
| `tests/coordinated/` | `npm run test:coordinated`                                                | Vitest (jsdom) — multi-window coordination  |
| `tests/shared/`      | `npm run lint` + relevant `test:integration` / `test:e2e:spec` coverage   | Shared WDIO helpers used by multiple suites |
| `tests/e2e/`         | `npm run test:e2e` or `npm run test:e2e:spec -- --spec=<path>`            | WDIO E2E tests                              |
| Everything           | `npm run test:all`                                                        | Full sequential suite                       |

## 🔧 Documentation Maintenance Contract

AI agents must update the relevant documentation in the same PR whenever behavior, structure, commands, boundaries, workflows, or source-of-truth file locations change.
When commands, boundaries, or patterns change, the nearest AGENTS.md or operational doc **must** be updated in the same PR:

| If you modify...                                  | Update...                            |
| ------------------------------------------------- | ------------------------------------ |
| IPC handlers in `src/main/managers/ipc/`          | `src/main/AGENTS.md`                 |
| Manager patterns in `src/main/managers/`          | `src/main/AGENTS.md`                 |
| React contexts/hooks in `src/renderer/`           | `src/renderer/AGENTS.md`             |
| Preload bridge APIs in `src/preload/`             | `src/preload/AGENTS.md`              |
| Shared contracts/types/channels in `src/shared/`  | `src/shared/AGENTS.md`               |
| Integration test patterns/helpers/config          | `tests/integration/AGENTS.md`        |
| Coordinated test patterns/helpers/config          | `tests/coordinated/AGENTS.md`        |
| Shared test utilities/routing in `tests/shared/`  | `tests/shared/AGENTS.md`             |
| E2E wait utilities or test patterns               | `tests/e2e/AGENTS.md`                |
| Unit test mock factories or patterns              | `tests/unit/AGENTS.md`               |
| AI-agent routing or documentation discovery paths | `docs/AI_AGENT_DOC_INDEX.md`         |
| Wayland / ARM Linux / browser validation runbooks | nearest relevant `docs/*.md` runbook |
| Global build/lint/test commands                   | Root `AGENTS.md`                     |
| Verification matrix commands                      | Root `AGENTS.md`                     |

---

---

## 🛑 Anti-Patterns & Deprecated Practices

AI agents should actively avoid the following patterns, as they violate the project's architecture or lead to bugs:

- **DO NOT** use global mutable state for managers (e.g., `let windowManager = new WindowManager()`). Always use dependency injection via `ApplicationContext` in `main.ts`.
- **DO NOT** use `browser.pause()` in E2E tests for waiting. Always use explicit conditions with `browser.waitUntil()` or similar deterministic waits.
- **DO NOT** add Node.js APIs (like `fs`, `path`, `child_process`) directly into the Renderer process. They must be exposed safely via the `preload.ts` bridge and typed in IPC channels.
- **DO NOT** duplicate WDIO configurations. Standalone config files should extend `wdio.base.conf.js`.
- **DO NOT** bypass `GeminiErrorBoundary` for risky UI sections; always ensure appropriate React error boundaries are established.

---

## 🧠 AI Agent Directives

If you are an AI assistant (like GitHub Copilot, Cursor, Windsurf, or a custom agent), adhere to these directives:

1. **Chain of Thought:** Always think step-by-step. Outline a brief implementation plan before generating, editing, or deleting code.
2. **Context First:** Refer to `docs/ARCHITECTURE.md` before making structural changes to the main process or renderer integration.
3. **Verify Constraints:** Identify edge cases and ensure safety constraints (no telemetry, strict CSP, Node isolation) are met before modifying any file.
4. **Holistic Validation:** When modifying code, also consider the impact on accompanying test files (`tests/unit`, `tests/e2e`, `tests/coordinated`).

---

## 🌐 Domain Context

- **Gemini Web App:** The app embeds `https://gemini.google.com/app` in an iframe after stripping `X-Frame-Options` headers.
- **Quick Chat:** Spotlight-style floating window. Fresh installs default to `Alt+Space` on all platforms. Existing installs preserve their persisted hotkey (authoritative).
- **Peek and Hide:** Instantly hide app to system tray via hotkey (`Ctrl+Shift+Space`).
- **Session Persistence:** Google auth sessions stored in Chromium's encrypted cookie storage via `persist:gemini` partition.

---

## 🔒 Important Constraints

- **No telemetry:** The app collects zero analytics or usage data.
- **Google-only connections:** Only connects to `*.google.com` domains.
- **No Node.js in renderer:** All Node.js access goes through the preload bridge.
- **Header stripping scope:** `X-Frame-Options` stripping applies only to `gemini.google.com`.
- **Cross-platform:** Must work on Windows (x64 and ARM64), macOS (Intel + ARM64), and Linux.
