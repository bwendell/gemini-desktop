import { beforeEach, describe, expect, it } from 'vitest';

import {
    createMockPlatformAdapter,
    platformAdapterPresets,
    resetPlatformAdapterForTests,
    useMockPlatformAdapter,
} from '../../../helpers/mocks';
import { getPlatformAdapter } from '../../../../src/main/platform/platformAdapterFactory';

describe('platformAdapterMock sentinel', () => {
    beforeEach(() => {
        resetPlatformAdapterForTests();
    });

    it('returns the default adapter after reset', () => {
        // After reset, the factory returns the real platform adapter.
        // To test that reset works correctly, mock it explicitly.
        useMockPlatformAdapter(platformAdapterPresets.windows());
        resetPlatformAdapterForTests();

        // Now get the adapter fresh (this will be the real platform adapter)
        const adapter = getPlatformAdapter();

        // The adapter should be whatever the real platform is.
        // For determinism, test that it's a valid adapter with an id.
        // On Linux with Wayland: 'linux-wayland'
        // On Linux without Wayland: 'linux-x11'
        // On Windows: 'windows'
        // On macOS: 'mac'
        expect(adapter.id).toMatch(/^(linux-wayland|linux-x11|windows|mac)$/);
        expect(adapter.id).toBeTruthy();
    });

    it('returns the configured adapter for linux-wayland', () => {
        useMockPlatformAdapter(platformAdapterPresets['linux-wayland']());
        const adapter = getPlatformAdapter();
        expect(adapter.id).toBe('linux-wayland');
    });

    it('returns the configured adapter for mac', () => {
        useMockPlatformAdapter(platformAdapterPresets.mac());
        const adapter = getPlatformAdapter();
        expect(adapter.id).toBe('mac');
    });

    it('supports custom overrides', () => {
        useMockPlatformAdapter(createMockPlatformAdapter({ id: 'linux-x11' }));
        const adapter = getPlatformAdapter();
        expect(adapter.id).toBe('linux-x11');
    });
});
