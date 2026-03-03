# Findings

## Phase 5+ Requirements

- Phase 5: Migrate E2E tests to appContext access pattern for helpers and specs.
- Phase 6: Remove legacy global references in exposeForE2E and E2EGlobals.
- Use plan located at .sisyphus/plans/IMPLEMENTATION-PLAN-application-context.md.

## Codebase Notes

- Integration tests were still referencing `global.hotkeyManager` and `global.windowManager` even though main now exposes only `global.appContext` (see `src/main/main.ts` exposeForE2E).
- Updated integration tests to use `global.appContext.hotkeyManager` / `global.appContext.windowManager` to match current E2E exposure.
- E2E options-window spec failed when the titlebar menu dropdown was not visible; a fallback to the Electron Menu API was added for reliability.
- A focused E2E run of `tests/e2e/options-window.spec.ts` passed after the fallback change.
