# Design: IpcManager Refactoring Architecture

## Context

The `IpcManager` class in `src/main/managers/ipcManager.ts` has grown to 1,496 lines and handles 12+ distinct IPC domains. This design document captures the architectural decisions for breaking it into smaller, focused handler classes.

### Stakeholders

- Main process code maintainers
- Test authors (unit, coordinated, integration, E2E)
- Future feature developers adding new IPC channels

### Constraints

- Must maintain 100% behavioral compatibility
- Existing consumers (main.ts) should not require changes
- Performance should not noticeably degrade

## Goals / Non-Goals

### Goals

- Improve code maintainability by following SRP
- Enable focused testing of individual IPC domains
- Make it easier to add new IPC handlers in the future
- Reduce cognitive load when working with IPC code
- Extract shared patterns into reusable base class

### Non-Goals

- Changing any existing IPC behavior
- Adding new IPC channels (beyond what exists)
- Modifying the preload or renderer IPC contracts
- Changing the SettingsStore structure

## Decisions

### Decision 1: Handler Registry Pattern

**What**: Create a `BaseIpcHandler` abstract class and domain-specific handler classes that register themselves with ipcMain.

**Why**:

- Follows industry-standard patterns (Strategy Pattern for handler selection)
- Enables focused unit testing per domain
- Open/Closed Principle - new handlers can be added without modifying orchestrator

**Alternatives considered**:

1. **Function-based handlers**: Less structured, harder to share state/dependencies
2. **Plugin architecture**: Overkill for internal refactoring, adds complexity
3. **Keep monolith**: Status quo, doesn't solve maintainability issues

### Decision 2: Dependency Injection Interface

**What**: Define `IpcHandlerDependencies` interface for injecting required managers and services.

```typescript
interface IpcHandlerDependencies {
    store: SettingsStore<UserPreferences>;
    logger: Logger;
    windowManager: WindowManager;
    hotkeyManager?: HotkeyManager;
    updateManager?: UpdateManager;
    printManager?: PrintManager;
    llmManager?: LlmManager;
}
```

**Why**:

- Enables testability - handlers can receive mock dependencies
- Makes dependencies explicit and documented
- Follows Dependency Inversion Principle

### Decision 3: Directory Structure

**What**: Place handlers in `src/main/managers/ipc/` subdirectory.

```
src/main/managers/
├── ipcManager.ts              # Slim orchestrator (~200 lines)
└── ipc/
    ├── index.ts               # Re-exports all handlers
    ├── types.ts               # Shared types/interfaces
    ├── BaseIpcHandler.ts      # Abstract base class
    ├── ShellIpcHandler.ts
    ├── WindowIpcHandler.ts
    ├── ThemeIpcHandler.ts
    ├── ZoomIpcHandler.ts
    ├── AlwaysOnTopIpcHandler.ts
    ├── PrintIpcHandler.ts
    ├── HotkeyIpcHandler.ts
    ├── AppIpcHandler.ts
    ├── AutoUpdateIpcHandler.ts
    ├── QuickChatIpcHandler.ts
    └── TextPredictionIpcHandler.ts
```

**Why**:

- Keeps handlers logically grouped with their orchestrator
- Avoids cluttering the top-level managers directory
- Clear namespace for IPC-related code

### Decision 4: Base Class Design

**What**: Abstract `BaseIpcHandler` class providing:

```typescript
abstract class BaseIpcHandler {
    protected readonly deps: IpcHandlerDependencies;
    protected readonly logger: Logger;

    constructor(deps: IpcHandlerDependencies) {
        this.deps = deps;
        this.logger = deps.logger;
    }

    /** Register IPC handlers with ipcMain */
    abstract register(): void;

    /** Optional post-registration initialization */
    initialize?(): void | Promise<void>;

    /** Helper: Get window from IPC event safely */
    protected getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null;

    /** Helper: Broadcast to all windows */
    protected broadcastToAllWindows(channel: string, data?: unknown): void;

    /** Helper: Log and handle errors consistently */
    protected handleError(operation: string, error: unknown, context?: Record<string, unknown>): void;
}
```

**Why**:

- Eliminates code duplication (broadcast pattern appears 8+ times currently)
- Provides consistent error handling
- Makes testing easier with protected method access

### Decision 5: Iterative Migration

**What**: Migrate handlers in 4 phases, validating all tests after each phase.

| Phase | Handlers                                                            | Complexity | Dependencies                               |
| ----- | ------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| 1     | BaseIpcHandler, ShellIpcHandler, WindowIpcHandler                   | Low        | None / BrowserWindow only                  |
| 2     | ThemeIpcHandler, ZoomIpcHandler, AlwaysOnTopIpcHandler              | Medium     | Store, WindowManager                       |
| 3     | PrintIpcHandler, HotkeyIpcHandler, AppIpcHandler                    | Medium     | PrintManager, HotkeyManager, WindowManager |
| 4     | AutoUpdateIpcHandler, QuickChatIpcHandler, TextPredictionIpcHandler | High       | UpdateManager, LlmManager, complex logic   |

**Why**:

- Reduces risk of breaking changes
- Allows validation at each step
- Simple handlers establish patterns for complex ones

## Handler Responsibility Mapping

| Handler                  | IPC Channels                              | Current Lines | Dependencies                |
| ------------------------ | ----------------------------------------- | ------------- | --------------------------- |
| ShellIpcHandler          | `shell:show-item-in-folder`               | ~30           | shell                       |
| WindowIpcHandler         | `window:*` (5 channels)                   | ~70           | BrowserWindow               |
| ThemeIpcHandler          | `theme:get`, `theme:set`, `theme:changed` | ~100          | store, nativeTheme          |
| ZoomIpcHandler           | `zoom:*` (3 channels)                     | ~95           | store, windowManager        |
| AlwaysOnTopIpcHandler    | `always-on-top:*` (3 channels)            | ~100          | store, windowManager        |
| PrintIpcHandler          | `print:*` (2 channels)                    | ~50           | printManager, windowManager |
| HotkeyIpcHandler         | `hotkeys:*` (6 channels)                  | ~270          | store, hotkeyManager        |
| AppIpcHandler            | `open-options`, `open-google-signin`      | ~40           | windowManager               |
| AutoUpdateIpcHandler     | `auto-update:*`, `dev:*` (10 channels)    | ~150          | store, updateManager        |
| QuickChatIpcHandler      | `quick-chat:*`, `gemini:*` (4 channels)   | ~150          | windowManager               |
| TextPredictionIpcHandler | `text-prediction:*` (7 channels)          | ~250          | store, llmManager           |

## Risks / Trade-offs

### Risk: Test Breakage

**Mitigation**: Run full test suite after each phase; fix immediately before proceeding.

### Risk: Subtle Behavioral Differences

**Mitigation**:

- Preserve exact error handling patterns
- Keep initialization order identical
- Use existing E2E tests as behavioral contracts

### Risk: Increased File Count

**Trade-off**: More files (12 new) but each is focused and maintainable (~50-100 lines average).

### Risk: Import Complexity

**Mitigation**: Use `src/main/managers/ipc/index.ts` barrel file for clean imports.

## Open Questions

None - all clarifying questions answered in proposal phase.
