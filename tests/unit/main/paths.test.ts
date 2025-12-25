/**
 * Unit tests for path utilities.
 * @module paths.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';

// Mock path module
vi.mock('path', async () => {
  const actual = await vi.importActual('path');
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
  };
});

describe('paths utilities', () => {
  // Helper to mock platform
  const mockPlatform = (platform: string) => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
    });
  };

  const originalPlatform = process.platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mockPlatform(originalPlatform);
  });

  describe('getPreloadPath', () => {
    it('should return path to preload.cjs in dist-electron', async () => {
      const { getPreloadPath } = await import('../../../src/main/utils/paths');
      const result = getPreloadPath();

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../preload/preload.cjs');
      expect(result).toContain('preload.cjs');
    });
  });

  describe('getDistHtmlPath', () => {
    it('should return path to specified HTML file in dist directory', async () => {
      const { getDistHtmlPath } = await import('../../../src/main/utils/paths');
      const result = getDistHtmlPath('index.html');

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../../dist', 'index.html');
      expect(result).toContain('index.html');
    });

    it('should handle options.html', async () => {
      const { getDistHtmlPath } = await import('../../../src/main/utils/paths');
      const result = getDistHtmlPath('src/renderer/windows/options/options.html');
      expect(result).toContain('src/renderer/windows/options/options.html');
    });

    it('should handle quickchat.html', async () => {
      const { getDistHtmlPath } = await import('../../../src/main/utils/paths');
      const result = getDistHtmlPath('src/renderer/windows/quickchat/quickchat.html');
      expect(result).toContain('src/renderer/windows/quickchat/quickchat.html');
    });
  });

  describe('getIconPath', () => {
    it('should return .ico path on Windows', async () => {
      mockPlatform('win32');
      vi.resetModules();
      const { getIconPath } = await import('../../../src/main/utils/paths');
      const result = getIconPath();

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../../build/icon.ico');
      expect(result).toContain('icon.ico');
    });

    it('should return .png path on macOS', async () => {
      mockPlatform('darwin');
      vi.resetModules();
      const { getIconPath } = await import('../../../src/main/utils/paths');
      const result = getIconPath();

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../../build/icon.png');
      expect(result).toContain('icon.png');
    });

    it('should return .png path on Linux', async () => {
      mockPlatform('linux');
      vi.resetModules();
      const { getIconPath } = await import('../../../src/main/utils/paths');
      const result = getIconPath();

      expect(path.join).toHaveBeenCalledWith(expect.any(String), '../../../build/icon.png');
      expect(result).toContain('icon.png');
    });
  });
});
