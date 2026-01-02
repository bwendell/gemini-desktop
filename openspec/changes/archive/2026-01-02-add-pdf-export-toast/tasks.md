## 1. Core Infrastructure

**Files to modify:**

- `src/shared/constants/ipc-channels.ts`
- `src/shared/types/ipc.ts`
- `src/preload/preload.ts`
- `src/main/managers/ipcManager.ts`

**Verification:** `npm run typecheck && npm run lint`

**References:**

- [ipc-channels.ts](file:///c:/Users/bwend/repos/gemini/src/shared/constants/ipc-channels.ts) - existing IPC channel patterns
- [ipcManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts) - existing handler patterns

**Tasks:**

- [x] 1.1 Add `SHELL_SHOW_ITEM_IN_FOLDER` constant to `ipc-channels.ts`
- [x] 1.2 Add `revealInFolder(path: string): void` to `WindowAPI` interface in `ipc.ts`
- [x] 1.3 Expose `revealInFolder` method in `preload.ts`
- [x] 1.4 Add IPC handler in `ipcManager.ts` calling `shell.showItemInFolder()`

---

## 2. Toast Integration

**Files to modify:**

- `src/renderer/App.tsx` (or new `usePdfExportToast.ts` hook)

**Verification:** `npm run dev` → trigger PDF export → observe toast

**References:**

- [ToastContext.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/context/ToastContext.tsx) - `useToast()` API
- [printManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/printManager.ts#L123-L134) - success/error IPC events

**Tasks:**

- [x] 2.1 Add `useEffect` listening for `print-to-pdf:success` IPC event
- [x] 2.2 Show success toast with message and "Show in Folder" action button
- [x] 2.3 Wire up `print-to-pdf:error` IPC event to show error toast

---

## 3. Unit Tests

**Files to create/modify:**

- `tests/unit/main/ipcManager.test.ts`
- `tests/unit/preload/preload.test.ts` (if exists)

**Verification:** `npm run test -- --testPathPattern="ipcManager"`

**References:**

- [printManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/printManager.test.ts) - existing unit test patterns

**Tasks:**

- [x] 3.1 Unit test: Verify `shell.showItemInFolder` is called with correct path
- [x] 3.2 Unit test: Verify preload `revealInFolder` sends correct IPC

---

## 4. Coordinated Tests

**Files to create:**

- `tests/coordinated/pdf-export-toast.coordinated.test.tsx`

**Verification:** `npm run test:coordinated -- --testPathPattern="pdf-export"`

**References:**

- [toast-context.coordinated.test.tsx](file:///c:/Users/bwend/repos/gemini/tests/coordinated) - toast coordinated test patterns
- [print-to-pdf-ipc.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-to-pdf-ipc.coordinated.test.ts) - print IPC patterns

**Tasks:**

- [x] 4.1 Coordinated test: Print success event → toast appears with file path
- [x] 4.2 Coordinated test: Print error event → error toast appears
- [x] 4.3 Coordinated test: "Show in Folder" action → IPC call made

---

## 5. Integration Tests

**Files to create/modify:**

- `tests/integration/pdf-export-toast.integration.test.ts`

**Verification:** `npm run test:integration -- --spec="tests/integration/pdf-export-toast*"`

**References:**

- [print-to-pdf.integration.test.ts](file:///c:/Users/bwend/repos/gemini/tests/integration/print-to-pdf.integration.test.ts) - existing integration patterns

**Tasks:**

- [x] 5.1 Integration test: Full flow from PDF export success to toast display
- [x] 5.2 Integration test: "Show in Folder" action triggers shell API

---

## 6. E2E Tests

**Files to create:**

- `tests/e2e/pdf-export-toast.spec.ts`
- Update `tests/e2e/pages/ToastPage.ts` if needed

**Verification:** `npm run test:e2e -- --spec="tests/e2e/pdf-export-toast*"`

**References:**

- [E2E_TESTING_GUIDELINES.md](file:///c:/Users/bwend/repos/gemini/docs/E2E_TESTING_GUIDELINES.md) - **Golden Rule: verify actual outcomes**
- [ToastPage.ts](file:///c:/Users/bwend/repos/gemini/tests/e2e/pages/ToastPage.ts) - toast page object
- [print-to-pdf-workflow.spec.ts](file:///c:/Users/bwend/repos/gemini/tests/e2e/print-to-pdf-workflow.spec.ts) - existing print E2E patterns

**Tasks:**

- [x] 6.1 E2E test: Export PDF via menu → verify success toast with file path
- [x] 6.2 E2E test: Click "Show in Folder" action → verify IPC invoked
- [x] 6.3 E2E test: Simulate export failure → verify error toast appears
