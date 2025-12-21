# Contributing to Gemini Desktop

First off, thank you for considering contributing to Gemini Desktop! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)

---

## Code of Conduct

This project follows a simple code of conduct: **be kind, be respectful, be helpful**. We're all here to make something cool together.

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check if the issue already exists.

**When filing a bug, include:**

- **Your OS** (Windows 10/11, macOS version, Linux distro)
- **App version** (check Help → About)
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Console logs** (View → Toggle DevTools → Console)

[Open a bug report →](https://github.com/bwendell/gemini-desktop/issues/new?template=bug_report.md)

### Suggesting Features

Have an idea? We'd love to hear it!

**For feature requests, describe:**

- **The problem** you're trying to solve
- **Your proposed solution**
- **Alternatives** you've considered

[Request a feature →](https://github.com/bwendell/gemini-desktop/issues/new?template=feature_request.md)

### Pull Requests

1. **Fork** the repo and create your branch from `main`
2. **Install** dependencies: `npm install`
3. **Make** your changes
4. **Test** your changes: `npm run test:all`
5. **Commit** with a clear message
6. **Push** and open a Pull Request

#### PR Guidelines

- Keep PRs focused on a single change
- Update tests if you change functionality
- Follow existing code style
- Reference any related issues

---

## Development Setup

### Prerequisites

- **Node.js** 18 or higher
- **npm** 9 or higher
- **Git**

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/gemini-desktop.git
cd gemini-desktop

# Install dependencies
npm install

# Start development mode
npm run electron:dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run electron:dev` | Start development mode |
| `npm run electron:build` | Build for production |
| `npm run test` | Run React unit tests |
| `npm run test:electron` | Run Electron unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:all` | Run all tests |

---

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes

### React

- Functional components with hooks
- Keep components small and focused
- Use context for shared state

### Electron

- Follow the security checklist
- Use IPC for main ↔ renderer communication
- Keep the main process lean

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add zen mode toggle
fix: resolve tray icon not showing on Linux
docs: update installation instructions
test: add e2e tests for quick chat
```

---

## Testing

We maintain high test coverage. Please add tests for new features.

### Running Tests

```bash
# All tests
npm run test:all

# Just React tests
npm run test

# Just Electron tests
npm run test:electron

# E2E tests (requires built app)
npm run test:e2e
```

### Writing Tests

- Unit tests go in `*.test.ts` files next to the source
- E2E tests go in `tests/specs/`
- Mock external dependencies

---

## Questions?

Feel free to open a [Discussion](https://github.com/bwendell/gemini-desktop/discussions) if you have questions or want to chat about the project.

Thanks for contributing! 🚀
