import { browser, expect } from '@wdio/globals';

describe('Multi-Window Coordination (Quick Chat)', () => {
    before(async () => {
        // Wait for app ready
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    it('should initially have only one window (Main)', async () => {
        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(1);
    });

    it('should open Quick Chat window via Main Process invocation', async () => {
        // Invoke toggleQuickChat directly in Main Process via wdio-electron-service
        await browser.electron.execute(() => {
            // @ts-expect-error - exposed in main.ts
            global.windowManager.toggleQuickChat();
        });

        // Wait for second window handle
        await browser.waitUntil(
            async () => {
                const handles = await browser.getWindowHandles();
                return handles.length === 2;
            },
            { timeout: 5000, timeoutMsg: 'Quick Chat window did not appear' }
        );

        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(2);
    });

    it('should have correct title/url in the new window', async () => {
        const handles = await browser.getWindowHandles();
        // Switch to the quick chat window (usually the new one)
        await browser.switchToWindow(handles[1]);

        // Verify usage of 'quickchat' definition (could check URL or Title)
        // Since the title bar is custom or frameless, checking URL is robust.
        const url = await browser.getUrl();
        expect(url).toContain('quickchat');
    });

    it('should close Quick Chat window via Main Process invocation', async () => {
        // Toggle again to close
        await browser.electron.execute(() => {
            // @ts-expect-error
            global.windowManager.toggleQuickChat();
        });

        // Wait for window to be hidden
        await browser.waitUntil(
            async () => {
                return await browser.electron.execute(() => {
                    // @ts-expect-error
                    const win = global.windowManager.getQuickChatWindow();
                    return win ? !win.isVisible() : true;
                });
            },
            { timeout: 5000, timeoutMsg: 'Quick Chat window did not hide' }
        );

        // Switch back to main window to avoid stale handle errors
        const handles = await browser.getWindowHandles();
        await browser.switchToWindow(handles[0]);
    });
});
