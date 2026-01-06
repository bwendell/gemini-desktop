/**
 * Unit tests for HotkeyManager.
 *
 * This test suite validates the HotkeyManager class which handles global keyboard
 * shortcut registration and management in the Electron main process.
 *
 * @module HotkeyManager.test
 * @see HotkeyManager - The class being tested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createMockWindowManager } from '../../helpers/mocks';
import {
    DEFAULT_ACCELERATORS,
    GLOBAL_HOTKEY_IDS,
    APPLICATION_HOTKEY_IDS,
    getHotkeyScope,
    isGlobalHotkey,
    isApplicationHotkey,
} from '../../../src/shared/types/hotkeys';

// ============================================================================
// Mocks
// ============================================================================

/**
 * Mock for Electron's globalShortcut API.
 * Hoisted to ensure mocks are available before imports.
 */
const mockGlobalShortcut = vi.hoisted(() => ({
    register: vi.fn(),
    unregister: vi.fn(),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn().mockReturnValue(false),
}));

// Mock Electron module
vi.mock('electron', () => ({
    globalShortcut: mockGlobalShortcut,
}));

/**
 * Mock for the logger utility - uses __mocks__ directory
 */
vi.mock('../../../src/main/utils/logger');

/**
 * Mock for constants module.
 * Ensures isLinux returns false during tests so hotkey registration tests work on all platforms.
 */
vi.mock('../../../src/main/utils/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/main/utils/constants')>();
    return {
        ...actual,
        isLinux: false,
    };
});

// Import after mocks are set up
import HotkeyManager from '../../../src/main/managers/hotkeyManager';

// ============================================================================
// Test Suite
// ============================================================================

describe('HotkeyManager', () => {
    /** Instance of HotkeyManager under test */
    let hotkeyManager: HotkeyManager;

    /** Mock WindowManager for verifying shortcut actions */
    let mockWindowManager: any;

    /**
     * Set up fresh mocks and instance before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock WindowManager using shared factory
        mockWindowManager = createMockWindowManager();

        hotkeyManager = new HotkeyManager(mockWindowManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ========================================================================
    // Constructor Tests
    // ========================================================================

    describe('constructor', () => {
        it('should create a HotkeyManager instance', () => {
            expect(hotkeyManager).toBeDefined();
        });

        it('should initialize shortcut actions with correct IDs', () => {
            const shortcutActions = (hotkeyManager as unknown as { shortcutActions: { id: string }[] }).shortcutActions;
            expect(shortcutActions).toHaveLength(4);
            expect(shortcutActions.map((s) => s.id)).toEqual(['bossKey', 'quickChat', 'alwaysOnTop', 'printToPdf']);
        });

        it('should accept initial settings (old style)', () => {
            const customManager = new HotkeyManager(mockWindowManager, {
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
            });

            expect(customManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });
        });

        it('should accept initial settings (new style with accelerators)', () => {
            const customManager = new HotkeyManager(mockWindowManager, {
                enabled: {
                    alwaysOnTop: false,
                    bossKey: true,
                    quickChat: false,
                },
                accelerators: {
                    bossKey: 'CommandOrControl+Alt+H',
                },
            });

            expect(customManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });
            expect(customManager.getAccelerator('bossKey')).toBe('CommandOrControl+Alt+H');
            // Others should have defaults
            expect(customManager.getAccelerator('alwaysOnTop')).toBe(DEFAULT_ACCELERATORS.alwaysOnTop);
            expect(customManager.getAccelerator('quickChat')).toBe(DEFAULT_ACCELERATORS.quickChat);
        });
    });

    // ========================================================================
    // Hotkey Scope Helper Tests
    // ========================================================================

    describe('hotkey scope helpers', () => {
        describe('getHotkeyScope', () => {
            it('should return "global" for quickChat', () => {
                expect(getHotkeyScope('quickChat')).toBe('global');
            });

            it('should return "global" for bossKey', () => {
                expect(getHotkeyScope('bossKey')).toBe('global');
            });

            it('should return "application" for alwaysOnTop', () => {
                expect(getHotkeyScope('alwaysOnTop')).toBe('application');
            });

            it('should return "application" for printToPdf', () => {
                expect(getHotkeyScope('printToPdf')).toBe('application');
            });
        });

        describe('isGlobalHotkey', () => {
            it('should return true for quickChat', () => {
                expect(isGlobalHotkey('quickChat')).toBe(true);
            });

            it('should return true for bossKey', () => {
                expect(isGlobalHotkey('bossKey')).toBe(true);
            });

            it('should return false for alwaysOnTop', () => {
                expect(isGlobalHotkey('alwaysOnTop')).toBe(false);
            });

            it('should return false for printToPdf', () => {
                expect(isGlobalHotkey('printToPdf')).toBe(false);
            });
        });

        describe('isApplicationHotkey', () => {
            it('should return false for quickChat', () => {
                expect(isApplicationHotkey('quickChat')).toBe(false);
            });

            it('should return false for bossKey', () => {
                expect(isApplicationHotkey('bossKey')).toBe(false);
            });

            it('should return true for alwaysOnTop', () => {
                expect(isApplicationHotkey('alwaysOnTop')).toBe(true);
            });

            it('should return true for printToPdf', () => {
                expect(isApplicationHotkey('printToPdf')).toBe(true);
            });
        });

        describe('GLOBAL_HOTKEY_IDS and APPLICATION_HOTKEY_IDS', () => {
            it('should have correct global hotkey IDs', () => {
                expect(GLOBAL_HOTKEY_IDS).toEqual(['quickChat', 'bossKey']);
            });

            it('should have correct application hotkey IDs', () => {
                expect(APPLICATION_HOTKEY_IDS).toEqual(['alwaysOnTop', 'printToPdf']);
            });

            it('should not have overlapping IDs', () => {
                const overlap = GLOBAL_HOTKEY_IDS.filter((id) => APPLICATION_HOTKEY_IDS.includes(id));
                expect(overlap).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // Individual Settings Tests
    // ========================================================================

    describe('getIndividualSettings', () => {
        it('should return default settings (all enabled)', () => {
            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });
        });
    });

    // ========================================================================
    // Accelerator Tests
    // ========================================================================

    describe('getAccelerators', () => {
        it('should return default accelerators', () => {
            expect(hotkeyManager.getAccelerators()).toEqual({
                alwaysOnTop: DEFAULT_ACCELERATORS.alwaysOnTop,
                bossKey: DEFAULT_ACCELERATORS.bossKey,
                quickChat: DEFAULT_ACCELERATORS.quickChat,
                printToPdf: DEFAULT_ACCELERATORS.printToPdf,
            });
        });
    });

    describe('getAccelerator', () => {
        it('should return accelerator for specific hotkey', () => {
            expect(hotkeyManager.getAccelerator('alwaysOnTop')).toBe(DEFAULT_ACCELERATORS.alwaysOnTop);
            expect(hotkeyManager.getAccelerator('bossKey')).toBe(DEFAULT_ACCELERATORS.bossKey);
            expect(hotkeyManager.getAccelerator('quickChat')).toBe(DEFAULT_ACCELERATORS.quickChat);
            expect(hotkeyManager.getAccelerator('printToPdf')).toBe(DEFAULT_ACCELERATORS.printToPdf);
        });
    });

    describe('getFullSettings', () => {
        it('should return combined enabled states and accelerators', () => {
            expect(hotkeyManager.getFullSettings()).toEqual({
                alwaysOnTop: {
                    enabled: true,
                    accelerator: DEFAULT_ACCELERATORS.alwaysOnTop,
                },
                bossKey: {
                    enabled: true,
                    accelerator: DEFAULT_ACCELERATORS.bossKey,
                },
                quickChat: {
                    enabled: true,
                    accelerator: DEFAULT_ACCELERATORS.quickChat,
                },
                printToPdf: {
                    enabled: true,
                    accelerator: DEFAULT_ACCELERATORS.printToPdf,
                },
            });
        });

        it('should reflect changes to enabled states', () => {
            hotkeyManager.setIndividualEnabled('bossKey', false);
            const settings = hotkeyManager.getFullSettings();
            expect(settings.bossKey.enabled).toBe(false);
            expect(settings.bossKey.accelerator).toBe(DEFAULT_ACCELERATORS.bossKey);
        });

        it('should reflect changes to accelerators', () => {
            hotkeyManager.setAccelerator('quickChat', 'CommandOrControl+Alt+Q');
            const settings = hotkeyManager.getFullSettings();
            expect(settings.quickChat.accelerator).toBe('CommandOrControl+Alt+Q');
            expect(settings.quickChat.enabled).toBe(true);
        });
    });

    describe('setAccelerator', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should update the accelerator for a hotkey', () => {
            hotkeyManager.setAccelerator('bossKey', 'CommandOrControl+Alt+H');
            expect(hotkeyManager.getAccelerator('bossKey')).toBe('CommandOrControl+Alt+H');
        });

        it('should re-register with new accelerator if hotkey was registered', () => {
            // Register all shortcuts
            hotkeyManager.registerShortcuts();
            vi.clearAllMocks();

            // Change accelerator for enabled hotkey (use a value that's not the default)
            hotkeyManager.setAccelerator('bossKey', 'CommandOrControl+Alt+B');

            // Should unregister old accelerator
            expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith(DEFAULT_ACCELERATORS.bossKey);
            // Should register new accelerator
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Alt+B', expect.any(Function));
        });

        it('should not re-register if hotkey was not registered', () => {
            // Don't register shortcuts first
            hotkeyManager.setAccelerator('bossKey', 'CommandOrControl+Alt+H');

            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should be idempotent for same accelerator', () => {
            hotkeyManager.registerShortcuts();
            vi.clearAllMocks();

            // Set to same value
            hotkeyManager.setAccelerator('bossKey', DEFAULT_ACCELERATORS.bossKey);

            // Should not trigger any registration changes
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });
    });

    describe('updateAllAccelerators', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should update all accelerators at once', () => {
            hotkeyManager.updateAllAccelerators({
                alwaysOnTop: 'CommandOrControl+Shift+A',
                bossKey: 'CommandOrControl+Alt+B',
                quickChat: 'CommandOrControl+Shift+Q',
                printToPdf: DEFAULT_ACCELERATORS.printToPdf,
            });

            expect(hotkeyManager.getAccelerators()).toEqual({
                alwaysOnTop: 'CommandOrControl+Shift+A',
                bossKey: 'CommandOrControl+Alt+B',
                quickChat: 'CommandOrControl+Shift+Q',
                printToPdf: DEFAULT_ACCELERATORS.printToPdf,
            });
        });
    });

    describe('isIndividualEnabled', () => {
        it('should return true for enabled hotkeys', () => {
            expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(true);
            expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(true);
            expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(true);
        });

        it('should return false for disabled hotkeys', () => {
            hotkeyManager.setIndividualEnabled('quickChat', false);
            expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);
        });
    });

    describe('setIndividualEnabled', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should register a hotkey when enabling it', () => {
            // First disable it
            hotkeyManager.setIndividualEnabled('quickChat', false);
            mockGlobalShortcut.register.mockClear();

            // Then enable it
            hotkeyManager.setIndividualEnabled('quickChat', true);

            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.quickChat,
                expect.any(Function)
            );
        });

        it('should unregister a hotkey when disabling it', () => {
            // First register all
            hotkeyManager.registerShortcuts();

            // Now disable one
            hotkeyManager.setIndividualEnabled('bossKey', false);

            expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith(DEFAULT_ACCELERATORS.bossKey);
        });

        it('should not call unregister if hotkey was never registered', () => {
            hotkeyManager.setIndividualEnabled('bossKey', false);
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
        });

        it('should be idempotent (no-op if already in desired state)', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', true); // Already true
            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should update individual settings', () => {
            hotkeyManager.setIndividualEnabled('quickChat', false);
            expect(hotkeyManager.getIndividualSettings().quickChat).toBe(false);
        });
    });

    describe('updateAllSettings', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should update all settings at once', () => {
            hotkeyManager.updateAllSettings({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false,
                printToPdf: true,
            });
        });
    });

    // ========================================================================
    // registerShortcuts Tests
    // ========================================================================

    describe('registerShortcuts', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should register only global shortcuts (quickChat, bossKey)', () => {
            hotkeyManager.registerShortcuts();

            // Only 2 global hotkeys should be registered via globalShortcut
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.bossKey,
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.quickChat,
                expect.any(Function)
            );
            // Application hotkeys should NOT be registered via globalShortcut
            expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.alwaysOnTop,
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.printToPdf,
                expect.any(Function)
            );
        });

        it('should not register disabled global shortcuts', () => {
            hotkeyManager.setIndividualEnabled('quickChat', false);
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            // Only bossKey should be registered (quickChat disabled)
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(1);
            expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.quickChat,
                expect.any(Function)
            );
        });

        it('should handle registration failure gracefully', () => {
            mockGlobalShortcut.register.mockReturnValue(false);

            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
            // Should still attempt to register global hotkeys
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(GLOBAL_HOTKEY_IDS.length);
        });

        it('should not register already registered shortcuts', () => {
            hotkeyManager.registerShortcuts();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should call minimizeMainWindow when boss key is triggered', () => {
            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === DEFAULT_ACCELERATORS.bossKey) {
                    callback();
                }
                return true;
            });

            hotkeyManager.registerShortcuts();

            expect(mockWindowManager.minimizeMainWindow).toHaveBeenCalledTimes(1);
        });

        it('should call toggleQuickChat when quick chat hotkey is triggered', () => {
            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === DEFAULT_ACCELERATORS.quickChat) {
                    callback();
                }
                return true;
            });

            hotkeyManager.registerShortcuts();

            expect(mockWindowManager.toggleQuickChat).toHaveBeenCalledTimes(1);
        });
    });

    // ========================================================================
    // unregisterAll Tests
    // ========================================================================

    describe('unregisterAll', () => {
        it('should unregister all shortcuts', () => {
            mockGlobalShortcut.register.mockReturnValue(true);
            hotkeyManager.registerShortcuts();

            hotkeyManager.unregisterAll();

            expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(1);
        });

        it('should reset registered state allowing re-registration', () => {
            mockGlobalShortcut.register.mockReturnValue(true);
            hotkeyManager.registerShortcuts();
            hotkeyManager.unregisterAll();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            // Should re-register only global hotkeys (2)
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(GLOBAL_HOTKEY_IDS.length);
        });
    });

    // ========================================================================
    // Scope Separation Tests
    // ========================================================================

    describe('scope separation', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should emit event when application hotkey enabled state changes', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);

            expect(mockWindowManager.emit).toHaveBeenCalledWith('hotkey-enabled-changed', 'alwaysOnTop', false);
        });

        it('should emit event when application hotkey accelerator changes', () => {
            hotkeyManager.setAccelerator('printToPdf', 'CommandOrControl+P');

            expect(mockWindowManager.emit).toHaveBeenCalledWith(
                'accelerator-changed',
                'printToPdf',
                'CommandOrControl+P'
            );
        });

        it('should NOT call globalShortcut for application hotkeys', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);
            hotkeyManager.setIndividualEnabled('printToPdf', false);
            hotkeyManager.setIndividualEnabled('alwaysOnTop', true);

            // Should not register/unregister application hotkeys via globalShortcut
            expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.alwaysOnTop,
                expect.any(Function)
            );
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalledWith(DEFAULT_ACCELERATORS.alwaysOnTop);
        });

        it('should still use globalShortcut for global hotkeys', () => {
            hotkeyManager.setIndividualEnabled('quickChat', false);
            hotkeyManager.registerShortcuts();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.setIndividualEnabled('quickChat', true);

            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                DEFAULT_ACCELERATORS.quickChat,
                expect.any(Function)
            );
        });

        it('getGlobalHotkeyActions should return only global hotkeys', () => {
            const globalActions = hotkeyManager.getGlobalHotkeyActions();

            expect(globalActions).toHaveLength(2);
            expect(globalActions.map((a) => a.id)).toEqual(['bossKey', 'quickChat']);
        });

        it('getApplicationHotkeyActions should return only application hotkeys', () => {
            const appActions = hotkeyManager.getApplicationHotkeyActions();

            expect(appActions).toHaveLength(2);
            expect(appActions.map((a) => a.id)).toEqual(['alwaysOnTop', 'printToPdf']);
        });
    });

    // ========================================================================
    // Deprecated API Tests (for backwards compatibility)
    // ========================================================================

    describe('deprecated API', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('isEnabled should return true if any hotkey is enabled', () => {
            expect(hotkeyManager.isEnabled()).toBe(true);
        });

        it('isEnabled should return false if all hotkeys are disabled', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);
            hotkeyManager.setIndividualEnabled('bossKey', false);
            hotkeyManager.setIndividualEnabled('quickChat', false);
            hotkeyManager.setIndividualEnabled('printToPdf', false);

            expect(hotkeyManager.isEnabled()).toBe(false);
        });

        it('setEnabled(false) should disable all hotkeys', () => {
            hotkeyManager.registerShortcuts();
            hotkeyManager.setEnabled(false);

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: false,
                quickChat: false,
                printToPdf: false,
            });
        });

        it('setEnabled(true) should enable all hotkeys', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);
            hotkeyManager.setIndividualEnabled('bossKey', false);
            hotkeyManager.setIndividualEnabled('quickChat', false);
            hotkeyManager.setIndividualEnabled('printToPdf', false);

            hotkeyManager.setEnabled(true);

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            });
        });
    });

    // ========================================================================
    // executeHotkeyAction Tests
    // ========================================================================

    describe('executeHotkeyAction', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should execute bossKey action', () => {
            hotkeyManager.executeHotkeyAction('bossKey');
            expect(mockWindowManager.minimizeMainWindow).toHaveBeenCalled();
        });

        it('should execute quickChat action', () => {
            hotkeyManager.executeHotkeyAction('quickChat');
            expect(mockWindowManager.toggleQuickChat).toHaveBeenCalled();
        });

        it('should execute alwaysOnTop action', () => {
            hotkeyManager.executeHotkeyAction('alwaysOnTop');
            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalled();
        });

        it('should execute printToPdf action', () => {
            hotkeyManager.executeHotkeyAction('printToPdf');
            expect(mockWindowManager.emit).toHaveBeenCalledWith('print-to-pdf-triggered');
        });

        it('should warn for unknown hotkey id', () => {
            hotkeyManager.executeHotkeyAction('unknownId' as any);
            // Should not throw, just log warning
        });
    });

    // ========================================================================
    // Registration Exception Tests
    // ========================================================================

    describe('registration exception handling', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should handle exception during globalShortcut.register', () => {
            mockGlobalShortcut.register.mockImplementation(() => {
                throw new Error('Registration exception');
            });

            // Should not throw
            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
        });

        it('should handle registration failure with isRegistered true', () => {
            mockGlobalShortcut.register.mockReturnValue(false);
            mockGlobalShortcut.isRegistered.mockReturnValue(true);

            // Should not throw, just log warning
            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
        });

        it('should handle action execution error in registered shortcut', () => {
            mockWindowManager.minimizeMainWindow = vi.fn(() => {
                throw new Error('Action failed');
            });

            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === DEFAULT_ACCELERATORS.bossKey) {
                    callback(); // Should not throw
                }
                return true;
            });

            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
        });
    });

    // ========================================================================
    // Unregister Edge Cases
    // ========================================================================

    describe('unregister edge cases', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should not unregister application hotkeys via globalShortcut', () => {
            hotkeyManager.registerShortcuts();
            vi.clearAllMocks();

            // Disable an application hotkey
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);

            // Should NOT call globalShortcut.unregister
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
        });

        it('should skip _unregisterShortcutById for application hotkeys', () => {
            hotkeyManager.registerShortcuts();
            vi.clearAllMocks();

            // Try to disable printToPdf (application hotkey)
            hotkeyManager.setIndividualEnabled('printToPdf', false);
            hotkeyManager.setIndividualEnabled('printToPdf', true);

            // Should NOT interact with globalShortcut
            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
        });
    });

    // ========================================================================
    // setAccelerator for Application Hotkeys
    // ========================================================================

    describe('setAccelerator for application hotkeys', () => {
        it('should emit accelerator-changed event for application hotkeys', () => {
            hotkeyManager.setAccelerator('alwaysOnTop', 'CmdOrCtrl+Shift+A');

            expect(mockWindowManager.emit).toHaveBeenCalledWith(
                'accelerator-changed',
                'alwaysOnTop',
                'CmdOrCtrl+Shift+A'
            );
        });

        it('should emit accelerator-changed event for printToPdf', () => {
            hotkeyManager.setAccelerator('printToPdf', 'CmdOrCtrl+P');

            expect(mockWindowManager.emit).toHaveBeenCalledWith('accelerator-changed', 'printToPdf', 'CmdOrCtrl+P');
        });

        it('should NOT call globalShortcut for application hotkey accelerator change', () => {
            hotkeyManager.setAccelerator('alwaysOnTop', 'CmdOrCtrl+Shift+A');

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
            expect(mockGlobalShortcut.unregister).not.toHaveBeenCalled();
        });
    });
});
