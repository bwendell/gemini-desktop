## ADDED Requirements

### Requirement: IPC Handler Base Class

The system SHALL provide an abstract `BaseIpcHandler` class that encapsulates common IPC handler functionality including:

- Dependency injection via `IpcHandlerDependencies` interface
- Window retrieval from IPC events with null safety
- Broadcasting to all windows with error handling
- Consistent error logging pattern

#### Scenario: Handler receives dependencies via constructor

- **WHEN** a handler class is instantiated
- **THEN** it receives all required dependencies via `IpcHandlerDependencies` interface
- **AND** dependencies are available to protected methods

#### Scenario: Get window from event returns null for destroyed window

- **WHEN** `getWindowFromEvent()` is called with an event
- **AND** the window is destroyed
- **THEN** null is returned
- **AND** an error is logged

#### Scenario: Broadcast skips destroyed windows

- **WHEN** `broadcastToAllWindows()` is called
- **AND** some windows are destroyed
- **THEN** messages are sent only to non-destroyed windows
- **AND** errors are logged for failed sends

---

### Requirement: Domain-Specific IPC Handlers

The system SHALL organize IPC handlers into domain-specific classes, each responsible for a single category of IPC channels:

| Handler                  | Channels                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| ShellIpcHandler          | `shell:show-item-in-folder`                                                               |
| WindowIpcHandler         | `window:minimize`, `window:maximize`, `window:close`, `window:show`, `window:isMaximized` |
| ThemeIpcHandler          | `theme:get`, `theme:set`                                                                  |
| ZoomIpcHandler           | `zoom:get-level`, `zoom:zoom-in`, `zoom:zoom-out`                                         |
| AlwaysOnTopIpcHandler    | `always-on-top:get`, `always-on-top:set`                                                  |
| PrintIpcHandler          | `print:trigger`, `print:cancel`                                                           |
| HotkeyIpcHandler         | `hotkeys:individual:*`, `hotkeys:accelerator:*`, `hotkeys:full-settings:*`                |
| AppIpcHandler            | `open-options`, `open-google-signin`                                                      |
| AutoUpdateIpcHandler     | `auto-update:*`, `dev:*`, `tray:get-tooltip`                                              |
| QuickChatIpcHandler      | `quick-chat:*`, `gemini:*`                                                                |
| TextPredictionIpcHandler | `text-prediction:*`                                                                       |

#### Scenario: Each handler registers its own channels

- **WHEN** a handler's `register()` method is called
- **THEN** all IPC channels for that domain are registered with `ipcMain`
- **AND** no channels from other domains are registered

#### Scenario: Handler initialization is optional

- **WHEN** a handler has an `initialize()` method
- **THEN** it is called after `register()` during setup
- **AND** handlers without `initialize()` skip this step

---

### Requirement: IPC Manager Orchestration

The `IpcManager` class SHALL act as an orchestrator that:

- Creates all domain-specific handler instances
- Calls `register()` on each handler during setup
- Calls `initialize()` on handlers that require post-registration setup
- Maintains backward-compatible public API

#### Scenario: All handlers registered during setupIpcHandlers

- **WHEN** `setupIpcHandlers()` is called on `IpcManager`
- **THEN** all domain handler `register()` methods are invoked
- **AND** all handler `initialize()` methods are invoked
- **AND** the same IPC channels are available as before refactoring

#### Scenario: Public API remains unchanged

- **WHEN** external code (e.g., `main.ts`) uses `IpcManager`
- **THEN** the constructor signature and public methods remain compatible
- **AND** no changes are required to consumer code

---

### Requirement: Handler Error Isolation

Each handler SHALL handle its own errors without affecting other handlers.

#### Scenario: Handler registration error is logged

- **WHEN** an error occurs during handler `register()`
- **THEN** the error is logged with context (handler name, channel)
- **AND** other handlers continue to register

#### Scenario: Handler runtime error is logged

- **WHEN** an IPC handler callback throws an error
- **THEN** the error is logged with context
- **AND** the renderer receives an appropriate error response
- **AND** other IPC channels remain functional

---

### Requirement: Test Organization Per Handler

Each domain-specific handler SHALL have dedicated test files:

- Unit tests in `tests/unit/main/ipc/[handler].test.ts`
- Coordinated tests in `tests/coordinated/ipc/[handler].coordinated.test.ts`

#### Scenario: Unit tests cover handler registration

- **WHEN** unit tests run for a handler
- **THEN** they verify IPC channel registration
- **AND** they verify handler-specific logic in isolation

#### Scenario: Coordinated tests cover handler integration

- **WHEN** coordinated tests run for a handler
- **THEN** they verify handler interaction with its dependencies
- **AND** they verify event broadcasting behavior
