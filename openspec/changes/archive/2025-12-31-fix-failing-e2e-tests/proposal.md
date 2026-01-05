# Change: Fix Failing E2E Tests

## Why

Eight out of eleven E2E test groups are failing, preventing reliable verification of the codebase. Restoring these tests is critical for maintaining quality and enabling safe future changes.

## What Changes

- Fix `tests/e2e/group/startup*` logic and timing
- Fix `tests/e2e/group/options*` logic and interactions
- Fix `tests/e2e/group/menu*` selectors and timing
- Fix `tests/e2e/group/hotkeys*` simulation logic
- Fix `tests/e2e/group/window*` state assertions
- Fix `tests/e2e/group/tray*` interaction simulations
- Fix `tests/e2e/group/update*` mocking
- Fix `tests/e2e/group/stability*` resource handling

## Impact

- Affected specs: `test-reliability`
- Affected code: `tests/e2e/**`
