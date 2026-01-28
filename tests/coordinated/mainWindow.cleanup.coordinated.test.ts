/**
 * Coordinated tests for MainWindow cleanup lifecycle.
 *
 * Tests that MainWindow properly cleans up:
 * - WebRequest listener on window close
 * - EventEmitter listeners (via BaseWindow)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainWindow from '../../src/main/windows/mainWindow';

// Use the centralized logger mock
vi.mock('../../src/main/utils/logger');

describe('MainWindow cleanup lifecycle', () => {
    let mainWindow: MainWindow;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Helper to trigger all 'closed' handlers on a window.
     * MainWindow registers multiple handlers: one from BaseWindow and one from setupCloseHandler.
     */
    function triggerAllClosedHandlers(win: ReturnType<typeof mainWindow.create>) {
        const onCalls = vi.mocked(win.on).mock.calls;
        const closedCalls = onCalls.filter((call): call is [string, () => void] => call[0] === 'closed');

        for (const call of closedCalls) {
            call[1]();
        }
    }

    describe('webRequest listener cleanup', () => {
        it('should store filter reference for cleanup', () => {
            mainWindow = new MainWindow(false);

            // Access private property via any cast for testing
            const privateWindow = mainWindow as any;

            // Before creating window, filter should not exist
            expect(privateWindow.responseDetectionFilter).toBeUndefined();
        });

        it('should store both filter and listener after window creation', () => {
            mainWindow = new MainWindow(false);

            // Create the window to set up response detection
            mainWindow.create();

            // Access private properties for testing
            const privateWindow = mainWindow as any;

            // Verify filter and listener are stored
            expect(privateWindow.responseDetectionFilter).toBeDefined();
            expect(privateWindow.responseDetectionFilter.urls).toContain('*://gemini.google.com/*StreamGenerate*');
            expect(privateWindow.responseDetectionListener).toBeDefined();
        });

        it('should clear filter and listener references after close', () => {
            mainWindow = new MainWindow(false);
            const win = mainWindow.create();

            const privateWindow = mainWindow as any;

            // Before close, they should be set
            expect(privateWindow.responseDetectionFilter).toBeDefined();
            expect(privateWindow.responseDetectionListener).toBeDefined();

            // Trigger all closed handlers (MainWindow registers multiple)
            triggerAllClosedHandlers(win);

            // After close, they should be cleared
            expect(privateWindow.responseDetectionFilter).toBeUndefined();
            expect(privateWindow.responseDetectionListener).toBeUndefined();
        });
    });

    describe('EventEmitter cleanup via BaseWindow', () => {
        it('should call removeAllListeners on window close', () => {
            mainWindow = new MainWindow(false);
            const win = mainWindow.create();

            // Spy on removeAllListeners
            const removeAllListenersSpy = vi.spyOn(mainWindow, 'removeAllListeners');

            // Trigger all closed handlers
            triggerAllClosedHandlers(win);

            expect(removeAllListenersSpy).toHaveBeenCalled();
        });

        it('should remove all event listeners after close', () => {
            mainWindow = new MainWindow(false);
            const win = mainWindow.create();

            // Add a test listener
            const testListener = vi.fn();
            mainWindow.on('test-event', testListener);
            expect(mainWindow.listenerCount('test-event')).toBe(1);

            // Trigger all closed handlers
            triggerAllClosedHandlers(win);

            // After close, listeners should be removed
            expect(mainWindow.listenerCount('test-event')).toBe(0);
        });
    });
});
