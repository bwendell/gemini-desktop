## ADDED Requirements

### Requirement: Shared Test Mock Infrastructure

The test suite SHALL provide shared mock factories to reduce code duplication and improve maintainability.

#### Scenario: Logger mock is available globally for all coordinated tests

- **WHEN** a coordinated test runs
- **THEN** a mock logger is automatically available without inline `vi.mock()` calls

#### Scenario: Manager mocks are created via factory functions

- **WHEN** a test needs a mock WindowManager, Store, or other manager
- **THEN** it can use `createMockWindowManager()`, `createMockStore()`, or similar factory
- **AND** the factory returns a fully-typed mock with all methods

#### Scenario: Mock factories support customization via overrides

- **WHEN** a test needs specific mock behavior
- **THEN** it can pass an overrides object to the factory
- **AND** only the specified methods are overridden

#### Scenario: WebContents mock supports multiple configurations

- **WHEN** a test needs a mock webContents
- **THEN** it can use `createMockWebContents(options)` with configurable capabilities
- **AND** options include scroll capture, custom dimensions, and custom isDestroyed behavior

#### Scenario: ElectronAPI mock is available for renderer component tests

- **WHEN** a renderer component test needs `window.electronAPI`
- **THEN** it can use `setupMockElectronAPI()` to configure the mock
- **AND** the mock includes all methods from the ElectronAPI interface

---

### Requirement: Test Harness Utilities

The test suite SHALL provide shared utilities for common test setup patterns.

#### Scenario: Fake timers utility handles setup and cleanup

- **WHEN** a test needs fake timers
- **THEN** it can use `useFakeTimers()` from the harness
- **AND** cleanup is automatic in afterEach

#### Scenario: Platform stubbing utility handles cross-platform scenarios

- **WHEN** a test needs to run on multiple platforms
- **THEN** it can use `stubPlatform()` or `stubPlatformAll()` utilities
- **AND** cleanup is automatic in afterEach
