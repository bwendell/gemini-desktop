import type { Browser } from '@wdio/globals';
import { browser, expect } from '@wdio/globals';

import { MainWindowPage, OptionsPage } from './pages';
import { SettingsHelper } from './helpers/SettingsHelper';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';

type WdioBrowser = WebdriverIO.Browser & Browser;

describe('Startup Settings', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();
    const settings = new SettingsHelper();
    const wdioBrowser = browser as unknown as WdioBrowser;

    beforeEach(async () => {
        await waitForAppReady();

        await wdioBrowser.execute(async () => {
            const api = (window as any).electronAPI;
            api.setStartMinimized(false);
            api.setLaunchAtStartup(false);
        });
        await wdioBrowser.pause(250);
    });

    afterEach(async () => {
        try {
            await wdioBrowser.execute(async () => {
                const api = (window as any).electronAPI;
                api.setStartMinimized(false);
                api.setLaunchAtStartup(false);
            });
        } catch (error) {
            console.warn('Startup settings cleanup failed:', error);
        }

        await ensureSingleWindow();
    });

    describe('Startup Section in Options', () => {
        it('displays Startup section with both toggles', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            expect(await optionsPage.isStartupSectionDisplayed()).toBe(true);

            const launchToggle = await wdioBrowser.$('[data-testid="launch-at-startup-toggle"]');
            expect(await launchToggle.isDisplayed()).toBe(true);

            const minimizedToggle = await wdioBrowser.$('[data-testid="start-minimized-toggle"]');
            expect(await minimizedToggle.isDisplayed()).toBe(true);
        });
    });

    describe('Launch at Startup Toggle', () => {
        it('defaults to OFF and toggles ON through UI', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            expect(await optionsPage.isLaunchAtStartupEnabled()).toBe(false);

            await optionsPage.clickLaunchAtStartupToggle();
            await wdioBrowser.pause(250);

            expect(await optionsPage.isLaunchAtStartupEnabled()).toBe(true);

            const handles = await wdioBrowser.getWindowHandles();
            await wdioBrowser.switchToWindow(handles[0]);
            const storedValue = await wdioBrowser.execute(async () => {
                return await (window as any).electronAPI.getLaunchAtStartup();
            });
            expect(storedValue).toBe(true);
        });
    });

    describe('Start Minimized dependency behavior', () => {
        it('is disabled when Launch at Startup is OFF', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            expect(await optionsPage.isStartMinimizedDisabled()).toBe(true);
        });

        it('is enabled when Launch at Startup is ON and cascades OFF when launch is turned off', async () => {
            await wdioBrowser.execute(async () => {
                const api = (window as any).electronAPI;
                api.setLaunchAtStartup(true);
                api.setStartMinimized(true);
            });
            await wdioBrowser.pause(250);

            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            expect(await optionsPage.isStartMinimizedDisabled()).toBe(false);
            expect(await optionsPage.isStartMinimizedEnabled()).toBe(true);

            await optionsPage.clickLaunchAtStartupToggle();
            await wdioBrowser.pause(300);

            expect(await optionsPage.isLaunchAtStartupEnabled()).toBe(false);
            expect(await optionsPage.isStartMinimizedEnabled()).toBe(false);
            expect(await optionsPage.isStartMinimizedDisabled()).toBe(true);
        });
    });

    describe('Persistence', () => {
        it('persists launchAtStartup and startMinimized to user-preferences.json', async () => {
            await wdioBrowser.execute(async () => {
                const api = (window as any).electronAPI;
                api.setLaunchAtStartup(true);
                api.setStartMinimized(true);
            });

            await wdioBrowser.pause(1000);

            expect(await settings.getLaunchAtStartup()).toBe(true);
            expect(await settings.getStartMinimized()).toBe(true);
        });
    });
});
