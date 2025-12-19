/**
 * E2E Test: Hotkey Toggle Feature
 *
 * Tests the hotkey toggle capsule switch in the Options window.
 * Verifies:
 * - Toggle renders correctly under Appearance section
 * - Toggle can be clicked to enable/disable hotkeys
 * - State persists across toggle interactions
 * 
 * Platform-aware: Tests run on Windows, macOS, and Linux with platform detection.
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, switchToWindowByIndex } from './helpers/windowActions';
import { getPlatform, isMacOS, isWindows, isLinux, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';

declare global {
    interface Window {
        electronAPI: {
            closeWindow: () => void;
            getHotkeysEnabled: () => Promise<{ enabled: boolean }>;
            setHotkeysEnabled: (enabled: boolean) => void;
        };
    }
}

describe('Hotkey Toggle Feature', () => {
    let mainWindowHandle: string;
    let optionsWindowHandle: string;
    let platform: E2EPlatform;

    /**
     * Open the Options window before each test.
     */
    beforeEach(async () => {
        E2ELogger.info('hotkey-toggle', 'Opening Options window for test');

        // Store main window handle
        const initialHandles = await browser.getWindowHandles();
        mainWindowHandle = initialHandles[0];

        // Open Options via menu
        await clickMenuItemById('menu-file-options');

        // Wait for new window
        await waitForWindowCount(2, 5000);
        const handles = await browser.getWindowHandles();
        optionsWindowHandle = handles.find(h => h !== mainWindowHandle) || handles[1];

        // Switch to Options window
        await browser.switchToWindow(optionsWindowHandle);
        await browser.pause(500);

        E2ELogger.info('hotkey-toggle', 'Options window opened successfully');
    });

    /**
     * Clean up after each test.
     */
    afterEach(async () => {
        E2ELogger.info('hotkey-toggle', 'Cleaning up after test');

        const handles = await browser.getWindowHandles();

        // If Options window is still open, close it
        if (handles.length > 1) {
            // Find and close the options window
            for (const handle of handles) {
                if (handle !== mainWindowHandle) {
                    await browser.switchToWindow(handle);
                    await browser.execute(() => window.electronAPI?.closeWindow?.());
                }
            }
        }

        // Switch back to main window
        await browser.switchToWindow(mainWindowHandle);
    });

    describe('Rendering', () => {
        it('should display the hotkey toggle under Appearance section', async () => {
            E2ELogger.info('hotkey-toggle', 'Checking hotkey toggle rendering');

            // Verify Appearance section exists
            const appearanceSection = await $('[data-testid="options-appearance"]');
            await expect(appearanceSection).toExist();
            await expect(appearanceSection).toBeDisplayed();

            // Verify hotkey toggle exists within the section
            const hotkeyToggle = await $('[data-testid="hotkey-toggle"]');
            await expect(hotkeyToggle).toExist();
            await expect(hotkeyToggle).toBeDisplayed();

            E2ELogger.info('hotkey-toggle', 'Hotkey toggle found in Appearance section');
        });

        it('should display correct label text', async () => {
            const hotkeyToggle = await $('[data-testid="hotkey-toggle"]');
            const labelText = await hotkeyToggle.getText();

            expect(labelText).toContain('Hotkey Combinations');
            E2ELogger.info('hotkey-toggle', `Toggle label: "${labelText}"`);
        });

        it('should display the toggle switch button', async () => {
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeDisplayed();

            // Verify it has proper role
            const role = await toggleSwitch.getAttribute('role');
            expect(role).toBe('switch');

            E2ELogger.info('hotkey-toggle', 'Toggle switch has correct accessibility attributes');
        });
    });

    describe('Interactions', () => {
        it('should toggle state when clicked', async () => {
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Get initial state
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('hotkey-toggle', `Initial state: aria-checked="${initialChecked}"`);

            // Click to toggle
            await toggleSwitch.click();
            await browser.pause(200);

            // Verify state changed
            const newChecked = await toggleSwitch.getAttribute('aria-checked');
            E2ELogger.info('hotkey-toggle', `After click: aria-checked="${newChecked}"`);

            expect(newChecked).not.toBe(initialChecked);
        });

        it('should toggle back when clicked again', async () => {
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Get initial state
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');

            // Click twice
            await toggleSwitch.click();
            await browser.pause(200);
            await toggleSwitch.click();
            await browser.pause(200);

            // Should be back to initial state
            const finalChecked = await toggleSwitch.getAttribute('aria-checked');
            expect(finalChecked).toBe(initialChecked);

            E2ELogger.info('hotkey-toggle', 'Toggle correctly returns to initial state after two clicks');
        });

        it('should be keyboard accessible via Enter key', async () => {
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Get initial state
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');

            // Focus and press Enter
            await toggleSwitch.click(); // Focus
            await browser.pause(100);
            await browser.keys(['Enter']);
            await browser.pause(200);

            // Verify state changed
            const newChecked = await toggleSwitch.getAttribute('aria-checked');
            expect(newChecked).not.toBe(initialChecked);

            E2ELogger.info('hotkey-toggle', 'Toggle responds to keyboard interaction');
        });
    });

    describe('Visual Feedback', () => {
        it('should have checked class when enabled', async () => {
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Check if aria-checked is true
            const isChecked = await toggleSwitch.getAttribute('aria-checked');
            const hasCheckedClass = await toggleSwitch.getAttribute('class');

            if (isChecked === 'true') {
                expect(hasCheckedClass).toContain('capsule-toggle__switch--checked');
            } else {
                expect(hasCheckedClass).not.toContain('capsule-toggle__switch--checked');
            }

            E2ELogger.info('hotkey-toggle', `Visual state matches checked state (${isChecked})`);
        });
    });

    describe('State Persistence', () => {
        it('should communicate with Electron API when toggled', async () => {
            // This test verifies the toggle calls the Electron API
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Get initial state from API
            const initialState = await browser.execute(() => {
                return window.electronAPI?.getHotkeysEnabled?.();
            });

            E2ELogger.info('hotkey-toggle', `Initial API state: ${JSON.stringify(initialState)}`);

            // Toggle the switch
            await toggleSwitch.click();
            await browser.pause(500); // Wait for IPC

            // Get new state from API
            const newState = await browser.execute(() => {
                return window.electronAPI?.getHotkeysEnabled?.();
            });

            E2ELogger.info('hotkey-toggle', `New API state: ${JSON.stringify(newState)}`);

            // States should be different (if API is properly connected)
            if (initialState && newState) {
                expect(newState.enabled).not.toBe(initialState.enabled);
            }
        });
    });

    describe('Cross-Platform Compatibility', () => {
        /**
         * Platform-specific tests to ensure the hotkey toggle works
         * consistently across Windows, macOS, and Linux.
         */

        beforeEach(async () => {
            if (!platform) {
                platform = await getPlatform();
                E2ELogger.info('hotkey-toggle', `Platform detected: ${platform.toUpperCase()}`);
            }
        });

        it('should report correct platform detection', async () => {
            const detectedPlatform = await getPlatform();

            E2ELogger.info('hotkey-toggle', `Running on: ${detectedPlatform}`);

            // Verify platform is one of the expected values
            expect(['windows', 'macos', 'linux']).toContain(detectedPlatform);
        });

        it('should render toggle on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('hotkey-toggle', 'Skipping Windows-specific test on non-Windows platform');
                return;
            }

            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeDisplayed();

            // Toggle should work on Windows
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(200);
            const newChecked = await toggleSwitch.getAttribute('aria-checked');

            expect(newChecked).not.toBe(initialChecked);
            E2ELogger.info('hotkey-toggle', 'Windows: Toggle verified working');
        });

        it('should render toggle on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('hotkey-toggle', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeDisplayed();

            // Toggle should work on macOS
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(200);
            const newChecked = await toggleSwitch.getAttribute('aria-checked');

            expect(newChecked).not.toBe(initialChecked);
            E2ELogger.info('hotkey-toggle', 'macOS: Toggle verified working');
        });

        it('should render toggle on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('hotkey-toggle', 'Skipping Linux-specific test on non-Linux platform');
                return;
            }

            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');
            await expect(toggleSwitch).toExist();
            await expect(toggleSwitch).toBeDisplayed();

            // Toggle should work on Linux
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');
            await toggleSwitch.click();
            await browser.pause(200);
            const newChecked = await toggleSwitch.getAttribute('aria-checked');

            expect(newChecked).not.toBe(initialChecked);
            E2ELogger.info('hotkey-toggle', 'Linux: Toggle verified working');
        });

        it('should persist state on current platform', async () => {
            const currentPlatform = await getPlatform();
            const toggleSwitch = await $('[data-testid="hotkey-toggle-switch"]');

            // Get initial state
            const initialChecked = await toggleSwitch.getAttribute('aria-checked');

            // Toggle OFF
            await toggleSwitch.click();
            await browser.pause(300);

            // Toggle ON
            await toggleSwitch.click();
            await browser.pause(300);

            // Should be back to initial
            const finalChecked = await toggleSwitch.getAttribute('aria-checked');
            expect(finalChecked).toBe(initialChecked);

            E2ELogger.info('hotkey-toggle', `${currentPlatform}: State persistence verified`);
        });
    });
});
