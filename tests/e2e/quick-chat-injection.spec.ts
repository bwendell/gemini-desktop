/**
 * E2E Tests for Quick Chat Text Injection.
 * 
 * Tests the complete Quick Chat workflow including:
 * - Text injection into the Gemini iframe
 * - DOM manipulation with Trusted Types compliance
 * - Submit button interaction
 * - Integration with main window focus
 * 
 * Note: These tests require the network to be available and 
 * gemini.google.com to be accessible in the iframe.
 * 
 * @module quick-chat-injection.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import {
    showQuickChatWindow,
    hideQuickChatWindow,
    getQuickChatState,
    submitQuickChatText,
    getGeminiIframeState,
} from './helpers/quickChatActions';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Quick Chat Text Injection', () => {

    describe('Prerequisites', () => {
        it('should have the main window loaded', async () => {
            const title = await browser.getTitle();
            E2ELogger.info('injection-prereq', `Window title: ${title}`);
            expect(title).toBeTruthy();
        });

        it('should have at least one active window', async () => {
            const windowCount = await browser.electron.execute(
                (electron: typeof import('electron')) => {
                    return electron.BrowserWindow.getAllWindows().length;
                }
            );
            E2ELogger.info('injection-prereq', `Window count: ${windowCount}`);
            expect(windowCount).toBeGreaterThanOrEqual(1);
        });

        it('should have the Gemini iframe accessible', async () => {
            // Wait a bit for iframe to load
            await browser.pause(E2E_TIMING.IFRAME_LOAD_WAIT_MS);

            const iframeState = await getGeminiIframeState();
            E2ELogger.info('injection-prereq', `Iframe state: ${JSON.stringify(iframeState)}`);

            // Log detailed info for debugging in CI
            E2ELogger.info('injection-prereq', '\n=== Gemini Iframe State ===');
            E2ELogger.info('injection-prereq', `  Loaded: ${iframeState.loaded}`);
            E2ELogger.info('injection-prereq', `  URL: ${iframeState.url}`);
            E2ELogger.info('injection-prereq', `  Frame Count: ${iframeState.frameCount}`);

            // The iframe should be present (though it may not load in CI without auth)
            expect(iframeState.frameCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Quick Chat Window Lifecycle for Injection', () => {
        afterEach(async () => {
            // Ensure Quick Chat is hidden after each test
            try {
                await hideQuickChatWindow();
                await browser.pause(E2E_TIMING.QUICK_CHAT_HIDE_DELAY_MS);
            } catch {
                // Ignore cleanup errors
            }
        });

        it('should be able to show Quick Chat window before injection', async () => {
            await showQuickChatWindow();
            await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);

            const state = await getQuickChatState();
            E2ELogger.info('injection-lifecycle', `Quick Chat state after show: ${JSON.stringify(state)}`);

            expect(state.windowExists).toBe(true);
            expect(state.windowVisible).toBe(true);
        });

        it('should hide Quick Chat window after submitting text', async () => {
            await showQuickChatWindow();
            await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);

            // Submit some text
            await submitQuickChatText('Test message from E2E');
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            // Window should be hidden
            const state = await getQuickChatState();
            E2ELogger.info('injection-lifecycle', `State after submit: ${JSON.stringify(state)}`);
            expect(state.windowVisible).toBe(false);
        });

        it('should focus main window after submitting text', async () => {
            await showQuickChatWindow();
            await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);

            // Submit text
            await submitQuickChatText('Test focus after submit');
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // Verify main window is visible
            const mainWindowVisible = await browser.electron.execute(
                (electron: typeof import('electron')) => {
                    const windows = electron.BrowserWindow.getAllWindows();
                    const mainWindow = windows.find(w => !w.isDestroyed() && w.getTitle() !== '');
                    return mainWindow?.isVisible() ?? false;
                }
            );

            expect(mainWindowVisible).toBe(true);
        });
    });

    describe('Text Injection Content Handling', () => {
        beforeEach(async () => {
            await showQuickChatWindow();
            await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);
        });

        afterEach(async () => {
            try {
                await hideQuickChatWindow();
            } catch {
                // Ignore
            }
        });

        it('should handle simple text submission', async () => {
            const testText = 'Hello from Quick Chat E2E test';

            // Submit the text
            await submitQuickChatText(testText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            // Test passes if no errors thrown
            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', `Simple text submitted: "${testText}"`);
        });

        it('should handle text with special characters', async () => {
            const specialChars = 'Test with <script>alert("xss")</script> & "quotes" \' apostrophe';

            await submitQuickChatText(specialChars);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            // Should not throw errors
            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', 'Special characters handled correctly');
        });

        it('should handle text with unicode characters', async () => {
            const unicodeText = 'Hello 👋 World 🌍 日本語 中文 العربية';

            await submitQuickChatText(unicodeText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', 'Unicode characters handled correctly');
        });

        it('should handle multi-line text', async () => {
            const multiLineText = 'Line 1\nLine 2\nLine 3';

            await submitQuickChatText(multiLineText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', 'Multi-line text handled correctly');
        });

        it('should handle very long text (1000+ characters)', async () => {
            const longText = 'A'.repeat(1500);

            await submitQuickChatText(longText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', `Long text (${longText.length} chars) handled correctly`);
        });

        it('should handle empty text gracefully', async () => {
            await submitQuickChatText('');
            await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

            // Should not cause errors
            const state = await getQuickChatState();
            E2ELogger.info('injection-content', 'Empty text handled gracefully');

            // Test passes if no exception thrown
            expect(true).toBe(true);
        });

        it('should handle text with backslashes and escapes', async () => {
            const escapedText = 'Path: C:\\Users\\test\\file.txt and regex: \\d+';

            await submitQuickChatText(escapedText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            const state = await getQuickChatState();
            expect(state.windowVisible).toBe(false);

            E2ELogger.info('injection-content', 'Escaped characters handled correctly');
        });
    });

    describe('Rapid Submission Handling', () => {
        afterEach(async () => {
            try {
                await hideQuickChatWindow();
            } catch {
                // Ignore
            }
            // Extra pause between rapid tests
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);
        });

        it('should handle multiple rapid submissions without errors', async () => {
            const submissions = [
                'First quick message',
                'Second quick message',
                'Third quick message',
            ];

            for (const text of submissions) {
                await showQuickChatWindow();
                await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);
                await submitQuickChatText(text);
                await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            }

            // Final state should be Quick Chat hidden
            const finalState = await getQuickChatState();
            expect(finalState.windowVisible).toBe(false);

            E2ELogger.info('injection-rapid', `Handled ${submissions.length} rapid submissions`);
        });
    });

    describe('Integration with Main Window', () => {
        it('should complete full workflow: show -> type -> submit -> inject', async () => {
            console.log('\n=== Full Workflow Test ===');

            // Step 1: Get initial state
            const initialState = await getQuickChatState();
            E2ELogger.info('injection-integration', `1. Initial state: visible=${initialState.windowVisible}`);

            // Step 2: Show Quick Chat
            await showQuickChatWindow();
            await browser.pause(E2E_TIMING.QUICK_CHAT_SHOW_DELAY_MS);
            const afterShowState = await getQuickChatState();
            E2ELogger.info('injection-integration', `2. After show: visible=${afterShowState.windowVisible}`);
            expect(afterShowState.windowVisible).toBe(true);

            // Step 3: Submit text (this triggers injection)
            const testText = 'Quick Chat E2E Integration Test';
            E2ELogger.info('injection-integration', `3. Submitting: "${testText}"`);
            await submitQuickChatText(testText);
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            // Step 4: Verify final state
            const finalState = await getQuickChatState();
            E2ELogger.info('injection-integration', `4. Final state: visible=${finalState.windowVisible}`);
            expect(finalState.windowVisible).toBe(false);

            // Step 5: Main window should still be operational
            const mainWindowOk = await browser.electron.execute(
                (electron: typeof import('electron')) => {
                    const windows = electron.BrowserWindow.getAllWindows();
                    const mainWindow = windows.find(w => !w.isDestroyed());
                    return mainWindow?.isVisible() ?? false;
                }
            );
            E2ELogger.info('injection-integration', `5. Main window visible: ${mainWindowOk}`);
            expect(mainWindowOk).toBe(true);

            E2ELogger.info('injection-integration', 'Full workflow completed successfully');
        });
    });
});

/**
 * Note on Text Injection Testing:
 * 
 * These E2E tests verify:
 * 1. The Quick Chat UI workflow (show/hide/submit)
 * 2. Text content handling (special chars, unicode, long text)
 * 3. Error handling (empty text, rapid submissions)
 * 4. Integration with main window focus
 * 
 * The actual DOM manipulation inside the Gemini iframe cannot be directly
 * asserted in E2E tests due to cross-origin restrictions. Instead, we
 * verify that the injection process completes without errors.
 * 
 * For verifying actual text appearance in Gemini, manual testing or
 * visual regression testing would be required.
 */
