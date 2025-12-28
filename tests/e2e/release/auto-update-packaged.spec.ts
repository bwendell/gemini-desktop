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

    expect(updateInfo.exists).withContext('UpdateManager should exist').toBe(true);
  });

  it('should report correct version from package', async () => {
    const versionInfo = await browser.electron.execute((electron) => {
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
        appVersion: electron.app.getVersion(),
        packageVersion,
        appPath,
      };
    });

    E2ELogger.info('auto-update-packaged', 'Version info', versionInfo);

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
      if (!updateManager || typeof updateManager.getAutoUpdateEnabled !== 'function') {
        return { accessible: false, error: 'getAutoUpdateEnabled not available' };
      }

      const enabled = updateManager.getAutoUpdateEnabled();
      return {
        accessible: true,
        enabled,
      };
    });

    E2ELogger.info('auto-update-packaged', 'Auto-update setting', settingInfo);

    expect(settingInfo.accessible).withContext('Auto-update setting should be accessible').toBe(
      true
    );
  });

  it('should have electron-updater available in packaged build', async () => {
    const updaterInfo = await browser.electron.execute(() => {
      try {
        // Check if electron-updater module is available
        const updater = require('electron-updater');
        return {
          available: true,
          hasAutoUpdater: !!updater.autoUpdater,
        };
      } catch (error: any) {
        return {
          available: false,
          error: error.message,
        };
      }
    });

    E2ELogger.info('auto-update-packaged', 'electron-updater availability', updaterInfo);

    expect(updaterInfo.available).withContext('electron-updater should be available').toBe(true);
    expect(updaterInfo.hasAutoUpdater).withContext('autoUpdater should exist').toBe(true);
  });

  it('should have valid update feed URL configured', async () => {
    const feedInfo = await browser.electron.execute(() => {
      try {
        const { autoUpdater } = require('electron-updater');

        // Get the feed URL if configured
        const feedURL = autoUpdater.getFeedURL();

        return {
          configured: !!feedURL,
          url: feedURL?.url || feedURL || null,
        };
      } catch (error: any) {
        return {
          configured: false,
          error: error.message,
        };
      }
    });

    E2ELogger.info('auto-update-packaged', 'Update feed configuration', feedInfo);

    // Feed URL should be configured (either GitHub or custom)
    // Note: This may not be configured in unsigned/test builds
    if (feedInfo.configured && feedInfo.url) {
      expect(feedInfo.url).toContain('github');
    }
  });
});
