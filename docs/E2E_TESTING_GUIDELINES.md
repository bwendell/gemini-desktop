# E2E Testing Guidelines for AI Agents

> **Target Audience**: AI coding agents (Gemini, Claude, GPT, etc.)  
> **Purpose**: Prevent E2E test gaps that allow bugs to pass through CI/CD  
> **Last Updated**: 2026-01-28

---

## Table of Contents

1. [The Golden Rule](#the-golden-rule)
2. [The Testing Pyramid](#the-testing-pyramid)
3. [Critical Anti-Patterns to Avoid](#critical-anti-patterns-to-avoid)
4. [Step-by-Step E2E Test Writing Process](#step-by-step-e2e-test-writing-process)
5. [Case Study: The Quick Chat Bug](#case-study-the-quick-chat-bug)
6. [Verification Checklist](#verification-checklist)
7. [Framework-Specific Guidelines](#framework-specific-guidelines)
8. [Running E2E Tests](#running-e2e-tests)
9. [Wait Strategies](#wait-strategies)
10. [Test Isolation](#test-isolation)

---

## The Golden Rule

> **If this code path was broken, would this test fail?**

Before committing ANY E2E test, ask yourself this question for every critical path the test exercises. If the answer is "no" for any path, the test has a gap.

### Apply the Golden Rule

For each E2E test, identify:

1. **The user action** (click, type, navigate)
2. **The expected side effect** (IPC message, DOM change, file written)
3. **The verification step** (check that the side effect actually occurred)

If step 3 doesn't actually verify step 2, the test is incomplete.

---

## The Testing Pyramid

```text
┌─────────────────────────────────────────────────────────────────┐
│  E2E TESTS (This Document's Focus)                             │
│  - Test FULL user workflows from start to finish               │
│  - NO mocks of internal systems                                │
│  - Verify ACTUAL outcomes users would see                      │
├─────────────────────────────────────────────────────────────────┤
│  INTEGRATION TESTS                                              │
│  - Test multiple modules working together                       │
│  - May mock external services (network, file system)           │
│  - Verify internal contracts are satisfied                      │
├─────────────────────────────────────────────────────────────────┤
│  COORDINATED TESTS                                              │
│  - Test cross-module communication (IPC, events)               │
│  - Mock external dependencies                                   │
│  - Verify message passing works correctly                       │
├─────────────────────────────────────────────────────────────────┤
│  UNIT TESTS                                                     │
│  - Test single function/class                                   │
│  - Mock all dependencies                                        │
│  - Verify logic in isolation                                    │
└─────────────────────────────────────────────────────────────────┘
```

### E2E Tests Are Special

E2E tests are NOT:

- "Integration tests with a browser"
- "Tests that use Selenium/WebdriverIO"
- "Tests that click buttons"

E2E tests ARE:

- Tests that verify **the complete user experience**
- Tests that exercise **the actual production code paths**
- Tests that fail when **users would experience a bug**

---

## Critical Anti-Patterns to Avoid

### Anti-Pattern 1: Re-implementing Production Logic in Test Helpers

**❌ BAD - The helper re-implements injection logic:**

```typescript
// In test helper
export async function injectTextOnly(text: string) {
    const injectionScript = `
    editor.textContent = '';
    const textNode = document.createTextNode(text);
    // ... entire injection logic duplicated ...
  `;
    await frame.executeJavaScript(injectionScript);

    // Returns optimistic result WITHOUT verifying
    return { textInjected: true }; // LIES!
}
```

**Why it's bad**: You now have TWO implementations of the same logic. When the production code breaks, the test helper keeps working.

**✅ GOOD - The helper triggers the production code:**

```typescript
// In test helper
export async function submitViaProductionPath(text: string) {
    // Trigger the ACTUAL IPC message that the production UI sends
    await browser.electron.execute((electron, submittedText) => {
        electron.ipcMain.emit('quick-chat:submit', { sender: null }, submittedText);
    }, text);

    // Verify the ACTUAL result
    return await verifyInjectionInGeminiIframe();
}
```

---

### Anti-Pattern 2: Returning Assumed/Optimistic Results

**❌ BAD - Assumes success without verification:**

```typescript
// After executing injection script
return {
    editorFound: true, // Did we actually find it?
    textInjected: true, // Did text actually appear?
    submitButtonFound: true, // Does it exist in the DOM?
};
```

**✅ GOOD - Actually verifies the result:**

```typescript
// Query the DOM to verify actual state
const result = await frame.executeJavaScript(`
  const editor = document.querySelector('.ql-editor');
  const button = document.querySelector('button[aria-label="Send message"]');
  return {
    editorFound: !!editor,
    actualText: editor?.textContent,
    buttonFound: !!button,
    buttonEnabled: button && !button.disabled
  };
`);
expect(result.actualText).toBe(expectedText);
```

---

### Anti-Pattern 3: Bypassing the IPC Layer

**❌ BAD - Calls internal methods directly:**

```typescript
// This bypasses the entire IPC/renderer flow
await browser.electron.execute(() => {
    global.windowManager.injectTextIntoGemini('test');
});
```

**✅ GOOD - Triggers via the same path as the user:**

```typescript
// Switch to Quick Chat window
await quickChat.switchToQuickChatWindow();

// Type text like a real user would
await quickChat.typeText('Hello from test');

// Click submit button like a real user would
await quickChat.submit();

// Verify the outcome the user would see
await mainWindow.verifyTextInGemini('Hello from test');
```

---

### Anti-Pattern 4: Testing Window Existence Without Function

**❌ BAD - Only checks window exists:**

```typescript
const isVisible = await browser.electron.execute(() => {
    const win = global.windowManager.getQuickChatWindow();
    return win && win.isVisible();
});
expect(isVisible).toBe(true);
// But does the window WORK? Can user type? Can user submit?
```

**✅ GOOD - Verifies window functionality:**

```typescript
// Verify window is visible AND functional
await quickChat.switchToQuickChatWindow();
await quickChat.typeText('test');
const value = await quickChat.getInputValue();
expect(value).toBe('test'); // Window actually works
```

---

### Anti-Pattern 5: Comments Containing "Simulating" or "Mocking"

If you see these words in E2E test comments, that's a red flag:

```typescript
// ❌ RED FLAGS in E2E tests:
// "Simulating submit action..."
// "Mocking the injection..."
// "Faking the response..."
```

E2E tests should NEVER simulate or mock the system under test.

---

## Step-by-Step E2E Test Writing Process

### Step 1: Document the User Journey

Before writing any code, write down the exact steps a user would take:

```text
1. User presses Ctrl+Shift+Space
2. Quick Chat window opens
3. User types "Hello Gemini"
4. User presses Enter or clicks Submit
5. Quick Chat closes
6. Main window navigates to Gemini
7. Text appears in Gemini input
8. Submit button is clicked
9. Gemini responds
```

### Step 2: Identify Verification Points

For each step, identify what to verify:

| Step | Verification                               |
| ---- | ------------------------------------------ |
| 1    | Hotkey registered and triggers handler     |
| 2    | Window exists, is visible, has focus       |
| 3    | Text appears in input field                |
| 4    | IPC message sent                           |
| 5    | Window hidden                              |
| 6    | Main window URL includes gemini.google.com |
| 7    | Gemini input contains expected text        |
| 8    | Submit button was clicked                  |
| 9    | Response appeared (if possible)            |

### Step 3: Map to Page Objects

Use Page Objects to encapsulate interactions:

```typescript
// QuickChatPage handles Quick Chat window
const quickChat = new QuickChatPage();
await quickChat.show();
await quickChat.typeText('Hello Gemini');
await quickChat.submit();
await quickChat.waitForHidden();

// MainWindowPage handles main window
const mainWindow = new MainWindowPage();
await mainWindow.waitForGeminiLoaded();
const text = await mainWindow.getGeminiInputText();
expect(text).toBe('Hello Gemini');
```

### Step 4: Write the Test

```typescript
describe('Quick Chat Full Workflow', () => {
    it('should inject text into Gemini and submit', async () => {
        // 1. Open Quick Chat via hotkey
        await pressComplexShortcut(['primary', 'shift'], 'Space');
        await browser.pause(500);

        // 2. Verify Quick Chat opened
        const foundQuickChat = await quickChat.switchToQuickChatWindow();
        expect(foundQuickChat).toBe(true);

        // 3. Type and submit
        await quickChat.typeText('Hello from E2E test');
        await quickChat.submit();

        // 4. Verify Quick Chat closed
        await quickChat.waitForHidden();

        // 5. Verify text arrived in Gemini
        await mainWindow.waitForGeminiLoaded();
        const injectedText = await mainWindow.getGeminiInputText();
        expect(injectedText).toBe('Hello from E2E test');

        // 6. Verify submit button was clicked (or is about to be)
        const submitClicked = await mainWindow.wasSubmitClicked();
        expect(submitClicked).toBe(true);
    });
});
```

### Step 5: Apply the Golden Rule

Ask: **"If the injection script was broken, would this test fail?"**

- If `_injectTextIntoGemini()` fails to find the editor → **Step 7 fails** ✅
- If the submit button selector is wrong → **Step 6 fails** ✅
- If IPC channel name is wrong → **Step 4 never happens** ✅

---

## Case Study: The Quick Chat Bug

### What Happened

The Quick Chat feature was broken:

- Text injection into Gemini didn't work
- Submit button wasn't clicked
- **But all E2E tests passed!**

### Why Tests Didn't Catch It

The E2E test helper `injectTextOnly()` **re-implemented** the injection logic independently of the production `InjectionScriptBuilder` class.

When the production code's event dispatching wasn't triggering Quill's change detection, the test helper's parallel implementation still worked.

### The Fix

1. **Fixed the production code** to dispatch proper events
2. **Updated tests** to trigger the production code path, not a parallel implementation
3. **Added verification** that text actually appeared in the Gemini iframe

### Lesson Learned

> Never have test helpers that duplicate production logic. Always trigger the production code and verify actual outcomes.

---

## Verification Checklist

Before committing an E2E test, verify:

- [ ] **No parallel implementations**: Test helpers trigger production code, not reimplementations
- [ ] **Actual verification**: Tests check real DOM/state, not assumed results
- [ ] **Full stack tested**: Renderer → IPC → Main → Side effects
- [ ] **Golden Rule applied**: If this code broke, would this test fail?
- [ ] **No red flag comments**: No "simulating", "mocking", "faking" in E2E tests
- [ ] **User perspective**: Test verifies what user would see/experience
- [ ] **Page Objects used**: Interactions encapsulated in maintainable classes

---

## Framework-Specific Guidelines

### WebdriverIO + Electron

```typescript
// DO: Trigger IPC via ipcMain.emit
await browser.electron.execute((electron, text) => {
    electron.ipcMain.emit('quick-chat:submit', { sender: null }, text);
}, text);

// DON'T: Call internal methods directly
await browser.electron.execute(() => {
    global.myInternalMethod(); // Bypasses the real flow!
});
```

### Quill Editor Injection

Quill editors don't respond to simple `textContent` changes. You must:

1. Use Selection API to insert text nodes
2. Dispatch proper events: `beforeinput`, `input`, `keydown`, `compositionend`
3. Wait for Angular/Quill change detection
4. Verify the submit button appeared (Gemini shows microphone when empty)

### Cross-Origin Iframe Testing

When testing features that interact with cross-origin iframes:

1. Use `webContents.mainFrame.frames` to find the iframe
2. Use `frame.executeJavaScript()` to run code in iframe context
3. Cannot use standard Selenium selectors across frame boundaries

---

## Running E2E Tests

> [!CAUTION]
> **AI Agents: Do NOT use `npm run test:e2e -- --spec=...`!**
> The `test:e2e` script runs a sequential runner that **ignores** the `--spec` argument and runs ALL specs in a hardcoded list.

### Running a Single Spec File

Use the `test:e2e:spec` npm script to run a single E2E spec:

```powershell
# Step 1: Build the app first (required before E2E tests)
npm run build && npm run build:electron

# Step 2: Run the specific spec
npm run test:e2e:spec -- --spec=tests/e2e/your-spec-file.spec.ts
```

Or if you've already built the app recently, skip the build:

```powershell
$env:SKIP_BUILD="true"; npm run test:e2e:spec -- --spec=tests/e2e/your-spec-file.spec.ts
```

> **Note:** The `--` separator is required to pass the `--spec` argument through npm to wdio.

### Running All E2E Tests

```powershell
npm run test:e2e        # Runs all specs in the sequential runner
npm run test:e2e:all    # Runs all specs including lifecycle tests
```

### Running Integration Tests (Single Spec)

Integration tests support the `--spec` flag correctly:

```powershell
npm run test:integration -- --spec="tests/integration/your-test.integration.test.ts"
```

### Test Group Commands

For running related E2E tests as a group:

```powershell
npm run test:e2e:group:options   # Options-related tests
npm run test:e2e:group:quickchat # Quick Chat tests
npm run test:e2e:group:theme     # Theme tests
npm run test:e2e:group:hotkeys   # Hotkey tests
# See package.json for full list of groups
```

### Debugging D-Bus Issues

For Linux/Wayland systems using D-Bus global hotkeys, you can enable verbose D-Bus logging to debug connection issues, signal reception, and portal communication.

The `DEBUG_DBUS` environment variable enables detailed logging including:

- D-Bus connection heartbeat (every 5 seconds)
- Message body dumps for GlobalShortcuts interface
- Activation signal tracking statistics

> **Note:** This requires both `NODE_ENV=test` (automatic in test runs) AND `DEBUG_DBUS=1` to be set.

**Unit Tests:**

```bash
DEBUG_DBUS=1 npx vitest tests/unit/main/utils/dbusFallback.test.ts
```

**Integration Tests:**

```bash
DEBUG_DBUS=1 npm run test:integration -- --spec="tests/integration/hotkeys.integration.test.ts"
```

**E2E Tests:**

```powershell
DEBUG_DBUS=1 npm run test:e2e:spec -- --spec=tests/e2e/hotkeys.spec.ts
```

The verbose output will appear in the console/logs, showing:

- D-Bus session bus connection status
- Portal method calls and responses
- Global shortcut activation signals

---

## Wait Strategies

### Prefer Explicit Waits Over Sleep

**❌ BAD - Hardcoded sleep times:**

```typescript
await browser.pause(5000); // Magic number, wastes time or is too short
await someAction();
```

**✅ GOOD - Wait for specific condition:**

```typescript
await browser.waitUntil(async () => (await element.getText()) === 'Expected Text', {
    timeout: 5000,
    timeoutMsg: 'Text did not appear in time',
});
```

### Wait Strategy Hierarchy

Use these in order of preference:

1. **`waitForExist()`** - Wait for element to be in DOM
2. **`waitForDisplayed()`** - Wait for element to be visible
3. **`waitUntil()`** - Wait for custom condition
4. **`browser.pause()`** - Last resort, only for animations/transitions

### When `pause()` Is Acceptable

- After triggering animations (use minimal duration, e.g., 300ms)
- Between rapid actions that need UI to settle
- **Always add a comment explaining why:**

```typescript
// Wait for slide animation to complete before checking position
await browser.pause(300);
```

---

## Test Isolation

### Each Test Must Be Independent

Tests should:

- Not depend on other tests running first
- Not leave state that affects other tests
- Be runnable in any order

**❌ BAD - Tests depend on each other:**

```typescript
it('should create a setting', async () => {
    await createSetting('foo');
});

it('should read the setting', async () => {
    // FAILS if run alone - depends on previous test!
    const value = await readSetting('foo');
    expect(value).toBeDefined();
});
```

**✅ GOOD - Each test is self-contained:**

```typescript
it('should create and read a setting', async () => {
    await createSetting('foo');
    const value = await readSetting('foo');
    expect(value).toBeDefined();
});
```

### Use `beforeEach` and `afterEach` for Setup/Cleanup

```typescript
describe('Options Window', () => {
    beforeEach(async () => {
        await optionsPage.open();
    });

    afterEach(async () => {
        await optionsPage.resetToDefaults();
        await optionsPage.close();
    });

    it('should toggle a setting', async () => {
        // Test starts with clean state
    });
});
```

### Avoid Global State Pollution

- Reset app settings after tests that modify them
- Close windows opened during tests
- Clear any cached data

---

## Summary

1. **Apply the Golden Rule**: "If this code was broken, would this test fail?"
2. **Never re-implement production logic** in test helpers
3. **Always verify actual outcomes**, not assumed results
4. **Test the full stack**: Renderer → IPC → Main → Side effects
5. **Use Page Objects** to encapsulate interactions
6. **Avoid red flag patterns**: No simulating, mocking, or faking in E2E
7. **Think like a user**: Verify what users would see and experience
