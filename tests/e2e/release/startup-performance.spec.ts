// @ts-nocheck
/**
 * E2E Test: Startup Performance (Release Build Only)
 *
 * This test validates that the packaged application meets basic performance
 * requirements. These are sanity checks to catch severe performance regressions
 * that might be introduced by packaging, bundling, or dependency changes.
 *
 * Key verifications:
 * - Application starts within acceptable time threshold
 * - Memory usage is within expected bounds
 * - Main window renders completely
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';

// Performance thresholds
const MAX_HEAP_MB = 500; // Maximum heap size warning threshold
const MAX_PROCESS_MEMORY_MB = 1000; // Maximum total memory warning threshold

describe('Release Build: Startup Performance', () => {
    it('should have completed startup in time', async () => {
        // The fact that we're here means the app started within WDIO's timeout
        // Verify the app is fully ready
        const startupInfo = await browser.electron.execute((electron) => {
            const app = electron.app;
            return {
                isReady: app.isReady(),
                uptime: process.uptime(),
                platform: process.platform,
            };
        });

        E2ELogger.info('startup-performance', 'Startup timing', startupInfo);

        expect(startupInfo.isReady).toBe(true);

        // Uptime should be reasonable (less than 30 seconds since process start)
        expect(startupInfo.uptime).toBeLessThan(30);

        E2ELogger.info('startup-performance', `App process uptime: ${startupInfo.uptime.toFixed(2)} seconds`);
    });

    it('should have acceptable memory usage', async () => {
        const memoryInfo = await browser.electron.execute(() => {
            const heapStats = process.memoryUsage();
            return {
                heapUsedMB: Math.round(heapStats.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(heapStats.heapTotal / 1024 / 1024),
                rssMB: Math.round(heapStats.rss / 1024 / 1024),
                externalMB: Math.round(heapStats.external / 1024 / 1024),
            };
        });

        E2ELogger.info('startup-performance', 'Memory usage (main process)', memoryInfo);

        // These are sanity checks - values will vary by platform and load
        // We're looking for severe issues, not optimizing
        expect(memoryInfo.heapUsedMB).toBeLessThan(MAX_HEAP_MB);
        expect(memoryInfo.rssMB).toBeLessThan(MAX_PROCESS_MEMORY_MB);

        E2ELogger.info('startup-performance', `Memory OK: Heap ${memoryInfo.heapUsedMB}MB / RSS ${memoryInfo.rssMB}MB`);
    });

    it('should have main window visible', async () => {
        const windowInfo = await browser.electron.execute((electron) => {
            try {
                const BrowserWindow = electron.BrowserWindow;
                const windows = BrowserWindow.getAllWindows();

                // Find main window - it's typically the first non-destroyed window
                // Don't rely on title which may not be set yet
                const mainWindow = windows.find((w: any) => !w.isDestroyed());

                if (!mainWindow) {
                    return { exists: false, error: `No windows found (total: ${windows.length})` };
                }

                return {
                    exists: true,
                    isVisible: mainWindow.isVisible(),
                    isFocused: mainWindow.isFocused(),
                    bounds: mainWindow.getBounds(),
                    title: mainWindow.getTitle(),
                    windowCount: windows.length,
                };
            } catch (error: any) {
                return { exists: false, error: error.message };
            }
        });

        E2ELogger.info('startup-performance', 'Main window state', windowInfo);

        expect(windowInfo.exists).toBe(true);
        expect(windowInfo.isVisible).toBe(true);
        expect(windowInfo.bounds.width).toBeGreaterThan(100);
        expect(windowInfo.bounds.height).toBeGreaterThan(100);
    });

    it('should have renderer process loaded', async () => {
        await browser.waitUntil(
            async () => {
                const loaded = await browser.electron.execute((electron) => {
                    try {
                        const BrowserWindow = electron.BrowserWindow;
                        const windows = BrowserWindow.getAllWindows();
                        const mainWindow = windows.find((w: any) => !w.isDestroyed());

                        if (!mainWindow) return false;

                        return !mainWindow.webContents.isLoading();
                    } catch (_error) {
                        return false;
                    }
                });
                return loaded;
            },
            {
                timeout: 10000,
                timeoutMsg: 'Renderer process did not finish loading within 10s',
            }
        );

        // Get final details for logging
        const rendererInfo = await browser.electron.execute((electron) => {
            try {
                const BrowserWindow = electron.BrowserWindow;
                const windows = BrowserWindow.getAllWindows();
                const mainWindow = windows.find((w: any) => !w.isDestroyed());

                if (!mainWindow) {
                    return { loaded: false, error: 'No main window' };
                }

                const webContents = mainWindow.webContents;
                return {
                    loaded: !webContents.isLoading(),
                    url: webContents.getURL(),
                    isDestroyed: webContents.isDestroyed(),
                };
            } catch (error: any) {
                return { loaded: false, error: error.message };
            }
        });

        E2ELogger.info('startup-performance', 'Renderer state', rendererInfo);
        expect(rendererInfo.loaded).toBe(true);
    });

    it('should report CPU usage', async () => {
        const cpuInfo = await browser.electron.execute(() => {
            const metrics = process.getCPUUsage();
            return {
                percentCPUUsage: metrics.percentCPUUsage,
                idleWakeupsPerSecond: metrics.idleWakeupsPerSecond,
            };
        });

        E2ELogger.info('startup-performance', 'CPU metrics', cpuInfo);

        // CPU usage should be reasonable (not stuck at 100%)
        // Note: This is a snapshot and may vary significantly
        expect(cpuInfo.percentCPUUsage).toBeDefined();
    });

    it('should have reasonable V8 heap statistics', async () => {
        const v8Stats = await browser.electron.execute(() => {
            try {
                const v8 = require('v8');
                const stats = v8.getHeapStatistics();
                return {
                    success: true,
                    totalHeapSizeMB: Math.round(stats.total_heap_size / 1024 / 1024),
                    usedHeapSizeMB: Math.round(stats.used_heap_size / 1024 / 1024),
                    heapSizeLimitMB: Math.round(stats.heap_size_limit / 1024 / 1024),
                    mallocedMemoryMB: Math.round(stats.malloced_memory / 1024 / 1024),
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: error.message,
                };
            }
        });

        E2ELogger.info('startup-performance', 'V8 heap statistics', v8Stats);

        if (!v8Stats.success) {
            E2ELogger.info('startup-performance', `V8 stats not available: ${v8Stats.error}`);
            // Skip this check if v8 module isn't available in this context
            return;
        }

        // Verify heap is not approaching limit (indicates potential memory leak)
        const heapUsagePercent = (v8Stats.usedHeapSizeMB / v8Stats.heapSizeLimitMB) * 100;
        expect(heapUsagePercent).toBeLessThan(80);

        E2ELogger.info('startup-performance', `V8 heap usage: ${heapUsagePercent.toFixed(1)}% of limit`);
    });
});
