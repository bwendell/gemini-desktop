import { browser, expect } from '@wdio/globals';

describe('Zoom Control Integration', () => {
    const getMainZoomFactor = async (): Promise<number | null> => {
        return browser.electron.execute(() => {
            const mainWin = (global as any).appContext.windowManager.getMainWindow();
            if (mainWin && !mainWin.isDestroyed()) {
                return mainWin.webContents.getZoomFactor();
            }
            return null;
        });
    };

    const resetZoomState = async (): Promise<void> => {
        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.initializeZoomLevel(100);
            (global as any).appContext.windowManager.applyZoomLevel();
            (global as any).appContext.ipcManager.store.set('zoomLevel', 100);
        });
    };

    it('should apply zoom factor to main window webContents', async () => {
        await resetZoomState();

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.setZoomLevel(150);
        });

        const actualZoomFactor = await getMainZoomFactor();
        expect(actualZoomFactor).not.toBeNull();
        expect(actualZoomFactor).toBeCloseTo(1.5, 2);
    });

    it('should increase zoom factor when zoomIn() is called', async () => {
        await resetZoomState();

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.zoomIn();
        });

        const newZoomFactor = await getMainZoomFactor();
        expect(newZoomFactor).toBeCloseTo(1.1, 2);
    });

    it('should decrease zoom factor when zoomOut() is called', async () => {
        await resetZoomState();

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.zoomOut();
        });

        const newZoomFactor = await getMainZoomFactor();
        expect(newZoomFactor).toBeCloseTo(0.9, 2);
    });

    it('should persist zoom level to store after setZoomLevel()', async () => {
        await resetZoomState();

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.setZoomLevel(125);
        });

        const storedZoom = await browser.electron.execute(() => {
            return (global as any).appContext.ipcManager.store.get('zoomLevel');
        });
        expect(storedZoom).toBe(125);
    });

    it('should read zoom level from store on initialization', async () => {
        await resetZoomState();

        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.setZoomLevel(150);
        });

        await browser.electron.execute(() => {
            const savedZoom = (global as any).appContext.ipcManager.store.get('zoomLevel');
            (global as any).appContext.windowManager.initializeZoomLevel(savedZoom);
        });

        const currentZoom = await browser.electron.execute(() => {
            return (global as any).appContext.windowManager.getZoomLevel();
        });
        const zoomFactor = await getMainZoomFactor();

        expect(currentZoom).toBe(150);
        expect(zoomFactor).toBeCloseTo(1.5, 2);
    });
});
