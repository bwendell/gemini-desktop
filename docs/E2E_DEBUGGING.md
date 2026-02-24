# E2E Test Failure Forensics

This guide explains how to diagnose E2E test failures using the automated diagnostics and reporting system.

## Quick Start: When a Test Fails

1. **Check the job summary** in GitHub Actions for rerun commands
2. **Download artifacts** (screenshots, logs, Allure report)
3. **Review `failure-index.json`** for structured failure data
4. **Run locally** using the provided rerun command

## Artifact Layout

After any E2E failure, these artifacts are generated:

```
tests/e2e/
├── screenshots/          # PNG screenshots on failure
│   └── {spec}--{test}--{timestamp}.png
├── logs/                 # JSON state dumps and failure index
│   ├── {spec}--{test}--{timestamp}.json
│   ├── failure-index.json
│   └── flaky-report.json
├── allure-results/       # Raw Allure results
└── allure-report/        # Generated HTML report
```

## Redaction Behavior

Sensitive fields are automatically redacted from state dumps:

- `token`, `cookie`, `auth`, `session`
- `password`, `secret`, `key` (case-insensitive)

Redacted values show as `[REDACTED]`.

## Local Debugging

### Debug Config

Use debug config for detailed logging and longer timeouts:

```bash
# Run all specs with debug logging
npm run test:e2e:debug

# Run specific spec with debug logging
npm run test:e2e:debug:spec -- tests/e2e/app-startup.spec.ts
```

Debug config features:
- `logLevel: 'debug'` - Maximum logging detail
- `specFileRetries: 0` - No automatic retries
- Extended timeouts (3 minutes test timeout)

### Smoke Tests

Run critical path tests quickly with fail-fast behavior:

```bash
npm run test:e2e:smoke
```

Smoke tests include:
- app-startup.spec.ts
- auth.spec.ts
- tray.spec.ts
- window-controls.spec.ts

## Allure Reports

### Generate and View Reports Locally

```bash
# After running tests, generate report
npm run test:e2e:allure:report

# Or generate and open separately
npm run test:e2e:allure:generate
npm run test:e2e:allure:open
```

### CI Artifacts

Allure reports are automatically uploaded as artifacts in CI:
- `allure-results-{group}-{os}` - Raw test results
- `allure-report-{group}-{os}` - Generated HTML report

## Retry Policy

Default retry configuration:

- **specFileRetries**: 1 (retry entire spec file once for infrastructure issues)
- **mochaOpts.retries**: 0 (no individual test retries)

Override via environment:
- `WDIO_SPEC_FILE_RETRIES=2` - Change spec retries
- `WDIO_TEST_RETRIES=1` - Enable test-level retries

## Troubleshooting

### No artifacts generated

Check that the test actually failed - artifacts are only generated on failure.

### Allure report empty

Ensure `tests/e2e/allure-results/` contains `.json` files before generating.

### Screenshot not captured

Screenshot capture may fail if:
- Browser crashed before screenshot
- Window was minimized/closed
- Disk space issues

### State dump missing

State dump requires `browser.electron.execute()` to work. If the app crashed, state may not be available.

## Additional Resources

- [E2E Testing Guidelines](E2E_TESTING_GUIDELINES.md)
- [E2E Wait Patterns](E2E_WAIT_PATTERNS.md)
- [WebdriverIO Documentation](https://webdriver.io/docs/)
