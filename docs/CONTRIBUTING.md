# Contributing to Gemini Desktop

First off, thank you for considering contributing to Gemini Desktop! 🎉 This guide walks you through setup, testing, code style, and the contribution workflow.

> **Quick summary:** Use **Node.js 20+**, install dependencies with `npm install`, run the app with `npm run electron:dev`, and run the relevant tests before opening a PR.

## Table of Contents

- [Welcome](#welcome)
- [Development Setup](#development-setup)
- [Available Scripts](#available-scripts)
- [Testing Guide](#testing-guide)
- [Code Style & Linting](#code-style--linting)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Commit Message Format](#commit-message-format)
- [Contributing Workflow](#contributing-workflow)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Additional Resources](#additional-resources)
- [Closing](#closing)

---

## Welcome

We follow a simple code of conduct: **be kind, be respectful, be helpful**. If you’re unsure where to start, feel free to open an issue or a discussion.

## Development Setup

### Prerequisites

- **Node.js 20+** (CI uses Node 20)
- **npm 9+**
- **Git**

### Getting Started

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/gemini-desktop.git
cd gemini-desktop

# Install dependencies
npm install

# Start development mode
npm run electron:dev
```

### Project Structure (high level)

```text
src/main/      # Electron main process
src/renderer/  # React UI
src/preload/   # Secure preload bridge
src/shared/    # Shared types and constants
tests/         # Unit, coordinated, integration, and E2E tests
```

For a deeper architecture overview, see [docs/ARCHITECTURE.md](ARCHITECTURE.md).

## Available Scripts

All scripts below come from `package.json` and are the source of truth for contributing and CI workflows.

| Category    | Script                             | Description                                       |
| ----------- | ---------------------------------- | ------------------------------------------------- |
| Development | `npm run dev`                      | Start Vite dev server                             |
| Development | `npm run preview`                  | Preview the Vite build                            |
| Development | `npm run electron:dev`             | Build Electron + run Vite + launch app            |
| Build       | `npm run build`                    | Type-check and build renderer (TypeScript + Vite) |
| Build       | `npm run build:electron`           | Build Electron main/preload output                |
| Build       | `npm run electron:build`           | Full production build via electron-builder        |
| Build       | `npm run clean`                    | Remove build artifacts                            |
| Release     | `npm run dist:mac-x64`             | Build macOS x64 release artifact                  |
| Release     | `npm run dist:mac-arm64`           | Build macOS ARM64 release artifact                |
| Release     | `npm run dist:win`                 | Build Windows release artifact                    |
| Release     | `npm run dist:linux`               | Build Linux release artifact                      |
| Lint/Format | `npm run lint`                     | Run ESLint across the repo                        |
| Lint/Format | `npm run format`                   | Format files with Prettier                        |
| Docs        | `npm run docs`                     | Generate TypeDoc docs                             |
| Test        | `npm run test`                     | Run unit tests (Vitest)                           |
| Test        | `npm run test:watch`               | Run unit tests in watch mode                      |
| Test        | `npm run test:coverage`            | Run unit tests with coverage                      |
| Test        | `npm run test:electron`            | Run Electron unit tests                           |
| Test        | `npm run test:electron:coverage`   | Run Electron unit tests with coverage             |
| Test        | `npm run test:coordinated`         | Run coordinated multi-window tests                |
| Test        | `npm run test:integration`         | Run integration tests (WDIO)                      |
| Test        | `npm run test:integration:watch`   | Run integration tests in watch mode               |
| Test        | `npm run test:e2e`                 | Run E2E tests sequentially                        |
| Test        | `npm run test:e2e:spec`            | Run a single E2E spec (WDIO)                      |
| Test        | `npm run test:e2e:group:startup`   | Run E2E startup group                             |
| Test        | `npm run test:e2e:group:window`    | Run E2E window group                              |
| Test        | `npm run test:e2e:group:menu`      | Run E2E menu group                                |
| Test        | `npm run test:e2e:group:hotkeys`   | Run E2E hotkeys group                             |
| Test        | `npm run test:e2e:group:quickchat` | Run E2E quickchat group                           |
| Test        | `npm run test:e2e:group:options`   | Run E2E options group                             |
| Test        | `npm run test:e2e:group:theme`     | Run E2E theme group                               |
| Test        | `npm run test:e2e:group:auth`      | Run E2E auth group                                |
| Test        | `npm run test:e2e:group:tray`      | Run E2E tray group                                |
| Test        | `npm run test:e2e:group:update`    | Run E2E update group                              |
| Test        | `npm run test:e2e:group:stability` | Run E2E stability group                           |
| Test        | `npm run test:e2e:group:toast`     | Run E2E toast group                               |
| Test        | `npm run test:e2e:group:macos`     | Run E2E macOS group                               |
| Test        | `npm run test:e2e:lifecycle`       | Run E2E lifecycle tests                           |
| Test        | `npm run test:e2e:release`         | Run E2E release tests                             |
| Test        | `npm run test:e2e:all`             | Run all E2E tests (sequential + lifecycle)        |
| Test        | `npm run test:all`                 | Run the full test suite                           |
| Meta        | `npm run prepare`                  | Install Husky hooks                               |

## Testing Guide

We use a five-tier testing strategy. Please run the relevant tier(s) before opening a PR.

### Test Tiers

1. **Unit tests** (Vitest)
2. **Electron unit tests** (Vitest with Electron config)
3. **Coordinated tests** (Vitest multi-window)
4. **Integration tests** (WebdriverIO)
5. **End-to-end (E2E) tests** (WebdriverIO)

### How to Run Tests

```bash
# Unit tests
npm run test

# Electron unit tests
npm run test:electron

# Coordinated tests
npm run test:coordinated

# Integration tests
npm run test:integration

# E2E tests (sequential)
npm run test:e2e

# Full test suite
npm run test:all
```

### Run a Single Test File

```bash
# Vitest single test file
npm run test -- tests/unit/shared/hotkeys.test.ts

# WDIO E2E single spec
npm run test:e2e:spec -- --spec=tests/e2e/auth.spec.ts

# WDIO integration single spec
npm run test:integration -- --spec=tests/integration/your-test.integration.test.ts
```

### E2E References

- [docs/E2E_TESTING_GUIDELINES.md](E2E_TESTING_GUIDELINES.md)
- [docs/E2E_WAIT_PATTERNS.md](E2E_WAIT_PATTERNS.md)

### ARM Linux / Headless Notes

If you’re running tests on headless ARM Linux, follow the runbook in [docs/ARM_LINUX_TESTING.md](ARM_LINUX_TESTING.md).

## Code Style & Linting

### Prettier

Prettier is the formatter for this repository. Key settings (from `.prettierrc`):

- `tabWidth: 4`
- `singleQuote: true`
- `printWidth: 120`
- `trailingComma: es5`
- `semi: true`

Run formatting across the repo:

```bash
npm run format
```

### ESLint

ESLint is configured with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`.

Notable rules:

- `@typescript-eslint/no-explicit-any` is **warn** in source and **off** in tests.
- `@typescript-eslint/no-unused-vars` is **error** (underscore-prefixed names are ignored).
- `react-hooks/exhaustive-deps` is **warn**.
- `react-refresh/only-export-components` is **warn**.

Run linting:

```bash
npm run lint
```

### Import Order Convention

When writing TypeScript/React code, follow this order:

1. React and third-party libraries
2. Local components, contexts, and hooks
3. Types and constants
4. CSS/Styles

## Pre-commit Hooks

We use **Husky + lint-staged**. On commit, Husky runs:

```bash
npx lint-staged
```

`lint-staged` runs this on staged files:

```bash
prettier --write --ignore-unknown
```

If the hook modifies files, re-stage them and commit again.

## Commit Message Format

Use conventional commits so the history stays clean and readable:

```
feat: add zen mode toggle
fix: resolve tray icon not showing on Linux
docs: update installation instructions
test: add e2e tests for quick chat
refactor: simplify ipc handler wiring
chore: bump electron-builder
```

Common prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

## Contributing Workflow

1. **Fork** the repo and create your branch from `main`.
2. **Install** dependencies: `npm install`.
3. **Make** your changes.
4. **Run** relevant tests (see [Testing Guide](#testing-guide)).
5. **Commit** using the conventional format above.
6. **Push** your branch and open a Pull Request targeting `main`.

### PR Checklist (include in your description)

- [ ] Tests pass for the areas you touched
- [ ] `npm run lint` and `npm run format` are clean
- [ ] Conventional commit message(s)
- [ ] Clear description of what changed and why

## Reporting Bugs

Open a new issue here: https://github.com/bwendell/gemini-desktop/issues/new

Please include:

- OS + version (Windows/macOS/Linux distro)
- Desktop environment + display server (Wayland/X11) when relevant
- App version and package format (AppImage/RPM/DMG/EXE)
- Steps to reproduce (numbered)
- Expected behavior vs actual behavior
- Console logs (View → Toggle DevTools → Console)
- Terminal output if the app crashes on launch
- Workarounds you already tried

Example of a great report: Issue [#158](https://github.com/bwendell/gemini-desktop/issues/158).

## Requesting Features

Open a new issue here: https://github.com/bwendell/gemini-desktop/issues/new

Please describe:

- The problem you’re trying to solve
- Why it matters for your workflow
- Any alternatives you’ve considered

## Additional Resources

- [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md)
- [docs/E2E_TESTING_GUIDELINES.md](E2E_TESTING_GUIDELINES.md)
- [docs/ARM_LINUX_TESTING.md](ARM_LINUX_TESTING.md)
- [docs/WAYLAND_MANUAL_TESTING.md](WAYLAND_MANUAL_TESTING.md)

## Closing

Thanks again for contributing! If you get stuck, open a discussion or issue and we’ll help you out.

Return to the main project overview: [README.md](../README.md)
