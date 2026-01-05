## Context

The Gemini Desktop test suite has grown to 100+ test files across unit, coordinated, integration, and E2E tests. During this growth, mock objects and setup patterns were copy-pasted between files rather than shared. This refactoring consolidates duplicated test infrastructure into shared utilities while preserving test isolation.

**Stakeholders**: All developers writing or maintaining tests

**Constraints**:

- Tests must remain independently runnable
- No changes to actual application code
- Must work with existing vitest and WebdriverIO configurations
- Shared mocks must be easily overridable per-test

## Goals / Non-Goals

**Goals:**

- Reduce mock duplication by 80%+ across test files
- Create maintainable, documented mock factories
- Enable easier onboarding for new test writers
- Reduce test file sizes (some are 70KB+)

**Non-Goals:**

- Changing test frameworks (vitest, WebdriverIO)
- Adding new test coverage (separate concern)
- Modifying application source code
- E2E test changes (they use real components, not mocks)

## Decisions

### Decision 1: Shared mock location

**Decision**: Create `tests/helpers/mocks/` directory for shared mock utilities

**Rationale**: This follows common conventions in JavaScript/TypeScript projects. The existing `tests/unit/main/test/` folder is too deeply nested and unit-test-specific.

**Alternatives considered**:

- Extend `tests/unit/main/test/` - Too tied to unit tests, not shared with coordinated/integration
- Create `src/__mocks__/` - Would mix test helpers with source code

### Decision 2: Logger mock auto-setup

**Decision**: Use vitest's `setupFilesAfterEnv` to auto-register the logger mock

**Rationale**: Logger is mocked identically in 37+ files. Auto-setup eliminates duplication entirely while still allowing per-test overrides.

**Alternatives considered**:

- Manual import in each file - Defeats the purpose, still requires maintenance
- Module alias - More complex, harder to override

### Decision 3: Keep renderer mocks separate from main process mocks

**Decision**: Separate `tests/helpers/mocks/main/` and `tests/helpers/mocks/renderer/` directories

**Rationale**: Main process mocks (electron, managers) and renderer mocks (electronAPI, React contexts) serve different purposes and have different APIs. Separation maintains clarity.

### Decision 4: Factory functions with optional overrides

**Decision**: All mock factories accept an optional `overrides` parameter

**Rationale**: Tests need to customize specific behaviors. Factory pattern with spreads allows easy customization:

```typescript
const mockStore = createMockStore({
  defaults: { theme: 'dark' },
});
```

## File Structure

```
tests/
├── helpers/
│   ├── mocks/
│   │   ├── index.ts              # Re-exports all mocks
│   │   ├── main/
│   │   │   ├── logger.ts         # Mock logger factory + auto-mock setup
│   │   │   ├── managers.ts       # WindowManager, Store, UpdateManager, etc.
│   │   │   ├── webContents.ts    # WebContents factory variants
│   │   │   └── electron.ts       # Base electron module mocks (ipcMain, etc.)
│   │   └── renderer/
│   │       └── electronAPI.ts    # window.electronAPI mock factory
│   ├── harness/
│   │   ├── timers.ts             # Fake timer utilities
│   │   └── platform.ts           # Platform stubbing utilities
│   └── index.ts                  # Main export
```

## Risks / Trade-offs

| Risk                                     | Mitigation                                                  |
| ---------------------------------------- | ----------------------------------------------------------- |
| Breaking existing tests during migration | Migrate one mock type at a time, run tests after each phase |
| Hidden coupling between tests            | Factories return fresh instances, avoid shared state        |
| Slower test startup from shared imports  | Tree-shaking keeps imports minimal; measure if needed       |
| Learning curve for new patterns          | Document usage in README, include examples                  |

## Migration Plan

1. **Phase 1**: Extract logger mock, apply to all 37+ files, verify tests pass
2. **Phase 2**: Extract manager mocks (WindowManager, Store), apply to tests
3. **Phase 3**: Consolidate WebContents factories
4. **Phase 4**: Extract ElectronAPI mock for renderer tests
5. **Phase 5**: Add test harness utilities (timers, platform)

Each phase is independently deployable and verifiable.

**Rollback**: If issues arise, individual files can revert to inline mocks while investigation continues.

## Open Questions

None - all decisions resolved during clarification phase.
