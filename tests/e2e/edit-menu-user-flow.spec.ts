import { $, browser, expect } from '@wdio/globals';
import { afterEach, beforeEach, describe, it } from 'mocha';

import { waitForAppReady } from './helpers/workflows';
import { isMacOS } from './helpers/platform';

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

async function clickEditRole(role: string): Promise<void> {
    const result = await testBrowser.electron.execute((electron: typeof import('electron'), targetRole: string) => {
        const menu = electron.Menu.getApplicationMenu();
        if (!menu) {
            return { success: false, error: 'Application menu not found' };
        }

        const editMenu = menu.items.find((item: Electron.MenuItem) => item.label === 'Edit');
        if (!editMenu || !editMenu.submenu) {
            return { success: false, error: 'Edit menu not found' };
        }

        const roleItem = editMenu.submenu.items.find((item: Electron.MenuItem) => item.role === targetRole);
        if (!roleItem) {
            return { success: false, error: `Edit role item not found: ${targetRole}` };
        }

        roleItem.click();
        return { success: true };
    }, role);

    if (!result.success) {
        throw new Error(result.error);
    }
}

describe('Edit Menu User Flow', () => {
    beforeEach(async () => {
        await waitForAppReady();

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

        const modKey = (await isMacOS()) ? 'Meta' : 'Control';

        await testBrowser.keys([modKey, 'a']);
        await clickEditRole('copy');

        const copiedText = await testBrowser.electron.execute((electron: typeof import('electron')) => {
            return electron.clipboard.readText();
        });
        expect(copiedText).toBe(originalText);

        await testBrowser.execute((inputId: string) => {
            const el = document.getElementById(inputId) as HTMLTextAreaElement | null;
            if (el) {
                el.value = '';
                el.focus();
            }
        }, TEST_INPUT_ID);

        await clickEditRole('paste');
        expect(await input.getValue()).toBe(originalText);

        await testBrowser.keys([modKey, 'a']);
        await clickEditRole('cut');
        expect(await input.getValue()).toBe('');

        await clickEditRole('undo');
        expect(await input.getValue()).toBe(originalText);
    });
});
