import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', async () => {
    const mockModule = await import('../unit/main/test/electron-mock');
    return mockModule.default;
});

import { app, shell } from 'electron';
import { getReleaseNotesUrl } from '../../src/shared/utils/releaseNotes';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');

describe('Release Notes Menu Coordination', () => {
    let windowManager: WindowManager;
    let menuManager: MenuManager;

    beforeEach(() => {
        vi.clearAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        const adapterForPlatform = {
            darwin: platformAdapterPresets.mac,
            win32: platformAdapterPresets.windows,
            linux: platformAdapterPresets.linuxX11,
        } as const;

        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
            windowManager = new WindowManager(false);
            menuManager = new MenuManager(windowManager);
            (app as any).getVersion = vi.fn().mockReturnValue('1.2.3');
        });

        it('opens release notes in system browser from Help menu', () => {
            menuManager.buildMenu();

            const template = (require('electron').Menu.buildFromTemplate as any).mock.calls[0][0];
            const helpMenu = template.find((menu: any) => menu.label === 'Help');
            const releaseNotesItem = helpMenu?.submenu?.find((item: any) => item.label === 'Release Notes');

            expect(releaseNotesItem).toBeDefined();

            releaseNotesItem.click();

            expect(shell.openExternal).toHaveBeenCalledWith(getReleaseNotesUrl('1.2.3'));
        });
    });
});
