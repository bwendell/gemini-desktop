/**
 * Unit tests for useMenuDefinitions hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMenuDefinitions } from './useMenuDefinitions';
import { mockElectronAPI } from '../../../../tests/unit/renderer/test/setup';

describe('useMenuDefinitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns correct menu structure', () => {
    const { result } = renderHook(() => useMenuDefinitions());
    const menus = result.current;

    // Edit menu removed - only 3 menus now
    expect(menus).toHaveLength(3);
    expect(menus[0].label).toBe('File');
    expect(menus[1].label).toBe('View');
    expect(menus[2].label).toBe('Help');
  });

  describe('File menu', () => {
    it('has New Window item (disabled placeholder)', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];
      const newWindowItem = fileMenu.items[0];

      expect(newWindowItem).toHaveProperty('label', 'New Window');
      expect(newWindowItem).toHaveProperty('disabled', true);
      expect(newWindowItem).toHaveProperty('shortcut', 'Ctrl+Shift+N');
    });

    it('has separator after New Window', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];

      expect(fileMenu.items[1]).toEqual({ separator: true });
    });

    it('has Print to PDF item and action works', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];
      const printItem = fileMenu.items[2];

      expect(printItem).toHaveProperty('label', 'Print to PDF');
      expect(printItem).toHaveProperty('action');

      if ('action' in printItem && printItem.action) {
        printItem.action();
        expect(mockElectronAPI.printToPdf).toHaveBeenCalledTimes(1);
      }
    });

    it('has separator after Print to PDF', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];

      expect(fileMenu.items[3]).toEqual({ separator: true });
    });

    it('has Sign in to Google item and action works', async () => {
      const reloadSpy = vi.fn();
      const originalLocation = window.location;

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: reloadSpy },
        writable: true,
      });

      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];
      const signInItem = fileMenu.items[4];

      expect(signInItem).toHaveProperty('label', 'Sign in to Google');
      expect(signInItem).toHaveProperty('action');

      // Call the async action to cover lines 25-27
      if ('action' in signInItem && signInItem.action) {
        await signInItem.action();
        expect(mockElectronAPI.openGoogleSignIn).toHaveBeenCalledTimes(1);
        expect(reloadSpy).toHaveBeenCalled();
      }

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('has Options item', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];
      const optionsItem = fileMenu.items[5];

      expect(optionsItem).toHaveProperty('label', 'Options');
      expect(optionsItem).toHaveProperty('disabled', false);
      expect(optionsItem).toHaveProperty('shortcut', 'Ctrl+,');

      if ('action' in optionsItem && optionsItem.action) {
        optionsItem.action();
        expect(mockElectronAPI.openOptions).toHaveBeenCalledTimes(1);
      }
    });

    it('has separator after Options', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];

      expect(fileMenu.items[6]).toEqual({ separator: true });
    });

    it('Exit action calls electronAPI.closeWindow()', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const fileMenu = result.current[0];
      const exitItem = fileMenu.items[7];

      expect(exitItem).toHaveProperty('label', 'Exit');

      if ('action' in exitItem && exitItem.action) {
        exitItem.action();
        expect(mockElectronAPI.closeWindow).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('View menu', () => {
    it('Reload action calls window.location.reload', () => {
      const reloadSpy = vi.fn();
      const originalLocation = window.location;

      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, reload: reloadSpy },
        writable: true,
      });

      const { result } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];
      const reloadItem = viewMenu.items[0];

      if ('action' in reloadItem && reloadItem.action) {
        reloadItem.action();
        expect(reloadSpy).toHaveBeenCalled();
      }

      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('Toggle Fullscreen is disabled', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];
      const toggleItem = viewMenu.items[4]; // After Always On Top and separator

      expect(toggleItem).toHaveProperty('label', 'Toggle Fullscreen');
      expect(toggleItem).toHaveProperty('disabled', true);
    });

    it('has Always On Top item with correct properties', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];
      const alwaysOnTopItem = viewMenu.items[2];

      expect(alwaysOnTopItem).toHaveProperty('id', 'menu-view-always-on-top');
      expect(alwaysOnTopItem).toHaveProperty('label', 'Always On Top');
      expect(alwaysOnTopItem).toHaveProperty('shortcut', 'Ctrl+Shift+T');
      expect(alwaysOnTopItem).toHaveProperty('checked', false); // Default state
      expect(alwaysOnTopItem).toHaveProperty('action');
    });

    it('Always On Top action calls setAlwaysOnTop and updates state', async () => {
      const { result, rerender } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];
      const alwaysOnTopItem = viewMenu.items[2];

      // Initial state should be false
      expect(alwaysOnTopItem).toHaveProperty('checked', false);

      // Call the action to toggle
      if ('action' in alwaysOnTopItem && alwaysOnTopItem.action) {
        alwaysOnTopItem.action();
      }

      // Mock should have been called
      expect(mockElectronAPI.setAlwaysOnTop).toHaveBeenCalledWith(true);

      // Simulate the event coming back from main process
      const callback = mockElectronAPI.onAlwaysOnTopChanged.mock.calls[0][0];
      await import('react').then(({ act }) => {
        act(() => {
          callback({ enabled: true });
        });
      });

      // After rerender, checked should be true
      rerender();
      const updatedViewMenu = result.current[1];
      const updatedItem = updatedViewMenu.items[2];
      expect(updatedItem).toHaveProperty('checked', true);
    });

    it('has separator before Always On Top', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];

      expect(viewMenu.items[1]).toEqual({ separator: true });
    });

    it('has separator after Always On Top', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const viewMenu = result.current[1];

      expect(viewMenu.items[3]).toEqual({ separator: true });
    });

    it('subscribes to always-on-top changes on mount', () => {
      renderHook(() => useMenuDefinitions());

      expect(mockElectronAPI.getAlwaysOnTop).toHaveBeenCalled();
      expect(mockElectronAPI.onAlwaysOnTopChanged).toHaveBeenCalled();
    });

    it('cleanup function is called on unmount', () => {
      const mockCleanup = vi.fn();
      mockElectronAPI.onAlwaysOnTopChanged.mockReturnValue(mockCleanup);

      const { unmount } = renderHook(() => useMenuDefinitions());
      unmount();

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('handles getAlwaysOnTop rejection gracefully', async () => {
      // Mock getAlwaysOnTop to reject
      mockElectronAPI.getAlwaysOnTop.mockRejectedValueOnce(new Error('Test error'));

      // Render hook - should not throw
      const { result } = renderHook(() => useMenuDefinitions());

      // Wait for the promise to settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Hook should still return valid menus
      expect(result.current).toHaveLength(3);

      // alwaysOnTop state should remain at default (false)
      const viewMenu = result.current[1];
      const alwaysOnTopItem = viewMenu.items[2];
      expect(alwaysOnTopItem).toHaveProperty('checked', false);
    });
  });

  describe('Help menu', () => {
    it('Check for Updates action calls electronAPI.checkForUpdates()', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const helpMenu = result.current[2];
      const checkUpdatesItem = helpMenu.items[0];

      expect(checkUpdatesItem).toHaveProperty('id', 'menu-help-check-updates');
      expect(checkUpdatesItem).toHaveProperty('label', 'Check for Updates');

      if ('action' in checkUpdatesItem && checkUpdatesItem.action) {
        checkUpdatesItem.action();
        expect(mockElectronAPI.checkForUpdates).toHaveBeenCalledTimes(1);
      }
    });

    it('has separator after Check for Updates', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const helpMenu = result.current[2];

      expect(helpMenu.items[1]).toEqual({ separator: true });
    });

    it('About action opens options window', () => {
      const { result } = renderHook(() => useMenuDefinitions());
      const helpMenu = result.current[2];
      const aboutItem = helpMenu.items[2]; // After Check for Updates and separator

      expect(aboutItem).toHaveProperty('label', 'About Gemini Desktop');

      if ('action' in aboutItem && aboutItem.action) {
        aboutItem.action();
        expect(mockElectronAPI.openOptions).toHaveBeenCalledWith('about');
      }
    });
  });
});
