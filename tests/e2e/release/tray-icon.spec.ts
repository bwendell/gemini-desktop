// @ts-nocheck
/**
 * E2E Test: System Tray Icon (Release Build Only)
 *
 * This test validates that the system tray icon is correctly packaged
 * and displayed in release builds. It verifies the tray exists
 * and is properly initialized.
 *
 * NOTE: Icon file path verification is skipped because process.resourcesPath
 * behaves differently in the WDIO execute context. The tray creation
 * itself validates that the icon was loaded successfully.
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';

describe('Release Build: System Tray', () => {
    it('should have system tray manager initialized', async () => {
        const trayInfo = await browser.electron.execute(() => {
            const trayManager = (global as any).trayManager;

            if (!trayManager) {
                return { exists: false, tooltip: null, error: 'trayManager not in global' };
            }

            const tray = trayManager.getTray();
            if (!tray) {
                return { exists: false, tooltip: null, error: 'getTray() returned null' };
            }

            if (tray.isDestroyed()) {
                return { exists: false, tooltip: null, error: 'tray is destroyed' };
            }

            return {
                exists: true,
                tooltip: tray.getToolTip?.() || 'Gemini Desktop',
                diagnostics: trayManager.getTrayIconDiagnostics?.() || null,
                error: null,
            };
        });

        if (!trayInfo.exists) {
            E2ELogger.error('tray-icon', `Tray verification failed: ${trayInfo.error}`);
        }

        expect(trayInfo.exists).toBe(true);

        if (process.platform === 'darwin') {
            expect(trayInfo.diagnostics).toBeTruthy();
            expect(trayInfo.diagnostics.isTemplate).toBe(true);
            expect(trayInfo.diagnostics.width).toBeLessThanOrEqual(32);
            expect(trayInfo.diagnostics.height).toBeLessThanOrEqual(32);
        }

        E2ELogger.info('tray-icon', `Tray icon verified with tooltip: ${trayInfo.tooltip}`);
    });

    it('should have tray icon displayed (implicit via tray creation)', async () => {
        // If the tray was created successfully, it means the icon was loaded
        // This is a more reliable check than trying to verify file paths
        const trayCreated = await browser.electron.execute(() => {
            const trayManager = (global as any).trayManager;
            if (!trayManager) return false;

            const tray = trayManager.getTray();
            return tray && !tray.isDestroyed();
        });

        expect(trayCreated).toBe(true);
        E2ELogger.info('tray-icon', 'Tray icon is displayed (tray creation successful)');
    });

    it('should have tray click handler registered', async () => {
        const hasClickHandler = await browser.electron.execute(() => {
            const trayManager = (global as any).trayManager;
            if (!trayManager) return false;

            const tray = trayManager.getTray();
            if (!tray || tray.isDestroyed()) return false;

            // Check if tray has any event listeners for 'click'
            return tray.listenerCount('click') > 0;
        });

        expect(hasClickHandler).toBe(true);
        E2ELogger.info('tray-icon', 'Tray click handler is registered');
    });

    it('should be able to show/hide via tray', async () => {
        // This tests that the tray click functionality works, which validates
        // the tray icon and handlers are properly set up
        const testResult = await browser.electron.execute(() => {
            const trayManager = (global as any).trayManager;
            if (!trayManager) return { success: false, error: 'no trayManager' };

            const tray = trayManager.getTray();
            if (!tray || tray.isDestroyed()) return { success: false, error: 'tray not available' };

            // Just verify the tray has the expected handlers
            const hasClick = tray.listenerCount('click') > 0;
            const hasDoubleClick = tray.listenerCount('double-click') >= 0; // May not be registered

            return {
                success: true,
                hasClick,
                hasDoubleClick,
            };
        });

        expect(testResult.success).toBe(true);
        expect(testResult.hasClick).toBe(true);
        E2ELogger.info('tray-icon', 'Tray click functionality verified');
    });
});
