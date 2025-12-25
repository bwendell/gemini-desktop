import { browser, expect } from '@wdio/globals';

describe('Application Smoke Test (Real Binary)', () => {
  before(async () => {
    // Wait for the app to be ready and available
    await browser.waitUntil(
      async () => {
        const handles = await browser.getWindowHandles();
        return handles.length > 0;
      },
      {
        timeout: 30000,
        timeoutMsg: 'No window handles found after 30s',
      }
    );
  });

  it('should launch the application with the correct title', async () => {
    const title = await browser.getTitle();
    expect(title).toBe('Gemini Desktop');
  });

  it('should have a visible main window', async () => {
    const isVisible = await browser.execute(() => {
      return document.visibilityState === 'visible';
    });
    expect(isVisible).toBe(true);
  });

  it('should expose the electronAPI on the window object', async () => {
    const apiType = await browser.execute(() => {
      return typeof (window as any).electronAPI;
    });
    expect(apiType).toBe('object');
  });

  it('should allow setting the theme (IPC Interactivity)', async () => {
    // This tests that the renderer can talk to the main process via IPC
    // and get a response (round-trip) without crashing.
    const result = await browser.execute(async () => {
      try {
        const api = (window as any).electronAPI;
        // Set to light first
        await api.setTheme('light');
        // Get it back to verify
        const theme = await api.getTheme();
        return theme;
      } catch (e) {
        return { error: String(e) };
      }
    });

    expect(result).toHaveProperty('preference');
    // We accept 'light' or 'system' depending on how the app handles the request vs system prefs,
    // but primarily we checking that IPC worked and returned an object.
    expect((result as any).error).toBeUndefined();
  });
});
