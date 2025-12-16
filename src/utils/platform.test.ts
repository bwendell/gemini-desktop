/**
 * Unit tests for platform detection utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type as getOsType } from '@tauri-apps/plugin-os';
import { getPlatform, isMacOS, isWindows, isLinux, usesCustomWindowControls } from './platform';

// Mock the OS plugin
vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(),
}));

const mockGetOsType = vi.mocked(getOsType);

describe('platform utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getPlatform', () => {
        it('returns windows when OS type is windows', () => {
            mockGetOsType.mockReturnValue('windows');
            expect(getPlatform()).toBe('windows');
        });

        it('returns linux when OS type is linux', () => {
            mockGetOsType.mockReturnValue('linux');
            expect(getPlatform()).toBe('linux');
        });

        it('returns macos when OS type is macos', () => {
            mockGetOsType.mockReturnValue('macos');
            expect(getPlatform()).toBe('macos');
        });
    });

    describe('isMacOS', () => {
        it('returns true on macOS', () => {
            mockGetOsType.mockReturnValue('macos');
            expect(isMacOS()).toBe(true);
        });

        it('returns false on Windows', () => {
            mockGetOsType.mockReturnValue('windows');
            expect(isMacOS()).toBe(false);
        });

        it('returns false on Linux', () => {
            mockGetOsType.mockReturnValue('linux');
            expect(isMacOS()).toBe(false);
        });
    });

    describe('isWindows', () => {
        it('returns true on Windows', () => {
            mockGetOsType.mockReturnValue('windows');
            expect(isWindows()).toBe(true);
        });

        it('returns false on macOS', () => {
            mockGetOsType.mockReturnValue('macos');
            expect(isWindows()).toBe(false);
        });

        it('returns false on Linux', () => {
            mockGetOsType.mockReturnValue('linux');
            expect(isWindows()).toBe(false);
        });
    });

    describe('isLinux', () => {
        it('returns true on Linux', () => {
            mockGetOsType.mockReturnValue('linux');
            expect(isLinux()).toBe(true);
        });

        it('returns false on Windows', () => {
            mockGetOsType.mockReturnValue('windows');
            expect(isLinux()).toBe(false);
        });

        it('returns false on macOS', () => {
            mockGetOsType.mockReturnValue('macos');
            expect(isLinux()).toBe(false);
        });
    });

    describe('usesCustomWindowControls', () => {
        it('returns true on Windows', () => {
            mockGetOsType.mockReturnValue('windows');
            expect(usesCustomWindowControls()).toBe(true);
        });

        it('returns true on Linux', () => {
            mockGetOsType.mockReturnValue('linux');
            expect(usesCustomWindowControls()).toBe(true);
        });

        it('returns false on macOS', () => {
            mockGetOsType.mockReturnValue('macos');
            expect(usesCustomWindowControls()).toBe(false);
        });
    });
});
