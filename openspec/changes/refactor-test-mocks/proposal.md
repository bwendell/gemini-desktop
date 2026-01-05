# Change: Refactor Test Mock Infrastructure

## Why

The test suite has significant code duplication in mock setups across 100+ test files. Logger mocks are duplicated 37+ times, `mockWindowManager` appears 100+ times, and `mockStore` 180+ times. This duplication makes tests harder to maintain, increases the risk of inconsistencies, and bloats test file sizes (e.g., `ipcManager.test.ts` is 70KB).

## What Changes

- **Extract shared mock factories** into `tests/helpers/mocks/` directory
- **Logger mock**: Single source of truth for mock logger, auto-setup via vitest config
- **Manager mocks**: Factory functions for `mockWindowManager`, `mockStore`, `mockUpdateManager`, etc.
- **WebContents mocks**: Consolidate 3 separate implementations into one configurable factory
- **ElectronAPI mock**: Shared factory for renderer component tests (kept separate from main process mocks)
- **Test harness utilities**: Common patterns for fake timers, platform stubbing

## Impact

- Affected specs: `test-reliability`
- Affected code:
  - `tests/helpers/mocks/` (NEW directory structure)
  - All 37+ coordinated test files
  - Unit tests in `tests/unit/main/`
  - Component tests in `tests/unit/renderer/`
  - Vitest configs in `config/vitest/`
