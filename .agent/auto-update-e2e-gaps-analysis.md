# Auto-Update Feature E2E Test Coverage Analysis

## Executive Summary

After conducting a comprehensive deep-dive code analysis of the auto-update feature from a user's perspective, I've identified **6 critical E2E test gaps** across all platforms (Linux, macOS, and Windows). While the existing test coverage is solid for basic toggle and persistence functionality, several key user workflows involving native UI indicators, user interactions with downloaded updates, and cross-platform visual feedback mechanisms are **not tested end-to-end**.

---

## Background: Auto-Update Feature Components

### Main Process (Electron)

1. **UpdateManager** (`electron/managers/updateManager.ts`)
   - Handles periodic background checks (default: every hour)
   - Downloads updates automatically when found
   - Broadcasts IPC events to renderer processes
   - Integrates with BadgeManager and TrayManager for visual indicators
   - Supports manual update checks via menu

2. **BadgeManager** (`electron/managers/badgeManager.ts`)
   - **macOS**: Shows dock badge (`app.dock.setBadge()`)
   - **Windows**: Shows taskbar overlay icon (`BrowserWindow.setOverlayIcon()`)
   - **Linux**: No native badge support

3. **TrayManager** (`electron/managers/trayManager.ts`)
   - Updates tooltip text with version info when update is available

### Renderer Process (React)

1. **useUpdateNotifications** hook (`src/hooks/useUpdateNotifications.ts`)
   - Subscribes to IPC events: `update-available`, `update-downloaded`, `update-error`
   - Manages state for toast visibility and pending update flag

2. **UpdateToast** component (`src/components/toast/UpdateToast.tsx`)
   - Shows 3 types of toasts:
     - **Available**: "Version X is downloading..."
     - **Downloaded**: "Version X is ready to install" (with "Restart Now" and "Later" buttons)
     - **Error**: Error message with dismiss button

3. **Titlebar Badge** (`src/components/titlebar/Titlebar.tsx`)
   - Visual indicator in titlebar when `hasPendingUpdate` is true
   - Clicking opens Options window to About tab

### Menu Integration

- **Help → Check for Updates** menu item (`menu-help-check-updates`)
- Triggers manual update check even when auto-updates are disabled

---

## Existing E2E Test Coverage ✅

### Test File 1: `auto-update-toggle.spec.ts`

**Coverage:**

- Rendering of auto-update toggle in Options window
- Toggle functionality (changing checked state)
- Label and description presence
- Accessibility attributes (role=switch, aria-checked)
- Cross-platform availability

**User Workflows Covered:**

- User opens Options → sees auto-update toggle
- User clicks toggle → state changes
- User toggles multiple times → state updates correctly

---

### Test File 2: `auto-update-persistence.spec.ts`

**Coverage:**

- Default enabled state for new installations
- Persistence across Options window reopen (within session)
- Multiple toggle operations
- Rapid toggling without corruption
- Cross-platform persistence

**User Workflows Covered:**

- User disables auto-updates → closes Options → reopens Options → state persisted
- User enables auto-updates → closes Options → reopens Options → state persisted
- User toggles rapidly → final state is correct
- Settings written to disk correctly

---

### Test File 3: `auto-update-platform.spec.ts`

**Coverage:**

- Platform-specific toggle visibility (Windows, macOS, Linux)
- Toggle functionality on each platform
- "Check for Updates" menu item existence
- Manual update check triggers successfully
- Persistence across window reopen
- Manual check works even when auto-updates disabled

**User Workflows Covered:**

- User clicks "Help → Check for Updates" → IPC call succeeds
- User disables auto-updates → manually checks → still works
- Linux non-AppImage handling

---

## Critical E2E Test Gaps ❌

### Gap 1: **Native Update Badges** 🚨 **CRITICAL**

**Missing User Workflows:**

Scenario A - macOS Dock Badge:

```
GIVEN an update is downloaded
WHEN the user looks at the dock
THEN the app icon should show a badge (• or dot)
AND when user clicks the badge in titlebar
THEN Options window opens to About tab
AND when user installs or dismisses update
THEN the dock badge should disappear
```

Scenario B - Windows Taskbar Overlay:

```
GIVEN an update is downloaded
WHEN the user looks at the taskbar
THEN the app icon should show a green dot overlay
AND when user clicks the titlebar badge
THEN Options window opens to About tab
AND when user installs or dismisses update
THEN the taskbar overlay should disappear
```

**Code Evidence:**

- `BadgeManager.showUpdateBadge()` is called in `UpdateManager` on `update-downloaded` event
- `BadgeManager.clearUpdateBadge()` is called in `UpdateManager.quitAndInstall()`
- No E2E tests verify these visual indicators appear/disappear

**Why This Matters:**

- Primary visual feedback mechanism for users who don't have the app window open
- Silent failure possible (badge code could break without failing existing tests)

**Platform Coverage Needed:**

- macOS: Verify dock badge appears/disappears
- Windows: Verify taskbar overlay appears/disappears
- Linux: Verify no errors (badge not supported)

---

### Gap 2: **System Tray Tooltip Update Notification** 🚨 **CRITICAL**

**Missing User Workflows:**

```
GIVEN an update is downloaded
WHEN the user hovers over the system tray icon
THEN tooltip should show "Gemini Desktop - Update vX.X.X available"
AND when user installs or dismisses update
THEN tooltip should revert to "Gemini Desktop"
```

**Code Evidence:**

- `TrayManager.setUpdateTooltip(version)` is called in `UpdateManager` on `update-downloaded` event
- `TrayManager.clearUpdateTooltip()` is called in `UpdateManager.quitAndInstall()`
- No E2E tests verify tray tooltip updates

**Why This Matters:**

- Another primary visual feedback mechanism for minimized-to-tray users
- Tooltip is platform-independent (Windows, macOS, Linux)

**Platform Coverage Needed:**

- All platforms: Verify tray tooltip updates with version info

---

### Gap 3: **Titlebar Update Badge Indicator** ⚠️ **HIGH**

**Missing User Workflows:**

```
GIVEN an update is downloaded
WHEN the user looks at the titlebar
THEN a visual badge/indicator should appear near the app icon
AND when user clicks the badge
THEN Options window opens to About tab
AND the badge remains visible until user installs or dismisses
```

**Code Evidence:**

- `Titlebar.tsx` shows `<button className="update-badge">` when `hasPendingUpdate` is true
- Badge click handler calls `window.electronAPI?.openOptions('about')`
- `hasPendingUpdate` state comes from `UpdateToastContext` → `useUpdateNotifications`
- No E2E tests verify titlebar badge appears or click behavior

**Why This Matters:**

- Only in-window visual indicator for updates
- User may miss toast notifications but see persistent badge
- Click behavior provides quick access to install updates

**Platform Coverage Needed:**

- All platforms: Verify titlebar badge appears, is clickable, opens About tab

---

### Gap 4: **Update Toast User Interactions** ⚠️ **HIGH**

**Missing User Workflows:**

Scenario A - "Later" Button:

```
GIVEN an update is downloaded
AND the "Update Ready" toast is visible
WHEN the user clicks "Later"
THEN the toast should dismiss
AND the titlebar badge should remain visible
AND the native badge (dock/taskbar) should remain visible
AND the tray tooltip should remain updated
```

Scenario B - "Restart Now" Button:

```
GIVEN an update is downloaded
AND the "Update Ready" toast is visible
WHEN the user clicks "Restart Now"
THEN the app should quit and install the update
AND all badges/indicators should clear
```

Scenario C - Dismiss Error Toast:

```
GIVEN an update error occurs
AND the "Update Error" toast is visible
WHEN the user clicks the dismiss (×) button
THEN the toast should dismiss
AND no badges should appear
```

**Code Evidence:**

- `UpdateToast.tsx` renders buttons: "Restart Now", "Later", "×"
- `useUpdateNotifications` provides handlers: `installUpdate`, `handleLater`, `dismissNotification`
- `installUpdate` calls `window.electronAPI?.installUpdate()` which triggers `UpdateManager.quitAndInstall()`
- `handleLater` sets `visible: false` but keeps `hasPendingUpdate: true`
- No E2E tests verify button clicks work correctly

**Why This Matters:**

- Primary user interaction points for update workflow
- "Later" workflow is critical - ensures badge persistence
- "Restart Now" must actually trigger quitAndInstall

**Platform Coverage Needed:**

- All platforms: Verify toast button interactions and state changes

---

### Gap 5: **Update Download Progress Indication** 📊 **MEDIUM**

**Missing User Workflows:**

```
GIVEN an update is being downloaded
AND the "Update Available" toast is visible showing "downloading..."
WHEN the download completes
THEN the toast should transition to "Update Ready"
AND the "Restart Now" and "Later" buttons should appear
```

**Code Evidence:**

- `UpdateManager` broadcasts `auto-update:available` → shows "downloading..." toast
- `UpdateManager` broadcasts `auto-update:downloaded` → shows "ready to install" toast
- `useUpdateNotifications` subscribes to both events and updates state
- No E2E tests verify the state transition from "available" → "downloaded"

**Why This Matters:**

- User needs feedback that download is happening and completes
- Toast state transition is a key part of the update UX
- electron-updater emits `download-progress` events, but we don't currently expose them to the UI

**Platform Coverage Needed:**

- All platforms: Verify toast transitions from "available" → "downloaded"
- Consider: Should we also test download progress percentage?

---

### Gap 6: **Update Error Handling and Recovery** ⚠️ **HIGH**

**Missing User Workflows:**

Scenario A - Network Error During Download:

```
GIVEN an update download is in progress
WHEN a network error occurs
THEN the "Update Error" toast should appear
AND the error message should be displayed
AND the user can dismiss the error
AND badges/indicators should NOT appear
```

Scenario B - Manual Retry After Error:

```
GIVEN an update error occurred
WHEN the user clicks "Help → Check for Updates" again
THEN a new update check should be triggered
AND if successful, normal update flow should proceed
```

**Code Evidence:**

- `UpdateManager` broadcasts `auto-update:error` on exceptions
- `useUpdateNotifications` subscribes and shows error toast
- No E2E tests verify error scenarios or recovery paths

**Why This Matters:**

- Errors will happen (network issues, server downtime, etc.)
- Users need clear feedback and recovery options
- Error handling is often undertested

**Platform Coverage Needed:**

- All platforms: Verify error toast appears and is dismissible
- Verify manual retry works after error

---

## Additional Observations

### What's Working Well ✅

1. **Toggle Persistence**: Excellent coverage of settings persistence across sessions
2. **Platform Detection**: Good coverage of platform-specific behavior (Linux vs Windows vs macOS)
3. **Menu Integration**: Manual "Check for Updates" is tested
4. **Basic Functionality**: Toggle on/off works correctly

### Architectural Strengths

1. **Separation of Concerns**: Main process (UpdateManager) cleanly separated from UI (UpdateToast)
2. **IPC Communication**: Well-defined event channels for updates
3. **Unit Test Coverage**: All managers (UpdateManager, BadgeManager, TrayManager) have unit tests
4. **Context Pattern**: UpdateToastContext provides clean state management

### Why E2E Tests Are Missing These Workflows

**Root Cause Analysis:**

1. **Visual Indicators Are Hard to Test in E2E:**
   - Native badges (dock, taskbar) are OS-level UI elements
   - WebDriverIO can't directly inspect dock badges or taskbar overlays
   - Tray tooltip verification requires OS-specific automation

2. **Mock/Stub Limitations:**
   - electron-updater's actual update flow is typically mocked in tests
   - Real update downloads would require test update server
   - Timing issues with download progress events

3. **Test Infrastructure Gaps:**
   - No helper functions to verify native badges exist
   - No tray tooltip inspection utilities in test helpers
   - Toast interaction testing exists but not for update toasts specifically

---

## Recommended E2E Tests to Implement

### Priority 1: CRITICAL (P1) 🚨

#### Test 1: Native Badge Lifecycle

**File:** `tests/e2e/auto-update-badges.spec.ts`

```typescript
describe('Auto-Update Native Badges', () => {
  it('[macOS] should show dock badge when update is downloaded', async () => {
    // Trigger dev test badge
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    // Verify titlebar badge appears
    const badge = await $('[data-testid="update-badge"]');
    await expect(badge).toExist();

    // Note: Actual dock badge verification would require macOS-specific
    // automation or manual verification
  });

  it('[Windows] should show taskbar overlay when update is downloaded');
  it('should clear badge when update is installed');
  it('should clear badge when update is dismissed');
});
```

---

#### Test 2: Tray Tooltip Updates

**File:** `tests/e2e/auto-update-tray-tooltip.spec.ts`

```typescript
describe('Auto-Update Tray Tooltip', () => {
  it('should update tooltip when update is downloaded', async () => {
    // Get initial tooltip
    const initialTooltip = await getTrayTooltip(); // Helper needed
    expect(initialTooltip).toBe('Gemini Desktop');

    // Trigger update
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    // Verify tooltip updated
    const updatedTooltip = await getTrayTooltip();
    expect(updatedTooltip).toContain('Update v2.0.0 available');
  });

  it('should clear tooltip when update is installed');
});
```

---

### Priority 2: HIGH (P2) ⚠️

#### Test 3: Titlebar Badge Interactions

**File:** `tests/e2e/auto-update-titlebar-badge.spec.ts`

```typescript
describe('Auto-Update Titlebar Badge', () => {
  it('should show titlebar badge when update is downloaded', async () => {
    const badge = await $('[data-testid="update-badge"]');
    await expect(badge).not.toExist();

    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    await expect(badge).toExist();
    await expect(badge).toBeClickable();
  });

  it('should open Options About tab when badge is clicked', async () => {
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    const badge = await $('[data-testid="update-badge"]');
    await badge.click();
    await browser.pause(500);

    // Verify Options window opened to About tab
    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(2);

    const optionsWindow = handles.find(h => h !== mainWindowHandle);
    await browser.switchToWindow(optionsWindow);

    const aboutTab = await $('[data-testid="options-nav-about"]');
    const isActive = await aboutTab.getAttribute('aria-selected');
    expect(isActive).toBe('true');
  });

  it('should persist badge across window focus changes');
});
```

---

#### Test 4: Update Toast Interactions

**File:** `tests/e2e/auto-update-toast-interactions.spec.ts`

```typescript
describe('Auto-Update Toast Interactions', () => {
  it('should dismiss toast but keep badge when "Later" is clicked', async () => {
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    const toast = await $('[data-testid="update-toast"]');
    await expect(toast).toExist();

    const laterButton = await $('[data-testid="update-toast-later"]');
    await laterButton.click();
    await browser.pause(500);

    // Toast should be gone
    await expect(toast).not.toExist();

    // Badge should still be visible
    const badge = await $('[data-testid="update-badge"]');
    await expect(badge).toExist();
  });

  it('should clear all indicators when "Restart Now" is clicked', async () => {
    // Note: Cannot actually test app restart in E2E, but can verify
    // that installUpdate IPC call is triggered
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    const restartButton = await $('[data-testid="update-toast-restart"]');
    await restartButton.click();

    // In real scenario, app would quit
    // In test, we can verify state is cleared
    const toast = await $('[data-testid="update-toast"]');
    await expect(toast).not.toExist();
  });

  it('should dismiss error toast when × is clicked', async () => {
    await browser.execute(() => {
      window.__testUpdateToast.showError('Test error');
    });
    await browser.pause(500);

    const dismissButton = await $('[data-testid="update-toast-dismiss"]');
    await dismissButton.click();
    await browser.pause(500);

    const toast = await $('[data-testid="update-toast"]');
    await expect(toast).not.toExist();
  });
});
```

---

### Priority 3: MEDIUM (P3) 📊

#### Test 5: Toast State Transitions

**File:** `tests/e2e/auto-update-toast-states.spec.ts`

```typescript
describe('Auto-Update Toast State Transitions', () => {
  it('should transition from "downloading" to "ready" state', async () => {
    // Show "downloading" toast
    await browser.execute(() => {
      window.__testUpdateToast.showAvailable('2.0.0');
    });
    await browser.pause(500);

    let toast = await $('[data-testid="update-toast"]');
    let message = await $('[data-testid="update-toast-message"]');
    let messageText = await message.getText();
    expect(messageText).toContain('downloading');

    // Transition to "downloaded" toast
    await browser.execute(() => {
      window.__testUpdateToast.showDownloaded('2.0.0');
    });
    await browser.pause(500);

    toast = await $('[data-testid="update-toast"]');
    message = await $('[data-testid="update-toast-message"]');
    messageText = await message.getText();
    expect(messageText).toContain('ready to install');

    // Verify action buttons appear
    const restartButton = await $('[data-testid="update-toast-restart"]');
    await expect(restartButton).toExist();

    const laterButton = await $('[data-testid="update-toast-later"]');
    await expect(laterButton).toExist();
  });

  it('should show error state correctly');
});
```

---

#### Test 6: Error Handling and Recovery

**File:** `tests/e2e/auto-update-error-handling.spec.ts`

```typescript
describe('Auto-Update Error Handling', () => {
  it('should show error toast when update check fails', async () => {
    await browser.execute(() => {
      window.__testUpdateToast.showError('Network error');
    });
    await browser.pause(500);

    const toast = await $('[data-testid="update-toast"]');
    await expect(toast).toExist();

    const title = await $('[data-testid="update-toast-title"]');
    const titleText = await title.getText();
    expect(titleText).toBe('Update Error');

    const message = await $('[data-testid="update-toast-message"]');
    const messageText = await message.getText();
    expect(messageText).toContain('Network error');
  });

  it('should allow manual retry after error', async () => {
    // Show error
    await browser.execute(() => {
      window.__testUpdateToast.showError('Network error');
    });
    await browser.pause(500);

    // Dismiss error
    const dismissButton = await $('[data-testid="update-toast-dismiss"]');
    await dismissButton.click();
    await browser.pause(500);

    // Trigger manual check via menu
    await clickMenuItemById('menu-help-check-updates');
    await browser.pause(500);

    // Verify new check was initiated (no error in this case)
  });

  it('should not show badges after error');
});
```

---

## Implementation Challenges & Solutions

### Challenge 1: Native Badge Verification

**Problem:** WebDriverIO cannot directly inspect macOS dock badges or Windows taskbar overlays.

**Solutions:**

1. **Indirect Verification (Recommended):**
   - Test that `devShowBadge()` is called (via IPC mock)
   - Verify titlebar badge appears (this we CAN test)
   - Add manual verification step in test documentation

2. **OS-Specific Automation:**
   - macOS: Use AppleScript to query dock badge state
   - Windows: Use Windows API to check overlay icon
   - Would require additional test infrastructure

3. **Unit Test Coverage:**
   - Ensure `BadgeManager` unit tests cover all scenarios
   - E2E tests verify the trigger conditions (update downloaded)

**Recommended Approach:**

- Use indirect verification for E2E tests
- Rely on unit tests for badge manager correctness
- Include manual test checklist for QA

---

### Challenge 2: Tray Tooltip Verification

**Problem:** Tooltip text is not easily accessible via WebDriverIO.

**Solutions:**

1. **Helper Function:**

   ```typescript
   async function getTrayTooltip(): Promise<string> {
     return await browser.execute(() => {
       // Call Electron API to get tooltip
       return window.electronAPI.getTrayTooltip();
     });
   }
   ```

   Requires adding `getTrayTooltip` to preload API.

2. **IPC Spy:**
   - Mock/spy on IPC calls to verify `setUpdateTooltip` is called
   - Verify correct version is passed

**Recommended Approach:**

- Add `getTrayTooltip()` to preload API for E2E testing
- Alternative: Verify IPC calls in integration tests

---

### Challenge 3: Simulating Update Events

**Problem:** Cannot trigger real electron-updater events in E2E tests.

**Solutions:**

1. **Dev Test Helpers (Already Implemented):**
   - Use existing `window.__testUpdateToast` helpers
   - `showAvailable()`, `showDownloaded()`, `showError()`
   - `devShowBadge()`, `devClearBadge()` for native badges

2. **Mock Update Server:**
   - Set up local update server for integration tests
   - Serve test updates with valid signatures
   - More realistic but much more complex

**Recommended Approach:**

- Use dev test helpers for most E2E tests
- Reserve mock server for specialized integration tests

---

### Challenge 4: Testing App Restart

**Problem:** "Restart Now" button triggers `app.quit()`, which would end the E2E test.

**Solutions:**

1. **Verify IPC Call Only:**
   - Don't actually quit in test environment
   - Verify `installUpdate` IPC call is triggered
   - Check that badges are cleared

2. **Test Mode Flag:**
   - Add `isTestMode` flag to prevent actual quit
   - Simulate quit side effects (clear badges, etc.)

**Recommended Approach:**

- Don't test actual app restart in E2E
- Verify IPC call and state cleanup
- Add integration test for quit behavior separately

---

## Helper Functions Needed

### 1. Tray Tooltip Getter

```typescript
// Add to preload.ts
getTrayTooltip: () => ipcRenderer.invoke('tray:get-tooltip'),

// Add to ipcManager.ts
ipcMain.handle('tray:get-tooltip', () => {
  return trayManager?.getTray()?.getToolTip() || '';
});
```

### 2. E2E Test Helpers

```typescript
// tests/e2e/helpers/updateHelpers.ts
export async function showUpdateDownloaded(version: string = '2.0.0') {
  await browser.execute((v) => {
    window.__testUpdateToast.showDownloaded(v);
  }, version);
  await browser.pause(500);
}

export async function verifyTitlebarBadge(shouldExist: boolean) {
  const badge = await $('[data-testid="update-badge"]');
  if (shouldExist) {
    await expect(badge).toExist();
  } else {
    await expect(badge).not.toExist();
  }
}
```

---

## Testing Strategy Summary

### Test Coverage Matrix

| User Workflow | Current Coverage | Gap Priority | Recommended Test |
|--------------|------------------|--------------|------------------|
| Toggle on/off | ✅ Complete | N/A | Existing tests |
| Settings persistence | ✅ Complete | N/A | Existing tests |
| Manual check via menu | ✅ Basic | N/A | Existing tests |
| **Native badge lifecycle** | ❌ None | 🚨 P1 Critical | Test 1 |
| **Tray tooltip updates** | ❌ None | 🚨 P1 Critical | Test 2 |
| **Titlebar badge click** | ❌ None | ⚠️ P2 High | Test 3 |
| **Toast "Later" button** | ❌ None | ⚠️ P2 High | Test 4 |
| **Toast "Restart" button** | ❌ None | ⚠️ P2 High | Test 4 |
| **Toast state transitions** | ❌ None | 📊 P3 Medium | Test 5 |
| **Error toast handling** | ❌ None | ⚠️ P2 High | Test 6 |
| **Manual retry after error** | ❌ None | ⚠️ P2 High | Test 6 |

---

## Platform-Specific Considerations

### macOS

- ✅ Dock badge (native)
- ✅ Tray tooltip
- ✅ Titlebar badge (web)
- ✅ Toast notifications

**Unique Tests Needed:**

- Dock badge appearance/disappearance
- Badge click behavior (opens Options About tab)

---

### Windows

- ✅ Taskbar overlay icon (native)
- ✅ Tray tooltip
- ✅ Titlebar badge (web)
- ✅ Toast notifications

**Unique Tests Needed:**

- Taskbar overlay appearance/disappearance
- Overlay icon rendering (green dot)

---

### Linux

- ❌ No native badge support
- ✅ Tray tooltip
- ✅ Titlebar badge (web)
- ✅ Toast notifications

**Unique Tests Needed:**

- Verify no badge errors on unsupported platform
- Tray tooltip is the primary visual indicator

---

## Conclusion

### Summary of Findings

**Strengths:**

- ✅ Excellent coverage of toggle and persistence workflows
- ✅ Platform detection and conditional behavior well-tested
- ✅ Strong unit test coverage for all managers

**Critical Gaps:**

- ❌ Native badge lifecycle (dock, taskbar overlays) not tested E2E
- ❌ Tray tooltip updates not verified
- ❌ Titlebar badge interactions not tested
- ❌ Update toast button clicks not tested E2E
- ❌ Error handling workflows missing coverage

### Impact Assessment

**Without these E2E tests, the following could break silently:**

1. **Native badges stop appearing** → Users don't know updates are ready
2. **Tray tooltip doesn't update** → Minimized-to-tray users miss updates
3. **Titlebar badge doesn't link to About tab** → User can't install update
4. **"Later" button broken** → Badge doesn't persist, user can't defer
5. **Error recovery broken** → Users stuck without manual retry option

### Recommendation

**Implement tests in this order:**

1. **Week 1:** Implement P1 tests (Badges, Tray)
   - Test 1: Native badge lifecycle
   - Test 2: Tray tooltip updates

2. **Week 2:** Implement P2 tests (Interactions)
   - Test 3: Titlebar badge interactions
   - Test 4: Update toast button clicks
   - Test 6: Error handling

3. **Week 3:** Implement P3 tests (State transitions)
   - Test 5: Toast state transitions

**Estimated Effort:**

- Test infrastructure (helpers, preload API): 4 hours
- Test implementation: 8-12 hours
- Documentation and review: 2 hours
- **Total: ~14-18 hours**

---

## Appendix A: Test Data Needed

### Mock Update Data

```typescript
interface MockUpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

const mockUpdate: MockUpdateInfo = {
  version: '2.0.0',
  releaseDate: '2024-01-15',
  releaseNotes: 'Bug fixes and performance improvements'
};
```

---

## Appendix B: Reference Documentation

### Key Files Analyzed

- `electron/managers/updateManager.ts` (322 lines)
- `electron/managers/badgeManager.ts` (198 lines)
- `electron/managers/trayManager.ts` (173 lines)
- `src/hooks/useUpdateNotifications.ts` (229 lines)
- `src/components/toast/UpdateToast.tsx` (193 lines)
- `src/components/titlebar/Titlebar.tsx` (92 lines)
- `tests/e2e/auto-update-*.spec.ts` (3 files, ~35KB total)

### IPC Channels Used

- `auto-update:available`
- `auto-update:downloaded`
- `auto-update:error`
- `auto-update:get-enabled`
- `auto-update:set-enabled`
- `auto-update:check`
- `auto-update:install`
- `dev:test:show-badge`
- `dev:test:clear-badge`
