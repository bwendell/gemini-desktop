# Change: Add CI Retry Controls for Flaky Integration/E2E Suites

## Why

Integration, E2E, and release E2E jobs intermittently fail in CI due to timing instability. We need a temporary resilience mechanism while underlying flakes are investigated.

## What Changes

- Add configurable WebdriverIO spec-level retry support to integration, regular E2E, and release E2E configs.
- Add configurable Mocha test-level retries in the same suites.
- Default retry values to CI-friendly settings while allowing environment overrides.

## Impact

- Affected specs: `test-reliability`
- Affected code:
    - `config/wdio/wdio.base.conf.js`
    - `config/wdio/wdio.conf.js`
    - `config/wdio/wdio.integration.conf.js`
    - `config/wdio/wdio.release.conf.js`
