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
import type WindowManager from './windowManager';

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
    unregisterAll: vi.fn()
}));

// Mock Electron module
vi.mock('electron', () => ({
    globalShortcut: mockGlobalShortcut
}));

/**
 * Mock for the logger utility.
 */
vi.mock('../utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    })
}));

// Import after mocks are set up
import HotkeyManager from './hotkeyManager';

// ============================================================================
// Test Suite
// ============================================================================

describe('HotkeyManager', () => {
    /** Instance of HotkeyManager under test */
    let hotkeyManager: HotkeyManager;

    /** Mock WindowManager for verifying shortcut actions */
    let mockWindowManager: WindowManager;

    /**
     * Set up fresh mocks and instance before each test.
     */
    beforeEach(() => {
        vi.clearAllMocks();

        // Create mock WindowManager with required methods
        mockWindowManager = {
            minimizeMainWindow: vi.fn(),
            toggleQuickChat: vi.fn(),
            isAlwaysOnTop: vi.fn().mockReturnValue(false),
            setAlwaysOnTop: vi.fn()
        } as unknown as WindowManager;

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

        it('should initialize shortcuts with correct IDs', () => {
            const shortcuts = (hotkeyManager as unknown as { shortcuts: { id: string; accelerator: string }[] }).shortcuts;
            expect(shortcuts).toHaveLength(3);
            expect(shortcuts.map(s => s.id)).toEqual(['bossKey', 'quickChat', 'alwaysOnTop']);
        });

        it('should accept initial settings', () => {
            const customManager = new HotkeyManager(mockWindowManager, {
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false
            });

            expect(customManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false
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
                quickChat: true
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
                'CommandOrControl+Shift+Space',
                expect.any(Function)
            );
        });

        it('should unregister a hotkey when disabling it', () => {
            // First register all
            hotkeyManager.registerShortcuts();

            // Now disable one
            hotkeyManager.setIndividualEnabled('bossKey', false);

            expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Alt+E');
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
                quickChat: false
            });

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: true,
                quickChat: false
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

        it('should register all enabled shortcuts', () => {
            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(3);
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Alt+E',
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Shift+Space',
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Shift+T',
                expect.any(Function)
            );
        });

        it('should not register disabled shortcuts', () => {
            hotkeyManager.setIndividualEnabled('quickChat', false);
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
            expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
                'CommandOrControl+Shift+Space',
                expect.any(Function)
            );
        });

        it('should handle registration failure gracefully', () => {
            mockGlobalShortcut.register.mockReturnValue(false);

            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(3);
        });

        it('should not register already registered shortcuts', () => {
            hotkeyManager.registerShortcuts();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should call minimizeMainWindow when boss key is triggered', () => {
            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === 'CommandOrControl+Alt+E') {
                    callback();
                }
                return true;
            });

            hotkeyManager.registerShortcuts();

            expect(mockWindowManager.minimizeMainWindow).toHaveBeenCalledTimes(1);
        });

        it('should call toggleQuickChat when quick chat hotkey is triggered', () => {
            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === 'CommandOrControl+Shift+Space') {
                    callback();
                }
                return true;
            });

            hotkeyManager.registerShortcuts();

            expect(mockWindowManager.toggleQuickChat).toHaveBeenCalledTimes(1);
        });

        it('should toggle always-on-top when always on top hotkey is triggered', () => {
            (mockWindowManager.isAlwaysOnTop as ReturnType<typeof vi.fn>).mockReturnValue(false);

            mockGlobalShortcut.register.mockImplementation((accelerator: string, callback: () => void) => {
                if (accelerator === 'CommandOrControl+Shift+T') {
                    callback();
                }
                return true;
            });

            hotkeyManager.registerShortcuts();

            expect(mockWindowManager.isAlwaysOnTop).toHaveBeenCalled();
            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
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

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(3);
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

            expect(hotkeyManager.isEnabled()).toBe(false);
        });

        it('setEnabled(false) should disable all hotkeys', () => {
            hotkeyManager.registerShortcuts();
            hotkeyManager.setEnabled(false);

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: false,
                bossKey: false,
                quickChat: false
            });
        });

        it('setEnabled(true) should enable all hotkeys', () => {
            hotkeyManager.setIndividualEnabled('alwaysOnTop', false);
            hotkeyManager.setIndividualEnabled('bossKey', false);
            hotkeyManager.setIndividualEnabled('quickChat', false);

            hotkeyManager.setEnabled(true);

            expect(hotkeyManager.getIndividualSettings()).toEqual({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true
            });
        });
    });
});
