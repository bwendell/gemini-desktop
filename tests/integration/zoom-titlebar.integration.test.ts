/**
 * Integration tests for Zoom Titlebar functionality.
 *
 * Tests the zoom level control via renderer API ((window as any).electronAPI):
 * - getZoomLevel() returns current zoom
 * - zoomIn() increases zoom
 * - zoomOut() decreases zoom
 * - zoom-level-changed event received in renderer
 *
 * Tasks covered: 9.4.1 - 9.4.4
 */

import { browser, expect } from '@wdio/globals';

describe('Zoom Titlebar Integration', () => {
    const resetZoomState = async () => {
        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.setZoomLevel(150);
            if ((global as any).appContext.windowManager.getZoomLevel() !== 150) {
                throw new Error(
                    `Failed to set intermediate zoom. Expected 150, got ${(
                        global as any
                    ).appContext.windowManager.getZoomLevel()}`
                );
            }
        });

        await browser.waitUntil(
            async () => {
                const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                return zoomLevel === 150;
            },
            { timeout: 3000, timeoutMsg: 'Zoom level did not update to 150 during reset', interval: 100 }
        );

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.setZoomLevel(100);

            if ((global as any).appContext.windowManager.getZoomLevel() !== 100) {
                throw new Error(
                    `Failed to set default zoom. Expected 100, got ${(
                        global as any
                    ).appContext.windowManager.getZoomLevel()}`
                );
            }

            (global as any).appContext.ipcManager.store.set('zoomLevel', 100);
        });

        await browser.waitUntil(
            async () => {
                const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                return zoomLevel === 100;
            },
            { timeout: 3000, timeoutMsg: 'Zoom level did not reset to 100', interval: 100 }
        );
    };

    beforeEach(async () => {
        await resetZoomState();
    });

    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        await browser.execute(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });
    });

    afterEach(async () => {
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

    describe('9.4.1 - (window as any).electronAPI.getZoomLevel() returns current zoom', () => {
        it('should return updated zoom level after change', async () => {
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.setZoomLevel(150);
            });

            await browser.waitUntil(
                async () => {
                    const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                    return zoomLevel === 150;
                },
                { timeout: 3000, timeoutMsg: 'Renderer API did not report updated zoom level', interval: 100 }
            );

            const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
            expect(zoomLevel).toBe(150);
        });
    });

    describe('9.4.2 - (window as any).electronAPI.zoomIn() increases zoom', () => {
        it('should increase zoom from 100% to 110%', async () => {
            const initialZoom = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
            expect(initialZoom).toBe(100);

            const newZoom = await browser.execute(() => (window as any).electronAPI.zoomIn());

            await browser.waitUntil(
                async () => {
                    const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                    return zoomLevel === 110;
                },
                { timeout: 3000, timeoutMsg: 'Zoom level did not increase to 110 after zoomIn()', interval: 100 }
            );

            expect(newZoom).toBe(110);
        });
    });

    describe('9.4.3 - (window as any).electronAPI.zoomOut() decreases zoom', () => {
        it('should decrease zoom from 100% to 90%', async () => {
            const initialZoom = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
            expect(initialZoom).toBe(100);

            const newZoom = await browser.execute(() => (window as any).electronAPI.zoomOut());

            await browser.waitUntil(
                async () => {
                    const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                    return zoomLevel === 90;
                },
                { timeout: 3000, timeoutMsg: 'Zoom level did not decrease to 90 after zoomOut()', interval: 100 }
            );

            expect(newZoom).toBe(90);
        });
    });

    describe('9.4.4 - Zoom level change event received in renderer', () => {
        it('should receive zoom-level-changed event after zoomIn', async () => {
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                (window as any).__testZoomUnsubscribe = (window as any).electronAPI.onZoomLevelChanged(
                    (level: number) => {
                        (window as any).__testZoomEvents.push(level);
                    }
                );
            });

            await browser.execute(() => (window as any).electronAPI.zoomIn());

            await browser.waitUntil(
                async () => {
                    const events = await browser.execute(() => (window as any).__testZoomEvents);
                    return Array.isArray(events) && events.includes(110);
                },
                { timeout: 3000, timeoutMsg: 'Renderer did not receive zoom-level-changed event', interval: 100 }
            );

            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events).toContain(110);

            await browser.execute(() => {
                if ((window as any).__testZoomUnsubscribe) {
                    (window as any).__testZoomUnsubscribe();
                }
                delete (window as any).__testZoomEvents;
                delete (window as any).__testZoomUnsubscribe;
            });
        });

        it('should unsubscribe correctly', async () => {
            await browser.execute(() => {
                (window as any).__testZoomEvents = [];
                const unsubscribe = (window as any).electronAPI.onZoomLevelChanged((level: number) => {
                    (window as any).__testZoomEvents.push(level);
                });
                unsubscribe();
            });

            await browser.execute(() => (window as any).electronAPI.zoomIn());

            await browser.waitUntil(
                async () => {
                    const zoomLevel = await browser.execute(() => (window as any).electronAPI.getZoomLevel());
                    return zoomLevel === 110;
                },
                {
                    timeout: 3000,
                    timeoutMsg: 'Zoom level did not increase to 110 after zoomIn() during unsubscribe test',
                    interval: 100,
                }
            );

            await browser.waitUntil(
                async () => {
                    const events = await browser.execute(() => (window as any).__testZoomEvents);
                    return Array.isArray(events) && events.length === 0;
                },
                { timeout: 3000, timeoutMsg: 'Received zoom events after unsubscribe', interval: 100 }
            );

            await browser.waitUntil(
                async () => {
                    const events = await browser.execute(() => (window as any).__testZoomEvents);
                    return Array.isArray(events) && events.length === 0;
                },
                {
                    timeout: 400,
                    timeoutMsg: 'Zoom events were emitted after unsubscribe stability window',
                    interval: 100,
                }
            );

            const events = await browser.execute(() => (window as any).__testZoomEvents);
            expect(events.length).toBe(0);

            await browser.execute(() => {
                delete (window as any).__testZoomEvents;
            });
        });
    });
});
