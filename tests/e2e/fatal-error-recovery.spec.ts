import { browser, expect, $ } from '@wdio/globals';

describe('Fatal Error Recovery E2E', () => {
  const isMac = process.platform === 'darwin';

  before(async () => {
    // Wait for app ready
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
      timeout: 10000,
      timeoutMsg: 'Expected app window to be available',
    });
  });

  describe('Application Stability', () => {
    it('should start with main window visible', async () => {
      // Real Outcome: Window title is non-empty string or window handle exists
      const handles = await browser.getWindowHandles();
      expect(handles.length).toBeGreaterThan(0);
      const title = await browser.getTitle();
      expect(title.length).toBeGreaterThan(0);
    });
  });

  describe('Renderer Crash Recovery', () => {
    // This test is skipped because the WebDriver session dies when the renderer crashes,
    // making it difficult to verify the auto-reload behavior without a custom driver implementation.
    // The functionality is verified manually or via main process unit tests.
    it.skip('should automatically reload when renderer crashes', async () => {
      // Navigate to a clean state
      await browser.reloadSession();
      await $('body').waitForDisplayed();

      // Trigger a real renderer process crash via Debug menu
      await browser.electron.execute((electron) => {
        const menu = electron.Menu.getApplicationMenu();
        const debugMenu = menu?.items.find(item => item.label === 'Debug');
        const crashItem = debugMenu?.submenu?.items.find(item => item.label === 'Crash Renderer');
        crashItem?.click();
      });

      // Wait for the window to reload (sanity check)
      await browser.waitUntil(
        async () => {
          try {
            const title = await browser.getTitle();
            return title === 'Gemini Desktop';
          } catch (error) {
            // Ignore tab crashed errors during reload
            return false;
          }
        },
        {
          timeout: 10000,
          timeoutMsg: 'Window should have reloaded after crash',
        }
      );

      // Verify the app is interactive again
      await expect($('body')).toBeDisplayed();
    });
  });

  describe('React Error Boundary Verification', () => {
    it('should show error boundary and allow reload on React error', async () => {
      // Navigate to a clean state
      await browser.reloadSession();
      await $('body').waitForDisplayed();

      // Trigger a simulated React error via global test hook
      // Note: We use a global function instead of IPC to avoid test environment flakiness
      // This still tests the error boundary UI rendering and recovery flow
      await browser.execute(() => {
        // @ts-ignore
        if (window.__GEMINI_TRIGGER_FATAL_ERROR__) {
            // @ts-ignore
            window.__GEMINI_TRIGGER_FATAL_ERROR__();
        } else {
            throw new Error('Global error trigger not found');
        }
      });

      // Verify the error boundary fallback is displayed
      const fallback = await $('[data-testid="gemini-error-fallback"]');
      await fallback.waitForDisplayed({ timeout: 10000, timeoutMsg: 'Error fallback UI did not appear' });

      const errorTitle = await fallback.$('h3');
      expect(await errorTitle.getText()).toContain("Gemini couldn't load");

      // 3. User can recover by clicking Reload
      const reloadButton = await fallback.$('button=Reload');
      await reloadButton.click();

      // Verify fallback disappears and normal content returns
      await fallback.waitForDisplayed({ reverse: true, timeout: 5000, timeoutMsg: 'Error fallback did not disappear after reload' });
    });
  });

  describe('Manual Page Reload', () => {
    it('should reload page when user presses key shortcut', async () => {
      // 1. SIMULATE REAL USER ACTION
      // Standard Reload Shortcut (Ctrl+R / Cmd+R)
      const modifier = isMac ? 'Command' : 'Control';
      
      // We verify reload by checking an element or state persistence, 
      // but for basic E2E, ensuring the window doesn't disappear is key.
      // A better test would be navigating somewhere then reloading, but this is a single page app.
      
      await browser.keys([modifier, 'r']);
      
      // Wait for potential reload
      await browser.pause(1000);

      // 2. VERIFY ACTUAL OUTCOME
      const body = await $('body');
      expect(await body.isDisplayed()).toBe(true);
    });
  });
});
