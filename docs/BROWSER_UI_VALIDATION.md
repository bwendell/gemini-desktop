# Browser UI Validation Guide

> [!WARNING]
> **Functionality does not work in browser mode.** This guide is for **UI/styling validation only**.

## Overview

When the Vite dev server is running (`npm run electron:dev`), you can view individual windows in a regular browser to validate UI appearance without launching the full Electron app.

## Available URLs

| Window     | URL                                                                   | Purpose            |
| ---------- | --------------------------------------------------------------------- | ------------------ |
| Options    | `http://localhost:1420/src/renderer/windows/options/options.html`     | Settings panel UI  |
| Quick Chat | `http://localhost:1420/src/renderer/windows/quickchat/quickchat.html` | Floating prompt UI |

> [!IMPORTANT]
> The main window (`http://localhost:1420/`) will show a broken iframe because the Gemini embed requires Electron's header stripping to work.

## What Works

- ✅ Layout and spacing
- ✅ Colors, typography, themes
- ✅ CSS animations and transitions
- ✅ Responsive design checks
- ✅ Component structure
- ✅ Hover states and focus indicators

## What Doesn't Work

- ❌ Button clicks that call `window.electronAPI.*`
- ❌ Settings persistence
- ❌ Window open/close/minimize
- ❌ IPC events and subscriptions
- ❌ Theme sync across windows
- ❌ Gemini iframe (main window)

## Why This Limitation Exists

The app uses Electron-specific APIs:

1. **Header Stripping**: Electron's `session.webRequest.onHeadersReceived` strips `X-Frame-Options` from Gemini responses - browsers enforce these headers
2. **IPC Bridge**: `window.electronAPI` is exposed via Electron's `contextBridge` in the preload script
3. **Multi-Window**: Settings/Auth/Quick Chat windows are separate `BrowserWindow` instances

## For Full Testing

Use the existing test suites:

```bash
# Unit tests (React components + utilities)
npm run test

# Multi-module integration tests
npm run test:coordinated

# Full Electron integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e
```

See [E2E_TESTING_GUIDELINES.md](./E2E_TESTING_GUIDELINES.md) for E2E test patterns.
