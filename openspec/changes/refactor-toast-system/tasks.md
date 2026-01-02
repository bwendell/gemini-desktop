# Refactor Toast System - Implementation Tasks

## 1. Core Toast Infrastructure

- [ ] 1.1 Create generic `Toast` component

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.tsx`
  - [NEW] `src/renderer/components/toast/index.ts`

  **Context:**
  - Review `src/renderer/components/update-toast/UpdateToast.tsx` for animation patterns
  - See `design.md` "Decision 1: Layered Component Architecture" and "Type Definitions"

  **Subtasks:**
  - [ ] 1.1.1 Define `ToastType`: `'success' | 'error' | 'info' | 'warning' | 'progress'`
  - [ ] 1.1.2 Define `ToastAction` interface: `{ label, onClick, primary? }`
  - [ ] 1.1.3 Define `ToastProps` interface: `{ id, type, title?, message, icon?, progress?, actions?, onDismiss }`
  - [ ] 1.1.4 Implement icon selection based on toast type (use lucide-react icons)
  - [ ] 1.1.5 Implement progress bar for progress type (0-100)
  - [ ] 1.1.6 Add action buttons support (primary/secondary styling)

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

- [ ] 3.1 Update UpdateToast component

  **Files:**
  - [MODIFY] `src/renderer/components/update-toast/UpdateToast.tsx`

  **Context:**
  - See `design.md` "Decision 2: Keep UpdateToastContext Separate" for rationale
  - Keep existing content generation logic (getMessage, getTitle, getIcon)

  **Subtasks:**
  - [ ] 3.1.1 Import generic `Toast` component
  - [ ] 3.1.2 Create mapping function: UpdateStatus → ToastType
    - `'available'` → `'info'`
    - `'downloaded'` → `'success'`
    - `'downloading'` → `'progress'`
    - `'error'` → `'error'`
  - [ ] 3.1.3 Render `<Toast type={mappedType} ... />` instead of custom JSX
  - [ ] 3.1.4 Pass existing actions (Install Now, Later, Details) as `actions[]`

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

- [ ] 3.2 Update UpdateToastContext

  **Files:**
  - [MODIFY] `src/renderer/context/UpdateToastContext.tsx`

  **Context:**
  - See `design.md` "Decision 3: Toast ID-Based Management" for tracking toast IDs

  **Subtasks:**
  - [ ] 3.2.1 Add `import { useToast } from './ToastContext'`
  - [ ] 3.2.2 Track current toast ID: `const [currentToastId, setCurrentToastId] = useState<string | null>(null)`
  - [ ] 3.2.3 Use `showToast()` to display update notifications instead of internal state
  - [ ] 3.2.4 Use `dismissToast(currentToastId)` when hiding
  - [ ] 3.2.5 Keep `hasPendingUpdate` and `downloadProgress` state unchanged

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

- [ ] 3.3 Update useUpdateNotifications hook

  **Files:**
  - [MODIFY] `src/renderer/hooks/useUpdateNotifications.ts` (if exists, else look in context)

  **Subtasks:**
  - [ ] 3.3.1 Verify hook works with new context structure
  - [ ] 3.3.2 Keep IPC event subscriptions unchanged
  - [ ] 3.3.3 Update dev mode test helpers to use new internal API

  **Acceptance Criteria:**
  - IPC events still trigger toast display
  - Dev mode helpers work: `__testUpdateToast.showAvailable()`, etc.

  **Verification:**

  ```bash
  npm run test -- useUpdateNotifications
  ```

---

## 4. App Integration

- [ ] 4.1 Update provider hierarchy

  **Files:**
  - [MODIFY] `src/renderer/App.tsx`

  **Context:**
  - See `design.md` "Component Hierarchy" for nesting order

  **Subtasks:**
  - [ ] 4.1.1 Import `ToastProvider` from context
  - [ ] 4.1.2 Wrap existing providers: `ThemeProvider > ToastProvider > UpdateToastProvider`
  - [ ] 4.1.3 Remove direct `<UpdateToast />` rendering if present (now handled by ToastContainer)

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

- [ ] 4.2 Update component exports

  **Files:**
  - [MODIFY] `src/renderer/components/toast/index.ts`
  - [MODIFY] `src/renderer/context/index.ts`

  **Subtasks:**
  - [ ] 4.2.1 Export `Toast`, `ToastContainer`, `ToastType`, `ToastProps`, `ToastAction`
  - [ ] 4.2.2 Export `ToastProvider`, `ToastContext`, `useToast`, `ShowToastOptions`

  **Acceptance Criteria:**
  - All public APIs importable from barrel exports

  **Verification:**

  ```bash
  npm run build
  ```

---

## 5. IPC Integration (Main Process → Renderer Toasts)

- [ ] 5.1 Add IPC channel for generic toasts

  **Files:**
  - [MODIFY] `src/shared/constants/ipc-channels.ts`
  - [NEW] `src/shared/types/toast.ts`

  **Subtasks:**
  - [ ] 5.1.1 Add `TOAST_SHOW = 'toast:show'` channel constant
  - [ ] 5.1.2 Define `ToastPayload` type: `{ type, title?, message, duration? }`

  **Acceptance Criteria:**
  - IPC channel exported and typed
  - Payload type matches ShowToastOptions subset

  **Verification:**

  ```bash
  npm run build
  ```

---

- [ ] 5.2 Update preload script

  **Files:**
  - [MODIFY] `src/preload/preload.ts`
  - [MODIFY] `src/shared/types/ipc.ts`

  **Subtasks:**
  - [ ] 5.2.1 Add `onToastShow: (callback) => ipcRenderer.on(IPC_CHANNELS.TOAST_SHOW, callback)`
  - [ ] 5.2.2 Add cleanup function return
  - [ ] 5.2.3 Update `ElectronAPI` interface with `onToastShow` method

  **Acceptance Criteria:**
  - Renderer can subscribe to toast events from main
  - TypeScript types correct

  **Verification:**

  ```bash
  npm run build:electron
  ```

---

- [ ] 5.3 Subscribe to IPC in ToastContext

  **Files:**
  - [MODIFY] `src/renderer/context/ToastContext.tsx`

  **Subtasks:**
  - [ ] 5.3.1 Add `useEffect` to subscribe to `onToastShow` events
  - [ ] 5.3.2 Call `showToast()` with received payload
  - [ ] 5.3.3 Clean up subscription on unmount

  **Acceptance Criteria:**
  - Main process can trigger toasts in renderer
  - No memory leaks from subscriptions

  **Verification:**

  ```bash
  npm run build
  ```

---

- [ ] 5.4 Create main process helper (optional)

  **Files:**
  - [NEW] `src/main/utils/toast.ts`

  **Subtasks:**
  - [ ] 5.4.1 Create `showToast(window: BrowserWindow, options: ToastPayload)` function
  - [ ] 5.4.2 Uses `window.webContents.send(IPC_CHANNELS.TOAST_SHOW, options)`

  **Acceptance Criteria:**
  - Main process can easily send toasts to any window

  **Verification:**

  ```bash
  npm run build:electron
  ```

---

## 6. Unit Tests

- [ ] 6.1 Toast component tests

  **Files:**
  - [NEW] `src/renderer/components/toast/Toast.test.tsx`

  **Subtasks:**
  - [ ] 6.1.1 Test rendering for each toast type with correct icon
  - [ ] 6.1.2 Test action button callbacks are called on click
  - [ ] 6.1.3 Test dismiss button triggers `onDismiss`
  - [ ] 6.1.4 Test accessibility: `role="alert"`, `aria-live`
  - [ ] 6.1.5 Test progress bar renders only for progress type
  - [ ] 6.1.6 Test custom title and message render correctly

  **Acceptance Criteria:**
  - All tests pass
  - Coverage for all props and variants

  **Verification:**

  ```bash
  npm run test -- Toast.test
  ```

---

- [ ] 6.2 ToastContainer tests

  **Files:**
  - [NEW] `src/renderer/components/toast/ToastContainer.test.tsx`

  **Subtasks:**
  - [ ] 6.2.1 Test renders correct number of toasts
  - [ ] 6.2.2 Test toast stacking order (newest first)
  - [ ] 6.2.3 Test individual toast dismissal removes correct toast
  - [ ] 6.2.4 Test max visible limit (only 5 shown)
  - [ ] 6.2.5 Test AnimatePresence animations trigger

  **Acceptance Criteria:**
  - All tests pass

  **Verification:**

  ```bash
  npm run test -- ToastContainer.test
  ```

---

- [ ] 6.3 ToastContext tests

  **Files:**
  - [NEW] `src/renderer/context/ToastContext.test.tsx`

  **Subtasks:**
  - [ ] 6.3.1 Test `showToast()` adds toast to array and returns ID
  - [ ] 6.3.2 Test `dismissToast(id)` removes correct toast
  - [ ] 6.3.3 Test `dismissAll()` clears all toasts
  - [ ] 6.3.4 Test auto-dismiss after duration (mock timers)
  - [ ] 6.3.5 Test persistent toast does not auto-dismiss
  - [ ] 6.3.6 Test `useToast()` throws outside provider
  - [ ] 6.3.7 Test helper functions (`showSuccess`, etc.) set correct type

  **Acceptance Criteria:**
  - All tests pass
  - Covers happy path and error cases

  **Verification:**

  ```bash
  npm run test -- ToastContext.test
  ```

---

- [ ] 6.4 Update existing tests

  **Files:**
  - [MODIFY] `src/renderer/components/update-toast/UpdateToast.test.tsx`
  - [MODIFY] `src/renderer/context/UpdateToastContext.test.tsx`

  **Subtasks:**
  - [ ] 6.4.1 Update `UpdateToast.test.tsx` - mock new Toast component or test integration
  - [ ] 6.4.2 Update `UpdateToastContext.test.tsx` - add ToastProvider wrapper in test setup
  - [ ] 6.4.3 Verify all existing tests still pass

  **Acceptance Criteria:**
  - No regressions in existing update toast tests

  **Verification:**

  ```bash
  npm run test -- update-toast
  npm run test -- UpdateToast
  ```

---

## 7. Coordinated Tests

- [ ] 7.1 Update notification flow tests

  **Files:**
  - [MODIFY] `tests/coordinated/*.coordinated.test.ts` (any that mock toasts)

  **Subtasks:**
  - [ ] 7.1.1 Find and update coordinated tests that mock toast rendering
  - [ ] 7.1.2 Verify update notification flow works with new architecture
  - [ ] 7.1.3 Add test for main→renderer toast IPC if applicable

  **Acceptance Criteria:**
  - All coordinated tests pass

  **Verification:**

  ```bash
  npm run test:coordinated
  ```

---

## 8. Documentation

- [ ] 8.1 Update ARCHITECTURE.md

  **Files:**
  - [MODIFY] `docs/ARCHITECTURE.md`

  **Subtasks:**
  - [ ] 8.1.1 Add section on Toast System architecture
  - [ ] 8.1.2 Document provider nesting order requirement
  - [ ] 8.1.3 Document ToastContext public API

  **Acceptance Criteria:**
  - Developers can understand toast system from docs

  **Verification:**
  - Review rendered markdown

---

- [ ] 8.2 Add JSDoc comments

  **Files:**
  - [MODIFY] `src/renderer/components/toast/Toast.tsx`
  - [MODIFY] `src/renderer/context/ToastContext.tsx`

  **Subtasks:**
  - [ ] 8.2.1 Add JSDoc to all exported functions and interfaces
  - [ ] 8.2.2 Include `@example` blocks for `showToast()` and `useToast()`

  **Acceptance Criteria:**
  - IDE shows helpful tooltips for all public APIs

  **Verification:**
  - Check IDE hover tooltips

---

## 9. Verification

- [ ] 9.1 Run all test suites

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

- [ ] 9.2 Manual testing in dev mode

  **Subtasks:**
  - [ ] 9.2.1 Run `npm run electron:dev`
  - [ ] 9.2.2 Open DevTools console
  - [ ] 9.2.3 Test `__testUpdateToast.showAvailable()` - should show info toast
  - [ ] 9.2.4 Test `__testUpdateToast.showDownloaded()` - should show success toast
  - [ ] 9.2.5 Test `__testUpdateToast.showError()` - should show error toast
  - [ ] 9.2.6 Verify toast stacking with multiple rapid triggers

  **Acceptance Criteria:**
  - All dev helpers work
  - Toast appears in bottom-left
  - Auto-dismiss works
  - Dismiss button works
