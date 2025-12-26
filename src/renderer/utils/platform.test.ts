/**
 * Unit tests for platform detection utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlatform,
  isMacOS,
  isWindows,
  isLinux,
  usesCustomWindowControls,
  isDevMode,
} from './platform';
import { setMockPlatform } from '../../../tests/unit/renderer/test/setup';

describe('platform utilities', () => {
  beforeEach(() => {
    // Reset to default (Windows)
    setMockPlatform('win32');
  });

  describe('getPlatform', () => {
    it('returns windows when platform is win32', () => {
      setMockPlatform('win32');
      expect(getPlatform()).toBe('windows');
    });

    it('returns linux when platform is linux', () => {
      setMockPlatform('linux');
      expect(getPlatform()).toBe('linux');
    });

    it('returns macos when platform is darwin', () => {
      setMockPlatform('darwin');
      expect(getPlatform()).toBe('macos');
    });
  });

  describe('isMacOS', () => {
    it('returns true on macOS', () => {
      setMockPlatform('darwin');
      expect(isMacOS()).toBe(true);
    });

    it('returns false on Windows', () => {
      setMockPlatform('win32');
      expect(isMacOS()).toBe(false);
    });

    it('returns false on Linux', () => {
      setMockPlatform('linux');
      expect(isMacOS()).toBe(false);
    });
  });

  describe('isWindows', () => {
    it('returns true on Windows', () => {
      setMockPlatform('win32');
      expect(isWindows()).toBe(true);
    });

    it('returns false on macOS', () => {
      setMockPlatform('darwin');
      expect(isWindows()).toBe(false);
    });

    it('returns false on Linux', () => {
      setMockPlatform('linux');
      expect(isWindows()).toBe(false);
    });
  });

  describe('isLinux', () => {
    it('returns true on Linux', () => {
      setMockPlatform('linux');
      expect(isLinux()).toBe(true);
    });

    it('returns false on Windows', () => {
      setMockPlatform('win32');
      expect(isLinux()).toBe(false);
    });

    it('returns false on macOS', () => {
      setMockPlatform('darwin');
      expect(isLinux()).toBe(false);
    });
  });

  describe('usesCustomWindowControls', () => {
    it('returns true on Windows', () => {
      setMockPlatform('win32');
      expect(usesCustomWindowControls()).toBe(true);
    });

    it('returns true on Linux', () => {
      setMockPlatform('linux');
      expect(usesCustomWindowControls()).toBe(true);
    });

    it('returns false on macOS', () => {
      setMockPlatform('darwin');
      expect(usesCustomWindowControls()).toBe(false);
    });
  });

  describe('navigator.platform fallback', () => {
    it('detects macOS from navigator.platform when electronAPI is unavailable', () => {
      const originalAPI = window.electronAPI;
      // @ts-ignore - Testing undefined case
      delete window.electronAPI;

      // Mock navigator.platform
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      expect(getPlatform()).toBe('macos');

      // Restore
      window.electronAPI = originalAPI;
    });

    it('detects Windows from navigator.platform when electronAPI is unavailable', () => {
      const originalAPI = window.electronAPI;
      // @ts-ignore - Testing undefined case
      delete window.electronAPI;

      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      expect(getPlatform()).toBe('windows');

      // Restore
      window.electronAPI = originalAPI;
    });

    it('defaults to Linux from navigator.platform when electronAPI is unavailable', () => {
      const originalAPI = window.electronAPI;
      // @ts-ignore - Testing undefined case
      delete window.electronAPI;

      Object.defineProperty(navigator, 'platform', {
        value: 'Linux x86_64',
        configurable: true,
      });

      expect(getPlatform()).toBe('linux');

      // Restore
      window.electronAPI = originalAPI;
    });
  });

  describe('isDevMode', () => {
    // isDevMode is already imported at the top level

    let originalLocation: Location;

    beforeEach(() => {
      originalLocation = window.location;
      // Default to production-like environment (not localhost)
      // We use Object.defineProperty because window.location is read-only in JSDOM
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          hostname: 'example.com',
          protocol: 'https:',
          pathname: '/',
        },
        writable: true,
      });
    });

    afterEach(() => {
      // Restore original location
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('detects dev mode from envOverride via DEV flag', () => {
      expect(isDevMode({ DEV: true })).toBe(true);
      // { DEV: false } alone might still be true if MODE != production (in test env, MODE is 'test')
      // So we need to ensure MODE is production to test DEV: false specifically NOT triggering dev mode logic
      expect(isDevMode({ DEV: false, MODE: 'production' })).toBe(false);
    });

    it('detects dev mode from envOverride via MODE', () => {
      expect(isDevMode({ MODE: 'development' })).toBe(true);
      expect(isDevMode({ MODE: 'production', DEV: false })).toBe(false);
    });

    it('prioritizes dev signals correctly', () => {
      // New logic: if ANY signal says dev, it is dev
      expect(isDevMode({ DEV: false, MODE: 'development' })).toBe(true);
      expect(isDevMode({ DEV: true, MODE: 'production' })).toBe(true);
    });

    it('detects dev mode from localhost', () => {
      // Reconfigure window.location to localhost
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          hostname: 'localhost',
        },
        writable: true,
      });

      // Force env checks to pass so we reach localhost check
      expect(isDevMode({ DEV: false, MODE: 'production' })).toBe(true);
    });

    it('detects dev mode from local file protocol in Electron (unpackaged)', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          protocol: 'file:',
          pathname: '/C:/Users/user/project/dist/index.html',
        },
        writable: true,
      });

      // Using setup helper to ensure isElectron is true
      setMockPlatform('win32');

      expect(isDevMode({ DEV: false, MODE: 'production' })).toBe(true);
    });

    it('detects production mode from file protocol in Electron (packaged in app.asar)', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          protocol: 'file:',
          pathname: '/C:/Program Files/App/resources/app.asar/dist/index.html',
        },
        writable: true,
      });

      setMockPlatform('win32');

      expect(isDevMode({ DEV: false, MODE: 'production' })).toBe(false);
    });

    it('detects production mode from file protocol in Electron (packaged in resources)', () => {
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          protocol: 'file:',
          pathname: '/C:/Program Files/App/resources/app/dist/index.html',
        },
        writable: true,
      });

      setMockPlatform('win32');

      expect(isDevMode({ DEV: false, MODE: 'production' })).toBe(false);
    });
  });
});
