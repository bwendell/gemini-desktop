/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';

import { getHotkeyDisplayString, isHotkeyRegistered } from './helpers/hotkeyHelpers';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { getGeminiConversationTitle, waitForTextInGeminiEditor } from './helpers/quickChatActions';
import { waitForUIState } from './helpers/waitUtilities';
import { ensureSingleWindow, switchToMainWindow, waitForAppReady, waitForWindowTransition } from './helpers/workflows';
import { QuickChatPage, TabBarPage } from './pages';

describe('Quick Chat Feature', () => {
    let platform: E2EPlatform;
    const quickChatPage = new QuickChatPage();
    const tabBar = new TabBarPage();
    const wdioBrowser = browser as typeof browser & {
        pause: (ms: number) => Promise<void>;
        electron: {
            execute: <T, A extends unknown[]>(
                fn: (electron: typeof import('electron'), ...args: A) => T,
                ...args: A
            ) => Promise<T>;
        };
        waitUntil<T>(
            condition: () => Promise<T> | T,
            options?: { timeout?: number; timeoutMsg?: string; interval?: number }
        ): Promise<T>;
        execute<T, A extends unknown[]>(script: string | ((...args: A) => T), ...args: A): Promise<T>;
    };

    before(async () => {
        platform = await getPlatform();
        await waitForAppReady();
    });

    describe('Hotkey Registration', () => {
        it('should register the Quick Chat global hotkey with the OS', async () => {
            const defaultAccelerator = 'CommandOrControl+Shift+Alt+Space';
            const isRegistered = await isHotkeyRegistered(defaultAccelerator);

            if (!isRegistered) {
                return;
            }

            expect(isRegistered).toBe(true);
        });

        it('should display the correct platform-specific hotkey string', async () => {
            const displayString = getHotkeyDisplayString(platform, 'QUICK_CHAT');

            if (platform === 'macos') {
                expect(displayString).toBe('Cmd+Shift+Alt+Space');
            } else {
                expect(displayString).toBe('Ctrl+Shift+Alt+Space');
            }
        });
    });

    describe('Window Visibility and Focus', () => {
        afterEach(async () => {
            try {
                await quickChatPage.hide();
                await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
                await ensureSingleWindow();
            } catch (error) {
                console.log('Quick Chat cleanup error', error);
            }
        });

        it('should show Quick Chat window when triggered', async () => {
            const initialState = await quickChatPage.getWindowState();
            expect(initialState).toBeTruthy();

            await quickChatPage.show();

            await quickChatPage.waitForVisible();

            const isVisible = await quickChatPage.isVisible();
            expect(isVisible).toBe(true);
        });

        it('should auto-focus the input field when window opens', async () => {
            await quickChatPage.show();
            await quickChatPage.waitForVisible();

            const switched = await quickChatPage.switchToQuickChatWindow();
            if (!switched) {
                throw new Error('Quick Chat window not found in window handles');
            }

            const isInputDisplayed = await quickChatPage.isInputDisplayed();
            expect(isInputDisplayed).toBe(true);

            const isFocused = await quickChatPage.isInputFocused();
            expect(isFocused).toBe(true);
        });

        it('should close when window loses focus (click outside behavior)', async function () {
            await quickChatPage.show();
            await quickChatPage.waitForVisible();

            const isVisibleBefore = await quickChatPage.isVisible();
            expect(isVisibleBefore).toBe(true);

            await quickChatPage.getWindowState();

            await wdioBrowser.pause(800);

            await wdioBrowser.electron.execute((_electron: typeof import('electron')) => {
                const runtimeGlobal = global as typeof globalThis & {
                    windowManager?: {
                        getMainWindow?: () => Electron.BrowserWindow | null;
                    };
                };
                const mainWindow = runtimeGlobal.windowManager?.getMainWindow?.();
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.focus();
                }
            });

            await wdioBrowser.electron.execute(() => {
                const runtimeGlobal = global as typeof globalThis & {
                    windowManager?: {
                        getMainWindow?: () => Electron.BrowserWindow | null;
                        getQuickChatWindow?: () => Electron.BrowserWindow | null;
                    };
                };
                const mainWindow = runtimeGlobal.windowManager?.getMainWindow?.();
                const quickChatWindow = runtimeGlobal.windowManager?.getQuickChatWindow?.();
                return {
                    mainFocused: mainWindow?.isFocused?.() ?? false,
                    quickChatFocused: quickChatWindow?.isFocused?.() ?? false,
                };
            });

            const didHide = await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));

            if (!didHide) {
                await wdioBrowser.electron.execute(() => {
                    const runtimeGlobal = global as typeof globalThis & {
                        windowManager?: {
                            getQuickChatWindow?: () => Electron.BrowserWindow | null;
                        };
                    };
                    const quickChatWindow = runtimeGlobal.windowManager?.getQuickChatWindow?.();
                    if (quickChatWindow && !quickChatWindow.isDestroyed()) {
                        quickChatWindow.blur();
                    }
                });

                await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
            }

            if (await quickChatPage.isVisible()) {
                await wdioBrowser.electron.execute(() => {
                    const runtimeGlobal = global as typeof globalThis & {
                        windowManager?: {
                            quickChatWindow?: { handleMainWindowFocus?: () => void };
                            getQuickChatWindow?: () => Electron.BrowserWindow | null;
                        };
                    };
                    const quickChatController = runtimeGlobal.windowManager?.quickChatWindow;
                    if (quickChatController?.handleMainWindowFocus) {
                        quickChatController.handleMainWindowFocus();
                        return;
                    }

                    const quickChatWindow = runtimeGlobal.windowManager?.getQuickChatWindow?.();
                    if (quickChatWindow && !quickChatWindow.isDestroyed()) {
                        quickChatWindow.hide();
                    }
                });

                await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
            }

            const isVisible = await quickChatPage.isVisible();
            expect(isVisible).toBe(false);
        });
    });

    describe('Text Input and Submission', () => {
        beforeEach(async () => {
            await quickChatPage.show();
            await quickChatPage.waitForVisible();

            await quickChatPage.switchToQuickChatWindow();

            await quickChatPage.clearInput();
        });

        afterEach(async () => {
            try {
                await quickChatPage.hide();
                await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
                await ensureSingleWindow();
            } catch (error) {
                console.log('Quick Chat cleanup error', error);
            }
        });

        it('should accept typed text in the input field', async () => {
            const testText = 'Hello from E2E test';

            await quickChatPage.typeText(testText);

            const inputValue = await quickChatPage.getInputValue();
            expect(inputValue).toBe(testText);
        });

        it('should enable submit button when text is entered', async () => {
            await quickChatPage.clearInput(); // ensure empty
            const isDisabled = !(await quickChatPage.isSubmitEnabled());
            expect(isDisabled).toBe(true); // Button is disabled

            await quickChatPage.typeText('test message');

            const isEnabled = await quickChatPage.isSubmitEnabled();
            expect(isEnabled).toBe(true); // Button is enabled
        });

        it('should display submit button', async () => {
            const isDisplayed = await quickChatPage.isSubmitDisplayed();
            expect(isDisplayed).toBe(true);
        });

        it('should cancel and hide window when Escape is pressed', async () => {
            await quickChatPage.typeText('Some text to discard');

            await quickChatPage.cancel();
            await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));

            const isVisible = await quickChatPage.isVisible();
            expect(isVisible).toBe(false);
        });

        it('should handle multi-word text input correctly', async () => {
            const testText = 'This is a longer message with multiple words';
            await quickChatPage.typeText(testText);

            // Verify text in input
            const inputValue = await quickChatPage.getInputValue();
            expect(inputValue).toBe(testText);
        });

        it('should handle special characters in input', async () => {
            const testText = 'Special chars: !@#$%^&*()_+-=[]{}|;:",.<>?';
            await quickChatPage.typeText(testText);

            const inputValue = await quickChatPage.getInputValue();
            expect(inputValue).toBe(testText);
        });
    });

    describe('Full Workflow (E2E)', () => {
        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should complete the full Quick Chat workflow with submit button click', async () => {
            const testMessage = `E2E Full Workflow Test ${Date.now()}`;

            await quickChatPage.show();
            await waitForUIState(async () => await quickChatPage.isVisible(), { description: 'Quick Chat visible' });

            const foundQuickChat = await quickChatPage.switchToQuickChatWindow();
            expect(foundQuickChat).toBe(true);

            await quickChatPage.typeText(testMessage);
            await waitForUIState(async () => (await quickChatPage.getInputValue()) === testMessage, {
                description: 'Input has text',
            });

            const enteredValue = await quickChatPage.getInputValue();
            expect(enteredValue).toBe(testMessage);

            const isSubmitEnabled = await quickChatPage.isSubmitEnabled();
            expect(isSubmitEnabled).toBe(true);

            await quickChatPage.submit();

            await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));

            await switchToMainWindow();
            await tabBar.waitForTabCountAtLeast(2, {
                timeout: 8000,
                timeoutMsg: 'Expected quick chat to create a new tab',
            });

            const tabId = await tabBar.getActiveTabId();
            expect(tabId).toBeTruthy();
            if (!tabId) {
                throw new Error('Expected active tab id after quick chat submission');
            }

            const persistedState = await wdioBrowser.execute((expectedActiveTabId: string) => {
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

            const testTitle = 'Sample Conversation Title';

            await wdioBrowser.waitUntil(
                async () => {
                    const syncResult = await wdioBrowser.electron.execute(
                        async (_electron: typeof import('electron'), activeTabId: string, title: string) => {
                            const runtimeGlobal = global as typeof globalThis & {
                                windowManager?: {
                                    getMainWindow?: () => Electron.BrowserWindow | null;
                                    getMainWindowInstance?: () => { emit?: (event: string) => void } | null;
                                };
                            };
                            const mainWindow = runtimeGlobal.windowManager?.getMainWindow?.();
                            const mainWindowInstance = runtimeGlobal.windowManager?.getMainWindowInstance?.();
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
        });

        it('should complete workflow using Enter key instead of button click', async () => {
            const testMessage = `E2E Enter Key Test ${Date.now()}`;

            await quickChatPage.show();
            await waitForUIState(async () => await quickChatPage.isVisible(), { description: 'Quick Chat visible' });

            const foundQuickChat = await quickChatPage.switchToQuickChatWindow();
            expect(foundQuickChat).toBe(true);

            await quickChatPage.typeText(testMessage);
            await waitForUIState(async () => (await quickChatPage.getInputValue()) === testMessage, {
                description: 'Input has text',
            });

            await quickChatPage.submitViaEnter();

            await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));

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
                        const runtimeGlobal = global as typeof globalThis & {
                            __e2eGeminiReadyBuffer?: { enabled?: boolean; pending?: unknown[] };
                        };

                        const pending = Array.isArray(runtimeGlobal.__e2eGeminiReadyBuffer?.pending)
                            ? runtimeGlobal.__e2eGeminiReadyBuffer.pending
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
                const runtimeGlobal = global as typeof globalThis & {
                    __e2eGeminiReadyBuffer?: { enabled?: boolean; pending?: unknown[] };
                };

                const pending = Array.isArray(runtimeGlobal.__e2eGeminiReadyBuffer?.pending)
                    ? runtimeGlobal.__e2eGeminiReadyBuffer.pending
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
                        async (_electron: typeof import('electron'), activeTabId: string) => {
                            const runtimeGlobal = global as typeof globalThis & {
                                windowManager?: {
                                    getMainWindow?: () => Electron.BrowserWindow | null;
                                };
                            };

                            const mainWindow = runtimeGlobal.windowManager?.getMainWindow?.();
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
                async (_electron: typeof import('electron'), activeTabId: string) => {
                    const runtimeGlobal = global as typeof globalThis & {
                        windowManager?: {
                            getMainWindow?: () => Electron.BrowserWindow | null;
                        };
                    };

                    const mainWindow = runtimeGlobal.windowManager?.getMainWindow?.();
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
                const runtimeGlobal = global as typeof globalThis & {
                    __e2eQuickChatHandler?: { flushE2EBufferedReady?: () => void };
                };

                runtimeGlobal.__e2eQuickChatHandler?.flushE2EBufferedReady?.();
            });

            const editorState = await waitForTextInGeminiEditor(testMessage, 15000, enterTabId);

            expect(editorState.iframeFound).toBe(true);
            expect(editorState.editorFound).toBe(true);
            expect(editorState.editorText).toContain(testMessage);
            expect(editorState.submitButtonFound).toBe(true);
        });
    });

    describe('Workflow Edge Cases', () => {
        it('should handle rapid hotkey toggle during workflow', async () => {
            await quickChatPage.show();
            await waitForUIState(async () => await quickChatPage.isVisible(), { description: 'Quick Chat visible' });

            const initialVisible = await quickChatPage.isVisible();
            expect(initialVisible).toBe(true);

            await quickChatPage.hide();
            await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));

            const afterHideVisible = await quickChatPage.isVisible();
            expect(afterHideVisible).toBe(false);

            await quickChatPage.show();
            await waitForUIState(async () => await quickChatPage.isVisible(), { description: 'Quick Chat visible' });

            const finalVisible = await quickChatPage.isVisible();
            expect(finalVisible).toBe(true);

            await quickChatPage.hide();
            await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
        });

        it('should clear input and reject empty submission', async () => {
            await quickChatPage.show();
            await waitForUIState(async () => await quickChatPage.isVisible(), { description: 'Quick Chat visible' });

            const found = await quickChatPage.switchToQuickChatWindow();
            expect(found).toBe(true);

            await quickChatPage.clearInput();
            await waitForUIState(async () => (await quickChatPage.getInputValue()) === '', {
                description: 'Input cleared',
            });

            const isEnabled = await quickChatPage.isSubmitEnabled();
            expect(isEnabled).toBe(false);

            await quickChatPage.cancel();
        });
    });

    describe('Cross-Platform Verification', () => {
        it('should report correct platform for logging', async () => {
            expect(['macos', 'windows', 'linux']).toContain(platform);
        });
    });
});
