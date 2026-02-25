import { $, browser, expect } from '@wdio/globals';
import { afterEach, beforeEach, describe, it } from 'mocha';

import { waitForAppReady } from './helpers/workflows';
import { waitForUIState } from './helpers/waitUtilities';
import { ContextMenuPage } from './pages/ContextMenuPage';

const TEST_INPUT_ID = 'e2e-edit-menu-flow-input';

type ElectronBrowser = {
    execute<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
    keys(value: string | string[]): Promise<void>;
    electron: {
        execute<T>(fn: (electron: typeof import('electron')) => T): Promise<T>;
        execute<T, A>(fn: (electron: typeof import('electron'), arg: A) => T, arg: A): Promise<T>;
    };
};

const testBrowser = browser as unknown as ElectronBrowser;
const contextMenuPage = new ContextMenuPage();

async function selectAllInputValue(inputId: string): Promise<void> {
    await testBrowser.execute((targetId: string) => {
        const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
        if (!el) {
            return;
        }
        el.focus();
        el.setSelectionRange(0, el.value.length);
    }, inputId);
}

async function clickEditRole(role: string): Promise<void> {
    const result = await testBrowser.electron.execute((electron: typeof import('electron'), targetRole: string) => {
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

describe('Edit Menu User Flow', () => {
    beforeEach(async () => {
        await waitForAppReady();

        await contextMenuPage.clearClipboard();

        await testBrowser.execute((inputId: string) => {
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
        }, TEST_INPUT_ID);
    });

    afterEach(async () => {
        await testBrowser.execute((inputId: string) => {
            document.getElementById(inputId)?.remove();
        }, TEST_INPUT_ID);
    });

    it('should support copy, paste, cut, and undo through Edit menu roles', async () => {
        const input = await $(`#${TEST_INPUT_ID}`);
        await input.click();

        const originalText = 'Edit menu user flow text';
        await input.setValue(originalText);

        await selectAllInputValue(TEST_INPUT_ID);
        const selectionReady = await waitForUIState(
            async () => {
                return testBrowser.execute((inputId: string) => {
                    const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
                    if (!el) {
                        return false;
                    }
                    return el.selectionStart === 0 && el.selectionEnd === el.value.length;
                }, TEST_INPUT_ID);
            },
            { description: 'Input selection ready' }
        );
        expect(selectionReady).toBe(true);

        await clickEditRole('copy');

        const copyApplied = await waitForUIState(
            async () => {
                const clipboardText = await testBrowser.electron.execute((electron: typeof import('electron')) => {
                    return electron.clipboard.readText();
                });
                return clipboardText === originalText;
            },
            { description: 'Clipboard contains copied text' }
        );
        expect(copyApplied).toBe(true);

        await testBrowser.execute((inputId: string) => {
            const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
            if (el) {
                el.value = '';
                el.focus();
            }
        }, TEST_INPUT_ID);

        await contextMenuPage.setClipboardText(originalText);
        await clickEditRole('paste');
        const pasteApplied = await waitForUIState(async () => (await input.getValue()) === originalText, {
            description: 'Input value after paste',
        });
        expect(pasteApplied).toBe(true);

        await selectAllInputValue(TEST_INPUT_ID);
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
