# Project Context

## Purpose

Gemini Desktop is a native desktop wrapper for Google Gemini that provides enhanced features beyond the web experience, including global hotkeys, system tray integration, Quick Chat (a Spotlight-style floating prompt), and auto-updates. The app embeds the Gemini web application in an iframe while respecting Google's authentication flow.

## Tech Stack

- **Runtime:** Electron 39
- **Frontend:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Styling:** CSS Modules
- **Animations:** Framer Motion
- **State:** React Context API
- **Settings Storage:** electron-store pattern (JSON file)
- **Auto-Updates:** electron-updater
- **Logging:** electron-log

## Project Conventions

### Code Style

- **Linter:** ESLint (flat config in `eslint.config.js`)
- **Formatter:** Prettier (config in `.prettierrc`)
- **Language:** TypeScript everywhere (`tsconfig.json`, `tsconfig.electron.json`)
- **File naming:** kebab-case for files, PascalCase for components/classes
- **Imports:** Use `@/` path alias for `src/` imports

### Architecture Patterns

- **3-Process Model:** Main (Node.js) → Preload (bridge) → Renderer (Chromium/React)
- **Manager Pattern:** Core functionality in dedicated managers (`windowManager`, `ipcManager`, `hotkeyManager`, etc.)
- **Window Classes:** Each window type extends `BaseWindow` abstract class
- **IPC Channels:** All channels defined centrally in `src/shared/constants/ipc-channels.ts`
- **Type Sharing:** Types in `src/shared/types/` are shared between main and renderer
- **Security First:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`

### Testing Strategy

| Type          | Framework   | Config                                       | Command                    |
| ------------- | ----------- | -------------------------------------------- | -------------------------- |
| Unit          | Vitest      | `config/vitest/vitest.config.ts`             | `npm run test`             |
| Electron Unit | Vitest      | `config/vitest/vitest.electron.config.ts`    | `npm run test:electron`    |
| Coordinated   | Vitest      | `config/vitest/vitest.coordinated.config.ts` | `npm run test:coordinated` |
| Integration   | WebdriverIO | `config/wdio/wdio.integration.conf.js`       | `npm run test:integration` |
| E2E           | WebdriverIO | `config/wdio/wdio.e2e.conf.js`               | `npm run test:e2e`         |

**E2E Testing Rules:**

1. Simulate real user actions only (clicks, typing, keypresses)
2. Verify actual outcomes visible to users
3. Test the full stack (Renderer → IPC → Main → Side effects)
4. Never call internal methods to trigger behavior—use UI interactions
5. See `docs/E2E_TESTING_GUIDELINES.md` for complete rules

### Git Workflow

- **Main branch:** `main`
- **CI:** GitHub Actions (`test.yml` on PRs, `release.yml` on tags)
- **Releases:** Triggered by version tags, builds distributed via GitHub Releases

## Domain Context

- **Gemini Web App:** The app embeds `https://gemini.google.com/app` in an iframe after stripping `X-Frame-Options` headers
- **Quick Chat:** Spotlight-style floating window activated by global hotkey (`Ctrl+Shift+Space`) for quick prompts
- **Stealth Mode:** Instantly hide app to system tray via hotkey (`Ctrl+Alt+E`)
- **Session Persistence:** Google auth sessions stored in Chromium's encrypted cookie storage via `persist:gemini` partition

## Important Constraints

- **No telemetry:** The app collects zero analytics or usage data
- **Google-only connections:** Only connects to `*.google.com` domains
- **No Node.js in renderer:** All Node.js access goes through the preload bridge
- **Header stripping scope:** `X-Frame-Options` stripping applies only to `gemini.google.com`
- **Cross-platform:** Must work on Windows, macOS (Intel + ARM), and Linux

## External Dependencies

| Service         | Purpose                  | Integration              |
| --------------- | ------------------------ | ------------------------ |
| Google Gemini   | Core AI functionality    | Iframe embedding         |
| Google OAuth    | User authentication      | BrowserWindow login flow |
| GitHub Releases | Auto-update distribution | electron-updater         |
