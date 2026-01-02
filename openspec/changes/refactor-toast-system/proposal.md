# Change: Refactor Toast System to Decouple from Updates

## Why

The current toast notification system is tightly coupled to the auto-update functionality. The `UpdateToast` component, `UpdateToastContext`, and `useUpdateNotifications` hook are all specific to update notifications, making it impossible to show other types of toasts (auth failures, download available, hotkey tips, etc.) without duplicating significant code.

This refactor will create a generic, reusable toast system that:

1. Supports multiple toast types beyond just updates
2. Provides a centralized API for showing toasts from anywhere in the app
3. Maintains the existing update toast functionality as one use case
4. Enables future extensibility for new toast types

## What Changes

### Core Architecture

- **Create generic `Toast` component** - Base presentational component with configurable variants (success, error, info, warning)
- **Create `ToastContainer`** - Manages toast stack, animations, and auto-dismiss behavior
- **Create `ToastContext` and `useToast` hook** - Provides `showToast()` API for triggering toasts from anywhere
- **Refactor `UpdateToast`** - Keep as a specialized wrapper using the new generic toast system
- **Update `UpdateToastContext`** - Simplify to only handle update-specific logic, delegating rendering to `ToastContext`

### New Toast Types Supported

- `success` - Green accent (e.g., update downloaded, file saved)
- `error` - Red accent (e.g., auth failure, network error)
- `info` - Blue accent (e.g., update available, feature tips)
- `warning` - Yellow/orange accent (e.g., session expiring)
- `progress` - Shows progress bar (e.g., download progress)

### IPC Integration

- Add optional IPC channel for main process to trigger toasts
- Enable toasts for: auth failures, download notifications, hotkey tips

### Files Modified/Created

- `src/renderer/components/toast/Toast.tsx` [NEW] - Generic toast component
- `src/renderer/components/toast/Toast.css` [NEW] - Generic toast styles
- `src/renderer/components/toast/ToastContainer.tsx` [NEW] - Toast stack manager
- `src/renderer/context/ToastContext.tsx` [NEW] - Generic toast provider and hook
- `src/renderer/components/toast/UpdateToast.tsx` [MODIFY] - Refactor to use generic Toast
- `src/renderer/context/UpdateToastContext.tsx` [MODIFY] - Simplify to use ToastContext
- `src/renderer/hooks/useUpdateNotifications.ts` [MODIFY] - Adapt to new toast API
- `src/renderer/App.tsx` [MODIFY] - Add ToastProvider wrapper

## Impact

### Affected specs

- toast-system (new capability)

### Affected code

- `src/renderer/components/toast/` - Core toast components
- `src/renderer/context/` - Context providers
- `src/renderer/hooks/` - Update notification hook
- `src/renderer/App.tsx` - Provider hierarchy
- All existing toast tests need updating

### Breaking changes

None - existing update toast functionality remains intact

### Testing impact

- All unit tests for toast components need updating
- Coordinated tests for update notifications need updating
- No E2E test changes expected (behavior unchanged)
