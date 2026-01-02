# Design: Refactor Toast System

## Context

The current toast notification system was designed specifically for auto-update notifications. As the application grows, we need to display various types of notifications (auth failures, download completions, hotkey tips, etc.) without duplicating toast infrastructure.

### Current Architecture

```
UpdateToastContext (Provider)
├── useUpdateNotifications (Hook - IPC subscription)
└── UpdateToast (Component - hardcoded for updates)
    └── UpdateToast.css (Styles)
```

### Stakeholders

- Users: Will see consistent toast notifications across features
- Developers: Will have a simple API to show toasts from any component

## Goals / Non-Goals

### Goals

1. Create a reusable toast system that supports multiple notification types
2. Maintain backward compatibility with existing update toast behavior
3. Provide a simple, declarative API (`useToast` hook)
4. Support toast queuing/stacking for multiple simultaneous notifications
5. Enable future extensibility (e.g., main process triggering toasts)

### Non-Goals

- Adding snackbar/notification center features (out of scope)
- Supporting custom toast positions (always bottom-left for consistency)
- Rich media in toasts (images, videos)
- Toast persistence across app restarts

## Decisions

### Decision 1: Layered Component Architecture

**What:** Create three layers: `Toast` (presentational), `ToastContainer` (stack manager), `ToastContext` (state provider).

**Why:** Separation of concerns allows each layer to be tested and maintained independently. The presentational `Toast` component can be used directly in tests or stories without requiring context.

**Alternatives considered:**

- Single monolithic ToastManager component → Rejected due to poor testability
- Third-party library (react-hot-toast) → Rejected to avoid new dependencies and maintain design consistency

### Decision 2: Keep UpdateToastContext Separate

**What:** Keep `UpdateToastContext` as a specialized layer on top of `ToastContext`, rather than merging them.

**Why:**

- Update notifications have unique concerns (hasPendingUpdate flag, IPC subscriptions)
- Existing code depending on `useUpdateToast()` doesn't need changes
- Clear separation between generic toast infrastructure and update-specific logic

**Migration path:**

- `UpdateToastContext` will use `useToast()` internally to show toasts
- External API (`useUpdateToast()`) remains unchanged

### Decision 3: Toast ID-Based Management

**What:** Each toast has a unique ID (generated or provided) for programmatic control.

**Why:**

- Enables dismissing specific toasts (e.g., dismissing an "downloading" toast when download completes)
- Prevents duplicate toasts (can check if toast with ID already exists)
- Supports replacing/updating existing toasts

**Implementation:**

```typescript
interface ToastOptions {
  id?: string; // Optional - auto-generated if not provided
  type: 'success' | 'error' | 'info' | 'warning' | 'progress';
  title?: string;
  message: string;
  duration?: number; // ms, default 5000, null for persistent
  progress?: number; // 0-100 for progress type
  actions?: ToastAction[];
}

const { showToast, dismissToast } = useToast();
showToast({ id: 'update-download', type: 'progress', message: 'Downloading...' });
// Later:
dismissToast('update-download');
```

### Decision 4: Fixed Duration with Override

**What:** Default auto-dismiss duration of 5 seconds, configurable per toast.

**Why:**

- Consistent UX for most notifications
- Allows critical notifications (errors) to stay longer or be persistent
- Matches current UpdateToast behavior

**Duration strategy:**

- Success: 5000ms (default)
- Info: 5000ms (default)
- Warning: 7000ms (slightly longer for attention)
- Error: 10000ms (longer to read error message)
- Progress: No auto-dismiss (waits for completion)
- `persistent: true`: No auto-dismiss

### Decision 5: CSS Class Migration

**What:** Refactor `UpdateToast.css` into generic `.toast-*` classes while keeping UpdateToast.css as a thin wrapper.

**Why:**

- Avoids style duplication
- Maintains design consistency across toast types
- Easy to add new types without new CSS files

**Class mapping:**

```css
/* Generic base */
.toast {
  /* container */
}
.toast__icon {
  /* icon area */
}
.toast__content {
  /* title + message */
}
.toast__actions {
  /* buttons */
}

/* Type variants */
.toast--success {
  border-left-color: #34a853;
}
.toast--error {
  border-left-color: var(--error-color);
}
.toast--info {
  border-left-color: var(--accent-color);
}
.toast--warning {
  border-left-color: #fbbc04;
}
.toast--progress {
  border-left-color: var(--accent-color);
}
```

## Component Hierarchy

```
App.tsx
└── ThemeProvider
    └── ToastProvider (new)
        └── UpdateToastProvider
            ├── [App Content]
            └── ToastContainer (rendered by ToastProvider)
                └── Toast (multiple)
```

## Type Definitions

```typescript
// src/renderer/components/toast/Toast.tsx
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'progress';

export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  icon?: string;
  progress?: number;
  actions?: ToastAction[];
  onDismiss: () => void;
}

// src/renderer/context/ToastContext.tsx
export interface ShowToastOptions {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number | null; // null = persistent
  progress?: number;
  actions?: ToastAction[];
}

export interface ToastContextValue {
  showToast: (options: ShowToastOptions) => string; // returns toast ID
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  toasts: ToastItem[];
}
```

## Risks / Trade-offs

### Risk: Provider Order Matters

- **Issue:** ToastProvider must wrap UpdateToastProvider for useToast() to work inside it
- **Mitigation:** Document provider order in ARCHITECTURE.md; add runtime check

### Risk: Animation Performance with Many Toasts

- **Issue:** Stacking many toasts could cause layout thrashing
- **Mitigation:** Limit max visible toasts (e.g., 5); older toasts queue until space

### Trade-off: Keeping UpdateToast as Wrapper

- **Pro:** No changes to external API (useUpdateToast still works)
- **Con:** Slight code duplication in mapping update types to generic types
- **Decision:** Accept duplication for backward compatibility

## Migration Plan

### Phase 1: Create Generic Infrastructure

1. Create Toast, ToastContainer, ToastContext
2. Add unit tests for new components
3. No changes to existing code

### Phase 2: Integrate UpdateToast

1. Wrap UpdateToastProvider with ToastProvider in App.tsx
2. Modify UpdateToastContext to use showToast() internally
3. Update tests

### Phase 3: Verify and Clean Up

1. Run all test suites
2. Manual testing with dev mode helpers
3. Remove any dead code

### Rollback

If issues arise, revert to commit before Phase 2 - the new generic components can exist alongside old implementation without breaking anything.

## Resolved Questions

1. **Max toast limit?** ✅ Yes, limit to 5 simultaneous visible toasts. Older toasts queue until space.
2. **IPC channel for main-triggered toasts?** ✅ Yes, included in scope. Add `TOAST_SHOW` IPC channel.

## Toast Stacking Behavior

Toasts stack vertically in the bottom-left corner. Newer toasts appear on top, older toasts at bottom.

```
┌──────────────────────────────────────────────────────────────┐
│                         App Content                          │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│                                                              │
│  ┌─────────────────────────────┐                             │
│  │ 🔔 Newest Toast (top)       │  ← Newest appears on top    │
│  │ Message here                │                             │
│  └─────────────────────────────┘                             │
│  ┌─────────────────────────────┐                             │
│  │ ⬇️ Update Available         │                             │
│  │ Version 2.0.0 downloading...│                             │
│  └─────────────────────────────┘                             │
│  ┌─────────────────────────────┐                             │
│  │ ✅ Oldest Toast (bottom)    │  ← Oldest at bottom         │
│  │ Will dismiss first          │                             │
│  └─────────────────────────────┘                             │
└──────────────────────────────────────────────────────────────┘
```

When max visible (5) is reached, new toasts queue and appear as older ones dismiss.
