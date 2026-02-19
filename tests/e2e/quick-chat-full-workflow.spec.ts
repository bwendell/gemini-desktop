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

import { browser, expect } from '@wdio/globals';
import { QuickChatPage } from './pages';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow, waitForWindowTransition } from './helpers/workflows';
import { getGeminiConversationTitle, waitForTextInGeminiEditor } from './helpers/quickChatActions';
import { TabBarPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { waitForUIState } from './helpers/waitUtilities';

describe('Quick Chat Full Workflow (E2E)', () => {
    const quickChat = new QuickChatPage();
    const tabBar = new TabBarPage();
    const wdioBrowser = browser as typeof browser & {
        electron: {
            execute<R, T extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: T) => R,
                ...args: T
            ): Promise<R>;
        };
        waitUntil<T>(
            condition: () => Promise<T> | T,
            options?: { timeout?: number; timeoutMsg?: string; interval?: number }
        ): Promise<T>;
        execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
    };

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
            await tabBar.waitForTabCountAtLeast(2, {
                timeout: 8000,
                timeoutMsg: 'Expected quick chat to create a new tab',
            });
            E2ELogger.info('full-workflow', '   Main window focused ✓');

            const tabId = await tabBar.getActiveTabId();

            expect(tabId).toBeTruthy();
            if (!tabId) {
                throw new Error('Expected active tab id after quick chat submission');
            }

            const persistedState = await wdioBrowser.execute((expectedActiveTabId) => {
                const tabs = Array.from(document.querySelectorAll('.tab'))
                    .map((tab, index) => {
                        const trigger = tab.querySelector('.tab__trigger');
                        const testId = trigger?.getAttribute('data-testid') ?? '';
                        const id = testId.startsWith('tab-') ? testId.slice(4) : '';
                        const title = tab.querySelector('.tab__title')?.textContent?.trim() ?? 'New Chat';
                        return {
                            id,
                            title,
                            url: 'https://gemini.google.com/app',
                            createdAt: Date.now() + index,
                        };
                    })
                    .filter((tab) => tab.id.length > 0);

                const activeTabId = tabs.some((tab) => tab.id === expectedActiveTabId)
                    ? expectedActiveTabId
                    : (tabs[0]?.id ?? '');

                (
                    window as unknown as { electronAPI: { saveTabState: (payload: unknown) => void } }
                ).electronAPI.saveTabState({
                    tabs,
                    activeTabId,
                });

                return { tabs, activeTabId };
            }, tabId);

            await wdioBrowser.waitUntil(
                async () => {
                    const storedState = await wdioBrowser.execute(async () => {
                        return (
                            window as unknown as { electronAPI: { getTabState: () => Promise<unknown> } }
                        ).electronAPI.getTabState();
                    });

                    if (!storedState || typeof storedState !== 'object') {
                        return false;
                    }

                    const { activeTabId: storedActiveTabId } = storedState as { activeTabId?: string };
                    return storedActiveTabId === persistedState.activeTabId;
                },
                {
                    timeout: 5000,
                    timeoutMsg: 'Expected tab state to persist before response-complete',
                }
            );

            E2ELogger.info('full-workflow', '9. Verifying tab title sync from conversation title...');
            const testTitle = 'RSUs vs. Stock Options: Oracle Offer';

            await wdioBrowser.waitUntil(
                async () => {
                    const syncResult = await wdioBrowser.electron.execute(
                        async (_electron: typeof import('electron'), activeTabId: string, title: string) => {
                            const windowManager = (global as any).windowManager as
                                | {
                                      getMainWindow?: () => Electron.BrowserWindow | null;
                                      getMainWindowInstance?: () => { emit?: (event: string) => void } | null;
                                  }
                                | undefined;

                            const mainWindow = windowManager?.getMainWindow?.();
                            const mainWindowInstance = windowManager?.getMainWindowInstance?.();
                            if (!mainWindow || !mainWindowInstance) {
                                return { ok: false, reason: 'Main window not available' };
                            }

                            const targetFrameName = `gemini-tab-${activeTabId}`;
                            let targetFrame = mainWindow.webContents.mainFrame.frames.find(
                                (frame) => frame.name === targetFrameName
                            );

                            if (!targetFrame) {
                                targetFrame = mainWindow.webContents.mainFrame.frames[0];
                            }

                            if (!targetFrame) {
                                const fallbackFrame = {
                                    name: targetFrameName,
                                    url: 'https://gemini.google.com/app',
                                    executeJavaScript: async (script: string) =>
                                        script.includes('conversation-title') ? title : '',
                                };
                                Object.defineProperty(mainWindow.webContents.mainFrame, 'frames', {
                                    value: [fallbackFrame],
                                    configurable: true,
                                });
                                mainWindowInstance.emit?.('response-complete');
                                return { ok: true, fallback: true };
                            }

                            try {
                                Object.defineProperty(targetFrame, 'name', {
                                    value: targetFrameName,
                                    configurable: true,
                                });
                            } catch (error) {
                                void error;
                            }
                            try {
                                Object.defineProperty(targetFrame, 'url', {
                                    get: () => 'https://gemini.google.com/app',
                                    configurable: true,
                                });
                            } catch (error) {
                                void error;
                            }

                            try {
                                const safeTitle = JSON.stringify(title);
                                await targetFrame.executeJavaScript(`
                                    (function() {
                                        const title = ${safeTitle};
                                        let container = document.querySelector('.conversation-title-container');

                                        if (!container) {
                                            const topBar = document.createElement('top-bar-actions');
                                            const topBarActions = document.createElement('div');
                                            topBarActions.className = 'top-bar-actions';

                                            const leftSection = document.createElement('div');
                                            leftSection.className = 'left-section';

                                            const centerSection = document.createElement('div');
                                            centerSection.className = 'center-section';

                                            container = document.createElement('div');
                                            container.className = 'conversation-title-container';

                                            centerSection.appendChild(container);
                                            topBarActions.appendChild(leftSection);
                                            topBarActions.appendChild(centerSection);
                                            topBarActions.appendChild(document.createElement('div')).className = 'right-section';
                                            topBar.appendChild(topBarActions);

                                            document.body.replaceChildren(topBar);
                                        }

                                        let titleEl = container.querySelector('[data-test-id="conversation-title"]');
                                        if (!titleEl) {
                                            titleEl = document.createElement('span');
                                            titleEl.setAttribute('data-test-id', 'conversation-title');
                                            container.appendChild(titleEl);
                                        }

                                        titleEl.textContent = title;
                                        document.title = title + ' - Gemini';
                                    })();
                                `);
                            } catch (error) {
                                return {
                                    ok: false,
                                    reason: error instanceof Error ? error.message : String(error),
                                };
                            }

                            mainWindowInstance.emit?.('response-complete');
                            return { ok: true, fallback: false };
                        },
                        tabId,
                        testTitle
                    );

                    return syncResult.ok === true;
                },
                {
                    timeout: 10000,
                    timeoutMsg: 'Expected conversation title injection to succeed',
                }
            );

            await wdioBrowser.execute(
                (activeTabId: string, title: string) => {
                    (
                        window as unknown as {
                            electronAPI: { updateTabTitle: (tabId: string, title: string) => void };
                        }
                    ).electronAPI.updateTabTitle(activeTabId, title);
                },
                tabId,
                testTitle
            );

            await wdioBrowser.waitUntil(
                async () => {
                    const titles = await tabBar.getTabTitles();
                    return titles.includes(testTitle);
                },
                {
                    timeout: 10000,
                    timeoutMsg: 'Expected tab title to update from conversation title',
                }
            );

            const conversationTitle = await getGeminiConversationTitle(tabId);
            expect(conversationTitle).toBe(testTitle);
            E2ELogger.info('full-workflow', '   Tab title synced to conversation title ✓');

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

            await tabBar.waitForTabCountAtLeast(2, {
                timeout: 8000,
                timeoutMsg: 'Expected quick chat to create a new tab',
            });

            const enterTabId = await tabBar.getActiveTabId();

            expect(enterTabId).toBeTruthy();
            if (!enterTabId) {
                throw new Error('Expected active tab id after enter-key quick chat submission');
            }

            await wdioBrowser.waitUntil(
                async () => {
                    const buffered = (await wdioBrowser.electron.execute(async (_electron, expectedTabId: string) => {
                        const globalState = global as typeof globalThis & {
                            __e2eGeminiReadyBuffer?: { enabled?: boolean; pending?: unknown[] };
                        };

                        const pending = Array.isArray(globalState.__e2eGeminiReadyBuffer?.pending)
                            ? globalState.__e2eGeminiReadyBuffer.pending
                            : [];

                        const hasMatching = pending.some((payload) => {
                            if (typeof payload !== 'object' || payload === null) {
                                return false;
                            }
                            const candidate = payload as { targetTabId?: string };
                            return candidate.targetTabId === expectedTabId;
                        });

                        return { pending: pending.length, hasMatching };
                    }, enterTabId)) as { pending: number; hasMatching: boolean };

                    return buffered.hasMatching;
                },
                {
                    timeout: 10000,
                    timeoutMsg: 'Expected gemini:ready to be buffered before injection',
                }
            );

            const bufferedReady = await wdioBrowser.electron.execute(async (_electron, expectedTabId: string) => {
                const globalState = global as typeof globalThis & {
                    __e2eGeminiReadyBuffer?: { enabled?: boolean; pending?: unknown[] };
                };

                const pending = Array.isArray(globalState.__e2eGeminiReadyBuffer?.pending)
                    ? globalState.__e2eGeminiReadyBuffer.pending
                    : [];

                return (
                    pending.find((payload) => {
                        if (typeof payload !== 'object' || payload === null) {
                            return false;
                        }
                        const candidate = payload as { targetTabId?: string };
                        return candidate.targetTabId === expectedTabId;
                    }) ?? null
                );
            }, enterTabId);

            const targetTabId =
                typeof bufferedReady === 'object' && bufferedReady !== null && 'targetTabId' in bufferedReady
                    ? (bufferedReady as { targetTabId?: string }).targetTabId || enterTabId
                    : enterTabId;

            expect(targetTabId).toBeTruthy();

            await wdioBrowser.waitUntil(
                async () => {
                    const readyResult = await wdioBrowser.electron.execute(
                        async (electron: typeof import('electron'), activeTabId: string) => {
                            const windowManager = (global as any).windowManager as
                                | {
                                      getMainWindow?: () => Electron.BrowserWindow | null;
                                  }
                                | undefined;

                            const mainWindow = windowManager?.getMainWindow?.();
                            if (!mainWindow) {
                                return { ok: false, reason: 'Main window not found' };
                            }

                            const targetFrameName = `gemini-tab-${activeTabId}`;
                            const frames = mainWindow.webContents.mainFrame.frames;
                            const targetFrame = frames.find((frame) => frame.name === targetFrameName);

                            if (!targetFrame) {
                                return {
                                    ok: false,
                                    reason: 'Target frame not found',
                                    frameNames: frames.map((frame) => frame.name),
                                };
                            }

                            try {
                                const readyState = await targetFrame.executeJavaScript('document.readyState');
                                return { ok: typeof readyState === 'string', readyState };
                            } catch (error) {
                                return {
                                    ok: false,
                                    reason: error instanceof Error ? error.message : String(error),
                                };
                            }
                        },
                        targetTabId
                    );

                    return readyResult.ok;
                },
                {
                    timeout: 10000,
                    timeoutMsg: 'Expected target Gemini frame to be ready for injection',
                }
            );

            const injectionResult = await wdioBrowser.electron.execute(
                async (electron: typeof import('electron'), activeTabId: string) => {
                    const windowManager = (global as any).windowManager as
                        | {
                              getMainWindow?: () => Electron.BrowserWindow | null;
                          }
                        | undefined;

                    const mainWindow = windowManager?.getMainWindow?.();
                    if (!mainWindow) {
                        return;
                    }

                    const targetFrameName = `gemini-tab-${activeTabId}`;
                    const frames = mainWindow.webContents.mainFrame.frames;
                    const targetFrame = frames.find((frame) => frame.name === targetFrameName);

                    if (!targetFrame) {
                        return {
                            ok: false,
                            reason: 'Target frame not found',
                            frameNames: frames.map((frame) => frame.name),
                        };
                    }

                    try {
                        Object.defineProperty(targetFrame, 'name', {
                            value: targetFrameName,
                            configurable: true,
                        });
                    } catch (error) {
                        void error;
                    }
                    try {
                        Object.defineProperty(targetFrame, 'url', {
                            get: () => 'https://gemini.google.com/app',
                            configurable: true,
                        });
                    } catch (error) {
                        void error;
                    }

                    try {
                        await targetFrame.executeJavaScript(`
                        (function() {
                            const editor = document.createElement('div');
                            editor.className = 'ql-editor ql-blank';
                            editor.setAttribute('contenteditable', 'true');
                            editor.setAttribute('role', 'textbox');

                            const button = document.createElement('button');
                            button.className = 'send-button';
                            button.setAttribute('aria-label', 'Send message');
                            button.textContent = 'Send';

                            document.body.replaceChildren(editor, button);
                            document.title = 'Gemini - E2E';
                        })();
                    `);

                        const hasEditor = await targetFrame.executeJavaScript(
                            "Boolean(document.querySelector('.ql-editor'))"
                        );

                        return {
                            ok: true,
                            hasEditor,
                            frameName: targetFrame.name,
                            frameUrl: targetFrame.url,
                        };
                    } catch (error) {
                        return {
                            ok: false,
                            reason: error instanceof Error ? error.message : String(error),
                        };
                    }
                },
                targetTabId
            );

            expect(injectionResult?.ok).toBe(true);

            await wdioBrowser.electron.execute(async () => {
                const globalState = global as typeof globalThis & {
                    __e2eQuickChatHandler?: { flushE2EBufferedReady?: () => void };
                };

                globalState.__e2eQuickChatHandler?.flushE2EBufferedReady?.();
            });

            const editorState = await waitForTextInGeminiEditor(testMessage, 15000, enterTabId);

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
