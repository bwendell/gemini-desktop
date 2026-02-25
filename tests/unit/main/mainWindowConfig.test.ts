/**
 * Unit tests for MainWindow frame configuration across platforms.
 *
 * Verifies:
 * - MAIN_WINDOW_CONFIG.frame is true on darwin, false on win32/linux
 * - MainWindow config combines platform-conditional frame with titleBarStyle
 * - OPTIONS_WINDOW_CONFIG and QUICK_CHAT_WINDOW_CONFIG remain unchanged (frame: false)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { stubPlatform, restorePlatform } from '../../../tests/helpers/harness/platform';

describe('MainWindow configuration', () => {
    beforeEach(() => {
        // Reset modules before each test to pick up platform stubs
        vi.resetModules();
    });

    afterEach(() => {
        restorePlatform();
        vi.resetModules();
    });

    describe('MAIN_WINDOW_CONFIG.frame platform conditions', () => {
        it('should have frame: true on darwin (macOS)', async () => {
            stubPlatform('darwin');

            // Dynamically import after platform stub to get platform-conditional value
            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(MAIN_WINDOW_CONFIG.frame).toBe(true);
        });

        it('should have frame: false on win32 (Windows)', async () => {
            stubPlatform('win32');

            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(MAIN_WINDOW_CONFIG.frame).toBe(false);
        });

        it('should have frame: false on linux', async () => {
            stubPlatform('linux');

            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(MAIN_WINDOW_CONFIG.frame).toBe(false);
        });
    });

    describe('getTitleBarStyle platform conditions', () => {
        it('should return "hidden" on darwin (macOS)', async () => {
            stubPlatform('darwin');

            const { getTitleBarStyle } = await import('../../../src/main/utils/constants');

            expect(getTitleBarStyle()).toBe('hidden');
        });

        it('should return undefined on win32 (Windows)', async () => {
            stubPlatform('win32');

            const { getTitleBarStyle } = await import('../../../src/main/utils/constants');

            expect(getTitleBarStyle()).toBeUndefined();
        });

        it('should return undefined on linux', async () => {
            stubPlatform('linux');

            const { getTitleBarStyle } = await import('../../../src/main/utils/constants');

            expect(getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('Config combination alignment (frame + titleBarStyle)', () => {
        it('macOS should have frame: true AND titleBarStyle: hidden together', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG, getTitleBarStyle } = await import(
                '../../../src/main/utils/constants'
            );

            // macOS requires frame: true when titleBarStyle is 'hidden' for custom titlebar
            expect(MAIN_WINDOW_CONFIG.frame).toBe(true);
            expect(getTitleBarStyle()).toBe('hidden');
        });

        it('Windows should have frame: false AND titleBarStyle: undefined together', async () => {
            stubPlatform('win32');

            const { MAIN_WINDOW_CONFIG, getTitleBarStyle } = await import(
                '../../../src/main/utils/constants'
            );

            // Windows uses frame: false for custom rendering
            expect(MAIN_WINDOW_CONFIG.frame).toBe(false);
            expect(getTitleBarStyle()).toBeUndefined();
        });

        it('Linux should have frame: false AND titleBarStyle: undefined together', async () => {
            stubPlatform('linux');

            const { MAIN_WINDOW_CONFIG, getTitleBarStyle } = await import(
                '../../../src/main/utils/constants'
            );

            // Linux uses frame: false for custom rendering
            expect(MAIN_WINDOW_CONFIG.frame).toBe(false);
            expect(getTitleBarStyle()).toBeUndefined();
        });
    });

    describe('Config includes expected inheritance from BASE_WINDOW_CONFIG', () => {
        it('MAIN_WINDOW_CONFIG should have backgroundColor from BASE_WINDOW_CONFIG', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG, BASE_WINDOW_CONFIG } = await import(
                '../../../src/main/utils/constants'
            );

            expect(MAIN_WINDOW_CONFIG.backgroundColor).toBe(BASE_WINDOW_CONFIG.backgroundColor);
            expect(MAIN_WINDOW_CONFIG.backgroundColor).toBe('#1a1a1a');
        });

        it('MAIN_WINDOW_CONFIG should have show: false from BASE_WINDOW_CONFIG', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG, BASE_WINDOW_CONFIG } = await import(
                '../../../src/main/utils/constants'
            );

            expect(MAIN_WINDOW_CONFIG.show).toBe(BASE_WINDOW_CONFIG.show);
            expect(MAIN_WINDOW_CONFIG.show).toBe(false);
        });

        it('MAIN_WINDOW_CONFIG should have webPreferences from BASE_WINDOW_CONFIG', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG, BASE_WINDOW_CONFIG } = await import(
                '../../../src/main/utils/constants'
            );

            expect(MAIN_WINDOW_CONFIG.webPreferences).toBeDefined();
            expect(MAIN_WINDOW_CONFIG.webPreferences).toEqual(BASE_WINDOW_CONFIG.webPreferences);
        });
    });

    describe('Dimension configuration for MAIN_WINDOW_CONFIG', () => {
        it('should have correct default dimensions', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(MAIN_WINDOW_CONFIG.width).toBe(1200);
            expect(MAIN_WINDOW_CONFIG.height).toBe(800);
        });

        it('should have correct minimum dimensions', async () => {
            stubPlatform('win32');

            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(MAIN_WINDOW_CONFIG.minWidth).toBe(350);
            expect(MAIN_WINDOW_CONFIG.minHeight).toBe(600);
        });
    });

    describe('Other window configs remain unchanged on all platforms', () => {
        it('OPTIONS_WINDOW_CONFIG should have frame: false on darwin', async () => {
            stubPlatform('darwin');

            const { OPTIONS_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(OPTIONS_WINDOW_CONFIG.frame).toBe(false);
        });

        it('OPTIONS_WINDOW_CONFIG should have frame: false on win32', async () => {
            stubPlatform('win32');

            const { OPTIONS_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(OPTIONS_WINDOW_CONFIG.frame).toBe(false);
        });

        it('QUICK_CHAT_WINDOW_CONFIG should have frame: false on darwin', async () => {
            stubPlatform('darwin');

            const { QUICK_CHAT_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(QUICK_CHAT_WINDOW_CONFIG.frame).toBe(false);
        });

        it('QUICK_CHAT_WINDOW_CONFIG should have frame: false on linux', async () => {
            stubPlatform('linux');

            const { QUICK_CHAT_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            expect(QUICK_CHAT_WINDOW_CONFIG.frame).toBe(false);
        });
    });

    describe('Config structure verification', () => {
        it('should have all required properties in MAIN_WINDOW_CONFIG', async () => {
            stubPlatform('darwin');

            const { MAIN_WINDOW_CONFIG } = await import('../../../src/main/utils/constants');

            // Verify required properties exist
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('width');
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('height');
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('minWidth');
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('minHeight');
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('frame');
            expect(MAIN_WINDOW_CONFIG).toHaveProperty('webPreferences');

            // Verify dimensions
            expect(MAIN_WINDOW_CONFIG.width).toBe(1200);
            expect(MAIN_WINDOW_CONFIG.height).toBe(800);
            expect(MAIN_WINDOW_CONFIG.minWidth).toBe(350);
            expect(MAIN_WINDOW_CONFIG.minHeight).toBe(600);
        });
    });
});
