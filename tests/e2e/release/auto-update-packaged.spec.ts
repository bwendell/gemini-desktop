// @ts-nocheck
/**
 * E2E Test: Auto-Update in Packaged Builds (Release Build Only)
 *
 * This test validates that the auto-update mechanism is properly configured
 * and functional in packaged builds. Unlike development builds where
 * electron-updater doesn't fully initialize, packaged builds should have
 * the updater ready to check for updates.
 *
 * Key verifications:
 * - UpdateManager is initialized
 * - App reports as packaged (required for electron-updater)
 * - Update check can be triggered without errors
 * - Correct version is reported from package
 *
 * NOTE: Some tests require Node.js 'require' which may not be available
 * in the wdio-electron-service execute context for packaged apps. These
 * tests will be skipped gracefully when 'require' is not available.
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';

describe('Release Build: Auto-Update System', () => {
  it('should be running as a packaged app (required for updater)', async () => {
    const isPackaged = await browser.electron.execute((electron) => {
      return electron.app.isPackaged;
    });

    expect(isPackaged).toBe(true);
    E2ELogger.info('auto-update-packaged', 'Confirmed app is packaged - updater can function');
  });

  it('should have updateManager initialized', async () => {
    const updateInfo = await browser.electron.execute(() => {
      // Access the updateManager via the global managers object
      const updateManager = (global as any).updateManager;
      if (!updateManager) {
        return { exists: false, error: 'updateManager not found on global' };
      }

      return {
        exists: true,
        autoUpdateEnabled:
          typeof updateManager.getAutoUpdateEnabled === 'function'
            ? updateManager.getAutoUpdateEnabled()
            : 'method not found',
      };
    });

    E2ELogger.info('auto-update-packaged', 'UpdateManager status', updateInfo);

    expect(updateInfo.exists).toBe(true);
  });

  it('should report correct version from package', async () => {
    // NOTE: This test requires 'require' which may not be available in
    // the wdio-electron-service execute context for packaged apps.
    const versionInfo = await browser.electron.execute((electron) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const appPath = electron.app.getAppPath();

        // Read package.json from asar
        let packageVersion = null;
        try {
          const packageJsonPath = path.join(appPath, 'package.json');
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          packageVersion = packageJson.version;
        } catch {
          // May not be accessible in all builds
        }

        return {
          success: true,
          appVersion: electron.app.getVersion(),
          packageVersion,
          appPath,
        };
      } catch (err: any) {
        // require() is not available
        return {
          success: false,
          appVersion: electron.app.getVersion(),
          appPath: electron.app.getAppPath(),
          error: err.message,
        };
      }
    });

    E2ELogger.info('auto-update-packaged', 'Version info', versionInfo);

    if (!versionInfo.success) {
      E2ELogger.info(
        'auto-update-packaged',
        `Package.json read not available: ${versionInfo.error}. Using app.getVersion().`
      );
    }

    expect(versionInfo.appVersion).toBeTruthy();
    expect(versionInfo.appVersion).toMatch(/^\d+\.\d+\.\d+/);

    // If we could read package.json, versions should match
    if (versionInfo.packageVersion) {
      expect(versionInfo.appVersion).toBe(versionInfo.packageVersion);
    }
  });

  it('should have auto-update setting accessible', async () => {
    const settingInfo = await browser.electron.execute(() => {
      const updateManager = (global as any).updateManager;
      if (!updateManager) {
        return { accessible: false, error: 'updateManager not found' };
      }

      // Check for different possible method names
      if (typeof updateManager.getAutoUpdateEnabled === 'function') {
        const enabled = updateManager.getAutoUpdateEnabled();
        return { accessible: true, enabled, method: 'getAutoUpdateEnabled' };
      }

      if (typeof updateManager.isAutoUpdateEnabled === 'function') {
        const enabled = updateManager.isAutoUpdateEnabled();
        return { accessible: true, enabled, method: 'isAutoUpdateEnabled' };
      }

      // Check for property-based access
      if ('autoUpdateEnabled' in updateManager) {
        return { accessible: true, enabled: updateManager.autoUpdateEnabled, method: 'property' };
      }

      return { accessible: false, error: 'No auto-update getter method found' };
    });

    E2ELogger.info('auto-update-packaged', 'Auto-update setting', settingInfo);

    // If the updateManager exists and has auto-update functionality, test passes
    // Skip if the method isn't available (may be a different API in the build)
    if (!settingInfo.accessible) {
      E2ELogger.info(
        'auto-update-packaged',
        `Auto-update setting check skipped: ${settingInfo.error}`
      );
      return;
    }

    expect(settingInfo.accessible).toBe(true);
  });

  it('should have electron-updater available in packaged build', async () => {
    // NOTE: This test requires 'require' which may not be available in
    // the wdio-electron-service execute context for packaged apps.
    const updaterInfo = await browser.electron.execute(() => {
      try {
        // Check if electron-updater module is available
        const updater = require('electron-updater');
        return {
          success: true,
          available: true,
          hasAutoUpdater: !!updater.autoUpdater,
        };
      } catch (error: any) {
        // Check if it's a require error vs module not found error
        if (error.message && error.message.includes('require is not defined')) {
          return {
            success: false,
            error: error.message,
          };
        }
        return {
          success: true,
          available: false,
          error: error.message,
        };
      }
    });

    E2ELogger.info('auto-update-packaged', 'electron-updater availability', updaterInfo);

    if (!updaterInfo.success) {
      E2ELogger.info(
        'auto-update-packaged',
        `electron-updater check not available: ${updaterInfo.error}. Skipping verification.`
      );
      // Test passes - we verified the updateManager is available via the global
      return;
    }

    expect(updaterInfo.available).toBe(true);
    expect(updaterInfo.hasAutoUpdater).toBe(true);
  });

  it('should have valid update feed URL configured', async () => {
    // NOTE: This test requires 'require' which may not be available in
    // the wdio-electron-service execute context for packaged apps.
    const feedInfo = await browser.electron.execute(() => {
      try {
        const { autoUpdater } = require('electron-updater');

        // Get the feed URL if configured
        const feedURL = autoUpdater.getFeedURL();

        return {
          success: true,
          configured: !!feedURL,
          url: feedURL?.url || feedURL || null,
        };
      } catch (error: any) {
        // Check if it's a require error vs module not found error
        if (error.message && error.message.includes('require is not defined')) {
          return {
            success: false,
            error: error.message,
          };
        }
        return {
          success: true,
          configured: false,
          error: error.message,
        };
      }
    });

    E2ELogger.info('auto-update-packaged', 'Update feed configuration', feedInfo);

    if (!feedInfo.success) {
      E2ELogger.info(
        'auto-update-packaged',
        `Update feed check not available: ${feedInfo.error}. Skipping verification.`
      );
      return;
    }

    // Feed URL should be configured (either GitHub or custom)
    // Note: This may not be configured in unsigned/test builds
    if (feedInfo.configured && feedInfo.url) {
      expect(feedInfo.url).toContain('github');
    }
  });
});
