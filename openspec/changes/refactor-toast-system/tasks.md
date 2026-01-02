# Refactor Toast System - Implementation Tasks

## 1. Core Toast Infrastructure

- [x] 1.1 Create generic `Toast` component

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.tsx`
  - [NEW] `src/renderer/components/toast/index.ts`

  **Context:**
  - Review `src/renderer/components/update-toast/UpdateToast.tsx` for animation patterns
  - See `design.md` "Decision 1: Layered Component Architecture" and "Type Definitions"

  **Subtasks:**
  - [x] 1.1.1 Define `ToastType`: `'success' | 'error' | 'info' | 'warning' | 'progress'`
  - [x] 1.1.2 Define `ToastAction` interface: `{ label, onClick, primary? }`
  - [x] 1.1.3 Define `ToastProps` interface: `{ id, type, title?, message, icon?, progress?, actions?, onDismiss }`
  - [x] 1.1.4 Implement icon selection based on toast type (use lucide-react icons)
  - [x] 1.1.5 Implement progress bar for progress type (0-100)
  - [x] 1.1.6 Add action buttons support (primary/secondary styling)

  **Acceptance Criteria:**
  - Component renders all 5 toast types with appropriate icons
  - Progress bar displays when type is `progress` and `progress` prop is provided
  - Action buttons render in `.toast__actions` area when `actions[]` provided
  - Dismiss callback fires when close button clicked
  - Accessibility: `role="alert"` and `aria-live="polite"`

  **Verification:**

  ```bash
  npm run build
  ```

---

- [x] 1.2 Create generic toast styles

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.css`

  **Context:**
  - Review `src/renderer/components/update-toast/UpdateToast.css` for glassmorphism styling
  - See `design.md` "Decision 5: CSS Class Migration" for class naming

  **Subtasks:**
  - [x] 1.2.1 Create base `.toast` container with glassmorphism effect
  - [x] 1.2.2 Create `.toast__icon`, `.toast__content`, `.toast__actions` layout
  - [x] 1.2.3 Add variant classes: `.toast--success` (green), `.toast--error` (red), `.toast--info` (accent), `.toast--warning` (yellow), `.toast--progress` (accent)
  - [x] 1.2.4 Use existing CSS variables: `--accent-color`, `--error-color`, `--background`, etc.
  - [x] 1.2.5 Add progress bar styling with smooth animation

  **Acceptance Criteria:**
  - All 5 variants have distinct left-border colors as defined in design.md
  - Glassmorphism effect matches existing UpdateToast
  - Dark theme compatible (uses CSS variables)
  - Smooth transitions on hover/dismiss

  **Verification:**

  ```bash
  npm run build
  ```

---

- [x] 1.3 Create ToastContainer component

  **Files:**
  - [NEW] `src/renderer/components/toast/ToastContainer.tsx`
  - [MODIFY] `src/renderer/components/toast/index.ts` - add export

  **Context:**
  - See `design.md` "Toast Stacking Behavior" for layout diagram
  - Review framer-motion AnimatePresence in existing UpdateToast

  **Subtasks:**
  - [x] 1.3.1 Create fixed-position container (bottom-left corner)
  - [x] 1.3.2 Implement toast stack rendering (map over toasts array)
  - [x] 1.3.3 Add `AnimatePresence` from framer-motion for enter/exit animations
  - [x] 1.3.4 Stack toasts vertically: newest on top, oldest at bottom
  - [x] 1.3.5 Limit max visible toasts to 5 (queue additional toasts)

  **Acceptance Criteria:**
  - Container is fixed to bottom-left with proper z-index
  - Toasts stack vertically with spacing
  - Enter/exit animations work smoothly
  - More than 5 toasts queues extras until space available

  **Verification:**

  ```bash
  npm run build
  ```

---

## 2. Toast Context and Hook

- [x] 2.1 Create ToastContext

  **Files:**
  - [NEW] `src/renderer/context/ToastContext.tsx`
  - [MODIFY] `src/renderer/context/index.ts` - add export

  **Context:**
  - See `design.md` "Type Definitions" for `ShowToastOptions` and `ToastContextValue`
  - See `design.md` "Decision 4: Fixed Duration with Override" for duration defaults

  **Subtasks:**
  - [x] 2.1.1 Define `ToastItem` interface (extends ToastProps with id)
  - [x] 2.1.2 Create `ToastContext` with `createContext<ToastContextValue | null>(null)`
  - [x] 2.1.3 Create `ToastProvider` component with `const [toasts, setToasts] = useState<ToastItem[]>([])`
  - [x] 2.1.4 Implement `showToast(options)` - generate uuid, add to array, return id
  - [x] 2.1.5 Implement `dismissToast(id)` - remove from array by id
  - [x] 2.1.6 Implement `dismissAll()` - clear array
  - [x] 2.1.7 Implement auto-dismiss with `setTimeout` based on duration:
    - Success/Info: 5000ms
    - Warning: 7000ms
    - Error: 10000ms
    - Progress: no auto-dismiss
    - `persistent: true`: no auto-dismiss
  - [x] 2.1.8 Render `<ToastContainer toasts={toasts} />` inside provider

  **Acceptance Criteria:**
  - `showToast()` returns unique toast ID
  - Toasts auto-dismiss after configured duration
  - `dismissToast(id)` removes correct toast
  - `dismissAll()` clears all toasts
  - Context provides `toasts` array for inspection

  **Verification:**

  ```bash
  npm run build
  ```

---

- [x] 2.2 Create useToast hook

  **Files:**
  - [MODIFY] `src/renderer/context/ToastContext.tsx` - add hook export

  **Subtasks:**
  - [x] 2.2.1 Export `useToast()` hook that returns `{ showToast, dismissToast, dismissAll, toasts }`
  - [x] 2.2.2 Add convenience helpers: `showSuccess(msg)`, `showError(msg)`, `showInfo(msg)`, `showWarning(msg)`
  - [x] 2.2.3 Throw descriptive error if used outside `ToastProvider`

  **Acceptance Criteria:**
  - Hook throws error with helpful message when used outside provider
  - Helper functions correctly set toast type
  - All functions from context are accessible

  **Verification:**

  ```bash
  npm run build
  ```

---

## 3. Refactor Update Toast

- [x] 3.1 Update UpdateToast component

  **Files:**
  - [MODIFY] `src/renderer/components/update-toast/UpdateToast.tsx`

  **Context:**
  - See `design.md` "Decision 2: Keep UpdateToastContext Separate" for rationale
  - Keep existing content generation logic (getMessage, getTitle, getIcon)

  **Subtasks:**
  - [x] 3.1.1 Import generic `Toast` component
  - [x] 3.1.2 Create mapping function: UpdateStatus → ToastType
    - `'available'` → `'info'`
    - `'downloaded'` → `'success'`
    - `'downloading'` → `'progress'`
    - `'error'` → `'error'`
  - [x] 3.1.3 Render `<Toast type={mappedType} ... />` instead of custom JSX
  - [x] 3.1.4 Pass existing actions (Install Now, Later, Details) as `actions[]`

  **Acceptance Criteria:**
  - UpdateToast uses generic Toast internally
  - Visual appearance unchanged from before
  - All existing functionality preserved

  **Verification:**

  ```bash
  npm run test -- UpdateToast
  npm run build
  ```

---

- [x] 3.2 Update UpdateToastContext

  **Files:**
  - [MODIFY] `src/renderer/context/UpdateToastContext.tsx`

  **Context:**
  - See `design.md` "Decision 3: Toast ID-Based Management" for tracking toast IDs

  **Subtasks:**
  - [x] 3.2.1 Add `import { useToast } from './ToastContext'`
  - [x] 3.2.2 Track current toast ID: `const [currentToastId, setCurrentToastId] = useState<string | null>(null)`
  - [x] 3.2.3 Use `showToast()` to display update notifications instead of internal state
  - [x] 3.2.4 Use `dismissToast(currentToastId)` when hiding
  - [x] 3.2.5 Keep `hasPendingUpdate` and `downloadProgress` state unchanged

  **Acceptance Criteria:**
  - Update toasts appear via generic ToastContext
  - `useUpdateToast()` API unchanged for consumers
  - Programmatic dismissal works via tracked ID

  **Verification:**

  ```bash
  npm run test -- UpdateToastContext
  npm run build
  ```

---

- [x] 3.3 Update useUpdateNotifications hook

  **Files:**
  - [MODIFY] `src/renderer/hooks/useUpdateNotifications.ts` (if exists, else look in context)

  **Subtasks:**
  - [x] 3.3.1 Verify hook works with new context structure
  - [x] 3.3.2 Keep IPC event subscriptions unchanged
  - [x] 3.3.3 Update dev mode test helpers to use new internal API

  **Acceptance Criteria:**
  - IPC events still trigger toast display
  - Dev mode helpers work: `__testUpdateToast.showAvailable()`, etc.

  **Verification:**

  ```bash
  npm run test -- useUpdateNotifications
  ```

---

## 4. App Integration

- [x] 4.1 Update provider hierarchy

  **Files:**
  - [MODIFY] `src/renderer/App.tsx`

  **Context:**
  - See `design.md` "Component Hierarchy" for nesting order

  **Subtasks:**
  - [x] 4.1.1 Import `ToastProvider` from context
  - [x] 4.1.2 Wrap existing providers: `ThemeProvider > ToastProvider > UpdateToastProvider`
  - [x] 4.1.3 Remove direct `<UpdateToast />` rendering if present (now handled by ToastContainer)

  **Acceptance Criteria:**
  - Provider order matches design.md hierarchy
  - No duplicate toast rendering
  - App builds and runs without errors

  **Verification:**

  ```bash
  npm run build
  npm run electron:dev
  # Manual: verify app loads, no console errors
  ```

---

- [x] 4.2 Update component exports

  **Files:**
  - [MODIFY] `src/renderer/components/toast/index.ts`
  - [MODIFY] `src/renderer/context/index.ts`

  **Subtasks:**
  - [x] 4.2.1 Export `Toast`, `ToastContainer`, `ToastType`, `ToastProps`, `ToastAction`
  - [x] 4.2.2 Export `ToastProvider`, `ToastContext`, `useToast`, `ShowToastOptions`

  **Acceptance Criteria:**
  - All public APIs importable from barrel exports

  **Verification:**

  ```bash
  npm run build
  ```

---

## 5. IPC Integration (Main Process → Renderer Toasts)

- [x] 5.1 Add IPC channel for generic toasts

  **Files:**
  - [MODIFY] `src/shared/constants/ipc-channels.ts`
  - [NEW] `src/shared/types/toast.ts`

  **Subtasks:**
  - [x] 5.1.1 Add `TOAST_SHOW = 'toast:show'` channel constant
  - [x] 5.1.2 Define `ToastPayload` type: `{ type, title?, message, duration? }`

  **Acceptance Criteria:**
  - IPC channel exported and typed
  - Payload type matches ShowToastOptions subset

  **Verification:**

  ```bash
  npm run build
  ```

---

- [x] 5.2 Update preload script

  **Files:**
  - [MODIFY] `src/preload/preload.ts`
  - [MODIFY] `src/shared/types/ipc.ts`

  **Subtasks:**
  - [x] 5.2.1 Add `onToastShow: (callback) => ipcRenderer.on(IPC_CHANNELS.TOAST_SHOW, callback)`
  - [x] 5.2.2 Add cleanup function return
  - [x] 5.2.3 Update `ElectronAPI` interface with `onToastShow` method

  **Acceptance Criteria:**
  - Renderer can subscribe to toast events from main
  - TypeScript types correct

  **Verification:**

  ```bash
  npm run build:electron
  ```

---

- [x] 5.3 Subscribe to IPC in ToastContext

  **Files:**
  - [MODIFY] `src/renderer/context/ToastContext.tsx`

  **Subtasks:**
  - [x] 5.3.1 Add `useEffect` to subscribe to `onToastShow` events
  - [x] 5.3.2 Call `showToast()` with received payload
  - [x] 5.3.3 Clean up subscription on unmount

  **Acceptance Criteria:**
  - Main process can trigger toasts in renderer
  - No memory leaks from subscriptions

  **Verification:**

  ```bash
  npm run build
  ```

---

- [x] 5.4 Create main process helper (optional)

  **Files:**
  - [NEW] `src/main/utils/toast.ts`

  **Subtasks:**
  - [x] 5.4.1 Create `showToast(window: BrowserWindow, options: ToastPayload)` function
  - [x] 5.4.2 Uses `window.webContents.send(IPC_CHANNELS.TOAST_SHOW, options)`

  **Acceptance Criteria:**
  - Main process can easily send toasts to any window

  **Verification:**

  ```bash
  npm run build:electron
  ```

---

## 6. Unit Tests

- [x] 6.1 Toast component tests

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.test.tsx`

  **Subtasks:**
  - [x] 6.1.1 Test rendering for each toast type with correct icon
  - [x] 6.1.2 Test action button callbacks are called on click
  - [x] 6.1.3 Test dismiss button triggers `onDismiss`
  - [x] 6.1.4 Test accessibility: `role="alert"`, `aria-live`
  - [x] 6.1.5 Test progress bar renders only for progress type
  - [x] 6.1.6 Test custom title and message render correctly

  **Acceptance Criteria:**
  - All tests pass
  - Coverage for all props and variants

  **Verification:**

  ```bash
  npm run test -- Toast.test
  ```

---

- [x] 6.2 ToastContainer tests

  **Files:**
  - [NEW] `src/renderer/components/toast/ToastContainer.test.tsx`

  **Subtasks:**
  - [x] 6.2.1 Test renders correct number of toasts
  - [x] 6.2.2 Test toast stacking order (newest first)
  - [x] 6.2.3 Test individual toast dismissal removes correct toast
  - [x] 6.2.4 Test max visible limit (only 5 shown)
  - [x] 6.2.5 Test AnimatePresence animations trigger

  **Acceptance Criteria:**
  - All tests pass

  **Verification:**

  ```bash
  npm run test -- ToastContainer.test
  ```

---

- [x] 6.3 ToastContext tests

  **Files:**
  - [NEW] `src/renderer/context/ToastContext.test.tsx`

  **Subtasks:**
  - [x] 6.3.1 Test `showToast()` adds toast to array and returns ID
  - [x] 6.3.2 Test `dismissToast(id)` removes correct toast
  - [x] 6.3.3 Test `dismissAll()` clears all toasts
  - [x] 6.3.4 Test auto-dismiss after duration (mock timers)
  - [x] 6.3.5 Test persistent toast does not auto-dismiss
  - [x] 6.3.6 Test `useToast()` throws outside provider
  - [x] 6.3.7 Test helper functions (`showSuccess`, etc.) set correct type

  **Acceptance Criteria:**
  - All tests pass
  - Covers happy path and error cases

  **Verification:**

  ```bash
  npm run test -- ToastContext.test
  ```

---

- [x] 6.4 Update existing tests

  **Files:**
  - [MODIFY] `src/renderer/components/toast/UpdateToast.test.tsx`
  - [MODIFY] `src/renderer/context/UpdateToastContext.test.tsx`

  **Subtasks:**
  - [x] 6.4.1 Update `UpdateToast.test.tsx` - mock new Toast component or test integration
  - [x] 6.4.2 Update `UpdateToastContext.test.tsx` - add ToastProvider wrapper in test setup
  - [x] 6.4.3 Verify all existing tests still pass

  **Acceptance Criteria:**
  - No regressions in existing update toast tests

  **Verification:**

  ```bash
  npm run test -- update-toast
  npm run test -- UpdateToast
  ```

---

## 7. Coordinated Tests

- [x] 7.1 Toast IPC Flow Tests

  **Files:**
  - [NEW] `tests/coordinated/toast-ipc.coordinated.test.ts`

  **Context:**
  - See `docs/E2E_TESTING_GUIDELINES.md` for testing pyramid
  - Reference `tests/coordinated/print-to-pdf-ipc.coordinated.test.ts` for IPC patterns

  **Subtasks:**
  - [x] 7.1.1 Test `TOAST_SHOW` IPC handler receives payload from main process
  - [x] 7.1.2 Test payload includes `type`, `title`, `message`, `duration`
  - [x] 7.1.3 Test renderer calls `showToast()` when IPC event received
  - [x] 7.1.4 Test main process helper sends correct IPC
  - [x] 7.1.5 Test IPC listener cleanup on unmount (no memory leak)

  **Acceptance Criteria:**
  - IPC flow tested end-to-end with mocked webContents
  - Golden Rule: If IPC channel name was wrong, test fails

  **Verification:**

  ```bash
  npm run test:coordinated -- toast-ipc
  ```

---

- [x] 7.2 ToastContext ↔ ToastContainer Coordination

  **Files:**
  - [NEW] `tests/coordinated/toast-context.coordinated.test.tsx`

  **Context:**
  - See `design.md` "Decision 3: Toast ID-Based Management"

  **Subtasks:**
  - [x] 7.2.1 Test `showToast()` adds toast and ToastContainer receives it
  - [x] 7.2.2 Test `dismissToast(id)` removes correct toast
  - [x] 7.2.3 Test `dismissAll()` clears all toasts
  - [x] 7.2.4 Test max visible limit (5) - 6th toast queues
  - [x] 7.2.5 Test queued toasts appear when earlier toasts dismiss
  - [x] 7.2.6 Test auto-dismiss timers for each toast type
  - [x] 7.2.7 Test `persistent: true` never auto-dismisses

  **Acceptance Criteria:**
  - Context state and container rendering stay in sync

  **Verification:**

  ```bash
  npm run test:coordinated -- toast-context
  ```

---

- [x] 7.3 UpdateToastContext ↔ ToastContext Integration

  **Files:**
  - [MODIFY] `tests/coordinated/update-notification.coordinated.test.ts`

  **Subtasks:**
  - [x] 7.3.1 Test UpdateToastContext uses `showToast()` for notifications
  - [x] 7.3.2 Test update toast ID tracked for programmatic dismissal
  - [x] 7.3.3 Test `dismissToast(updateToastId)` removes update toast
  - [x] 7.3.4 Test update status changes update existing toast
  - [x] 7.3.5 Test provider nesting: ToastProvider wraps UpdateToastProvider

  **Acceptance Criteria:**
  - Update notifications flow through generic toast system
  - Backward compatibility: `useUpdateToast()` unchanged

  **Verification:**

  ```bash
  npm run test:coordinated -- update-notification
  ```

---

- [x] 7.4 Toast Error Handling Coordination

  **Files:**
  - [NEW] `tests/coordinated/toast-errors.coordinated.test.ts`

  **Subtasks:**
  - [x] 7.4.1 Test useToast() throws error outside ToastProvider
  - [x] 7.4.2 Test invalid toast type handled gracefully
  - [x] 7.4.3 Test duplicate toast IDs handled (replace vs reject)
  - [x] 7.4.4 Test destroyed webContents doesn't crash
  - [x] 7.4.5 Test rapid toast creation no race conditions

  **Acceptance Criteria:**
  - Errors logged and handled, never crash app

  **Verification:**

  ```bash
  npm run test:coordinated -- toast-errors
  ```

---

## 7.5 Integration Tests

- [x] 7.5.1 Toast Provider Integration

  **Files:**
  - [NEW] `tests/integration/toast-provider.integration.test.ts`

  **Subtasks:**
  - [x] 7.5.1.1 Test ToastProvider renders children
  - [x] 7.5.1.2 Test ToastContainer renders inside provider
  - [x] 7.5.1.3 Test nested components access useToast()
  - [x] 7.5.1.4 Test ThemeProvider → ToastProvider → UpdateToastProvider nesting
  - [x] 7.5.1.5 Test multiple ToastProviders don't conflict

  **Verification:**

  ```bash
  npm run test:integration -- toast-provider
  ```

---

- [x] 7.5.2 Toast IPC Integration

  **Files:**
  - [NEW] `tests/integration/toast-ipc.integration.test.ts`

  **Subtasks:**
  - [x] 7.5.2.1 Test main process sends → renderer shows toast
  - [x] 7.5.2.2 Test preload exposes `onToastShow` correctly
  - [x] 7.5.2.3 Test cleanup unsubscribes from IPC
  - [x] 7.5.2.4 Test multiple windows receive independent events

  **Verification:**

  ```bash
  npm run test:integration -- toast-ipc
  ```

---

- [x] 7.5.3 Toast State Management Integration

  **Files:**
  - [NEW] `tests/integration/toast-state.integration.test.ts`

  **Subtasks:**
  - [x] 7.5.3.1 Test showToast → state update → re-render
  - [x] 7.5.3.2 Test rapid sequential showToast calls
  - [x] 7.5.3.3 Test concurrent showToast and dismissToast
  - [x] 7.5.3.4 Test state persists across re-renders

  **Verification:**

  ```bash
  npm run test:integration -- toast-state
  ```

---

- [x] 7.5.4 Update Toast Migration Integration

  **Files:**
  - [MODIFY] `tests/integration/update-notification.integration.test.ts`

  **Subtasks:**
  - [x] 7.5.4.1 Test existing update IPC events still trigger toasts
  - [x] 7.5.4.2 Test download progress updates toast correctly
  - [x] 7.5.4.3 Test update actions (Install Now, Later) work
  - [x] 7.5.4.4 Test dev mode helpers still function

  **Verification:**

  ```bash
  npm run test:integration -- update-notification
  ```

---

## 7.6 E2E Tests

> **Golden Rule**: "If this code path was broken, would this test fail?"

- [x] 7.6.1 Toast Visibility E2E

  **Files:**
  - [NEW] `tests/e2e/toast-visibility.spec.ts`

  **Context:**
  - Follow `docs/E2E_TESTING_GUIDELINES.md` - NO mocks, actual outcomes

  **Subtasks:**
  - [x] 7.6.1.1 Test toast appears in bottom-left corner
  - [x] 7.6.1.2 Test correct icon for each type (success, error, info, warning, progress)
  - [x] 7.6.1.3 Test title and message display correctly
  - [x] 7.6.1.4 Test ARIA attributes (`role="alert"`, `aria-live="polite"`)
  - [x] 7.6.1.5 Test toast actually rendered in DOM (not just exists)

  **Acceptance Criteria:**
  - Golden Rule: If toast CSS broken, tests fail

  **Verification:**

  ```bash
  npm run test:e2e -- toast-visibility
  ```

---

- [x] 7.6.2 Toast User Interactions E2E

  **Files:**
  - [NEW] `tests/e2e/toast-interactions.spec.ts`
  - [NEW] `tests/e2e/pages/ToastPage.ts`

  **Context:**
  - Simulate REAL user actions (click, not js click)

  **Subtasks:**
  - [x] 7.6.2.1 Create ToastPage page object
  - [x] 7.6.2.2 Test clicking dismiss removes toast
  - [x] 7.6.2.3 Test clicking action button fires callback
  - [x] 7.6.2.4 Test toast auto-dismisses after duration
  - [x] 7.6.2.5 Test hover pauses auto-dismiss (if implemented)
  - [x] 7.6.2.6 Test keyboard navigation

  **Acceptance Criteria:**
  - Golden Rule: If dismiss selector wrong, test fails

  **Verification:**

  ```bash
  npm run test:e2e -- toast-interactions
  ```

---

- [x] 7.6.3 Toast Stacking E2E

  **Files:**
  - [NEW] `tests/e2e/toast-stacking.spec.ts`

  **Context:**
  - See `design.md` "Toast Stacking Behavior" diagram

  **Subtasks:**
  - [x] 7.6.3.1 Test multiple toasts stack vertically (newest on top)
  - [x] 7.6.3.2 Test max 5 toasts visible
  - [x] 7.6.3.3 Test 6th toast appears after 1st dismisses
  - [x] 7.6.3.4 Test correct z-order
  - [x] 7.6.3.5 Test dismissing middle toast doesn't break layout
  - [x] 7.6.3.6 Test rapid creation (10 in 500ms) handled

  **Acceptance Criteria:**
  - Stacking matches design.md, no visual glitches

  **Verification:**

  ```bash
  npm run test:e2e -- toast-stacking
  ```

---

- [x] 7.6.4 Update Toast Integration E2E

  **Files:**
  - [NEW] `tests/e2e/toast-update-integration.spec.ts`

  **Context:**
  - Test via dev helpers, NOT internal method calls

  **Subtasks:**
  - [x] 7.6.4.1 Test `__testUpdateToast.showAvailable()` shows info toast
  - [x] 7.6.4.2 Test `__testUpdateToast.showDownloaded()` shows success toast
  - [x] 7.6.4.3 Test `__testUpdateToast.showError()` shows error toast
  - [x] 7.6.4.4 Test "Install Now" button triggers install
  - [x] 7.6.4.5 Test "Later" button dismisses toast
  - [x] 7.6.4.6 Test download progress bar updates

  **Acceptance Criteria:**
  - Update toast works through generic system

  **Verification:**

  ```bash
  npm run test:e2e -- toast-update-integration
  ```

---

- [x] 7.6.5 Toast Full Workflow E2E

  **Files:**
  - [NEW] `tests/e2e/toast-workflow.spec.ts`

  **Context:**
  - Test COMPLETE flows, not isolated pieces

  **Subtasks:**
  - [x] 7.6.5.1 **Success Toast:** Trigger → appears → auto-dismiss → removed
  - [x] 7.6.5.2 **Error Toast:** Trigger → appears → persists 10s → dismiss → removed
  - [x] 7.6.5.3 **Progress Toast:** Trigger → appears → progress updates → completion
  - [x] 7.6.5.4 **Multi-Toast:** Trigger 3 → all stack → dismiss middle → re-stack

  **Acceptance Criteria:**
  - Golden Rule: If any step broken, test fails

  **Verification:**

  ```bash
  npm run test:e2e -- toast-workflow
  ```

---

- [x] 7.6.6 Create ToastPage Page Object

  **Files:**
  - [NEW] `tests/e2e/pages/ToastPage.ts`

  **Context:**
  - Follow existing page object patterns in `tests/e2e/pages/`

  **Subtasks:**
  - [x] 7.6.6.1 `waitForToast(type?)` - wait for toast to appear
  - [x] 7.6.6.2 `getToastCount()` - count visible toasts
  - [x] 7.6.6.3 `getToastByIndex(index)` - get nth toast
  - [x] 7.6.6.4 `dismissToast(index)` - click dismiss
  - [x] 7.6.6.5 `clickAction(index, label)` - click action button
  - [x] 7.6.6.6 `getToastText(index)` - get title/message
  - [x] 7.6.6.7 `waitForToastDismissed(index)` - wait for gone
  - [x] 7.6.6.8 `triggerTestToast(type)` - trigger via dev console

  **Acceptance Criteria:**
  - Page object encapsulates all toast interactions

  **Verification:**

  ```bash
  npm run test:e2e -- toast
  ```

---

## 8. Documentation

- [x] 8.1 Update ARCHITECTURE.md

  **Files:**
  - [MODIFY] `docs/ARCHITECTURE.md`

  **Subtasks:**
  - [x] 8.1.1 Add section on Toast System architecture
  - [x] 8.1.2 Document provider nesting order requirement
  - [x] 8.1.3 Document ToastContext public API

  **Acceptance Criteria:**
  - Developers can understand toast system from docs

  **Verification:**
  - Review rendered markdown

---

- [x] 8.2 Add JSDoc comments

  **Files:**
  - [MODIFY] `src/renderer/components/toast/Toast.tsx`
  - [MODIFY] `src/renderer/context/ToastContext.tsx`

  **Subtasks:**
  - [x] 8.2.1 Add JSDoc to all exported functions and interfaces
  - [x] 8.2.2 Include `@example` blocks for `showToast()` and `useToast()`

  **Acceptance Criteria:**
  - IDE shows helpful tooltips for all public APIs

  **Verification:**
  - Check IDE hover tooltips

---

## 9. Verification

- [x] 9.1 Run all test suites

  **Verification:**

  ```bash
  npm run test
  npm run test:coordinated
  npm run test:integration
  npm run test:e2e
  ```

  **Acceptance Criteria:**
  - All tests pass
  - No regressions

---

- [x] 9.2 Manual testing in dev mode

  **Subtasks:**
  - [x] 9.2.1 Run `npm run electron:dev`
  - [x] 9.2.2 Open DevTools console
  - [x] 9.2.3 Test `__testUpdateToast.showAvailable()` - should show info toast
  - [x] 9.2.4 Test `__testUpdateToast.showDownloaded()` - should show success toast
  - [x] 9.2.5 Test `__testUpdateToast.showError()` - should show error toast
  - [x] 9.2.6 Verify toast stacking with multiple rapid triggers

  **Acceptance Criteria:**
  - All dev helpers work
  - Toast appears in bottom-left
  - Auto-dismiss works
  - Dismiss button works
    **Subtasks:**
  - [x] 9.2.1 Run `npm run electron:dev`
  - [x] 9.2.2 Open DevTools console
  - [x] 9.2.3 Test `__testUpdateToast.showAvailable()` - should show info toast
  - [x] 9.2.4 Test `__testUpdateToast.showDownloaded()` - should show success toast
  - [x] 9.2.5 Test `__testUpdateToast.showError()` - should show error toast
  - [x] 9.2.6 Verify toast stacking with multiple rapid triggers

  **Acceptance Criteria:**
  - All dev helpers work
  - Toast appears in bottom-left
  - Auto-dismiss works
  - Dismiss button works
