/**
 * Unit tests for HotkeyManager.
 * 
 * This test suite validates the HotkeyManager class which handles global keyboard
 * shortcut registration and management in the Electron main process.
 * 
 * ## Test Coverage
 * 
 * - **constructor**: Initialization and shortcut configuration
 * - **registerShortcuts**: Shortcut registration with Electron's globalShortcut API
 * - **unregisterAll**: Cleanup and state reset
 * - **isEnabled**: Enabled state accessor
 * - **setEnabled**: Enable/disable toggle functionality
 * - **State management**: Registration flags and toggle cycles
 * 
 * ## Mocking Strategy
 * 
 * The tests mock:
 * - `electron.globalShortcut` - To avoid actual global shortcut registration
 * - `logger` - To prevent console output during tests
 * - `WindowManager` - To verify shortcut actions are called correctly
 * 
 * ## Test Patterns
 * 
 * Each test follows the Arrange-Act-Assert pattern:
 * 1. Set up mocks and initial state
 * 2. Call the method under test
 * 3. Verify expected behavior via assertions
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
    unregisterAll: vi.fn()
}));

// Mock Electron module
vi.mock('electron', () => ({
    globalShortcut: mockGlobalShortcut
}));

/**
 * Mock for the logger utility.
 * Prevents console output and allows verification of log calls.
 */
vi.mock('../utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    })
}));

// Import after mocks are set up (important for mock injection)
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
            toggleQuickChat: vi.fn()
        } as unknown as WindowManager;

        hotkeyManager = new HotkeyManager(mockWindowManager);
    });

    /**
     * Restore all mocks after each test for isolation.
     */
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ========================================================================
    // Constructor Tests
    // ========================================================================

    describe('constructor', () => {
        it('should create a HotkeyManager instance with the windowManager', () => {
            expect(hotkeyManager).toBeDefined();
        });

        it('should initialize shortcuts array with minimize and quick chat shortcuts', () => {
            // Access private shortcuts via type casting to verify initialization
            const shortcuts = (hotkeyManager as unknown as { shortcuts: { accelerator: string }[] }).shortcuts;
            expect(shortcuts).toHaveLength(2);
            expect(shortcuts[0].accelerator).toBe('CommandOrControl+Alt+E');
            expect(shortcuts[1].accelerator).toBe('CommandOrControl+Shift+Space');
        });
    });

    // ========================================================================
    // registerShortcuts Tests
    // ========================================================================

    describe('registerShortcuts', () => {

        it('should register all shortcuts successfully', () => {
            mockGlobalShortcut.register.mockReturnValue(true);

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Alt+E',
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Shift+Space',
                expect.any(Function)
            );
        });

        it('should handle registration failure gracefully', () => {
            mockGlobalShortcut.register.mockReturnValue(false);

            // Should not throw
            expect(() => hotkeyManager.registerShortcuts()).not.toThrow();
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
        });

        it('should call minimizeMainWindow when minimize hotkey is triggered', () => {
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
    });

    describe('unregisterAll', () => {
        it('should unregister all shortcuts', () => {
            mockGlobalShortcut.register.mockReturnValue(true);
            hotkeyManager.registerShortcuts();

            hotkeyManager.unregisterAll();

            expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalledTimes(1);
        });

        it('should reset registered state', () => {
            mockGlobalShortcut.register.mockReturnValue(true);
            hotkeyManager.registerShortcuts();
            hotkeyManager.unregisterAll();

            // Registering again should work
            hotkeyManager.registerShortcuts();
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(4); // 2 + 2
        });
    });

    describe('isEnabled', () => {
        it('should return true by default', () => {
            expect(hotkeyManager.isEnabled()).toBe(true);
        });

        it('should return false after setEnabled(false)', () => {
            hotkeyManager.setEnabled(false);
            expect(hotkeyManager.isEnabled()).toBe(false);
        });

        it('should return true after setEnabled(true)', () => {
            hotkeyManager.setEnabled(false);
            hotkeyManager.setEnabled(true);
            expect(hotkeyManager.isEnabled()).toBe(true);
        });
    });

    describe('setEnabled', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should disable hotkeys when called with false', () => {
            hotkeyManager.registerShortcuts();
            hotkeyManager.setEnabled(false);

            expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
            expect(hotkeyManager.isEnabled()).toBe(false);
        });

        it('should enable hotkeys when called with true', () => {
            hotkeyManager.setEnabled(false);
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.setEnabled(true);

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
            expect(hotkeyManager.isEnabled()).toBe(true);
        });

        it('should not re-register if already enabled', () => {
            hotkeyManager.registerShortcuts();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.setEnabled(true); // Already enabled

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should not unregister if already disabled', () => {
            hotkeyManager.setEnabled(false);
            mockGlobalShortcut.unregisterAll.mockClear();

            hotkeyManager.setEnabled(false); // Already disabled

            expect(mockGlobalShortcut.unregisterAll).not.toHaveBeenCalled();
        });
    });

    describe('registerShortcuts state management', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should not register if hotkeys are disabled', () => {
            hotkeyManager.setEnabled(false);
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should not register if already registered', () => {
            hotkeyManager.registerShortcuts();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).not.toHaveBeenCalled();
        });

        it('should register after unregisterAll even if previously registered', () => {
            hotkeyManager.registerShortcuts();
            hotkeyManager.unregisterAll();
            mockGlobalShortcut.register.mockClear();

            hotkeyManager.registerShortcuts();

            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
        });
    });

    describe('enable/disable workflow', () => {
        beforeEach(() => {
            mockGlobalShortcut.register.mockReturnValue(true);
        });

        it('should maintain state through toggle cycle', () => {
            // Initial state
            expect(hotkeyManager.isEnabled()).toBe(true);

            // Register then disable
            hotkeyManager.registerShortcuts();
            hotkeyManager.setEnabled(false);
            expect(hotkeyManager.isEnabled()).toBe(false);

            // Re-enable
            hotkeyManager.setEnabled(true);
            expect(hotkeyManager.isEnabled()).toBe(true);

            // Total: 2 initial + 2 re-enabled = 4
            expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(4);
        });

        it('should preserve shortcuts config when toggling', () => {
            hotkeyManager.registerShortcuts();
            hotkeyManager.setEnabled(false);

            mockGlobalShortcut.register.mockClear();
            hotkeyManager.setEnabled(true);

            // Should still register the same two shortcuts
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Alt+E',
                expect.any(Function)
            );
            expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
                'CommandOrControl+Shift+Space',
                expect.any(Function)
            );
        });
    });
});
