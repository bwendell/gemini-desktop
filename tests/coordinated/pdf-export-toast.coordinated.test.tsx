/**
 * Coordinated tests for PDF Export Toast.
 * Verifies the interaction between PDF export IPC events and the Toast system in App.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act as reactAct, fireEvent } from '@testing-library/react';
import App from '../../src/renderer/App';
import { useFakeTimers, useRealTimers } from '../helpers/harness';

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock hooks to avoid unwanted side effects
vi.mock('../../src/renderer/hooks', () => ({
    useGeminiIframe: () => ({
        isLoading: false,
        error: null,
        isOnline: true,
        handleLoad: vi.fn(),
        handleError: vi.fn(),
        retry: vi.fn(),
    }),
    useQuickChatNavigation: (handleLoad: any) => ({
        iframeKey: 0,
        handleIframeLoad: handleLoad,
    }),
    usePrintProgress: () => ({
        state: { visible: false, currentPage: 0, totalPages: 0, progress: 0 },
        handleCancel: vi.fn(),
    }),
}));

describe('PDF Export Toast Coordination', () => {
    let successCallback: ((path: string) => void) | null = null;
    let errorCallback: ((error: string) => void) | null = null;
    const mockRevealInFolder = vi.fn();

    beforeEach(() => {
        useFakeTimers();
        vi.clearAllMocks();
        successCallback = null;
        errorCallback = null;

        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            configurable: true,
            value: vi.fn().mockImplementation((query) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Setup window.electronAPI mock
        (window as any).electronAPI = {
            onPrintToPdfSuccess: vi.fn().mockImplementation((cb) => {
                successCallback = cb;
                return vi.fn(); // cleanup
            }),
            onPrintToPdfError: vi.fn().mockImplementation((cb) => {
                errorCallback = cb;
                return vi.fn(); // cleanup
            }),
            revealInFolder: mockRevealInFolder,
            // Missing mocks required by components in App
            getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'light' }),
            onThemeChanged: vi.fn().mockReturnValue(vi.fn()),
            getAlwaysOnTop: vi.fn().mockResolvedValue(false),
            onAlwaysOnTopChanged: vi.fn().mockReturnValue(vi.fn()),
            getHotkeyAccelerators: vi.fn().mockResolvedValue({ printToPdf: 'Ctrl+P' }),
            onHotkeyAcceleratorsChanged: vi.fn().mockReturnValue(vi.fn()),
            onUpdateAvailable: vi.fn().mockReturnValue(vi.fn()),
            onUpdateDownloaded: vi.fn().mockReturnValue(vi.fn()),
            onUpdateError: vi.fn().mockReturnValue(vi.fn()),
            onUpdateProgress: vi.fn().mockReturnValue(vi.fn()),
            onUpdateNotAvailable: vi.fn().mockReturnValue(vi.fn()),
            onGeminiNavigate: vi.fn().mockReturnValue(vi.fn()),
            onPrintProgress: vi.fn().mockReturnValue(vi.fn()),
            onLinuxHotkeyNotice: vi.fn().mockReturnValue(vi.fn()),
            onAuthSessionExpired: vi.fn().mockReturnValue(vi.fn()),
            // Zoom API
            getZoomLevel: vi.fn().mockResolvedValue(100),
            zoomIn: vi.fn().mockResolvedValue(110),
            zoomOut: vi.fn().mockResolvedValue(90),
            onZoomLevelChanged: vi.fn().mockReturnValue(vi.fn()),
        };
    });

    afterEach(() => {
        useRealTimers();
        delete (window as any).electronAPI;
    });

    it('4.1 - should show success toast when PDF export succeeds', async () => {
        render(<App />);

        // Trigger success event
        const testPath = 'C:\\Users\\test\\Documents\\chat.pdf';
        await reactAct(async () => {
            if (successCallback) successCallback(testPath);
        });

        // Advance timers so toast appears
        await reactAct(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Verify toast content
        expect(screen.getByText(`PDF saved to ${testPath}`)).toBeTruthy();
        expect(screen.getByText('Show in Folder')).toBeTruthy();
    });

    it('4.2 - should show error toast when PDF export fails', async () => {
        render(<App />);

        // Trigger error event
        const testError = 'Permission denied';
        await reactAct(async () => {
            if (errorCallback) errorCallback(testError);
        });

        // Advance timers
        await reactAct(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Verify toast content
        expect(screen.getByText(`Failed to export PDF: ${testError}`)).toBeTruthy();
    });

    it('4.3 - should call revealInFolder when "Show in Folder" is clicked', async () => {
        render(<App />);

        // Trigger success event
        const testPath = 'C:\\Users\\test\\Documents\\chat.pdf';
        await reactAct(async () => {
            if (successCallback) successCallback(testPath);
        });

        // Advance timers
        await reactAct(async () => {
            await vi.advanceTimersByTimeAsync(10);
        });

        // Click "Show in Folder" button
        const actionButton = screen.getByText('Show in Folder');
        await reactAct(async () => {
            fireEvent.click(actionButton);
        });

        // Verify IPC call
        expect(mockRevealInFolder).toHaveBeenCalledWith(testPath);
    });
});
