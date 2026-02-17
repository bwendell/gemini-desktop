/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { TabPanel } from '../../../../../src/renderer/components/tabs/TabPanel';
import { useGeminiIframe } from '../../../../../src/renderer/hooks';

vi.mock('../../../../../src/renderer/hooks', () => ({
    useGeminiIframe: vi.fn(),
}));

describe('TabPanel', () => {
    const tabs = [
        { id: 'tab-1', title: 'First', url: 'https://gemini.google.com/app', createdAt: 1 },
        { id: 'tab-2', title: 'Second', url: 'https://gemini.google.com/app', createdAt: 2 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: false,
            error: null,
            isOnline: true,
            handleLoad: vi.fn(),
            handleError: vi.fn(),
            retry: vi.fn(),
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders one iframe per tab with active and inactive visibility', () => {
        render(<TabPanel tabs={tabs} activeTabId="tab-1" />);

        expect(screen.queryByTestId('tab-panel')).not.toBeNull();

        const iframes = document.querySelectorAll('iframe');
        expect(iframes.length).toBe(2);

        const activeIframe = screen.getByTestId('gemini-iframe');
        const inactiveIframe = screen.getByTestId('tab-iframe-tab-2');

        expect((activeIframe as HTMLIFrameElement).style.display).toBe('block');
        expect((inactiveIframe as HTMLIFrameElement).style.display).toBe('none');

        expect(activeIframe.getAttribute('allow')).toBe('microphone; clipboard-write');
        expect(activeIframe.getAttribute('src')).toBe('https://gemini.google.com/app');
        expect(inactiveIframe.getAttribute('src')).toBe('https://gemini.google.com/app');
    });

    it('calls onTabReady when active iframe load fires', () => {
        const handleLoad = vi.fn();
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: false,
            error: null,
            isOnline: true,
            handleLoad,
            handleError: vi.fn(),
            retry: vi.fn(),
        });

        const onTabReady = vi.fn();
        render(<TabPanel tabs={tabs} activeTabId="tab-1" onTabReady={onTabReady} />);

        fireEvent.load(screen.getByTestId('gemini-iframe'));
        expect(handleLoad).toHaveBeenCalledTimes(1);
        expect(onTabReady).toHaveBeenCalledWith('tab-1');
    });

    it('does not run connectivity check when inactive iframe loads', () => {
        const handleLoad = vi.fn();
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: false,
            error: null,
            isOnline: true,
            handleLoad,
            handleError: vi.fn(),
            retry: vi.fn(),
        });

        render(<TabPanel tabs={tabs} activeTabId="tab-1" />);

        fireEvent.load(screen.getByTestId('tab-iframe-tab-2'));

        expect(handleLoad).not.toHaveBeenCalled();
    });

    it('runs connectivity check when a loaded tab becomes active', () => {
        const handleLoad = vi.fn();
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: false,
            error: null,
            isOnline: true,
            handleLoad,
            handleError: vi.fn(),
            retry: vi.fn(),
        });

        const { rerender } = render(<TabPanel tabs={tabs} activeTabId="tab-1" />);

        fireEvent.load(screen.getByTestId('tab-iframe-tab-2'));
        expect(handleLoad).not.toHaveBeenCalled();

        rerender(<TabPanel tabs={tabs} activeTabId="tab-2" />);

        expect(handleLoad).toHaveBeenCalledTimes(1);
    });

    it('shows loading indicator when iframe is loading', () => {
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: true,
            error: null,
            isOnline: true,
            handleLoad: vi.fn(),
            handleError: vi.fn(),
            retry: vi.fn(),
        });

        render(<TabPanel tabs={tabs} activeTabId="tab-1" />);
        expect(screen.queryByTestId('tab-iframe-tab-1-loading')).not.toBeNull();
    });

    it('shows error indicator when offline or iframe has error', () => {
        (useGeminiIframe as Mock).mockReturnValue({
            isLoading: false,
            error: 'Unable to reach Gemini',
            isOnline: false,
            handleLoad: vi.fn(),
            handleError: vi.fn(),
            retry: vi.fn(),
        });

        render(<TabPanel tabs={tabs} activeTabId="tab-1" />);
        expect(screen.getByTestId('tab-iframe-tab-1-error').textContent).toContain('Unable to reach Gemini');
    });

    it('supports zero tabs', () => {
        render(<TabPanel tabs={[]} activeTabId="tab-1" />);
        expect(screen.queryByTestId('tab-panel')).not.toBeNull();
        expect(document.querySelectorAll('iframe').length).toBe(0);
    });
});
