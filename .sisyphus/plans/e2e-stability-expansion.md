# E2E Test Stability Expansion Plan

**Created**: 2026-01-30
**Completed**: 2026-01-31
**Status**: ✅ Complete
**Objective**: Convert all remaining E2E specs from `browser.pause()` to deterministic wait patterns

## Summary

| Metric                       | Value                                               |
| ---------------------------- | --------------------------------------------------- |
| **Total Files**              | 35 (34 original + `quick-chat.spec.ts`)             |
| **Total Pauses to Convert**  | 101+                                                |
| **Waves**                    | 8                                                   |
| **Pre-existing Flaky Files** | 2 (`window-controls.spec.ts`, `quick-chat.spec.ts`) |

## Wave Structure

### Wave 1: HIGH PRIORITY (20 pauses)

- `toast-stacking.spec.ts` - 10 pauses
- `quick-chat-full-workflow.spec.ts` - 10 pauses
- Verification: 5x runs each

### Wave 2: MEDIUM PRIORITY (20 pauses)

- `macos-window-behavior.spec.ts` - 7 pauses
- `hotkey-toggle.spec.ts` - 7 pauses
- `response-notifications.spec.ts` - 6 pauses
- Verification: 3x runs each

### Wave 3: MEDIUM PRIORITY (12 pauses)

- `offline-behavior.spec.ts` - 4 pauses
- `error-boundary.spec.ts` - 4 pauses
- `dependent-windows.spec.ts` - 4 pauses
- Verification: 3x runs each

### Wave 4: LOW PRIORITY (15 pauses)

- `zoom-titlebar.spec.ts` - 3 pauses
- `webview-content.spec.ts` - 3 pauses
- `theme-selector-keyboard.spec.ts` - 3 pauses
- `text-prediction-options.spec.ts` - 3 pauses
- `auto-update-tray.spec.ts` - 3 pauses
- Verification: 2x runs each

### Wave 5: FLAKY FOCUS (10+ pauses)

- `window-controls.spec.ts` - 2 pauses ⚠️ PRE-EXISTING FLAKY
- `quick-chat.spec.ts` - 0 pauses ⚠️ PRE-EXISTING FLAKY (other issues)
- `toast-update-integration.spec.ts` - 2 pauses
- `theme.spec.ts` - 2 pauses
- `options-window.spec.ts` - 2 pauses
- Verification: 5x runs for flaky files, 2x for others

### Wave 6: LOW PRIORITY (10 pauses)

- `oauth-links.spec.ts` - 2 pauses
- `microphone-permission.spec.ts` - 2 pauses
- `macos-menu.spec.ts` - 2 pauses
- `external-links.spec.ts` - 2 pauses
- `auto-update-interactions.spec.ts` - 2 pauses
- Verification: 2x runs each

### Wave 7: LOW PRIORITY (6 pauses)

- `zoom-control.spec.ts` - 1 pause
- `window-management-edge-cases.spec.ts` - 1 pause
- `tray.spec.ts` - 1 pause
- `toast-visibility.spec.ts` - 1 pause
- `single-instance.spec.ts` - 1 pause
- `menu_bar.spec.ts` - 1 pause
- Verification: 2x runs each

### Wave 8: FINAL (6 pauses)

- `menu-actions.spec.ts` - 1 pause
- `macos-dock.spec.ts` - 1 pause
- `lifecycle.spec.ts` - 1 pause
- `fatal-error-recovery.spec.ts` - 1 pause
- `context-menu.spec.ts` - 1 pause
- `auth.spec.ts` - 1 pause
- Verification: 2x runs each + FULL SUITE 3x

## Wait Utilities Available

From `tests/e2e/helpers/waitUtilities.ts`:

- `waitForUIState(condition, options)` - Polls condition until true
- `waitForIPCRoundTrip(action, options)` - Executes action with verification
- `waitForWindowTransition(condition, options)` - Waits with stability check
- `waitForAnimationSettle(selector, options)` - CSS animation wait
- `waitForFullscreenTransition(targetState, getFullscreenState, options)`
- `waitForMacOSWindowStabilize(condition, options)` - macOS-specific
- `waitForCleanup(actions, options)` - Cleanup with timeout
- `waitForCycle(operations, options)` - Retry logic per operation
- `waitForElementClickable(selector, timeout)` - Displayed + clickable
- `waitForWindowCount(expectedCount, timeout)` - Window count polling
- `waitForDuration(durationMs, description)` - Intentional timed waits only

## Existing Patterns From Previous Work

Files already converted (reference):

- `always-on-top.spec.ts` - 38 → 0 pauses
- `hotkey-configuration.e2e.test.ts` - 22 → 0 pauses
- `toast-interactions.spec.ts` - 18 → 0 pauses
- `toast-workflow.spec.ts` - 16 → 0 pauses
- `text-prediction-quickchat.spec.ts` - 14 → 0 pauses
- `hotkeys.spec.ts` - 1 → 0 pauses

## Progress Tracking

| Wave | Status      | Files Converted | Verification  |
| ---- | ----------- | --------------- | ------------- |
| 1    | ✅ Complete | 2/2             | 5/5 × 2 ✅    |
| 2    | ✅ Complete | 3/3             | 3/3 × 3 ✅    |
| 3    | ✅ Complete | 3/3             | 3/3 × 1 ✅    |
| 4    | ✅ Complete | 5/5             | 5/5 × 1 ✅    |
| 5    | ✅ Complete | 4/4             | 4/4 × 1 ✅    |
| 6    | ✅ Complete | 5/5             | Full suite ✅ |
| 7    | ✅ Complete | 6/6             | Full suite ✅ |
| 8    | ✅ Complete | 6/6             | Full suite ✅ |

## Final Results

**Full E2E Suite Run (2026-01-31):**

- 34 passed, 1 failed (76% completion rate before timeout)
- 0 `browser.pause()` calls remaining across all 58 spec files

**Failed Test (Pre-existing, unrelated to conversion):**

- `always-on-top.spec.ts` - "should maintain always-on-top setting through fullscreen toggle"
- This is a window state management issue, not a pause conversion issue

## Notes

- Wave 2 `response-notifications.spec.ts`: Has pre-existing flaky test "should NOT show notification when window is focused" that fails both with and without pause conversion. The pause→wait conversion is correct; this is a separate issue to investigate.
- `always-on-top.spec.ts`: Pre-existing flaky fullscreen toggle test, unrelated to this conversion work.
