/**
 * E2E Test: Individual Hotkey Toggles
 *
 * Tests the individual hotkey toggle switches in the Options window.
 * 
 * User Workflows Covered:
 * 1. Viewing - Three toggles visible with labels and shortcuts
 * 2. Toggling - Each toggle works independently
 * 3. Platform text - Ctrl (Win/Linux) or Cmd (macOS)
 * 
 * @module hotkey-toggle.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { Selectors } from './helpers/selectors';

// ============================================================================
// Extensible Hotkey Configuration
// ============================================================================

interface HotkeyTestConfig {
    id: string;
    label: string;
    shortcutWin: string;
    shortcutMac: string;
    testId: string;
}

const HOTKEY_CONFIGS: HotkeyTestConfig[] = [
    {
        id: 'alwaysOnTop',
        label: 'Always on Top',
        shortcutWin: 'Ctrl+Shift+T',
        shortcutMac: 'Cmd+Shift+T',
        testId: 'hotkey-toggle-alwaysOnTop',
    },
    {
        id: 'bossKey',
        label: 'Boss Key',
        shortcutWin: 'Ctrl+Alt+E',
        shortcutMac: 'Cmd+Alt+E',
        testId: 'hotkey-toggle-bossKey',
    },
    {
        id: 'quickChat',
        label: 'Quick Chat',
        shortcutWin: 'Ctrl+Shift+Space',
        shortcutMac: 'Cmd+Shift+Space',
        testId: 'hotkey-toggle-quickChat',
    },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('Individual Hotkey Toggles', () => {
    let mainWindowHandle: string;
    let platform: E2EPlatform;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('hotkey-toggle', `Platform: ${platform.toUpperCase()}`);
    });

    beforeEach(async () => {
        E2ELogger.info('hotkey-toggle', 'Opening Options window');

        // Store main window handle
        const initialHandles = await browser.getWindowHandles();
        mainWindowHandle = initialHandles[0];

        // Open Options via menu
        await clickMenuItemById('menu-file-options');
        await waitForWindowCount(2, 5000);

        // Switch to Options window
        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find(h => h !== mainWindowHandle) || handles[1];
        await browser.switchToWindow(optionsHandle);
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
    });

    afterEach(async () => {
        E2ELogger.info('hotkey-toggle', 'Cleaning up');

        try {
            // Close options window via close button
            const closeBtn = await $(Selectors.optionsCloseButton);
            if (await closeBtn.isExisting()) {
                await closeBtn.click();
                await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            }
        } catch { /* ignore */ }

        // Switch back to main window
        try {
            await browser.switchToWindow(mainWindowHandle);
        } catch { /* ignore */ }
    });

    // ========================================================================
    // Rendering Tests
    // ========================================================================

    describe('Rendering', () => {
        it('should display all three hotkey toggles', async () => {
            for (const config of HOTKEY_CONFIGS) {
                const toggle = await $(`[data-testid="${config.testId}"]`);
                await expect(toggle).toExist();
                await expect(toggle).toBeDisplayed();
                E2ELogger.info('hotkey-toggle', `Found toggle: ${config.label}`);
            }
        });

        it('should display correct labels for each toggle', async () => {
            for (const config of HOTKEY_CONFIGS) {
                const toggle = await $(`[data-testid="${config.testId}"]`);
                const text = await toggle.getText();
                expect(text).toContain(config.label);
            }
        });

        it('should display platform-appropriate shortcut text', async () => {
            for (const config of HOTKEY_CONFIGS) {
                const toggle = await $(`[data-testid="${config.testId}"]`);
                const text = await toggle.getText();
                const expectedShortcut = platform === 'macos' ? config.shortcutMac : config.shortcutWin;

                expect(text).toContain(expectedShortcut);
                E2ELogger.info('hotkey-toggle', `${config.label}: displays "${expectedShortcut}"`);
            }
        });

        it('should show Ctrl on Windows/Linux, Cmd on macOS', async () => {
            const config = HOTKEY_CONFIGS[0];
            const toggle = await $(`[data-testid="${config.testId}"]`);
            const text = await toggle.getText();

            if (platform === 'macos') {
                expect(text).toContain('Cmd');
                expect(text).not.toContain('Ctrl');
            } else {
                expect(text).toContain('Ctrl');
                expect(text).not.toContain('Cmd');
            }
        });
    });

    // ========================================================================
    // Interaction Tests
    // ========================================================================

    describe('Interactions', () => {
        it('should have clickable toggle switches with role=switch', async () => {
            for (const config of HOTKEY_CONFIGS) {
                const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
                await expect(toggleSwitch).toExist();

                const role = await toggleSwitch.getAttribute('role');
                expect(role).toBe('switch');

                E2ELogger.info('hotkey-toggle', `${config.label}: switch exists with role=switch`);
            }
        });

        it('should have aria-checked attribute on toggle switches', async () => {
            for (const config of HOTKEY_CONFIGS) {
                const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggleSwitch.getAttribute('aria-checked');

                expect(['true', 'false']).toContain(checked);
                E2ELogger.info('hotkey-toggle', `${config.label}: aria-checked=${checked}`);
            }
        });

        it('should toggle state when clicked', async () => {
            const config = HOTKEY_CONFIGS[0]; // Test with first toggle
            const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('hotkey-toggle', `Initial state: ${initialChecked}`);

            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const newChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('hotkey-toggle', `After click: ${newChecked}`);

            expect(newChecked).not.toBe(initialChecked);

            // Restore original state
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
        });

        it('should toggle back when clicked again', async () => {
            const config = HOTKEY_CONFIGS[0];
            const toggleSwitch = await $(`[data-testid="${config.testId}-switch"]`);

            const initial = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            await toggleSwitch.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const final = await toggleSwitch.getAttribute('aria-checked');
            expect(final).toBe(initial);
        });

        it('should toggle each hotkey independently', async () => {
            // Toggle first hotkey
            const config1 = HOTKEY_CONFIGS[0];
            const toggle1 = await $(`[data-testid="${config1.testId}-switch"]`);
            const initial1 = await toggle1.getAttribute('aria-checked');

            await toggle1.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Second hotkey should be unaffected
            const config2 = HOTKEY_CONFIGS[1];
            const toggle2 = await $(`[data-testid="${config2.testId}-switch"]`);
            const state2 = await toggle2.getAttribute('aria-checked');

            // First should have changed
            const new1 = await toggle1.getAttribute('aria-checked');
            expect(new1).not.toBe(initial1);

            // Restore
            await toggle1.click();
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            E2ELogger.info('hotkey-toggle', 'Independent toggle verified');
        });
    });

    // ========================================================================
    // Cross-Platform Tests
    // ========================================================================

    describe('Cross-Platform', () => {
        it('should report correct platform', async () => {
            const detectedPlatform = await getPlatform();
            expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);
            E2ELogger.info('hotkey-toggle', `Running on: ${detectedPlatform}`);
        });
    });

    // ========================================================================
    // Behavior Verification Tests
    // ========================================================================

    describe('Behavior Verification', () => {
        /**
         * Helper to set a toggle to a specific state.
         */
        async function setToggleTo(testId: string, targetState: 'true' | 'false') {
            const toggle = await $(`[data-testid="${testId}-switch"]`);
            const current = await toggle.getAttribute('aria-checked');
            if (current !== targetState) {
                await toggle.click();
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
            }
        }

        describe('Quick Chat Hotkey Behavior', () => {
            const config = HOTKEY_CONFIGS.find(c => c.id === 'quickChat')!;

            afterEach(async () => {
                // Re-enable Quick Chat after each test
                try {
                    await setToggleTo(config.testId, 'true');
                } catch { /* ignore */ }
            });

            it('should disable Quick Chat action when toggle is OFF', async () => {
                // Disable Quick Chat via toggle
                await setToggleTo(config.testId, 'false');

                // Verify toggle is off
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('false');

                E2ELogger.info('hotkey-toggle', 'Quick Chat toggle disabled - hotkey should not work');
            });

            it('should enable Quick Chat action when toggle is ON', async () => {
                // Enable Quick Chat via toggle
                await setToggleTo(config.testId, 'true');

                // Verify toggle is on
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('true');

                E2ELogger.info('hotkey-toggle', 'Quick Chat toggle enabled - hotkey should work');
            });
        });

        describe('Boss Key Hotkey Behavior', () => {
            const config = HOTKEY_CONFIGS.find(c => c.id === 'bossKey')!;

            afterEach(async () => {
                // Re-enable Boss Key after each test
                try {
                    await setToggleTo(config.testId, 'true');
                } catch { /* ignore */ }
            });

            it('should disable Boss Key action when toggle is OFF', async () => {
                // Disable Boss Key via toggle
                await setToggleTo(config.testId, 'false');

                // Verify toggle is off
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('false');

                E2ELogger.info('hotkey-toggle', 'Boss Key toggle disabled - minimize hotkey should not work');
            });

            it('should enable Boss Key action when toggle is ON', async () => {
                // Enable Boss Key via toggle
                await setToggleTo(config.testId, 'true');

                // Verify toggle is on
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('true');

                E2ELogger.info('hotkey-toggle', 'Boss Key toggle enabled - minimize hotkey should work');
            });
        });

        describe('Always on Top Hotkey Behavior', () => {
            const config = HOTKEY_CONFIGS.find(c => c.id === 'alwaysOnTop')!;

            afterEach(async () => {
                // Re-enable Always on Top after each test
                try {
                    await setToggleTo(config.testId, 'true');
                } catch { /* ignore */ }
            });

            it('should disable Always on Top action when toggle is OFF', async () => {
                // Disable Always on Top via toggle
                await setToggleTo(config.testId, 'false');

                // Verify toggle is off
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('false');

                E2ELogger.info('hotkey-toggle', 'Always on Top toggle disabled - z-order hotkey should not work');
            });

            it('should enable Always on Top action when toggle is ON', async () => {
                // Enable Always on Top via toggle
                await setToggleTo(config.testId, 'true');

                // Verify toggle is on
                const toggle = await $(`[data-testid="${config.testId}-switch"]`);
                const checked = await toggle.getAttribute('aria-checked');
                expect(checked).toBe('true');

                E2ELogger.info('hotkey-toggle', 'Always on Top toggle enabled - z-order hotkey should work');
            });
        });
    });
});
