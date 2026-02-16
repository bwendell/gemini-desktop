/**
 * E2E Test: Quick Chat Full Workflow
 *
 * Tests the complete Quick Chat workflow from start to finish:
 * 1. User pushes quick chat hotkey
 * 2. Quick chat window opens
 * 3. User types text
 * 4. User hits enter or clicks submit button
 * 5. Main window refreshes to gemini.google.com
 * 6. User's text is automatically pasted in text box
 * 7. Submit button is visible and clickable (NOT clicked - E2E flag prevents)
 *
 * IMPORTANT: This test clicks the REAL submit button, but the E2E flag
 * (--e2e-disable-auto-submit) prevents actual submission to Gemini.
 * This tests the full production code path.
 *
 * @module quick-chat-full-workflow.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { expect } from '@wdio/globals';
import { QuickChatPage } from './pages';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow, waitForWindowTransition } from './helpers/workflows';
import { waitForTextInGeminiEditor } from './helpers/quickChatActions';
import { E2ELogger } from './helpers/logger';
import { waitForUIState } from './helpers/waitUtilities';

describe('Quick Chat Full Workflow (E2E)', () => {
    const quickChat = new QuickChatPage();

    before(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Complete Production Path Test', () => {
        it('should complete the full Quick Chat workflow with REAL button click', async () => {
            /**
             * This test exercises the REAL production code path:
             * - Actually clicks the Quick Chat submit button
             * - Actually triggers the IPC flow
             * - Actually navigates to Gemini and injects text
             * - Submit button is found but NOT clicked (E2E flag in ipcManager)
             *
             * This catches bugs that tests using injectTextOnly() would miss.
             */

            const testMessage = `E2E Full Workflow Test ${Date.now()}`;
            E2ELogger.info('full-workflow', '\n=== Starting Full Quick Chat Workflow ===');
            E2ELogger.info('full-workflow', `Test message: "${testMessage}"`);

            // Step 1: Trigger Quick Chat via hotkey action (same as pressing hotkey)
            E2ELogger.info('full-workflow', '1. Opening Quick Chat window...');
            await quickChat.show();
            await waitForUIState(async () => await quickChat.isVisible(), { description: 'Quick Chat visible' });

            // Step 2: Verify Quick Chat window opened
            const foundQuickChat = await quickChat.switchToQuickChatWindow();
            expect(foundQuickChat).toBe(true);
            E2ELogger.info('full-workflow', '2. Quick Chat window opened ✓');

            // Step 3: Type test message
            E2ELogger.info('full-workflow', '3. Typing message...');
            await quickChat.typeText(testMessage);
            await waitForUIState(async () => (await quickChat.getInputValue()) === testMessage, {
                description: 'Input has text',
            });

            // Verify text was entered
            const enteredValue = await quickChat.getInputValue();
            expect(enteredValue).toBe(testMessage);
            E2ELogger.info('full-workflow', `   Message entered: "${testMessage}" ✓`);

            // Step 4: Click the REAL submit button (this triggers production IPC flow)
            E2ELogger.info('full-workflow', '4. Clicking REAL submit button...');
            const isSubmitEnabled = await quickChat.isSubmitEnabled();
            expect(isSubmitEnabled).toBe(true);

            // Click submit - this triggers the production code path:
            // renderer → IPC → ipcManager → navigate → inject text
            await quickChat.submit();
            E2ELogger.info('full-workflow', '   Submit button clicked ✓');

            // Step 5: Wait for Quick Chat to hide using polling
            E2ELogger.info('full-workflow', '5. Waiting for Quick Chat to hide...');
            await waitForWindowTransition(async () => !(await quickChat.isVisible()));
            E2ELogger.info('full-workflow', '   Quick Chat hidden ✓');

            // Step 6: Switch to main window and wait for text injection
            // With tabbed chat, submit creates a new tab → iframe loads → 500ms delay → injection.
            // waitForTextInGeminiEditor polls all Gemini frames until the expected text appears.
            E2ELogger.info('full-workflow', '6. Switching to main window...');
            await switchToMainWindow();
            E2ELogger.info('full-workflow', '   Main window focused ✓');

            // Step 7: Verify text was injected into Gemini editor
            E2ELogger.info('full-workflow', '7. Verifying text injection into Gemini...');
            const editorState = await waitForTextInGeminiEditor(testMessage, 15000);
            E2ELogger.info('full-workflow', `   Editor state: ${JSON.stringify(editorState)}`);

            // Verify the text was injected
            expect(editorState.iframeFound).toBe(true);
            expect(editorState.editorFound).toBe(true);
            expect(editorState.editorText).toContain(testMessage);
            E2ELogger.info('full-workflow', '   Text injected into Gemini ✓');

            // Step 8: Verify submit button is visible and clickable (but NOT clicked due to E2E flag)
            E2ELogger.info('full-workflow', '8. Verifying submit button state...');
            expect(editorState.submitButtonFound).toBe(true);
            expect(editorState.submitButtonEnabled).toBe(true);
            E2ELogger.info('full-workflow', '   Submit button visible and clickable ✓');
            E2ELogger.info('full-workflow', '   (NOT clicked due to E2E flag - message NOT sent to Gemini)');

            E2ELogger.info('full-workflow', '\n=== Full Workflow Complete ===');
            E2ELogger.info('full-workflow', 'Verified: Quick Chat → Type → Submit → Inject → Ready to send');
            E2ELogger.info('full-workflow', 'E2E flag prevented actual Gemini submission ✓');
        });

        it('should complete workflow using Enter key instead of button click', async () => {
            /**
             * Same workflow but uses Enter key to submit instead of clicking button.
             */

            const testMessage = `E2E Enter Key Test ${Date.now()}`;
            E2ELogger.info('enter-workflow', '\n=== Starting Enter Key Workflow ===');

            // Open Quick Chat
            await quickChat.show();
            await waitForUIState(async () => await quickChat.isVisible(), { description: 'Quick Chat visible' });

            const foundQuickChat = await quickChat.switchToQuickChatWindow();
            expect(foundQuickChat).toBe(true);

            // Type message
            await quickChat.typeText(testMessage);
            await waitForUIState(async () => (await quickChat.getInputValue()) === testMessage, {
                description: 'Input has text',
            });

            // Submit via Enter key
            E2ELogger.info('enter-workflow', 'Submitting via Enter key...');
            await quickChat.submitViaEnter();

            // Wait for processing using polling
            await waitForWindowTransition(async () => !(await quickChat.isVisible()));

            // Switch to main and verify text injection in the new tab
            await switchToMainWindow();

            const editorState = await waitForTextInGeminiEditor(testMessage, 15000);

            expect(editorState.iframeFound).toBe(true);
            expect(editorState.editorFound).toBe(true);
            expect(editorState.editorText).toContain(testMessage);
            expect(editorState.submitButtonFound).toBe(true);

            E2ELogger.info('enter-workflow', 'Enter key workflow complete ✓');
        });
    });

    describe('Workflow Edge Cases', () => {
        it('should handle rapid hotkey toggle during workflow', async () => {
            // Open Quick Chat
            await quickChat.show();
            await waitForUIState(async () => await quickChat.isVisible(), { description: 'Quick Chat visible' });

            const initialVisible = await quickChat.isVisible();
            expect(initialVisible).toBe(true);

            // Toggle hide
            await quickChat.hide();
            await waitForWindowTransition(async () => !(await quickChat.isVisible()));

            const afterHideVisible = await quickChat.isVisible();
            expect(afterHideVisible).toBe(false);

            // Toggle show again
            await quickChat.show();
            await waitForUIState(async () => await quickChat.isVisible(), { description: 'Quick Chat visible' });

            const finalVisible = await quickChat.isVisible();
            expect(finalVisible).toBe(true);

            // Cleanup
            await quickChat.hide();
            await waitForWindowTransition(async () => !(await quickChat.isVisible()));
            E2ELogger.info('edge-case', 'Rapid toggle test passed ✓');
        });

        it('should clear input and reject empty submission', async () => {
            await quickChat.show();
            await waitForUIState(async () => await quickChat.isVisible(), { description: 'Quick Chat visible' });

            const found = await quickChat.switchToQuickChatWindow();
            expect(found).toBe(true);

            // Verify submit is disabled with empty input
            await quickChat.clearInput();
            await waitForUIState(async () => (await quickChat.getInputValue()) === '', {
                description: 'Input cleared',
            });

            const isEnabled = await quickChat.isSubmitEnabled();
            expect(isEnabled).toBe(false);

            E2ELogger.info('edge-case', 'Empty submission rejected ✓');

            // Cleanup
            await quickChat.cancel();
        });
    });
});
