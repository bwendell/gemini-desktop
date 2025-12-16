/**
 * Unit tests for platform detection utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getPlatform, isMacOS, isWindows, isLinux, usesCustomWindowControls } from './platform';
import { setMockPlatform } from '../test/setup';

describe('platform utilities', () => {
    beforeEach(() => {
        // Reset to default (Windows)
        setMockPlatform('win32');
    });

    describe('getPlatform', () => {
        it('returns windows when platform is win32', () => {
            setMockPlatform('win32');
            expect(getPlatform()).toBe('windows');
        });

        it('returns linux when platform is linux', () => {
            setMockPlatform('linux');
            expect(getPlatform()).toBe('linux');
        });

        it('returns macos when platform is darwin', () => {
            setMockPlatform('darwin');
            expect(getPlatform()).toBe('macos');
        });
    });

    describe('isMacOS', () => {
        it('returns true on macOS', () => {
            setMockPlatform('darwin');
            expect(isMacOS()).toBe(true);
        });

        it('returns false on Windows', () => {
            setMockPlatform('win32');
            expect(isMacOS()).toBe(false);
        });

        it('returns false on Linux', () => {
            setMockPlatform('linux');
            expect(isMacOS()).toBe(false);
        });
    });

    describe('isWindows', () => {
        it('returns true on Windows', () => {
            setMockPlatform('win32');
            expect(isWindows()).toBe(true);
        });

        it('returns false on macOS', () => {
            setMockPlatform('darwin');
            expect(isWindows()).toBe(false);
        });

        it('returns false on Linux', () => {
            setMockPlatform('linux');
            expect(isWindows()).toBe(false);
        });
    });

    describe('isLinux', () => {
        it('returns true on Linux', () => {
            setMockPlatform('linux');
            expect(isLinux()).toBe(true);
        });

        it('returns false on Windows', () => {
            setMockPlatform('win32');
            expect(isLinux()).toBe(false);
        });

        it('returns false on macOS', () => {
            setMockPlatform('darwin');
            expect(isLinux()).toBe(false);
        });
    });

    describe('usesCustomWindowControls', () => {
        it('returns true on Windows', () => {
            setMockPlatform('win32');
            expect(usesCustomWindowControls()).toBe(true);
        });

        it('returns true on Linux', () => {
            setMockPlatform('linux');
            expect(usesCustomWindowControls()).toBe(true);
        });

        it('returns false on macOS', () => {
            setMockPlatform('darwin');
            expect(usesCustomWindowControls()).toBe(false);
        });
    });

    describe('navigator.platform fallback', () => {
        it('detects macOS from navigator.platform when electronAPI is unavailable', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            // Mock navigator.platform
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                configurable: true,
            });

            expect(getPlatform()).toBe('macos');

            // Restore
            window.electronAPI = originalAPI;
        });

        it('detects Windows from navigator.platform when electronAPI is unavailable', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            Object.defineProperty(navigator, 'platform', {
                value: 'Win32',
                configurable: true,
            });

            expect(getPlatform()).toBe('windows');

            // Restore
            window.electronAPI = originalAPI;
        });

        it('defaults to Linux from navigator.platform when electronAPI is unavailable', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            Object.defineProperty(navigator, 'platform', {
                value: 'Linux x86_64',
                configurable: true,
            });

            expect(getPlatform()).toBe('linux');

            // Restore
            window.electronAPI = originalAPI;
        });
    });
});
