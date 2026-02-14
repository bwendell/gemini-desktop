## MODIFIED Requirements

### Requirement: E2E Test Reliability

The system SHALL reliably verify core features through end-to-end tests without flakiness.

#### Scenario: Startup tests pass without timeout or error

- **Given** the app is built and launched
- **When** the startup test group runs
- **Then** all tests in the group pass

#### Scenario: Options tests pass reliably

- **Given** the app is running
- **When** the options test group runs
- **Then** it correctly interacts with settings and persists changes

#### Scenario: Menu tests pass reliably

- **Given** the app is running
- **When** the menu test group runs
- **Then** menu items trigger expected actions

#### Scenario: Hotkeys tests pass reliably

- **Given** the app is running
- **When** the hotkeys test group runs
- **Then** global shortcuts trigger expected actions

#### Scenario: Window tests pass reliably

- **Given** the app is running
- **When** the window test group runs
- **Then** window management (bounds, resizing) works as expected

#### Scenario: Tray tests pass reliably

- **Given** the app is running
- **When** the tray test group runs
- **Then** tray icon interactions work as expected

#### Scenario: Update tests pass reliably

- **Given** the app is packaged
- **When** the update test group runs
- **Then** it correctly checks for updates (simulated or real)

#### Scenario: Stability tests pass reliably

- **Given** the app is running under stress
- **When** the stability test group runs
- **Then** the app does not crash or hang

#### Scenario: CI timing instability is mitigated with retries

- **Given** integration, E2E, or release E2E test runs in CI
- **When** a failure occurs due to transient timing conditions
- **Then** WebdriverIO retries the affected spec and Mocha retries failed tests based on configured retry values
- **And** retry values can be overridden via environment variables without modifying test files
