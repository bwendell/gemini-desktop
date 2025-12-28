// @ts-nocheck
/**
 * E2E Test: Packaged Resources (Release Build Only)
 *
 * This test validates that all required assets are correctly packaged
 * in the release build. Catches issues where files are missing from
 * the electron-builder extraFiles configuration.
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';

describe('Release Build: Packaged Resources', () => {
  it('should start the application successfully', async () => {
    const isReady = await browser.electron.execute((electron) => {
      return electron.app.isReady();
    });
    expect(isReady).toBe(true);

    E2ELogger.info('packaged-resources', 'Application started successfully from package');
  });

  it('should have the correct app name from package', async () => {
    const appName = await browser.electron.execute((electron) => {
      return electron.app.getName();
    });

    expect(appName).toBe('Gemini Desktop');
    E2ELogger.info('packaged-resources', `App name: ${appName}`);
  });

  it('should have a valid app path', async () => {
    const appPath = await browser.electron.execute((electron) => {
      return electron.app.getAppPath();
    });

    expect(appPath).toBeTruthy();
    expect(typeof appPath).toBe('string');

    E2ELogger.info('packaged-resources', `App path: ${appPath}`);
  });

  it('should be running as a packaged app', async () => {
    const isPackaged = await browser.electron.execute((electron) => {
      return electron.app.isPackaged;
    });

    expect(isPackaged).toBe(true);
    E2ELogger.info('packaged-resources', 'App is running in packaged mode');
  });

  it('should have valid resources directory', async () => {
    const resourcesInfo = await browser.electron.execute(() => {
      const resourcesPath = process.resourcesPath;
      const exists = require('fs').existsSync(resourcesPath);
      const isDir = exists && require('fs').statSync(resourcesPath).isDirectory();
      
      return {
        path: resourcesPath,
        exists,
        isDirectory: isDir,
      };
    });

    expect(resourcesInfo.exists).toBe(true);
    expect(resourcesInfo.isDirectory).toBe(true);
    E2ELogger.info('packaged-resources', `Resources path: ${resourcesInfo.path}`);
  });

  it('should have icon files in resources directory', async () => {
    const iconInfo = await browser.electron.execute(() => {
      const fs = require('fs');
      const path = require('path');
      const resourcesPath = process.resourcesPath;
      
      const hasIco = fs.existsSync(path.join(resourcesPath, 'icon.ico'));
      const hasPng = fs.existsSync(path.join(resourcesPath, 'icon.png'));
      
      // List all files in resources for debugging
      const files = fs.readdirSync(resourcesPath);
      
      return {
        hasIco,
        hasPng,
        files,
        platform: process.platform,
      };
    });

    E2ELogger.info('packaged-resources', `Resources contents: ${iconInfo.files.join(', ')}`);

    // Platform-specific checks
    if (iconInfo.platform === 'win32') {
      expect(iconInfo.hasIco).withContext('Windows should have icon.ico').toBe(true);
    } else {
      expect(iconInfo.hasPng).withContext('macOS/Linux should have icon.png').toBe(true);
    }
  });

  it('should have preload script accessible', async () => {
    const preloadInfo = await browser.electron.execute(() => {
      const fs = require('fs');
      const path = require('path');
      
      // Preload is inside the asar at dist-electron/preload/preload.cjs
      const appPath = require('electron').app.getAppPath();
      const preloadPath = path.join(appPath, 'dist-electron/preload/preload.cjs');
      
      // Check if it exists (handles asar transparently)
      const exists = fs.existsSync(preloadPath);
      
      return {
        path: preloadPath,
        exists,
        appPath,
      };
    });

    E2ELogger.info('packaged-resources', `Preload path: ${preloadInfo.path}`);
    expect(preloadInfo.exists).withContext('Preload script should exist in package').toBe(true);
  });

  it('should have main process entry point', async () => {
    const mainInfo = await browser.electron.execute(() => {
      const fs = require('fs');
      const path = require('path');
      const appPath = require('electron').app.getAppPath();
      const mainPath = path.join(appPath, 'dist-electron/main/main.cjs');
      
      return {
        path: mainPath,
        exists: fs.existsSync(mainPath),
      };
    });

    expect(mainInfo.exists).withContext('Main entry point should exist').toBe(true);
    E2ELogger.info('packaged-resources', `Main entry point verified: ${mainInfo.path}`);
  });

  it('should have dist folder with index.html', async () => {
    const distInfo = await browser.electron.execute(() => {
      const fs = require('fs');
      const path = require('path');
      const appPath = require('electron').app.getAppPath();
      const indexPath = path.join(appPath, 'dist/index.html');
      
      return {
        path: indexPath,
        exists: fs.existsSync(indexPath),
      };
    });

    expect(distInfo.exists).withContext('index.html should exist in dist').toBe(true);
    E2ELogger.info('packaged-resources', `Index.html verified: ${distInfo.path}`);
  });
});
