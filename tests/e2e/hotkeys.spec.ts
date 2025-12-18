/**
 * E2E Tests for Global Hotkey Functionality.
 * 
 * Tests the global keyboard shortcut registration and behavior
 * across Windows, macOS, and Linux platforms.
 * 
 * @module hotkeys.spec
 */

import { browser, expect } from '@wdio/globals';
import { getPlatform, E2EPlatform } from './helpers/platform';
import {
    REGISTERED_HOTKEYS,
    isHotkeyRegistered,
    getHotkeyDisplayString,
    verifyHotkeyRegistration,
    getRegisteredHotkeys,
} from './helpers/hotkeyHelpers';

describe('Global Hotkeys', () => {
    let platform: E2EPlatform;

    beforeEach(async () => {
        // Detect platform for each test
        if (!platform) {
            platform = await getPlatform();
            console.log(`\n========================================`);
            console.log(`Platform detected: ${platform.toUpperCase()}`);
            console.log(`========================================\n`);
        }
    });

    describe('Hotkey Registration', () => {
        it('should have the minimize window hotkey registered', async () => {
            // Ensure app is loaded
            const title = await browser.getTitle();
            expect(title).not.toBe('');

            // Verify the hotkey is registered
            const isRegistered = await verifyHotkeyRegistration(platform, 'MINIMIZE_WINDOW');
            expect(isRegistered).toBe(true);
        });

        it('should use the correct accelerator format (CommandOrControl+Alt+E)', async () => {
            const expectedAccelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
            const isRegistered = await isHotkeyRegistered(expectedAccelerator);

            console.log(`Checking accelerator: ${expectedAccelerator}`);
            expect(isRegistered).toBe(true);
        });

        it('should display the correct platform-specific hotkey string', async () => {
            const displayString = getHotkeyDisplayString(platform, 'MINIMIZE_WINDOW');

            // Verify platform-specific display format
            if (platform === 'macos') {
                expect(displayString).toBe('Cmd+Alt+E');
            } else {
                // Windows and Linux use Ctrl
                expect(displayString).toBe('Ctrl+Alt+E');
            }

            console.log(`Platform: ${platform}, Display String: ${displayString}`);
        });
    });

    describe('Window State Before Hotkey', () => {
        it('should have window in non-minimized state initially', async () => {
            const isMinimized = await browser.electron.execute(
                (electron: typeof import('electron')) => {
                    const win = electron.BrowserWindow.getAllWindows()[0];
                    return win ? win.isMinimized() : false;
                }
            );

            expect(isMinimized).toBe(false);
            console.log(`Window minimized state: ${isMinimized}`);
        });
    });

    describe('All Registered Hotkeys', () => {
        it('should have all expected hotkeys registered', async () => {
            const registeredHotkeys = await getRegisteredHotkeys();

            console.log(`\nRegistered hotkeys on ${platform}:`);
            registeredHotkeys.forEach((hotkey) => {
                console.log(`  - ${hotkey}`);
            });

            // Verify at least the minimize hotkey is registered
            expect(registeredHotkeys).toContain(REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator);
        });
    });

    describe('Platform-Specific Behavior', () => {
        it('should work correctly on current platform', async () => {
            // Log platform info for CI visibility
            const electronPlatform = await browser.electron.execute(
                (electron: typeof import('electron')) => process.platform
            );

            console.log(`\nPlatform Information:`);
            console.log(`  Node process.platform: ${process.platform}`);
            console.log(`  Electron process.platform: ${electronPlatform}`);
            console.log(`  Detected E2E platform: ${platform}`);

            // Verify hotkey is registered regardless of platform
            const isRegistered = await isHotkeyRegistered(
                REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator
            );
            expect(isRegistered).toBe(true);
        });
    });
});

/**
 * Note on E2E Hotkey Testing Limitations:
 * 
 * Simulating global shortcuts via WebDriver's browser.keys() is not reliable
 * because WebDriver sends synthetic events to the web content, not the OS.
 * Global shortcuts are handled at the OS level by Electron's globalShortcut API.
 * 
 * Therefore, we verify:
 * 1. The shortcut IS registered via globalShortcut.isRegistered()
 * 2. Unit tests cover the callback logic (minimizeMainWindow is called)
 * 3. The window starts in a non-minimized state
 * 
 * This approach provides confidence that:
 * - The HotkeyManager is properly initialized on all platforms
 * - The shortcuts are correctly registered with Electron
 * - The cross-platform accelerator (CommandOrControl) works on all OSes
 */
