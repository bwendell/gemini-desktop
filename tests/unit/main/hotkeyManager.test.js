import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import HotkeyManager from '../../electron/managers/hotkeyManager.cjs';

// Mock electron just enough to prevent top-level require failure
vi.mock('electron', () => ({
  globalShortcut: {},
  app: {},
}));

describe('HotkeyManager', () => {
  let hotkeyManager;
  let windowManagerMock;
  let globalShortcutMock;

  beforeEach(() => {
    vi.clearAllMocks();

    //Checking to for function calls using vi.fn()
    windowManagerMock = {
      minimizeMainWindow: vi.fn(),
    };

    globalShortcutMock = {
      register: vi.fn(() => true),
      unregisterAll: vi.fn(),
    };

    // Inject dependencies via constructor
    hotkeyManager = new HotkeyManager(windowManagerMock, {
      globalShortcut: globalShortcutMock,
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('should register shortcuts on initialization', () => {
    hotkeyManager.registerShortcuts();

    expect(globalShortcutMock.register).toHaveBeenCalledWith(
      'CommandOrControl+Alt+E',
      expect.any(Function)
    );
  });

  it('should call minimizeMainWindow when hotkey is pressed', () => {
    hotkeyManager.registerShortcuts();

    // Get the callback passed to register
    const callback = globalShortcutMock.register.mock.calls[0][1];

    // Execute the callback
    callback();

    expect(windowManagerMock.minimizeMainWindow).toHaveBeenCalled();
  });

  it('should unregister all shortcuts when requested', () => {
    hotkeyManager.unregisterAll();

    expect(globalShortcutMock.unregisterAll).toHaveBeenCalled();
  });

  it('should log error if registration fails', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    globalShortcutMock.register.mockReturnValueOnce(false);

    hotkeyManager.registerShortcuts();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Registration failed'));
  });
});
