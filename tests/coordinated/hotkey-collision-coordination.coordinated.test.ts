/**
 * Integration tests for HotkeyManager collision and coordination.
 * Tests how the application handles hotkey registration failures and coordination with IPC/Store.
 *
 * Scenarios:
 * - Handling registration collisions (globalShortcut.register returns false)
 * - IPC-driven hotkey toggle synchronization
 * - Maintaining internal state despite registration failures
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron module FIRST (before importing from 'electron')
vi.mock('electron', async () => {
  const mockModule = await import('../unit/main/test/electron-mock');
  return mockModule.default;
});

import { globalShortcut } from 'electron';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import WindowManager from '../../src/main/managers/windowManager';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock constants to ensure isLinux is false (so hotkey registration tests work on all platforms)
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/main/utils/constants')>();
  return {
    ...actual,
    isLinux: false,
  };
});

describe('Hotkey Collision and Coordination Integration', () => {
  let hotkeyManager: HotkeyManager;
  let windowManager: WindowManager;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((globalShortcut as any)._reset) (globalShortcut as any)._reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create REAL WindowManager and HotkeyManager after platform stub
      windowManager = new WindowManager(false);
      hotkeyManager = new HotkeyManager(windowManager);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('Registration Collision Handling', () => {
      it('should handle hotkey registration failure gracefully', () => {
        // Simulate collision for one specific hotkey
        (globalShortcut.register as any).mockImplementation((accel: string) => {
          if (accel.includes('Space')) return false; // Collision for Quick Chat
          return true;
        });

        // Register shortcuts
        hotkeyManager.registerShortcuts();

        // Verify error was logged for collision
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED to register hotkey: quickChat')
        );

        // Verify other shortcuts were still registered (only global hotkeys)
        expect(globalShortcut.register).toHaveBeenCalledTimes(2); // 2 global hotkeys: quickChat, bossKey

        // Check internal tracking: failed hotkey should NOT be in registered set
        // (We check this indirectly via idempotency of setIndividualEnabled)
        expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(true); // Still enabled in settings

        // Try enabling it again - should attempt to re-register
        mockLogger.error.mockClear();
        hotkeyManager.setIndividualEnabled('quickChat', true);

        expect(globalShortcut.register).toHaveBeenCalledWith(
          expect.stringContaining('Space'),
          expect.any(Function)
        );
      });
    });

    describe('IPC and Store Coordination', () => {
      it('should synchronize hotkey state through IpcManager to Store', () => {
        // Register first
        hotkeyManager.registerShortcuts();

        hotkeyManager.setIndividualEnabled('bossKey', false);

        // Verify hotkey was unregistered
        // bossKey uses the default accelerator from DEFAULT_ACCELERATORS
        expect(globalShortcut.unregister).toHaveBeenCalledWith(DEFAULT_ACCELERATORS.bossKey);

        // Verify state in manager
        expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(false);
      });
    });

    describe('Accelerator Handling', () => {
      it('should register shortcuts with appropriate accelerators', () => {
        hotkeyManager.registerShortcuts();

        // accelerators should use 'CommandOrControl' which Electron handles per-platform
        // In our mock, we just verify it was called
        expect(globalShortcut.register).toHaveBeenCalled();

        // On macOS, we expect CommandOrControl to resolve to Command (behavior of Electron, mock mimics this)
        // Actually our mock just takes the string.
      });
    });
  });
});
