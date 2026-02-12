# PlatformAdapter Migration — Next 3 Files (BadgeManager, MainWindow, MenuManager)

## TL;DR

> **Quick Summary**: Migrate `badgeManager.ts`, `mainWindow.ts`, and `menuManager.ts` to use the existing `PlatformAdapter` abstraction by extending the adapter interface with badge/window/menu behaviors and implementing those methods in all adapters (Linux Wayland/X11 + Windows + macOS). Preserve existing behavior and tests; no integration/E2E changes.
>
> **Deliverables**:
>
> - Extended `PlatformAdapter` interface + types for badge/window/menu behavior
> - Adapter implementations for Linux Wayland/X11, Windows, macOS (new methods only)
> - Refactors: `badgeManager.ts`, `mainWindow.ts`, `menuManager.ts`
> - Unit + coordinated test updates (platform mocks switch to adapters)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO — sequential due to shared interface updates
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request

“Find the next 3 most impactful files to migrate to PlatformAdapter and create a plan to migrate them.”

### Selected Files (Top 3 by Impact)

1. `src/main/managers/badgeManager.ts` — macOS dock badges, Windows overlay icons, Linux no-op.
2. `src/main/windows/mainWindow.ts` — Linux WM_CLASS and non-macOS taskbar skip behavior.
3. `src/main/managers/menuManager.ts` — macOS app/dock menu, platform-specific labels/roles.

### Research Findings

- Unit tests exist for all three files (`badgeManager.test.ts`, `mainWindow.test.ts`, `menuManager.test.ts`).
- Coordinated tests cover menu platform behavior (`menu-manager-platform.coordinated.test.ts`).
- PlatformAdapter exists with Linux adapters implemented; Windows/Mac adapters currently stub for existing methods.
- Electron docs for `app.dock.setBadge`, `BrowserWindow.setOverlayIcon`, and `Menu.buildFromTemplate` confirm platform-specific constraints.

### Guardrails (Non-Negotiable)

- **Source-only** changes. No integration/E2E updates.
- **No behavior changes**—pure refactor to adapter.
- **Do not touch**: `waylandDetector.ts`, `dbusFallback.ts`, renderer code.
- **Keep** existing `constants.ts` exports intact.

---

## Work Objectives

### Core Objective

Move platform-specific behavior in BadgeManager, MainWindow, and MenuManager behind the PlatformAdapter while preserving current behavior and tests.

### Concrete Deliverables

- Extended adapter contract for:
    - Badge rendering (dock/overlay/no-op)
    - Window platform config + tray/taskbar behavior
    - Menu platform structure + labels
- Refactored managers that only depend on adapter for platform logic
- Updated unit + coordinated tests to use adapter mocks

### Definition of Done

- [ ] Unit tests pass: badgeManager, mainWindow, menuManager
- [ ] Coordinated tests pass: menu-manager-platform
- [ ] `npm run test`, `npm run test:coordinated`, `npm run lint`, `npm run build` pass
- [ ] No integration/E2E test changes

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
> All verification is agent-executed with commands.

### Test Decision

- **Infrastructure exists**: YES (Vitest + coordinated)
- **Automated tests**: YES (TDD)
- **Frameworks**: Vitest (electron + coordinated)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1
└── Task 1: Extend PlatformAdapter contract + adapter tests (RED)

Wave 2
└── Task 2: Migrate BadgeManager + tests

Wave 3
└── Task 3: Migrate MainWindow + tests

Wave 4
└── Task 4: Migrate MenuManager + tests

Wave 5
└── Task 5: Full verification
```

---

## TODOs

### Task 1: Extend PlatformAdapter contract + adapter implementations (TDD)

**Goal**: Add only the methods required for BadgeManager, MainWindow, MenuManager.

**Add to PlatformAdapter** (new methods):

- `showBadge({ window, description, text, overlayIcon }): void`
- `clearBadge({ window }): void`
- `supportsBadges(): boolean`
- `getMainWindowPlatformConfig(): Partial<BrowserWindowConstructorOptions>` (Linux WM_CLASS)
- `hideToTray(window: BrowserWindow): void` (skipTaskbar on non-macOS)
- `restoreFromTray(window: BrowserWindow): void`
- `shouldIncludeAppMenu(): boolean`
- `getSettingsMenuLabel(): string` (macOS “Settings...” vs Windows/Linux “Options”)
- `getWindowCloseRole(): 'close' | 'quit'`
- `getDockMenuTemplate(windowManager): MenuItemConstructorOptions[] | null` (macOS only)

**Files**:

- Modify: `src/main/platform/PlatformAdapter.ts`
- Modify: `src/main/platform/types.ts` (add types if needed)
- Modify: `src/main/platform/adapters/LinuxWaylandAdapter.ts`
- Modify: `src/main/platform/adapters/LinuxX11Adapter.ts`
- Modify: `src/main/platform/adapters/WindowsAdapter.ts`
- Modify: `src/main/platform/adapters/MacAdapter.ts`
- Add/Modify tests: `tests/unit/main/platform/*` (extend or add new file)

**Guardrails**:

- Implement the new methods for **all adapters** (Linux Wayland/X11 + Windows + Mac).
- Do **not** change existing adapter behavior or method semantics.
- Avoid introducing any new runtime dependencies.

**TDD Steps**:

1. **RED** — Add tests for new adapter methods (platform-specific behavior assertions).
2. **GREEN** — Implement methods in adapters.
3. **REFACTOR** — Keep signatures consistent across platforms.

**Acceptance Criteria**:

- [ ] Adapter tests pass for all new methods.
- [ ] Windows/macOS implementations behave as current code does (badge overlay, dock badge, menu behaviors).
- [ ] `WindowsAdapter` and `MacAdapter` implement the required new methods (no stub throws).

---

### Task 2: Migrate BadgeManager to PlatformAdapter (TDD)

**What to do**:

- Replace `isMacOS/isWindows/isLinux` checks with adapter calls.
- BadgeManager keeps responsibility for icon creation; adapter handles platform-specific application of badge.

**Files**:

- Modify: `src/main/managers/badgeManager.ts`
- Modify: `tests/unit/main/badgeManager.test.ts`
- Modify: `tests/coordinated/badge-manager.coordinated.test.ts` (if platform mocks need updates)

**Key Behaviors to Preserve**:

- macOS: `app.dock.setBadge(text)`
- Windows: `BrowserWindow.setOverlayIcon(icon, description)`
- Linux: no-op with logging

**Acceptance Criteria**:

- [ ] All badgeManager unit tests pass.
- [ ] Platform-specific badge behavior unchanged (verified by tests).

---

### Task 3: Migrate MainWindow to PlatformAdapter (TDD)

**What to do**:

- Replace `process.platform === 'linux'` in constructor with adapter `getMainWindowPlatformConfig()`.
- Replace `if (!isMacOS)` in `hideToTray/restoreFromTray` with adapter methods.

**Files**:

- Modify: `src/main/windows/mainWindow.ts`
- Modify: `tests/unit/main/mainWindow.test.ts`

**Acceptance Criteria**:

- [ ] `wmClass` behavior preserved on Linux.
- [ ] `setSkipTaskbar` still only called on non-macOS.
- [ ] MainWindow unit tests pass.

---

### Task 4: Migrate MenuManager to PlatformAdapter (TDD)

**What to do**:

- Replace `isMac()` runtime function with adapter methods:
    - `shouldIncludeAppMenu()`
    - `getSettingsMenuLabel()`
    - `getWindowCloseRole()`
    - `getDockMenuTemplate()`

**Files**:

- Modify: `src/main/managers/menuManager.ts`
- Modify: `tests/unit/main/menuManager.test.ts`
- Modify: `tests/coordinated/menu-manager-platform.coordinated.test.ts`

**Acceptance Criteria**:

- [ ] Menu structure unchanged across macOS/Windows/Linux.
- [ ] Dock menu remains macOS-only.
- [ ] Menu unit + coordinated tests pass.

---

### Task 5: Full verification

**Commands**:

- `npm run test`
- `npm run test:coordinated`
- `npm run lint`
- `npm run build`

**Acceptance Criteria**:

- [ ] All commands succeed with zero failures.

---

## References (Key Files)

- `src/main/managers/badgeManager.ts`
- `src/main/windows/mainWindow.ts`
- `src/main/managers/menuManager.ts`
- `src/main/platform/PlatformAdapter.ts`
- `src/main/platform/adapters/*`
- `tests/unit/main/badgeManager.test.ts`
- `tests/unit/main/mainWindow.test.ts`
- `tests/unit/main/menuManager.test.ts`
- `tests/coordinated/menu-manager-platform.coordinated.test.ts`

---

## Success Criteria

- [ ] All platform-specific branching in BadgeManager, MainWindow, MenuManager is moved to PlatformAdapter methods.
- [ ] Unit + coordinated tests pass without modifying integration/E2E tests.
- [ ] No behavior changes in badges, window tray behavior, or menu structures.
