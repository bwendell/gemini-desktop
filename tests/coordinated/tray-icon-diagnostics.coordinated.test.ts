import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Tray, nativeImage } from 'electron';

import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';
import { restorePlatform, stubPlatform } from '../helpers/harness/platform';

vi.mock('../../src/main/utils/logger');
vi.mock('../../src/main/utils/paths', () => ({
    getIconPath: () => '/mock/icon.png',
}));
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
}));

describe('Tray icon diagnostics (coordinated)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (Tray as any)._reset?.();
    });

    afterEach(() => {
        restorePlatform();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    it('sets template image and resized dimensions on macOS', async () => {
        stubPlatform('darwin');
        useMockPlatformAdapter(platformAdapterPresets.mac());

        const { default: TrayManagerFresh } = await import('../../src/main/managers/trayManager');
        const manager = new TrayManagerFresh({ restoreFromTray: vi.fn() } as never);

        manager.createTray();

        expect(nativeImage.createFromPath).toHaveBeenCalledWith('/mock/icon.png');
        const diagnostics = manager.getTrayIconDiagnostics();

        expect(diagnostics?.platform).toBe('darwin');
        expect(diagnostics?.isTemplate).toBe(true);
        expect(diagnostics?.width).toBe(18);
        expect(diagnostics?.height).toBe(18);
    });

    it('does not mark template image on non-macOS platforms', async () => {
        stubPlatform('win32');
        useMockPlatformAdapter(platformAdapterPresets.windows());

        const { default: TrayManagerFresh } = await import('../../src/main/managers/trayManager');
        const manager = new TrayManagerFresh({ restoreFromTray: vi.fn() } as never);

        manager.createTray();

        const diagnostics = manager.getTrayIconDiagnostics();

        expect(diagnostics?.platform).toBe('win32');
        expect(diagnostics?.isTemplate).toBe(false);
    });
});
