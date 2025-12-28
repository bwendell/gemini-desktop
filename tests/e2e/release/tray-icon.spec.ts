/**
 * E2E Test: System Tray Icon (Release Build Only)
 *
 * This test validates that the system tray icon is correctly packaged
 * and displayed in release builds. It actually verifies the tray exists
 * and is properly initialized.
 *
 * Platform Support:
 * - Windows: Expects .ico file in resources
 * - macOS: Expects .png file in resources
 * - Linux: Expects .png file in resources
 */

import { expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';
import { TrayPage } from '../pages';

describe('Release Build: System Tray', () => {
  const tray = new TrayPage();

  it('should have system tray manager initialized', async () => {
    const trayInfo = await tray.verifyManagerInitialized();

    if (!trayInfo.exists) {
      E2ELogger.error('tray-icon', `Tray verification failed: ${trayInfo.error}`);
    }

    expect(trayInfo.exists).withContext(`Tray check: ${trayInfo.error}`).toBe(true);
    expect(trayInfo.tooltip).toContain('Gemini');
    E2ELogger.info('tray-icon', `Tray icon verified with tooltip: ${trayInfo.tooltip}`);
  });

  it('should have icon file at correct path', async () => {
    const iconInfo = await tray.getIconFileInfo();

    E2ELogger.info('tray-icon', `Icon path: ${iconInfo.path}`);
    E2ELogger.info('tray-icon', `Resources path: ${iconInfo.resourcesPath}`);
    E2ELogger.info('tray-icon', `Icon exists: ${iconInfo.exists}`);

    expect(iconInfo.exists).withContext(`Icon file should exist at ${iconInfo.path}`).toBe(true);
  });

  it('should load icon file with valid content', async () => {
    const iconData = await tray.getIconFileDetails();

    expect(iconData.exists).toBe(true);
    expect(iconData.isFile).toBe(true);
    expect(iconData.size).toBeGreaterThan(1000); // Icon should be at least 1KB
    E2ELogger.info('tray-icon', `Icon file size: ${iconData.size} bytes`);
  });

  it('should have tray click handler registered', async () => {
    const hasClickHandler = await tray.hasClickHandler();

    expect(hasClickHandler).toBe(true);
    E2ELogger.info('tray-icon', 'Tray click handler is registered');
  });

  it('should have context menu attached to tray', async () => {
    const hasContextMenu = await tray.hasContextMenu();

    expect(hasContextMenu).toBe(true);
    E2ELogger.info('tray-icon', 'Tray context menu is attached');
  });
});
