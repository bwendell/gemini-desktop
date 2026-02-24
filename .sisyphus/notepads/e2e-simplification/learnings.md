# E2E Simplification - Task 1 Troubleshooting (AI-Only)

## Artifact Capture Implementation

Failure artifacts (screenshots and DOM snapshots) are captured automatically in `afterTest` hooks.

### Implementation Details
- **Trigger**: Runs if `!passed`.
- **Screenshot**: Uses `browser.saveScreenshot(path)`.
- **DOM Snapshot**: Uses `browser.execute(() => document.documentElement.outerHTML)`.
- **Retry Logic**: Attempt number is derived from `retries?.attempts` (object) with a fallback to `0`.
- **Timestamp**: Uses a full sanitized ISO string: `new Date().toISOString().replace(/[:.]/g, '-')`.
- **Filename Sanitization**:
  - Replaces `<>:"/\\|?*` with `_`.
  - Replaces spaces with `-`.
  - Trims trailing dots and spaces.
  - Caps length at 80 characters.
- **Storage**: Saved to `tests/e2e/screenshots/`.

## Environment Troubleshooting

### 1. Build Failures (`node-llama-cpp`)
- **Symptom**: `npm run build:electron` fails during `node-llama-cpp` compilation.
- **Root Cause**: Native dependency compilation issues.
- **Fix**: Verify build tools are installed or ensure the architecture is supported.

### 2. Missing Main Bundle
- **Symptom**: `Error: Cannot find module '.../dist-electron/main/main.cjs'`.
- **Fix**: Execute `npm run build` to generate the `dist-electron` directory.

### 3. Missing LSP Diagnostics
- **Symptom**: `lsp_diagnostics` tool fails or returns no data.
- **Fix**: Confirm `typescript-language-server` is installed or fall back to `npm run lint`.

## Verification Status
The `afterTest` hooks are implemented in both `config/wdio/wdio.conf.js` and `config/wdio/wdio.base.conf.js`. The directory `tests/e2e/screenshots/` exists with a `.gitkeep` file. `.gitignore` is configured to exclude artifacts.
