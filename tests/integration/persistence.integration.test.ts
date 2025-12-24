import { browser, expect } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Application Lifecycle & Persistence', () => {
    let userDataPath: string;

    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        // Get the userData path from the main process
        userDataPath = await browser.electron.execute((electron) => {
            return electron.app.getPath('userData');
        });
    });

    it('should persist auto-update settings to disk', async () => {
        // 1. Change setting via Renderer IPC
        await browser.execute(async () => {
            const api = (window as any).electronAPI;
            await api.setAutoUpdateEnabled(false);
        });

        // 2. Wait a moment for file write
        await browser.pause(1000);

        // 3. Verify file on disk
        // The store is initialized with configName: 'user-preferences' in ipcManager.ts
        const settingsPath = path.join(userDataPath, 'user-preferences.json');

        expect(fs.existsSync(settingsPath)).toBe(true);

        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);

        expect(settings).toHaveProperty('autoUpdateEnabled', false);
    });

    it('should persist hotkey settings to disk', async () => {
        // 1. Change setting via Renderer IPC
        await browser.execute(async () => {
            const api = (window as any).electronAPI;
            await api.setIndividualHotkey('bossKey', false);
        });

        await browser.pause(1000);

        // 2. Verify file on disk (same file)
        const settingsPath = path.join(userDataPath, 'user-preferences.json');
        const content = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(content);

        // Key in store is 'hotkeyBossKey' based on ipcManager map
        expect(settings).toHaveProperty('hotkeyBossKey', false);
    });
});
