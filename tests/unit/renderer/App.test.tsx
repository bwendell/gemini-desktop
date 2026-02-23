/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import App from '../../../src/renderer/App';
import { useNetworkStatus } from '../../../src/renderer/hooks/useNetworkStatus';
import { setupMockElectronAPI } from '../../helpers/mocks';

vi.mock('../../../src/renderer/hooks/useNetworkStatus', () => ({
    useNetworkStatus: vi.fn(),
}));

type NavigatePayload = { requestId: string; targetTabId: string; text: string };

function createElectronApiMock(overrides: Record<string, unknown> = {}) {
    let navigateListener: ((payload: NavigatePayload) => void) | null = null;

    const api = setupMockElectronAPI({
        getTabState: vi.fn().mockResolvedValue(null),
        saveTabState: vi.fn(),
        getZoomLevel: vi.fn().mockResolvedValue(100),
        onZoomLevelChanged: vi.fn().mockReturnValue(() => undefined),
        zoomIn: vi.fn().mockResolvedValue(110),
        zoomOut: vi.fn().mockResolvedValue(90),
        onGeminiNavigate: vi.fn((listener: (payload: NavigatePayload) => void) => {
            navigateListener = listener;
            return () => {
                navigateListener = null;
            };
        }),
        signalGeminiReady: vi.fn(),
        onTabShortcutTriggered: vi.fn().mockReturnValue(() => undefined),
        ...overrides,
    });

    return {
        api,
        emitNavigate(payload: NavigatePayload) {
            navigateListener?.(payload);
        },
    };
}

describe('App', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNetworkStatus as Mock).mockReturnValue(true);
        fetchMock.mockResolvedValue({ ok: true });
        global.fetch = fetchMock as typeof global.fetch;
    });

    afterEach(() => {
        cleanup();
    });

    it('renders tabbed shell with a default active iframe', async () => {
        createElectronApiMock();
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('tab-bar')).toBeTruthy();
        });

        expect(screen.getByTestId('tab-new-button')).toBeTruthy();
        expect(screen.getByTestId('gemini-iframe')).toBeTruthy();
        expect(document.querySelector('.tab')).toBeTruthy();
    });

    it('renders an active iframe when persisted activeTabId is invalid', async () => {
        createElectronApiMock({
            getTabState: vi.fn().mockResolvedValue({
                tabs: [
                    { id: 'tab-a', title: 'A', url: 'https://gemini.google.com/app', createdAt: 1 },
                    { id: 'tab-b', title: 'B', url: 'https://gemini.google.com/app', createdAt: 2 },
                ],
                activeTabId: 'missing-tab',
            }),
        });

        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('gemini-iframe')).toBeTruthy();
        });

        const activeIframe = screen.getByTestId('gemini-iframe');
        expect(activeIframe.getAttribute('id')).toBe('tab-iframe-tab-a');
    });

    it('adds a tab when new-tab button is clicked', async () => {
        createElectronApiMock();
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('tab-new-button')).toBeTruthy();
        });

        expect(document.querySelectorAll('.tab').length).toBe(1);

        fireEvent.click(screen.getByTestId('tab-new-button'));

        await waitFor(() => {
            expect(document.querySelectorAll('.tab').length).toBe(2);
        });
    });

    it('creates target tab from navigate event and signals ready on iframe load', async () => {
        const electron = createElectronApiMock();
        render(<App />);

        await waitFor(() => {
            expect(electron.api.onGeminiNavigate).toHaveBeenCalledTimes(1);
        });

        const payload: NavigatePayload = {
            requestId: 'request-1',
            targetTabId: 'tab-target-1',
            text: 'hello',
        };

        act(() => {
            electron.emitNavigate(payload);
        });

        await waitFor(() => {
            expect(document.querySelectorAll('.tab').length).toBe(2);
        });

        const activeIframe = screen.getByTestId('gemini-iframe');
        fireEvent.load(activeIframe);

        await waitFor(() => {
            expect(electron.api.signalGeminiReady).toHaveBeenCalledWith({
                requestId: payload.requestId,
                targetTabId: payload.targetTabId,
            });
        });
    });

    it('shows offline overlay when network hook reports offline', async () => {
        createElectronApiMock();
        (useNetworkStatus as Mock).mockReturnValue(false);

        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('offline-overlay')).toBeTruthy();
        });
    });
});
