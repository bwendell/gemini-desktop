# Change: Refactor IpcManager into Domain-Specific Handlers

## Why

The `ipcManager.ts` file has grown to 1,496 lines (58KB) and handles 12+ distinct responsibility domains, making it difficult to maintain, test, and extend. This violates the Single Responsibility Principle (SRP) and makes the codebase harder to navigate. Extracting domain-specific handlers will improve maintainability, testability, and code organization.

## What Changes

This is a **pure refactoring** with no behavioral changes. The refactoring will be done iteratively in 4 phases, from simplest to most complex handlers:

- **Phase 1**: Extract BaseIpcHandler, ShellIpcHandler, WindowIpcHandler
- **Phase 2**: Extract ThemeIpcHandler, ZoomIpcHandler, AlwaysOnTopIpcHandler
- **Phase 3**: Extract PrintIpcHandler, HotkeyIpcHandler, AppIpcHandler
- **Phase 4**: Extract AutoUpdateIpcHandler, QuickChatIpcHandler, TextPredictionIpcHandler

Each phase follows a Refactor → Validate → Test → Verify cycle before proceeding.

### Architectural Improvements

- Create `src/main/managers/ipc/` subdirectory for domain-specific handlers
- Introduce `BaseIpcHandler` abstract class with shared utilities
- Use `IpcHandlerDependencies` interface for dependency injection
- Reduce `IpcManager` to a ~200-line orchestrator

## Impact

- Affected specs: New `ipc-handlers` capability
- Affected code:
    - [NEW] `src/main/managers/ipc/` - New handler directory
    - [NEW] `src/main/managers/ipc/BaseIpcHandler.ts` - Abstract base class
    - [NEW] `src/main/managers/ipc/*.ts` - 10 domain-specific handlers
    - [MODIFY] `src/main/managers/ipcManager.ts` - Slim down to orchestrator
    - [NEW] `tests/unit/main/ipc/*.test.ts` - Per-handler unit tests
    - [NEW] `tests/coordinated/ipc/*.coordinated.test.ts` - Per-handler coordinated tests

## Scope Clarifications

- **Pure refactor**: No behavioral changes, all existing functionality preserved
- **Backward compatible**: `IpcManager` public API remains unchanged for consumers
- **Iterative validation**: All tests (unit, coordinated, integration, E2E) verified after each phase
- **Separate test files**: Each handler gets its own test file
- **Missing coverage**: Identify and add tests for currently untested error scenarios
