import { beforeEach, describe, expect, it } from 'vitest';

import {
    createMockPlatformAdapter,
    platformAdapterPresets,
    resetPlatformAdapterForTests,
    useMockPlatformAdapter,
} from '../../../helpers/mocks';
import { getPlatformAdapter } from '../../../../src/main/platform/platformAdapterFactory';
import { isLinux } from '../../../../src/main/utils/constants';

describe('platformAdapterMock sentinel', () => {
    beforeEach(() => {
        resetPlatformAdapterForTests();
    });

    it('returns the default adapter after reset', () => {
        const adapter = getPlatformAdapter();
        // On Linux CI, the actual platform adapter is returned
        const expectedId = isLinux ? 'linux-wayland' : 'windows';
        expect(adapter.id).toBe(expectedId);
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
