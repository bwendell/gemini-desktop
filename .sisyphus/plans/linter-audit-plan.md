# Linter Audit Plan: Gemini Desktop

## Executive Summary

**Date**: 2025-02-10  
**Status**:

- **ESLint**: 30 Errors, 67 Warnings (97 total findings)
- **TypeScript/LSP**: 48 additional type errors in test files
- **Combined**: 145 total issues to address  
  **Priority**: Address all errors (CI-blocking), then strategic warning reduction

---

## Issue Breakdown

### ERRORS (30 total) - MUST FIX FIRST

All errors are `@typescript-eslint/no-unused-vars` violations, primarily in test files:

| Category             | Count | Files Affected           | Pattern                      |
| -------------------- | ----- | ------------------------ | ---------------------------- |
| Unused variables     | 19    | `*.spec.ts`, `*.test.ts` | Defined but never referenced |
| Unused function args | 2     | `ContextMenuPage.ts`     | Params defined but unused    |
| Unused assignments   | 9     | Test helpers             | Assigned but never read      |

**Critical Files Requiring Fixes:**

1. `tests/e2e/options-tabs.spec.ts` (6 errors)
2. `tests/e2e/toast-interactions.spec.ts` (4 errors)
3. `tests/e2e/hotkey-toggle.spec.ts` (3 errors)
4. `tests/e2e/helpers/waitUtilities.ts` (3 errors)
5. `tests/e2e/helpers/workflows.ts` (1 error)
6. `tests/e2e/lifecycle.spec.ts` (1 error)
7. `tests/e2e/macos-dock.spec.ts` (2 errors)
8. `tests/e2e/menu_bar.spec.ts` (1 error)
9. `tests/e2e/pages/ContextMenuPage.ts` (2 errors)
10. `tests/e2e/pages/UpdateToastPage.ts` (0 errors but related)
11. `tests/e2e/quick-chat-full-workflow.spec.ts` (2 errors)
12. `tests/e2e/session-persistence.spec.ts` (1 error)
13. `tests/e2e/tray.spec.ts` (2 errors)

---

### WARNINGS (67 total) - STRATEGIC REDUCTION

| Rule                                         | Count | Severity    | Notes                                                  |
| -------------------------------------------- | ----- | ----------- | ------------------------------------------------------ |
| `@typescript-eslint/ban-ts-comment`          | 28    | Medium      | ts-expect-error missing descriptions, ts-nocheck usage |
| `@typescript-eslint/no-explicit-any`         | 17    | Medium-High | Type safety concerns in production code                |
| `@typescript-eslint/no-unsafe-function-type` | 12    | Low-Medium  | Function types should be explicit                      |
| `react-refresh/only-export-components`       | 6     | Low         | Fast refresh optimization                              |
| `react-hooks/exhaustive-deps`                | 1     | High        | Missing dependency can cause bugs                      |
| `@typescript-eslint/no-implied-eval`         | 1     | Low         | Unused eslint-disable directive                        |

---

### LSP/TypeScript Type Errors (Additional - Not caught by ESLint)

These are type errors detected by the TypeScript language server that don't trigger ESLint warnings but indicate type safety issues:

| File                                                            | Error Count | Issue Type                           |
| --------------------------------------------------------------- | ----------- | ------------------------------------ |
| `tests/integration/sandbox-detection.integration.test.ts`       | 10          | Missing WDIO Browser type extensions |
| `tests/integration/wayland-platform-status.integration.test.ts` | 26          | Missing WDIO Browser type extensions |
| `tests/e2e/helpers/hotkeyHelpers.ts`                            | 8           | Missing WDIO Browser type extensions |
| `tests/unit/main/test/setup.ts`                                 | 1           | Missing mock function declaration    |
| `tests/coordinated/hotkey-coordination.coordinated.test.ts`     | 1           | Incorrect mock import path           |

**Root Cause**: Missing type declarations for WebdriverIO's Electron service extensions to the Browser object.

---

## Implementation Phases

### Phase 1: Critical Error Cleanup (Priority: HIGH)

**Goal**: Eliminate all 30 CI-blocking errors  
**Est. Effort**: 2-3 hours  
**Impact**: Unblocks CI, cleaner test suite

#### 1.1 Test File Unused Variable Cleanup

**Approach**: Prefix unused variables with `_` OR remove if truly unnecessary

**Files to modify:**

```
tests/e2e/options-tabs.spec.ts          - 6 unused imports/vars
tests/e2e/toast-interactions.spec.ts    - 4 unused toastId assignments
tests/e2e/hotkey-toggle.spec.ts         - 3 unused imports/vars
tests/e2e/helpers/waitUtilities.ts      - 3 unused error vars
tests/e2e/helpers/workflows.ts          - 1 unused import
tests/e2e/lifecycle.spec.ts             - 1 unused import
tests/e2e/macos-dock.spec.ts            - 2 unused vars
tests/e2e/menu_bar.spec.ts              - 1 unused var
tests/e2e/pages/ContextMenuPage.ts      - 2 unused params
tests/e2e/quick-chat-full-workflow.spec.ts - 2 unused vars
tests/e2e/session-persistence.spec.ts   - 1 unused import
tests/e2e/tray.spec.ts                  - 2 unused vars
```

**Action Items:**

- [ ] `options-tabs.spec.ts`: Prefix `browser`, `Selectors`, `waitForWindowCount`, `switchToOptionsWindow`, `assertWindowCount`, `withOptionsTab` with `_`
- [ ] `toast-interactions.spec.ts`: Use `_toast1Id`, `_toast2Id`, `_toastId` or remove
- [ ] `hotkey-toggle.spec.ts`: Use `_waitForWindowCount`, `_Selectors`, `_mainWindowHandle` or remove
- [ ] `waitUtilities.ts`: Use `_error` in catch blocks or remove variable
- [ ] `workflows.ts`: Remove or prefix `closeCurrentWindow`
- [ ] `lifecycle.spec.ts`: Prefix `_waitForWindowCount`
- [ ] `macos-dock.spec.ts`: Prefix `_browser`, `_mainWindow`
- [ ] `menu_bar.spec.ts`: Prefix `_fileButton`
- [ ] `ContextMenuPage.ts`: Prefix `_options`, `_expectedText` in method params
- [ ] `quick-chat-full-workflow.spec.ts`: Prefix `_browser`, `_mainWindow`
- [ ] `session-persistence.spec.ts`: Prefix `_browser`
- [ ] `tray.spec.ts`: Prefix `_browser`, `_mainWindow`

---

### Phase 2: High-Impact Type Safety (Priority: MEDIUM-HIGH)

**Goal**: Replace `any` types in production code with proper types  
**Est. Effort**: 4-6 hours  
**Impact**: Better type safety, IDE support, maintainability

#### 2.1 Production Code `any` Types (17 warnings)

**Critical files (production code):**

```
src/main/main.ts                           - 3 occurrences
src/main/managers/exportManager.ts         - 1 occurrence
src/main/managers/ipc/AutoUpdateIpcHandler.ts - 2 occurrences
src/main/managers/updateManager.ts         - 2 occurrences
src/preload/preload.ts                     - 1 occurrence
src/renderer/components/ErrorBoundary.tsx  - 0 (only ts-expect-error desc)
src/renderer/components/GeminiErrorBoundary.tsx - 0 (only ts-expect-error desc)
src/renderer/context/ToastContext.tsx      - 5 occurrences
src/renderer/context/UpdateToastContext.tsx - 0 (only hooks warning)
src/renderer/vite-env.d.ts                 - 1 occurrence
src/shared/types/ipc.ts                    - 1 occurrence
```

**Action Items:**

- [ ] `src/main/main.ts` (lines 50, 51, 390): Define proper types for WebRequest callbacks
- [ ] `src/main/managers/exportManager.ts` (line 101): Type the exception parameter
- [ ] `src/main/managers/ipc/AutoUpdateIpcHandler.ts` (lines 150, 235): Type update info and error objects
- [ ] `src/main/managers/updateManager.ts` (lines 239, 465): Type HTTP error responses
- [ ] `src/preload/preload.ts` (line 215): Type the notification click payload
- [ ] `src/renderer/context/ToastContext.tsx` (lines 284-293): Define Toast interface properly
- [ ] `src/renderer/vite-env.d.ts` (line 124): Define proper type for Electron API
- [ ] `src/shared/types/ipc.ts` (line 208): Define specific type for IPC args

---

### Phase 3: Documentation & Code Quality (Priority: MEDIUM)

**Goal**: Add descriptions to ts-expect-error directives  
**Est. Effort**: 2-3 hours  
**Impact**: Better documentation, easier maintenance

#### 3.1 Add @ts-expect-error Descriptions (21 warnings)

**Files requiring descriptions:**

```
src/renderer/components/ErrorBoundary.tsx         - 1
tests/e2e/auth.spec.ts                           - 1
tests/e2e/auto-update-interactions.spec.ts       - 1
tests/e2e/error-boundary.spec.ts                 - 4
tests/e2e/fatal-error-recovery.spec.ts           - 2
tests/e2e/hotkey-configuration.e2e.test.ts       - 5
tests/e2e/pages/UpdateToastPage.ts               - 1
tests/e2e/toast-update-integration.spec.ts       - 1
```

**Action Items:**

- [ ] Add 3+ character descriptions to all `@ts-expect-error` directives explaining WHY the suppression is needed

#### 3.2 Replace @ts-ignore with @ts-expect-error (1 warning)

**File:** `src/main/managers/exportManager.ts` (line 8)

**Action Item:**

- [ ] Replace `@ts-ignore` with `@ts-expect-error` and add description

#### 3.3 Remove Unused eslint-disable Directive (1 warning)

**File:** `src/main/managers/llmManager.ts` (line 27)

**Action Item:**

- [ ] Remove unused `// eslint-disable-next-line @typescript-eslint/no-implied-eval`

---

### Phase 4: React Best Practices (Priority: LOW-MEDIUM)

**Goal**: Fix React-specific warnings  
**Est. Effort**: 1-2 hours  
**Impact**: Better dev experience with Fast Refresh

#### 4.1 Fast Refresh Export Pattern (6 warnings)

**Files:**

```
src/renderer/context/IndividualHotkeysContext.tsx
src/renderer/context/ThemeContext.tsx
src/renderer/context/ToastContext.tsx
src/renderer/context/UpdateToastContext.tsx
```

**Action Items:**

- [ ] Move non-component exports to separate files OR restructure exports to follow Fast Refresh pattern

#### 4.2 React Hooks Dependencies (1 warning)

**File:** `src/renderer/context/UpdateToastContext.tsx` (line 231)

**Action Item:**

- [ ] Add `currentToastId` to dependency array OR suppress with comment explaining why it's safe to omit

---

### Phase 5: Test Code Cleanup (Priority: LOW)

**Goal**: Clean up test-specific warnings  
**Est. Effort**: 1-2 hours  
**Impact**: Consistent test code style

#### 5.1 Replace Function Type (12 warnings in coordinated tests)

**Files:**

```
tests/coordinated/*.test.ts (8 files)
```

**Action Item:**

- [ ] Replace `Function` type with explicit `() => void` or appropriate function signature

#### 5.2 Remove @ts-nocheck Directives (3 warnings)

**Files:**

```
tests/e2e/hotkey-registration.spec.ts
tests/e2e/release/*.spec.ts (6 files with @ts-nocheck)
```

**Action Items:**

- [ ] Remove `@ts-nocheck` from `hotkey-registration.spec.ts`
- [ ] Evaluate if `@ts-nocheck` is still needed in release test files

---

### Phase 6: TypeScript LSP Error Resolution (Priority: MEDIUM)

**Goal**: Fix TypeScript type errors not caught by ESLint  
**Est. Effort**: 3-4 hours  
**Impact**: Full type safety across test suite, better IDE experience

#### 6.1 WDIO Type Extensions (46 errors)

**Issue**: WebdriverIO's Electron service extends the Browser type, but TypeScript doesn't recognize these extensions.

**Files affected:**

```
tests/integration/sandbox-detection.integration.test.ts    - 10 errors
tests/integration/wayland-platform-status.integration.test.ts - 26 errors
tests/e2e/helpers/hotkeyHelpers.ts                        - 8 errors
```

**Errors:**

- `Property 'waitUntil' does not exist on type 'Browser'`
- `Property 'execute' does not exist on type 'Browser'`
- `Property 'electron' does not exist on type 'Browser'`
- `Property 'getWindowHandles' does not exist on type 'Browser'`

**Solution Options:**

1. **Preferred**: Add proper WDIO Electron service type declarations
2. **Workaround**: Add `// @ts-expect-error` with descriptions where types are missing

**Action Items:**

- [ ] Verify `@wdio/electron-service` types are properly installed
- [ ] Check `tsconfig.json` includes proper type references
- [ ] Add triple-slash reference directive if needed: `/// <reference types="@wdio/electron-service" />`
- [ ] Consider creating custom type augmentation file: `tests/types/wdio-electron.d.ts`

#### 6.2 Test Helper Type Issues (2 errors)

**File:** `tests/unit/main/test/setup.ts` (line 37)

**Error:** `Cannot find name 'createMockWebContents'`

**Action Item:**

- [ ] Import or declare `createMockWebContents` function

**File:** `tests/coordinated/hotkey-coordination.coordinated.test.ts` (line 18)

**Error:** `Module '"../../src/main/utils/logger"' has no exported member 'mockLogger'`

**Action Item:**

- [ ] Fix import path or add `mockLogger` export to logger module

---

## Quick Wins (15 minutes each)

These can be done immediately for immediate impact:

1. **Prefix unused variables** in test files with `_` (30 errors → 0)
2. **Remove unused eslint-disable** in `llmManager.ts`
3. **Add descriptions** to 2-3 most critical `@ts-expect-error` directives
4. **Add `currentToastId`** to dependency array in `UpdateToastContext.tsx`

---

## Risk Assessment

| Phase                   | Risk Level | Mitigation                                          |
| ----------------------- | ---------- | --------------------------------------------------- |
| Phase 1 (Unused vars)   | Very Low   | Pure cleanup, no logic changes                      |
| Phase 2 (any types)     | Medium     | Requires understanding of intended types; add tests |
| Phase 3 (Comments)      | Very Low   | Documentation only                                  |
| Phase 4 (React exports) | Low        | May require file restructuring; test thoroughly     |
| Phase 5 (Test types)    | Low        | Test code only; easy to validate                    |
| Phase 6 (LSP errors)    | Low-Medium | Type-only changes; verify with `npx tsc --noEmit`   |

---

## Success Metrics

- [ ] **Phase 1 Complete**: `npm run lint` shows 0 errors
- [ ] **Phase 2 Complete**: `any` types reduced from 17 to < 5 in production code
- [ ] **Phase 3 Complete**: All `@ts-expect-error` have descriptions
- [ ] **Phase 4 Complete**: 0 `react-refresh` warnings
- [ ] **Phase 5 Complete**: 0 `no-unsafe-function-type` warnings in tests
- [ ] **Phase 6 Complete**: `npx tsc --noEmit` shows 0 errors across test files

---

## Next Steps

1. **Immediate**: Create a PR for Phase 1 (error cleanup) - unblocks CI
2. **This Sprint**: Complete Phase 2 (type safety) - highest code quality impact
3. **Next Sprint**: Address Phases 3-5 based on team bandwidth
4. **Backlog**: Phase 6 (LSP errors) - nice-to-have type safety improvements

---

## Appendix: Full Issue List

### Errors (by file)

```
tests/e2e/helpers/waitUtilities.ts
  271:18  error  'error' is defined but never used
  335:18  error  'error' is defined but never used
  590:11  error  'allSucceeded' is assigned but never used

tests/e2e/helpers/workflows.ts
  17:30  error  'closeCurrentWindow' is defined but never used

tests/e2e/hotkey-toggle.spec.ts
  18:10  error  'waitForWindowCount' is defined but never used
  22:10  error  'Selectors' is defined but never used
  78:9   error  'mainWindowHandle' is assigned but never used

tests/e2e/lifecycle.spec.ts
  14:10  error  'waitForWindowCount' is defined but never used

tests/e2e/macos-dock.spec.ts
  16:10  error  'browser' is defined but never used
  25:11  error  'mainWindow' is assigned but never used

tests/e2e/menu_bar.spec.ts
  139:15  error  'fileButton' is assigned but never used

tests/e2e/options-tabs.spec.ts
  12:10  error  'browser' is defined but never used
  13:10  error  'Selectors' is defined but never used
  16:10  error  'waitForWindowCount' is defined but never used
  20:5   error  'switchToOptionsWindow' is defined but never used
  29:26  error  'assertWindowCount' is defined but never used
  33:5   error  'withOptionsTab' is defined but never used

tests/e2e/pages/ContextMenuPage.ts
  272:50  error  'options' is defined but never used
  413:35  error  'expectedText' is defined but never used

tests/e2e/quick-chat-full-workflow.spec.ts
  22:10  error  'browser' is defined but never used
  31:11  error  'mainWindow' is assigned but never used

tests/e2e/session-persistence.spec.ts
  8:10  error  'browser' is defined but never used

tests/e2e/toast-interactions.spec.ts
  82:19  error  'toast1Id' is assigned but never used
  86:19  error  'toast2Id' is assigned but never used
  117:19  error  'toastId' is assigned but never used
  150:19  error  'toastId' is assigned but never used

tests/e2e/tray.spec.ts
  18:10  error  'browser' is defined but never used
  25:11  error  'mainWindow' is assigned but never used
```

### Warnings Summary

```
@typescript-eslint/no-explicit-any: 17 occurrences
@typescript-eslint/ban-ts-comment: 28 occurrences
  - @ts-expect-error missing description: 21
  - @ts-ignore usage: 1
  - @ts-nocheck usage: 3
  - Other ban-ts-comment: 3
@typescript-eslint/no-unsafe-function-type: 12 occurrences
react-refresh/only-export-components: 6 occurrences
react-hooks/exhaustive-deps: 1 occurrence
@typescript-eslint/no-implied-eval: 1 occurrence
```
