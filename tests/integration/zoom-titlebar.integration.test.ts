/**
 * Integration tests for Zoom Titlebar functionality.
 *
 * Tests the zoom level control via renderer API (window.electronAPI):
 * - getZoomLevel() returns current zoom
 * - zoomIn() increases zoom
 * - zoomOut() decreases zoom
 * - zoom-level-changed event received in renderer
 *
 * Tasks covered: 9.4.1 - 9.4.4
 */

import { browser, expect } from '@wdio/globals';

describe('Zoom Titlebar Integration', () => {
    const DEFAULT_ZOOM = 100;

    const resetZoomState = async () => {
        console.log('--- RESETTING ZOOM STATE ---');

        // 1. Force a change to 150% and VERIFY it applied
        await browser.electron.execute(() => {
            // @ts-expect-error
            global.windowManager.setZoomLevel(150);
            // @ts-expect-error
            if (global.windowManager.getZoomLevel() !== 150) {
                throw new Error(
                    `Failed to set intermediate zoom. Expected 150, got ${
                        // @ts-expect-error
                        global.windowManager.getZoomLevel()
                    }`
                );
            }
        });

        await browser.pause(100);

        // 2. Set to default (100%) and VERIFY it applied
        await browser.electron.execute(() => {
            // @ts-expect-error
            global.windowManager.setZoomLevel(100);

            // @ts-expect-error
            if (global.windowManager.getZoomLevel() !== 100) {
                throw new Error(
                    `Failed to set default zoom. Expected 100, got ${
                        // @ts-expect-error
                        global.windowManager.getZoomLevel()
                    }`
                );
            }

            // @ts-expect-error - Explicitly sync store as backup
            global.ipcManager.store.set('zoomLevel', 100);
        });

        // Wait for zoom change events to propagate to renderer
        await browser.pause(300);
    };

    beforeEach(async () => {
        await resetZoomState();
    });

    before(async () => {
        // Wait for app ready
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        // Ensure renderer is ready
        await browser.execute(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });

        // Wait for the app to be fully initialized
        await browser.pause(500);
    });

    afterEach(async () => {
        // Clean up any test event listeners
        await browser.execute(() => {
            if ((window as any).__testZoomUnsubscribe) {
                (window as any).__testZoomUnsubscribe();
                delete (window as any).__testZoomUnsubscribe;
            }
            if ((window as any).__testZoomEvents) {
                delete (window as any).__testZoomEvents;
            }
        });
    });

    describe('9.4.1 - window.electronAPI.getZoomLevel() returns current zoom', () => {
        it('should return default zoom level (100%)', async () => {
            const zoomLevel = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(zoomLevel).toBe(100);
        });

        it('should return updated zoom level after change', async () => {
            // Set zoom to 150% via main process
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(150);
            });

            await browser.pause(100);

            // Read via renderer API
            const zoomLevel = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(zoomLevel).toBe(150);
        });

        it('should return correct zoom after multiple changes', async () => {
            // Set different zoom levels sequentially
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(75);
            });
            await browser.pause(50);

            let zoomLevel = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(zoomLevel).toBe(75);

            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(125);
            });
            await browser.pause(50);

            zoomLevel = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(zoomLevel).toBe(125);
        });
    });

    describe('9.4.2 - window.electronAPI.zoomIn() increases zoom', () => {
        it('should increase zoom from 100% to 110%', async () => {
            // Ensure we start at 100%
            const initialZoom = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(initialZoom).toBe(100);

            // Call zoomIn via renderer API
            const newZoom = await browser.execute(() => window.electronAPI.zoomIn());

            // Should return 110% (next step after 100%)
            expect(newZoom).toBe(110);
        });

        it('should update actual webContents zoom factor after zoomIn', async () => {
            // Call zoomIn
            await browser.execute(() => window.electronAPI.zoomIn());
            await browser.pause(100);

            // Verify webContents zoom factor
            const zoomFactor = await browser.electron.execute(() => {
                // @ts-expect-error
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });

            // 110% = 1.1 zoom factor
            expect(zoomFactor).toBeCloseTo(1.1, 2);
        });

        it('should cap at 200% maximum', async () => {
            // Set to 200% first
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(200);
            });
            await browser.pause(50);

            // Try to zoom in further
            const newZoom = await browser.execute(() => window.electronAPI.zoomIn());

            // Should still be 200%
            expect(newZoom).toBe(200);
        });

        it('should progress through zoom steps correctly', async () => {
            // Start at 100%, zoom in twice
            let zoom = await browser.execute(() => window.electronAPI.zoomIn());
            expect(zoom).toBe(110);

            zoom = await browser.execute(() => window.electronAPI.zoomIn());
            expect(zoom).toBe(125);
        });
    });

    describe('9.4.3 - window.electronAPI.zoomOut() decreases zoom', () => {
        it('should decrease zoom from 100% to 90%', async () => {
            // Ensure we start at 100%
            const initialZoom = await browser.execute(() => window.electronAPI.getZoomLevel());
            expect(initialZoom).toBe(100);

            // Call zoomOut via renderer API
            const newZoom = await browser.execute(() => window.electronAPI.zoomOut());

            // Should return 90% (previous step before 100%)
            expect(newZoom).toBe(90);
        });

        it('should update actual webContents zoom factor after zoomOut', async () => {
            // Call zoomOut
            await browser.execute(() => window.electronAPI.zoomOut());
            await browser.pause(100);

            // Verify webContents zoom factor
            const zoomFactor = await browser.electron.execute(() => {
                // @ts-expect-error
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });

            // 90% = 0.9 zoom factor
            expect(zoomFactor).toBeCloseTo(0.9, 2);
        });

        it('should cap at 50% minimum', async () => {
            // Set to 50% first
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(50);
            });
            await browser.pause(50);

            // Try to zoom out further
            const newZoom = await browser.execute(() => window.electronAPI.zoomOut());

            // Should still be 50%
            expect(newZoom).toBe(50);
        });

        it('should progress through zoom steps correctly', async () => {
            // Start at 100%, zoom out twice
            let zoom = await browser.execute(() => window.electronAPI.zoomOut());
            expect(zoom).toBe(90);

            zoom = await browser.execute(() => window.electronAPI.zoomOut());
            expect(zoom).toBe(80);
        });
    });

    describe('9.4.4 - Zoom level change event received in renderer', () => {
        it('should receive zoom-level-changed event after zoomIn', async () => {
            // Set up event listener and track received events
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                (window as any).__testZoomUnsubscribe = window.electronAPI.onZoomLevelChanged((level: number) => {
                    (window as any).__testZoomEvents.push(level);
                });
            });

            await browser.pause(50);

            // Trigger zoom change via zoomIn
            await browser.execute(() => window.electronAPI.zoomIn());

            await browser.pause(100);

            // Check if event was received
            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events).toContain(110);

            // Clean up
            await browser.execute(() => {
                if ((window as any).__testZoomUnsubscribe) {
                    (window as any).__testZoomUnsubscribe();
                }
                delete (window as any).__testZoomEvents;
                delete (window as any).__testZoomUnsubscribe;
            });
        });

        it('should receive zoom-level-changed event after zoomOut', async () => {
            // Set up event listener
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                (window as any).__testZoomUnsubscribe = window.electronAPI.onZoomLevelChanged((level: number) => {
                    (window as any).__testZoomEvents.push(level);
                });
            });

            await browser.pause(50);

            // Trigger zoom change via zoomOut
            await browser.execute(() => window.electronAPI.zoomOut());

            await browser.pause(100);

            // Check if event was received
            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events).toContain(90);

            // Clean up
            await browser.execute(() => {
                if ((window as any).__testZoomUnsubscribe) {
                    (window as any).__testZoomUnsubscribe();
                }
                delete (window as any).__testZoomEvents;
                delete (window as any).__testZoomUnsubscribe;
            });
        });

        it('should receive event when zoom changed via main process', async () => {
            // Set up event listener
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                (window as any).__testZoomUnsubscribe = window.electronAPI.onZoomLevelChanged((level: number) => {
                    (window as any).__testZoomEvents.push(level);
                });
            });

            await browser.pause(50);

            // Trigger zoom change via main process
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.setZoomLevel(175);
            });

            await browser.pause(100);

            // Check if event was received
            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events).toContain(175);

            // Clean up
            await browser.execute(() => {
                if ((window as any).__testZoomUnsubscribe) {
                    (window as any).__testZoomUnsubscribe();
                }
                delete (window as any).__testZoomEvents;
                delete (window as any).__testZoomUnsubscribe;
            });
        });

        it('should unsubscribe correctly', async () => {
            // Set up and immediately unsubscribe
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                const unsubscribe = window.electronAPI.onZoomLevelChanged((level: number) => {
                    (window as any).__testZoomEvents.push(level);
                });
                // Immediately unsubscribe
                unsubscribe();
            });

            await browser.pause(50);

            // Trigger zoom change
            await browser.execute(() => window.electronAPI.zoomIn());

            await browser.pause(100);

            // Should not have received any events after unsubscribe
            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events.length).toBe(0);

            // Clean up
            await browser.execute(() => {
                delete (window as any).__testZoomEvents;
            });
        });
    });
});
