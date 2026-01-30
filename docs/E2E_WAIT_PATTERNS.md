# E2E Wait Patterns: Migration Guide

> **TL;DR**: Replace `browser.pause()` with condition-based waits for deterministic, faster, and more reliable tests.

## Why This Matters

Static `browser.pause()` calls cause:

- **Flaky tests**: Fixed delays don't account for system load variations
- **Slow tests**: Pauses wait the full duration even when conditions are met early
- **CI failures**: What works locally may fail in slower CI environments

Deterministic waits fix all of this by polling for actual conditions.

---

## Quick Reference

| Old Pattern                          | New Pattern                          | When to Use                           |
| ------------------------------------ | ------------------------------------ | ------------------------------------- |
| `browser.pause(300)`                 | `waitForUIState(condition)`          | UI state changes, visibility          |
| `browser.pause(500)` after animation | `waitForAnimationSettle(selector)`   | CSS animations, transitions           |
| `browser.pause(300)` after IPC       | `waitForIPCRoundTrip(action, opts)`  | Settings changes, state sync          |
| `browser.pause(1000)` window ops     | `waitForWindowTransition(condition)` | Minimize, maximize, restore           |
| `browser.pause(5500)` for timer test | `waitForDuration(5500, 'reason')`    | **Only** for intentional timing tests |

---

## Decision Tree: Which Wait to Use?

```
Is this wait testing an intentional timer (e.g., auto-dismiss)?
├── YES → waitForDuration(ms, 'INTENTIONAL: reason')
└── NO → Continue below

What are you waiting for?
├── Element to appear/disappear → element.waitForDisplayed() / waitForUIState()
├── Element to be clickable → waitForElementClickable(selector)
├── Window state change → waitForWindowTransition(condition)
├── CSS animation to finish → waitForAnimationSettle(selector)
├── IPC round-trip complete → waitForIPCRoundTrip(action, { verification })
├── Window count change → waitForWindowCount(n)
├── Fullscreen toggle → waitForFullscreenTransition(targetState, getter)
└── macOS-specific delay → waitForMacOSWindowStabilize(condition)
```

---

## Detailed Patterns

### Pattern 1: UI State Changes

**When to Use**: Theme updates, toggle states, visibility changes, class modifications

**Before**:

```typescript
await toggleButton.click();
await browser.pause(300);
const isActive = await element.getAttribute('class').includes('active');
```

**After**:

```typescript
await toggleButton.click();
await waitForUIState(
    async () => {
        const className = await element.getAttribute('class');
        return className?.includes('active') ?? false;
    },
    { description: 'Toggle to become active' }
);
```

**Options**:

```typescript
interface WaitForUIStateOptions {
    timeout?: number; // Default: 5000ms
    interval?: number; // Default: 50ms (polling frequency)
    description?: string; // For logging
}
```

---

### Pattern 2: IPC Communication

**When to Use**: State propagation via IPC, settings updates, cross-process communication

**Before**:

```typescript
await setAlwaysOnTop(true);
await browser.pause(300);
const state = await getAlwaysOnTopState();
```

**After**:

```typescript
await waitForIPCRoundTrip(async () => await setAlwaysOnTop(true), {
    verification: async () => {
        const state = await getAlwaysOnTopState();
        return state.enabled === true;
    },
});
```

**Options**:

```typescript
interface WaitForIPCRoundTripOptions {
    timeout?: number; // Default: 3000ms
    verification?: () => Promise<boolean>; // Condition to verify
}
```

---

### Pattern 3: Window Transitions

**When to Use**: Minimize, maximize, restore, show/hide window operations

**Before**:

```typescript
await minimizeWindow();
await browser.pause(1000);
expect(await isWindowMinimized()).toBe(true);
```

**After**:

```typescript
await minimizeWindow();
await waitForWindowTransition(async () => await isWindowMinimized(), { description: 'Window minimize' });
expect(await isWindowMinimized()).toBe(true);
```

**Options**:

```typescript
interface WaitForWindowTransitionOptions {
    timeout?: number; // Default: 5000ms
    stableDuration?: number; // Default: 200ms (stability check)
    interval?: number; // Default: 100ms
    description?: string;
}
```

---

### Pattern 4: CSS Animations

**When to Use**: Toast animations, modal transitions, element transforms

**Before**:

```typescript
await showToast('Hello');
await browser.pause(500);
const toast = await browser.$('[data-testid="toast"]');
```

**After**:

```typescript
await showToast('Hello');
await waitForAnimationSettle('[data-testid="toast"]');
const toast = await browser.$('[data-testid="toast"]');
```

**Options**:

```typescript
interface WaitForAnimationSettleOptions {
    timeout?: number; // Default: 3000ms
    property?: string; // Default: 'transform' (CSS property to watch)
    interval?: number; // Default: 50ms
}
```

---

### Pattern 5: Fullscreen Transitions

**When to Use**: Entering/exiting fullscreen mode

**Before**:

```typescript
await toggleFullscreen();
await browser.pause(2000);
expect(await isWindowFullScreen()).toBe(true);
```

**After**:

```typescript
await toggleFullscreen();
await waitForFullscreenTransition(true, isWindowFullScreen);
expect(await isWindowFullScreen()).toBe(true);
```

---

### Pattern 6: Window Count Changes

**When to Use**: Opening/closing windows, multi-window tests

**Before**:

```typescript
await openOptionsWindow();
await browser.pause(500);
const handles = await browser.getWindowHandles();
expect(handles.length).toBe(2);
```

**After**:

```typescript
await openOptionsWindow();
await waitForWindowCount(2);
// Now safe to proceed
```

---

### Pattern 7: Element Ready for Interaction

**When to Use**: Before clicking buttons, before form input

**Before**:

```typescript
await browser.pause(300);
const button = await browser.$('[data-testid="submit"]');
await button.click();
```

**After**:

```typescript
const button = await waitForElementClickable('[data-testid="submit"]');
await button.click();
```

---

### Pattern 8: Intentional Duration Waits

**When to Use**: **ONLY** for testing time-based features (auto-dismiss timers, debounce, etc.)

**Before**:

```typescript
await showToast('Success');
await browser.pause(5500); // Wait for 5s auto-dismiss
expect(await toast.isDisplayed()).toBe(false);
```

**After**:

```typescript
await showToast('Success');
// INTENTIONAL: Testing that success toasts auto-dismiss after 5 seconds
await waitForDuration(5500, 'INTENTIONAL: Testing 5s auto-dismiss timer');
expect(await toast.isDisplayed()).toBe(false);
```

> **Important**: Always include `INTENTIONAL:` in the description to signal this is purposeful.

---

## Common Migration Examples

### Example 1: Toast Dismiss Button

```typescript
// Before
it('should dismiss toast when clicking X', async () => {
    await showToast('Test');
    await browser.pause(300);
    const dismissBtn = await browser.$('.toast-dismiss');
    await dismissBtn.click();
    await browser.pause(500);
    expect(await toast.isDisplayed()).toBe(false);
});

// After
it('should dismiss toast when clicking X', async () => {
    await showToast('Test');
    await waitForAnimationSettle('[data-testid="toast"]');
    const dismissBtn = await waitForElementClickable('.toast-dismiss');
    await dismissBtn.click();
    await waitForUIState(
        async () => {
            const toast = await browser.$('[data-testid="toast"]');
            return !(await toast.isDisplayed());
        },
        { description: 'Toast to disappear' }
    );
});
```

### Example 2: Always-on-Top Toggle

```typescript
// Before
it('should toggle always-on-top', async () => {
    await toggleAlwaysOnTop();
    await browser.pause(300);
    const state = await getAlwaysOnTopState();
    expect(state.enabled).toBe(true);
});

// After
it('should toggle always-on-top', async () => {
    await waitForIPCRoundTrip(async () => await toggleAlwaysOnTop(), {
        verification: async () => {
            const state = await getAlwaysOnTopState();
            return state.enabled === true;
        },
    });
    const state = await getAlwaysOnTopState();
    expect(state.enabled).toBe(true);
});
```

### Example 3: Multi-Window Test

```typescript
// Before
it('should open options window', async () => {
    await openOptions();
    await browser.pause(1000);
    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(2);
    await browser.switchToWindow(handles[1]);
    await browser.pause(500);
    // interact with options
});

// After
it('should open options window', async () => {
    await openOptions();
    await waitForWindowCount(2);
    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[1]);
    await waitForUIState(
        async () => {
            const title = await browser.getTitle();
            return title.includes('Options');
        },
        { description: 'Options window to be ready' }
    );
    // interact with options
});
```

---

## Available Utilities

All utilities are exported from `tests/e2e/helpers/waitUtilities.ts`:

| Utility                       | Purpose                       | Default Timeout |
| ----------------------------- | ----------------------------- | --------------- |
| `waitForUIState`              | Generic condition polling     | 5000ms          |
| `waitForIPCRoundTrip`         | IPC action + verification     | 3000ms          |
| `waitForWindowTransition`     | Window state with stability   | 5000ms          |
| `waitForAnimationSettle`      | CSS animation completion      | 3000ms          |
| `waitForFullscreenTransition` | Fullscreen enter/exit         | 10000ms         |
| `waitForMacOSWindowStabilize` | macOS-specific delays         | 5000ms          |
| `waitForCleanup`              | Cleanup actions with timeout  | 2000ms          |
| `waitForCycle`                | Multi-operation with retries  | 3000ms/op       |
| `waitForElementClickable`     | Element displayed + clickable | 5000ms          |
| `waitForWindowCount`          | Wait for N windows            | 5000ms          |
| `waitForDuration`             | Intentional fixed wait        | N/A             |

---

## Timeout Constants

Defined in `tests/e2e/helpers/e2eConstants.ts`:

```typescript
TIMEOUTS: {
    UI_STATE: 5000,
    IPC_OPERATION: 3000,
    WINDOW_TRANSITION: 5000,
    ANIMATION_SETTLE: 3000,
    FULLSCREEN_TRANSITION: 10000,
    MACOS_WINDOW_STABILIZE: 5000,
    CLEANUP: 2000,
    CYCLE_PER_OPERATION: 3000,
}

POLLING: {
    UI_STATE: 50,
    IPC: 50,
    WINDOW_STATE: 100,
    ANIMATION: 50,
}
```

---

## Troubleshooting

### "Timeout waiting for condition"

1. **Increase timeout**: Pass `{ timeout: 10000 }` for slow operations
2. **Check selector**: Verify the element exists with correct selector
3. **Check condition logic**: Add logging to debug what the condition returns
4. **Check for race condition**: Ensure the action that triggers the state change actually ran

### Tests pass locally but fail in CI

1. CI environments are slower - consider increasing timeouts for CI
2. Add `stableDuration` to window transitions
3. Use `waitForAnimationSettle` instead of assuming instant animation

### Flaky element interactions

```typescript
// Instead of
await browser.$('.button').click();

// Use
const button = await waitForElementClickable('.button');
await button.click();
```

---

## Best Practices

1. **Never use raw `browser.pause()`** - always use a waitFor\* utility
2. **Document intentional waits** - if testing timing, use `waitForDuration` with `INTENTIONAL:` prefix
3. **Use descriptive names** - pass `{ description: 'meaningful text' }` for debugging
4. **Prefer specific utilities** - use `waitForWindowTransition` over generic `waitForUIState` for window ops
5. **Add stability checks** - for window operations, use `stableDuration` to ensure state is settled
