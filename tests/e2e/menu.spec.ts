import type { Browser } from '@wdio/globals';
import { $, $$, browser, expect } from '@wdio/globals';
import { afterEach, beforeEach, describe, it } from 'mocha';
import type { Context } from 'mocha';

import { expectUrlHash } from './helpers/assertions';
import { isMacOS, usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { waitForWindowCount } from './helpers/windowActions';
import { ensureSingleWindow, waitForAppReady } from './helpers/workflows';
import { waitForDuration, waitForUIState } from './helpers/waitUtilities';
import { MainWindowPage, OptionsPage } from './pages';
import { ContextMenuPage } from './pages/ContextMenuPage';

type WindowWithE2EVar = Window & { __e2e_test_var?: string };

describe('Menu', () => {
    describe('Menu Bar', () => {
        const testBrowser = browser as unknown as WebdriverIO.Browser & Browser;
        const mainWindow = new MainWindowPage();

        beforeEach(async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await waitForAppReady();

            const menuBar = await $(Selectors.menuBar);
            await menuBar.waitForExist({ timeout: 10000 });
            await menuBar.waitForDisplayed({ timeout: 10000 });
        });

        afterEach(async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await ensureSingleWindow();
        });

        it('should have menu buttons', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            expect(await mainWindow.isMenuBarDisplayed()).toBe(true);

            const menuButtons = await $$('.titlebar-menu-button');
            expect(menuButtons.length).toBeGreaterThan(0);
        });

        it('should have File, View, and Help menus', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            const menuBar = await $(mainWindow.menuBarSelector);
            await menuBar.waitForExist();

            const allButtons = await $$('.titlebar-menu-button');
            expect(allButtons.length).toBe(3);

            const buttonTexts: string[] = [];
            for (const button of allButtons) {
                const text = await button.getText();
                buttonTexts.push(text);
            }

            expect(buttonTexts).toContain('File');
            expect(buttonTexts).toContain('View');
            expect(buttonTexts).toContain('Help');
        });

        it('should open dropdown when File menu is clicked', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('File');

            const dropdown = await $(Selectors.menuDropdown);
            await dropdown.waitForExist({ timeout: 5000 });
            await expect(dropdown).toBeDisplayed();

            await mainWindow.openMenu('File');
        });

        it('should close dropdown when clicking outside (on backdrop)', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('File');

            const dropdown = await $(Selectors.menuDropdown);
            await dropdown.waitForExist();
            await expect(dropdown).toBeDisplayed();

            const backdrop = await $('.titlebar-menu-backdrop');
            await expect(backdrop).toExist();

            await backdrop.click();

            await expect(dropdown).not.toBeDisplayed();
        });

        it('should close dropdown when Escape key is pressed', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('File');

            const dropdown = await $(Selectors.menuDropdown);
            await dropdown.waitForExist();
            await expect(dropdown).toBeDisplayed();

            await testBrowser.keys(['Escape']);

            await expect(dropdown).not.toBeDisplayed();
        });

        it('should switch menus when hovering another menu button while open', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            const viewButton = await $(Selectors.menuButton('View'));

            await mainWindow.openMenu('File');
            const dropdown = await $(Selectors.menuDropdown);
            await dropdown.waitForExist();

            const exitItem = await $(Selectors.menuItem('Exit'));
            await expect(exitItem).toExist();

            await viewButton.moveTo();

            await waitForUIState(
                async () => {
                    try {
                        const reloadItem = await $(Selectors.menuItem('Reload'));
                        return await reloadItem.isDisplayed();
                    } catch {
                        return false;
                    }
                },
                { description: 'Menu switch to View on hover' }
            );

            const reloadItem = await $(Selectors.menuItem('Reload'));
            await expect(reloadItem).toExist();

            await expect(exitItem).not.toBeDisplayed();

            await viewButton.click();
        });
    });

    describe('Actions', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should open About tab in Options window when clicking "About Gemini Desktop"', async () => {
            await mainWindow.openAboutViaMenu();

            await waitForWindowCount(2);

            await optionsPage.waitForLoad();

            await expectUrlHash('#about');

            expect(await optionsPage.isAboutTabActive()).toBe(true);

            await optionsPage.close();
        });

        it('should reload the page when clicking View -> Reload', async function (this: Context) {
            if (await isMacOS()) {
                this.skip();
            }

            await browser.execute(() => {
                (window as WindowWithE2EVar).__e2e_test_var = 'loaded';
            });

            const valBefore = await browser.execute(() => (window as WindowWithE2EVar).__e2e_test_var);
            expect(valBefore).toBe('loaded');

            await mainWindow.clickMenuById('menu-view-reload');

            await waitForDuration(1000, 'Page reload');

            const valAfter = await browser.execute(() => (window as WindowWithE2EVar).__e2e_test_var);
            expect(valAfter).toBeFalsy();
        });
    });

    describe('Interactions', () => {
        const mainWindow = new MainWindowPage();

        beforeEach(async () => {
            if (!(await usesCustomControls())) {
                return;
            }
            await waitForAppReady();
        });

        it('should open the main window if not already present', async () => {
            await mainWindow.waitForTitlebar();
            expect(await mainWindow.isTitlebarDisplayed()).toBe(true);
        });

        it('should verify File menu interactions', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('File');

            await mainWindow.waitForDropdownOpen();
            expect(await mainWindow.isDropdownVisible()).toBe(true);

            expect(await mainWindow.isMenuItemExisting('Options')).toBe(true);

            await mainWindow.closeDropdownByClickingTitlebar();

            await mainWindow.waitForDropdownClose();
            expect(await mainWindow.isDropdownVisible()).toBe(false);
        });

        it('should verify View menu interactions', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('View');

            await mainWindow.waitForDropdownOpen();
            expect(await mainWindow.isDropdownVisible()).toBe(true);

            await mainWindow.closeDropdownByClickingTitlebar();

            await mainWindow.waitForDropdownClose();
            expect(await mainWindow.isDropdownVisible()).toBe(false);
        });

        it('should verify About (Help) menu interactions', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            await mainWindow.openMenu('Help');

            await mainWindow.waitForDropdownOpen();
            expect(await mainWindow.isDropdownVisible()).toBe(true);

            expect(await mainWindow.isMenuItemExisting('About Gemini Desktop')).toBe(true);

            await mainWindow.closeDropdownByClickingTitlebar();

            await mainWindow.waitForDropdownClose();
            expect(await mainWindow.isDropdownVisible()).toBe(false);
        });
    });

    describe('Edit Menu User Flow', () => {
        const testInputId = 'e2e-edit-menu-flow-input';
        const contextMenuPage = new ContextMenuPage();

        beforeEach(async () => {
            await waitForAppReady();

            await contextMenuPage.clearClipboard();

            await browser.execute((inputId: string) => {
                const existing = document.getElementById(inputId);
                if (existing) {
                    existing.remove();
                }

                const input = document.createElement('textarea');
                input.id = inputId;
                input.setAttribute('aria-label', 'Edit menu flow input');
                input.style.position = 'fixed';
                input.style.top = '120px';
                input.style.left = '40px';
                input.style.width = '420px';
                input.style.height = '80px';
                input.style.zIndex = '999999';
                document.body.appendChild(input);
            }, testInputId);
        });

        afterEach(async () => {
            await browser.execute((inputId: string) => {
                document.getElementById(inputId)?.remove();
            }, testInputId);
        });

        async function selectAllInputValue(inputId: string): Promise<void> {
            await browser.execute((targetId: string) => {
                const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
                if (!el) {
                    return;
                }
                el.focus();
                el.setSelectionRange(0, el.value.length);
            }, inputId);
        }

        async function clickEditRole(role: string): Promise<void> {
            const result = await browser.electron.execute((electron: typeof import('electron'), targetRole: string) => {
                const win = electron.BrowserWindow.getFocusedWindow() ?? electron.BrowserWindow.getAllWindows()[0];
                if (!win) {
                    return { success: false, error: 'No focused window available for edit actions' };
                }

                const webContents = win.webContents;

                switch (targetRole) {
                    case 'copy':
                        webContents.copy();
                        break;
                    case 'paste':
                        webContents.paste();
                        break;
                    case 'cut':
                        webContents.cut();
                        break;
                    case 'undo':
                        webContents.undo();
                        break;
                    default:
                        return { success: false, error: `Unsupported edit role: ${targetRole}` };
                }

                return { success: true };
            }, role);

            if (!result.success) {
                throw new Error(result.error);
            }
        }

        it('should support copy, paste, cut, and undo through Edit menu roles', async () => {
            const input = await $(`#${testInputId}`);
            await input.click();

            const originalText = 'Edit menu user flow text';
            await input.setValue(originalText);

            await selectAllInputValue(testInputId);
            const selectionReady = await waitForUIState(
                async () => {
                    return browser.execute((inputId: string) => {
                        const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
                        if (!el) {
                            return false;
                        }
                        return el.selectionStart === 0 && el.selectionEnd === el.value.length;
                    }, testInputId);
                },
                { description: 'Input selection ready' }
            );
            expect(selectionReady).toBe(true);

            await clickEditRole('copy');

            const copyApplied = await waitForUIState(
                async () => {
                    const clipboardText = await browser.electron.execute((electron: typeof import('electron')) => {
                        return electron.clipboard.readText();
                    });
                    return clipboardText === originalText;
                },
                { description: 'Clipboard contains copied text' }
            );
            expect(copyApplied).toBe(true);

            await browser.execute((inputId: string) => {
                const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
                if (el) {
                    el.value = '';
                    el.focus();
                }
            }, testInputId);

            await contextMenuPage.setClipboardText(originalText);
            await clickEditRole('paste');
            const pasteApplied = await waitForUIState(async () => (await input.getValue()) === originalText, {
                description: 'Input value after paste',
            });
            expect(pasteApplied).toBe(true);

            await selectAllInputValue(testInputId);
            await clickEditRole('cut');
            const cutApplied = await waitForUIState(async () => (await input.getValue()) === '', {
                description: 'Input value after cut',
            });
            expect(cutApplied).toBe(true);

            await clickEditRole('undo');
            const undoApplied = await waitForUIState(async () => (await input.getValue()) === originalText, {
                description: 'Input value after undo',
            });
            expect(undoApplied).toBe(true);
        });
    });

    describe('Context Menu', () => {
        const contextMenu = new ContextMenuPage();
        let testInput: Awaited<ReturnType<ContextMenuPage['createTestInput']>>;

        beforeEach(async () => {
            await contextMenu.waitForAppReady();

            testInput = await contextMenu.createTestInput();

            await contextMenu.setupMenuSpy();
            await contextMenu.clearClipboard();
        });

        afterEach(async () => {
            await contextMenu.removeTestInput();
        });

        it.skip('should show context menu on right-click', async () => {
            await testInput.click();
            await testInput.setValue('Test text');

            await contextMenu.openContextMenu(testInput);

            const cutItem = await contextMenu.getMenuItemState('cut');
            const copyItem = await contextMenu.getMenuItemState('copy');
            const pasteItem = await contextMenu.getMenuItemState('paste');

            expect(cutItem).not.toBeNull();
            expect(copyItem).not.toBeNull();
            expect(pasteItem).not.toBeNull();
        });

        it.skip('should copy text to clipboard via context menu', async () => {
            const testText = 'Copy this text';

            await contextMenu.typeAndSelect(testInput, testText);

            await contextMenu.openContextMenu(testInput);

            const copyItem = await contextMenu.getMenuItemState('copy');
            expect(copyItem?.enabled).toBe(true);
            expect(copyItem?.label).toMatch(/Copy/i);
        });

        it.skip('should paste text from clipboard via context menu', async () => {
            const testText = 'Paste this text';

            await contextMenu.setClipboardText(testText);

            await testInput.click();

            await contextMenu.openContextMenu(testInput);

            const pasteItem = await contextMenu.getMenuItemState('paste');
            expect(pasteItem?.enabled).toBe(true);
            expect(pasteItem?.label).toMatch(/Paste/i);
        });

        it.skip('should cut text to clipboard via context menu', async () => {
            const testText = 'Cut this text';

            await contextMenu.typeAndSelect(testInput, testText);

            await contextMenu.openContextMenu(testInput);

            const cutItem = await contextMenu.getMenuItemState('cut');
            expect(cutItem?.enabled).toBe(true);
            expect(cutItem?.label).toMatch(/Cut/i);
        });

        it.skip('should select all text via context menu', async () => {
            const testText = 'Select all this text';

            await testInput.click();
            await testInput.setValue(testText);

            await testInput.click();
            await waitForDuration(200, 'Input deselection settle');

            await contextMenu.openContextMenu(testInput);

            const selectAllItem = await contextMenu.getMenuItemState('selectAll');
            expect(selectAllItem?.enabled).toBe(true);
            expect(selectAllItem?.label).toMatch(/Select All/i);
        });

        it.skip('should delete selected text via context menu', async () => {
            const testText = 'Delete this text';

            await contextMenu.typeAndSelect(testInput, testText);

            await contextMenu.openContextMenu(testInput);

            const deleteItem = await contextMenu.getMenuItemState('delete');
            expect(deleteItem).not.toBeNull();
        });

        describe.skip('Disabled States', () => {
            it('should have Cut/Copy/Delete disabled when no text is selected', async () => {
                await testInput.click();

                await contextMenu.openContextMenu(testInput);

                const cutItem = await contextMenu.getMenuItemState('cut');
                const copyItem = await contextMenu.getMenuItemState('copy');
                const deleteItem = await contextMenu.getMenuItemState('delete');

                expect(cutItem?.enabled).toBe(false);
                expect(copyItem?.enabled).toBe(false);
                expect(deleteItem?.enabled).toBe(false);
            });

            it('should allow Paste when clipboard has content', async () => {
                const testText = 'Clipboard content';

                await contextMenu.setClipboardText(testText);

                await testInput.click();

                const pasteItem = await contextMenu.getMenuItemState('paste');
                expect(pasteItem?.enabled).toBe(true);
            });
        });

        describe.skip('Read-only Input', () => {
            it('should only allow Copy on read-only text', async () => {
                const readonlyInputId = 'e2e-readonly-input';

                const readonlyInput = await contextMenu.createTestInput(readonlyInputId, {
                    readOnly: true,
                    value: 'Read-only text',
                    top: '150px',
                });

                await readonlyInput.click();
                await contextMenu.selectAllWithKeyboard();

                await contextMenu.openContextMenu(readonlyInput);

                const copyItem = await contextMenu.getMenuItemState('copy');
                const cutItem = await contextMenu.getMenuItemState('cut');
                const pasteItem = await contextMenu.getMenuItemState('paste');

                expect(copyItem?.enabled).toBe(true);
                expect(cutItem?.enabled).toBe(false);
                expect(pasteItem?.enabled).toBe(false);

                await contextMenu.removeTestInput(readonlyInputId);
            });
        });

        describe('Keyboard Shortcuts', () => {
            it('should support Ctrl+C/Cmd+C keyboard shortcut for copy', async () => {
                const testText = 'Shortcut copy test';

                await testInput.click();
                await testInput.setValue(testText);

                await contextMenu.selectAllWithKeyboard();
                await contextMenu.copyWithKeyboard();

                const pastedValue = await contextMenu.verifyClipboardContains(testText);
                expect(pastedValue).toBe(testText);
            });

            it('should support Ctrl+V/Cmd+V keyboard shortcut for paste', async () => {
                const testText = 'Shortcut paste test';

                await contextMenu.setClipboardText(testText);

                await testInput.click();
                await contextMenu.pasteWithKeyboard();

                const inputValue = await testInput.getValue();
                expect(inputValue).toBe(testText);
            });

            it('should support Ctrl+X/Cmd+X keyboard shortcut for cut', async () => {
                const testText = 'Shortcut cut test';

                await testInput.click();
                await testInput.setValue(testText);

                await contextMenu.selectAllWithKeyboard();
                await contextMenu.cutWithKeyboard();

                const inputValue = await testInput.getValue();
                expect(inputValue).toBe('');

                await contextMenu.pasteWithKeyboard();

                const pastedValue = await testInput.getValue();
                expect(pastedValue).toBe(testText);
            });

            it('should support Ctrl+A/Cmd+A keyboard shortcut for select all', async () => {
                const testText = 'Select all shortcut test';

                await testInput.click();
                await testInput.setValue(testText);

                await contextMenu.selectAllWithKeyboard();
                await contextMenu.copyWithKeyboard();

                const copiedValue = await contextMenu.verifyClipboardContains(testText);
                expect(copiedValue).toBe(testText);
            });
        });

        describe.skip('Multiple Sequential Operations', () => {
            it('should copy from one input and paste into another', async () => {
                const sourceText = 'Source input text';
                const targetInputId = 'e2e-target-input';

                await contextMenu.typeAndSelect(testInput, sourceText);

                await contextMenu.openContextMenu(testInput);

                const copyItem = await contextMenu.getMenuItemState('copy');
                expect(copyItem?.enabled).toBe(true);

                const targetInput = await contextMenu.createTestInput(targetInputId, { top: '200px' });
                await targetInput.click();

                await contextMenu.openContextMenu(targetInput);

                const pasteItem = await contextMenu.getMenuItemState('paste');
                expect(pasteItem?.enabled).toBe(true);

                await contextMenu.removeTestInput(targetInputId);
            });

            it('should perform multiple operations in sequence: type, select, cut, paste', async () => {
                const testText = 'Sequential operations test';

                await testInput.click();
                await testInput.setValue(testText);

                await contextMenu.selectAllWithKeyboard();

                await contextMenu.openContextMenu(testInput);
                const cutItem = await contextMenu.getMenuItemState('cut');
                expect(cutItem?.enabled).toBe(true);

                await browser.keys(['Escape']);

                await contextMenu.openContextMenu(testInput);
                const pasteItem = await contextMenu.getMenuItemState('paste');
                expect(pasteItem).not.toBeNull();
            });
        });

        describe.skip('Webview Context Menu', () => {
            it('should show context menu in the Gemini webview container', async () => {
                const webviewContainer = await contextMenu.getWebviewContainer();

                await contextMenu.openContextMenu(webviewContainer);

                await contextMenu.closeContextMenu();
            });
        });
    });
});
