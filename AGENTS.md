# Agent Instructions: Gemini Desktop

This guide is for agentic coding agents working in the Gemini Desktop repository. It details project-specific commands, conventions, and workflows.

## 🛠 Build, Lint, and Test Commands

The project uses **npm** for package management and **Vitest** + **WebdriverIO** for testing.

### Development & Build

- `npm install` - Install dependencies
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
- **WDIO (E2E):** `npx wdio run config/wdio/wdio.conf.js --spec tests/e2e/auth.spec.ts`

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
    - `coordinated/`: Vitest tests for multi-window coordination.
    - `e2e/`: WDIO End-to-End tests.
- `openspec/`: Specification-driven development docs (see `openspec/AGENTS.md`).

---

## 📜 OpenSpec Workflow

This project uses **OpenSpec** for planning and tracking changes.
**CRITICAL:** For any non-trivial change, you MUST follow the OpenSpec workflow:

1. Read `openspec/AGENTS.md` for detailed instructions.
2. Create a change proposal in `openspec/changes/`.
3. Update `tasks.md` as you progress.
4. Archive the change once complete.

---

## 🤖 Cursor & Copilot Rules

- Follow existing patterns in `.cursor/rules/` if they exist (none found currently).
- Adhere to the `Core Mandates` in the system prompt.

---

## 🛡️ Boundaries

### ✅ Always Do

- Run `npm run lint` and `npm run test && npm run test:electron` before committing
- Use existing patterns from `docs/ARCHITECTURE.md`
- Reference existing components before creating new ones

### ⚠️ Ask First

- Adding new npm dependencies
- Modifying IPC channel definitions in `src/shared/constants/ipc-channels.ts`
- Changing Electron main process security settings
- Architectural changes affecting multiple managers

### 🚫 Never Do

- Commit secrets, API keys, or credentials
- Force push to main branch
- Modify `electron-builder.yml` without explicit approval

---

## ✅ Pre-Commit Checklist

Before committing, verify:

```bash
npm run lint          # No ESLint errors
npm run test          # Unit tests pass
npm run test:electron # Electron tests pass
npm run build         # TypeScript compiles
```

For E2E changes, also run relevant group:

```bash
npm run test:e2e:group:quickchat  # Example: Quick Chat changes
```

**Commit Message Format**: `type(scope): description`

- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Scope: `main`, `renderer`, `shared`, `e2e`, `build`

---

## 🤔 When Stuck

If you're uncertain about how to proceed:

1. **Check existing patterns first**:
    - `docs/ARCHITECTURE.md` - System design, IPC patterns, manager patterns
    - `docs/E2E_TESTING_GUIDELINES.md` - Test patterns and anti-patterns
    - Search codebase for similar implementations

2. **Ask clarifying questions** rather than making assumptions:
    - "Should this follow the existing X pattern, or is a new approach needed?"
    - "This change affects Y. Should I also update Z?"
