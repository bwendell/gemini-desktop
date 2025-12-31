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
import type WindowManager from '../../../src/main/managers/windowManager';
import { DEFAULT_ACCELERATORS } from '../../../src/shared/types/hotkeys';

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
 * Mock for the logger utility.
 */
vi.mock('../../../src/main/utils/logger', () => ({
  createLogger: () => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

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
      setAlwaysOnTop: vi.fn(),
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

    it('should initialize shortcut actions with correct IDs', () => {
      const shortcutActions = (
        hotkeyManager as unknown as { shortcutActions: { id: string }[] }
      ).shortcutActions;
      expect(shortcutActions).toHaveLength(3);
      expect(shortcutActions.map((s) => s.id)).toEqual(['bossKey', 'quickChat', 'alwaysOnTop']);
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
      });
      expect(customManager.getAccelerator('bossKey')).toBe('CommandOrControl+Alt+H');
      // Others should have defaults
      expect(customManager.getAccelerator('alwaysOnTop')).toBe(DEFAULT_ACCELERATORS.alwaysOnTop);
      expect(customManager.getAccelerator('quickChat')).toBe(DEFAULT_ACCELERATORS.quickChat);
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
      });
    });
  });

  describe('getAccelerator', () => {
    it('should return accelerator for specific hotkey', () => {
      expect(hotkeyManager.getAccelerator('alwaysOnTop')).toBe(DEFAULT_ACCELERATORS.alwaysOnTop);
      expect(hotkeyManager.getAccelerator('bossKey')).toBe(DEFAULT_ACCELERATORS.bossKey);
      expect(hotkeyManager.getAccelerator('quickChat')).toBe(DEFAULT_ACCELERATORS.quickChat);
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
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Alt+B',
        expect.any(Function)
      );
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
      });

      expect(hotkeyManager.getAccelerators()).toEqual({
        alwaysOnTop: 'CommandOrControl+Shift+A',
        bossKey: 'CommandOrControl+Alt+B',
        quickChat: 'CommandOrControl+Shift+Q',
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
      });

      expect(hotkeyManager.getIndividualSettings()).toEqual({
        alwaysOnTop: false,
        bossKey: true,
        quickChat: false,
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
        DEFAULT_ACCELERATORS.bossKey,
        expect.any(Function)
      );
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        DEFAULT_ACCELERATORS.quickChat,
        expect.any(Function)
      );
      expect(mockGlobalShortcut.register).toHaveBeenCalledWith(
        DEFAULT_ACCELERATORS.alwaysOnTop,
        expect.any(Function)
      );
    });

    it('should not register disabled shortcuts', () => {
      hotkeyManager.setIndividualEnabled('quickChat', false);
      mockGlobalShortcut.register.mockClear();

      hotkeyManager.registerShortcuts();

      expect(mockGlobalShortcut.register).toHaveBeenCalledTimes(2);
      expect(mockGlobalShortcut.register).not.toHaveBeenCalledWith(
        DEFAULT_ACCELERATORS.quickChat,
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
      mockGlobalShortcut.register.mockImplementation(
        (accelerator: string, callback: () => void) => {
          if (accelerator === DEFAULT_ACCELERATORS.bossKey) {
            callback();
          }
          return true;
        }
      );

      hotkeyManager.registerShortcuts();

      expect(mockWindowManager.minimizeMainWindow).toHaveBeenCalledTimes(1);
    });

    it('should call toggleQuickChat when quick chat hotkey is triggered', () => {
      mockGlobalShortcut.register.mockImplementation(
        (accelerator: string, callback: () => void) => {
          if (accelerator === DEFAULT_ACCELERATORS.quickChat) {
            callback();
          }
          return true;
        }
      );

      hotkeyManager.registerShortcuts();

      expect(mockWindowManager.toggleQuickChat).toHaveBeenCalledTimes(1);
    });

    it('should toggle always-on-top when always on top hotkey is triggered', () => {
      (mockWindowManager.isAlwaysOnTop as ReturnType<typeof vi.fn>).mockReturnValue(false);

      mockGlobalShortcut.register.mockImplementation(
        (accelerator: string, callback: () => void) => {
          if (accelerator === DEFAULT_ACCELERATORS.alwaysOnTop) {
            callback();
          }
          return true;
        }
      );

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
        quickChat: false,
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
        quickChat: true,
      });
    });
  });
});
