import { expect, browser } from '@wdio/globals';

describe('Auto-Update Platform Logic', () => {
    // Disable auto-updates updates initially to prevent interference
    before(async () => {
        await (browser as any).pause(2000);
        await (browser as any).execute(() => {
            if ((window as any).electronAPI) {
                (window as any).electronAPI.setAutoUpdateEnabled(false);
                // Clear mocks
                (window as any).electronAPI.devMockPlatform(null, null);
            }
        });
        await (browser as any).pause(1000);
    });

    afterEach(async () => {
        // Reset mocks
        await (browser as any).execute(() => {
            if ((window as any).electronAPI) {
                (window as any).electronAPI.devMockPlatform(null, null);
            }
        });
    });

    it('should disable updates on Linux non-AppImage', async () => {
        // GIVEN: We act as Linux without AppImage env
        // passing undefined for APPIMAGE key. Note: mockEnv replaces process.env so just {} misses APPIMAGE usually.
        await (browser as any).execute(() => {
            (window as any).electronAPI.devMockPlatform('linux', { MOCK: 'true' });
        });

        // AND: We ensure updates are "enabled" in settings
        await (browser as any).execute(() => {
            (window as any).electronAPI.setAutoUpdateEnabled(true);
        });

        // THEN: getAutoUpdateEnabled() should return false (because platform restriction overrides setting)
        const enabled = await (browser as any).execute(async () => {
            return await (window as any).electronAPI.getAutoUpdateEnabled();
        });

        expect(enabled).toBe(false);
    });

    it('should disable updates on Windows Portable', async () => {
        // GIVEN: We act as Windows Portable
        await (browser as any).execute(() => {
            // PORTABLE_EXECUTABLE_DIR present means portable
            (window as any).electronAPI.devMockPlatform('win32', { 'PORTABLE_EXECUTABLE_DIR': 'some/path' });
        });

        // AND: We ensure updates are "enabled" in settings
        await (browser as any).execute(() => {
            (window as any).electronAPI.setAutoUpdateEnabled(true);
        });

        // THEN: getAutoUpdateEnabled() should return false
        const enabled = await (browser as any).execute(async () => {
            return await (window as any).electronAPI.getAutoUpdateEnabled();
        });
        // Wait, does UpdateManager support Portable detection?
        // I need to verify UpdateManager.ts logic for Windows Portable.
        // It relies on 'electron-updater' isUpdaterActive()? Or checks env?
        // Let's assume for now. If it fails, I'll check logic.
        // UpdateManager logic: "Linux non-AppImage detected...". Does it have Windows Portable logic?
        // I will verify UpdateManager logic in next step if this fails.
        // But the task says "Portable Windows showing appropriate messages".
        // If logic is missing, I must add it.
        expect(enabled).toBe(false);
    });

    it('should enable updates on Linux AppImage', async () => {
        await (browser as any).execute(() => {
            (window as any).electronAPI.devMockPlatform('linux', { 'APPIMAGE': '/path/to/app.AppImage' });
        });
        await (browser as any).execute(() => {
            (window as any).electronAPI.setAutoUpdateEnabled(true);
        });

        const enabled = await (browser as any).execute(async () => {
            return await (window as any).electronAPI.getAutoUpdateEnabled();
        });
        expect(enabled).toBe(true);
    });
});
