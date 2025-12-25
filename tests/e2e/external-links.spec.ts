import { browser, $, expect } from '@wdio/globals';

describe('External Link Sanitization', () => {
  it('should open external links in default browser instead of the app', async () => {
    // 1. Inject a mock link into the page
    await browser.execute(() => {
      const link = document.createElement('a');
      link.href = 'https://example.com';
      link.target = '_blank';
      link.textContent = 'External Link';
      link.id = 'mock-external-link';
      link.style.position = 'absolute';
      link.style.top = '100px';
      link.style.left = '100px';
      link.style.zIndex = '9999';
      link.style.background = 'red'; // Make it visible
      link.style.padding = '20px';
      document.body.appendChild(link);
    });

    const link = await $('#mock-external-link');
    await expect(link).toBeDisplayed();

    // 2. Click the link
    await link.click();

    // 3. Verify the internal webview URL does NOT change
    // Since we can't easily check the system browser, we check that a new *electron* window wasn't created
    // and that the current window didn't navigate to example.com

    const currentUrl = await browser.getUrl();
    expect(currentUrl).not.toContain('example.com');

    // Also check window handles - simple check to ensure no new Electron window popped up
    // (default Electron behavior for target=_blank is new window if not handled)
    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(1);
  });

  it('should block direct navigation of main window to external URLs', async () => {
    // This tests the `will-navigate` handler in WindowManager

    const initialUrl = await browser.getUrl();

    // Attempt to navigate to an external URL using window.location
    await browser.execute(() => {
      window.location.href = 'https://google.com';
    });

    // Wait a bit and check URL
    await browser.pause(1000);

    const currentUrl = await browser.getUrl();
    // Should still be on original URL (or at least not google.com)
    expect(currentUrl).toBe(initialUrl);
  });

  it('should open links inside Gemini iframe in system browser', async () => {
    // This is a critical security test. Links inside the webview iframe
    // must also be intercepted and opened externally.

    // 1. Find the Gemini iframe and inject a link into it
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      const main = wins.find((w) => w.getTitle().includes('Gemini'));
      if (!main) return;

      const webContents = main.webContents;
      const frames = webContents.mainFrame.frames;
      // Find a frame that looks like Gemini (usually the largest one or matches URL)
      const geminiFrame = frames.find((f) => f.url.includes('google.com'));

      if (geminiFrame) {
        geminiFrame.executeJavaScript(`
                    const link = document.createElement('a');
                    link.href = 'https://google.com';
                    link.target = '_blank';
                    link.textContent = 'Iframe External Link';
                    link.id = 'iframe-external-link';
                    link.style.cssText = 'position:fixed;top:50px;left:50px;z-index:9999;background:green;color:white;padding:10px;';
                    document.body.appendChild(link);
                    console.log('Injected link into iframe');
                `);
      }
    });

    // 2. Click the link inside the iframe
    // Since we can't easily click inside the iframe via WDIO selectors in this setup,
    // we'll trigger the click via executeJavaScript in the iframe
    await browser.electron.execute((electron) => {
      const wins = electron.BrowserWindow.getAllWindows();
      const main = wins.find((w) => w.getTitle().includes('Gemini'));
      if (!main) return;

      const webContents = main.webContents;
      const frames = webContents.mainFrame.frames;
      const geminiFrame = frames.find((f) => f.url.includes('google.com'));

      if (geminiFrame) {
        geminiFrame.executeJavaScript(`
                    const link = document.getElementById('iframe-external-link');
                    if (link) link.click();
                `);
      }
    });

    await browser.pause(1000);

    // 3. Verify no new Electron window was opened
    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(1);

    // 4. Verify main window didn't navigate
    const currentUrl = await browser.getUrl();
    expect(currentUrl).not.toContain('google.com');
  });
});
