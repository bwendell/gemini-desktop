/**
 * Unit tests for WindowManager zoom functionality.
 *
 * Tests zoom level clamping, step progression, event emission,
 * validation, and edge cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import WindowManager, { ZOOM_LEVEL_STEPS } from '../../../src/main/managers/windowManager';

// Mock constants
vi.mock('../../../src/main/utils/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/main/utils/constants')>();
    return {
        ...actual,
        isMacOS: false,
    };
});

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/main/utils/paths')>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('WindowManager Zoom', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        windowManager = new WindowManager(false);
    });

    describe('getZoomLevel', () => {
        // 4.7 Test getZoomLevel() returns current zoom level
        it('returns default zoom level of 100%', () => {
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('returns updated zoom level after setZoomLevel', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(125);
            expect(windowManager.getZoomLevel()).toBe(125);
        });
    });

    describe('setZoomLevel - Boundary Clamping', () => {
        // 4.1 Test zoom level clamping at boundaries (50%, 200%)
        it('clamps setZoomLevel(30) to 50%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(30);
            expect(windowManager.getZoomLevel()).toBe(50);
        });

        it('clamps setZoomLevel(250) to 200%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(250);
            expect(windowManager.getZoomLevel()).toBe(200);
        });

        it('allows exact boundary value of 50%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(50);
            expect(windowManager.getZoomLevel()).toBe(50);
        });

        it('allows exact boundary value of 200%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(200);
            expect(windowManager.getZoomLevel()).toBe(200);
        });
    });

    describe('zoomIn and zoomOut - Step Progression', () => {
        // 4.2 Test zoom step progression
        it('zoomIn() from 100% goes to 110%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(100);
            windowManager.zoomIn();
            expect(windowManager.getZoomLevel()).toBe(110);
        });

        it('zoomOut() from 100% goes to 90%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(100);
            windowManager.zoomOut();
            expect(windowManager.getZoomLevel()).toBe(90);
        });

        // 4.8 Test zoomIn() does nothing at maximum (200%)
        it('zoomIn() from 200% remains at 200%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(200);
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.zoomIn();

            expect(windowManager.getZoomLevel()).toBe(200);
            expect(listener).not.toHaveBeenCalled();
        });

        // 4.9 Test zoomOut() does nothing at minimum (50%)
        it('zoomOut() from 50% remains at 50%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(50);
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.zoomOut();

            expect(windowManager.getZoomLevel()).toBe(50);
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('zoom-level-changed Event', () => {
        // 4.3 Test zoom level persistence via event
        it('emits zoom-level-changed event when zoom changes', () => {
            windowManager.createMainWindow();
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.setZoomLevel(125);

            expect(listener).toHaveBeenCalledWith(125);
        });

        it('emits event on zoomIn()', () => {
            windowManager.createMainWindow();
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.zoomIn();

            expect(listener).toHaveBeenCalledWith(110);
        });

        it('emits event on zoomOut()', () => {
            windowManager.createMainWindow();
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.zoomOut();

            expect(listener).toHaveBeenCalledWith(90);
        });

        // 4.10 Test setZoomLevel() with same value is no-op
        it('does not emit event when setting same zoom level', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(100); // Initial set
            const listener = vi.fn();
            windowManager.on('zoom-level-changed', listener);

            windowManager.setZoomLevel(100); // Same value

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('initializeZoomLevel - Invalid Value Handling', () => {
        // 4.4 Test invalid stored zoom values are sanitized
        it('sanitizes NaN to valid zoom level', () => {
            windowManager.initializeZoomLevel(NaN);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('sanitizes null to valid zoom level', () => {
            windowManager.initializeZoomLevel(null);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('sanitizes undefined to valid zoom level', () => {
            windowManager.initializeZoomLevel(undefined);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('sanitizes negative values to minimum (50%)', () => {
            windowManager.initializeZoomLevel(-50);
            expect(windowManager.getZoomLevel()).toBe(50);
        });

        // 4.11 Test _sanitizeZoomLevel() handles Infinity and -Infinity
        // Note: Infinity is not finite, so isFinite(Infinity) returns false
        // which triggers the default 100% return value
        it('sanitizes Infinity to default 100%', () => {
            windowManager.initializeZoomLevel(Infinity);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('sanitizes -Infinity to default 100%', () => {
            windowManager.initializeZoomLevel(-Infinity);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        // 4.12 Test _sanitizeZoomLevel() handles string inputs
        it('sanitizes string "100" to default 100%', () => {
            windowManager.initializeZoomLevel('100' as any);
            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('sanitizes non-numeric string to default 100%', () => {
            windowManager.initializeZoomLevel('abc' as any);
            expect(windowManager.getZoomLevel()).toBe(100);
        });
    });

    describe('Snap to Nearest Step', () => {
        // 4.6 Test snap to nearest step for non-standard zoom values
        // Note: Since setZoomLevel snaps to nearest step, we can't have a true non-standard
        // zoom level. The implementation's zoomIn/Out from a non-standard step (if possible)
        // would go to the next higher/lower step. Testing setZoomLevel snapping behavior.

        // Test that setZoomLevel snaps non-standard values to nearest step
        it('setZoomLevel(112) snaps to nearest step 110%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(112);
            expect(windowManager.getZoomLevel()).toBe(110);
        });

        it('setZoomLevel(117) snaps to nearest step 110%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(117);
            // 117 is closer to 110 (distance 7) than to 125 (distance 8)
            expect(windowManager.getZoomLevel()).toBe(110);
        });

        it('setZoomLevel(62) snaps to nearest step 67%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(62);
            expect(windowManager.getZoomLevel()).toBe(67);
        });

        // 4.13 Additional snap tests
        it('setZoomLevel(113) snaps to 110%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(113);
            expect(windowManager.getZoomLevel()).toBe(110);
        });

        it('setZoomLevel(118) snaps to 125%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(118);
            expect(windowManager.getZoomLevel()).toBe(125);
        });

        it('setZoomLevel(55) snaps to 50%', () => {
            windowManager.createMainWindow();
            windowManager.setZoomLevel(55);
            expect(windowManager.getZoomLevel()).toBe(50);
        });
    });

    describe('Zoom Operations with Missing/Destroyed Window', () => {
        // 4.5 Test zoom operations with missing main window
        it('setZoomLevel() does not throw when main window is null', () => {
            // No main window created
            expect(() => windowManager.setZoomLevel(150)).not.toThrow();
        });

        it('zoomIn() does not throw when main window is null', () => {
            expect(() => windowManager.zoomIn()).not.toThrow();
        });

        it('zoomOut() does not throw when main window is null', () => {
            expect(() => windowManager.zoomOut()).not.toThrow();
        });

        it('applyZoomLevel() does not throw when main window is null', () => {
            expect(() => windowManager.applyZoomLevel()).not.toThrow();
        });

        // 4.15 Test zoom operations with destroyed main window
        it('setZoomLevel() does not throw when window is destroyed', () => {
            const win = windowManager.createMainWindow();
            win.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => windowManager.setZoomLevel(150)).not.toThrow();
        });

        it('zoomIn() does not throw when window is destroyed', () => {
            const win = windowManager.createMainWindow();
            win.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => windowManager.zoomIn()).not.toThrow();
        });

        it('zoomOut() does not throw when window is destroyed', () => {
            const win = windowManager.createMainWindow();
            win.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => windowManager.zoomOut()).not.toThrow();
        });

        it('applyZoomLevel() does not throw when window is destroyed', () => {
            const win = windowManager.createMainWindow();
            win.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => windowManager.applyZoomLevel()).not.toThrow();
        });
    });

    describe('applyZoomLevel - webContents.setZoomFactor', () => {
        // 4.14 Test applyZoomLevel() calls webContents.setZoomFactor
        it('calls setZoomFactor(1.0) at 100% zoom', () => {
            const win = windowManager.createMainWindow();
            windowManager.setZoomLevel(100);
            windowManager.applyZoomLevel();

            expect(win.webContents.setZoomFactor).toHaveBeenCalledWith(1.0);
        });

        it('calls setZoomFactor(0.5) at 50% zoom', () => {
            const win = windowManager.createMainWindow();
            windowManager.setZoomLevel(50);
            windowManager.applyZoomLevel();

            expect(win.webContents.setZoomFactor).toHaveBeenCalledWith(0.5);
        });

        it('calls setZoomFactor(2.0) at 200% zoom', () => {
            const win = windowManager.createMainWindow();
            windowManager.setZoomLevel(200);
            windowManager.applyZoomLevel();

            expect(win.webContents.setZoomFactor).toHaveBeenCalledWith(2.0);
        });

        it('calls setZoomFactor(1.25) at 125% zoom', () => {
            const win = windowManager.createMainWindow();
            windowManager.setZoomLevel(125);
            windowManager.applyZoomLevel();

            expect(win.webContents.setZoomFactor).toHaveBeenCalledWith(1.25);
        });
    });

    describe('ZOOM_LEVEL_STEPS constant', () => {
        it('exports ZOOM_LEVEL_STEPS with correct values', () => {
            expect(ZOOM_LEVEL_STEPS).toEqual([50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]);
        });

        it('ZOOM_LEVEL_STEPS starts at 50%', () => {
            expect(ZOOM_LEVEL_STEPS[0]).toBe(50);
        });

        it('ZOOM_LEVEL_STEPS ends at 200%', () => {
            expect(ZOOM_LEVEL_STEPS[ZOOM_LEVEL_STEPS.length - 1]).toBe(200);
        });

        it('ZOOM_LEVEL_STEPS includes 100% as default', () => {
            expect(ZOOM_LEVEL_STEPS).toContain(100);
        });
    });
});
