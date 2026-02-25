# Headless ARM Linux Testing

This project now supports automatic WDIO test setup on headless Linux ARM64 hosts.

## One command

Run the full coordinated + integration + E2E flow:

```bash
npm run test:headless:auto
```

## What auto-detection does

When `process.platform === 'linux'` and `process.arch === 'arm64'`, the WDIO startup path automatically:

1. Sets CI-style behavior for headless execution if no display is available.
2. Resolves installed Electron version from `node_modules/electron/package.json`.
3. Downloads matching ARM Chromedriver from Electron releases.
4. Caches Chromedriver locally and exports `CHROMEDRIVER_PATH`.
5. Enables `SKIP_BUILD=true` when `node-llama-cpp` is missing but prebuilt Electron artifacts exist.

This is wired into WDIO config entrypoints, so normal commands also benefit:

- `npm run test:integration`
- `npm run test:e2e:spec`
- `npm run test:e2e`

## Cache location

Default cache path:

```text
~/.cache/gemini-desktop/chromedriver/
```

Override cache root:

```bash
export GEMINI_DESKTOP_CACHE_DIR=/path/to/cache
```

## Optional overrides

Pin your own Chromedriver binary:

```bash
export CHROMEDRIVER_PATH=/abs/path/to/chromedriver
```

If `CHROMEDRIVER_PATH` is set, auto-download is skipped.

## Notes

- The first run downloads Chromedriver. Later runs reuse cache.
- WDIO still may retry flaky E2E specs in CI-like headless environments; this is expected.
- Coordinated tests are Vitest-based and do not require Chromedriver.
