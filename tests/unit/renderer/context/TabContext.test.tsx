/* @vitest-environment jsdom */

import { useState, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TabProvider, useTabContext } from '../../../../src/renderer/context/TabContext';
import type { TabsState } from '../../../../src/shared/types/tabs';

interface ElectronApiSubset {
    getTabState?: () => Promise<TabsState | null>;
    saveTabState?: (state: TabsState) => void;
    onTabTitleUpdated?: (callback: (payload: { tabId: string; title: string }) => void) => () => void;
}

function Probe() {
    const [lastCreatedId, setLastCreatedId] = useState('');
    const { tabs, activeTabId, createTab, createTabAndActivate, closeTab, setActiveTab, getActiveTab } =
        useTabContext();

    const firstId = tabs[0]?.id ?? '';
    const active = getActiveTab();

    return (
        <div>
            <div data-testid="tab-count">{String(tabs.length)}</div>
            <div data-testid="active-id">{activeTabId}</div>
            <div data-testid="active-title">{active?.title ?? 'none'}</div>
            <button
                type="button"
                data-testid="create-tab"
                onClick={() => {
                    setLastCreatedId(createTab() ?? '');
                }}
            >
                create
            </button>
            <button
                type="button"
                data-testid="create-tab-and-activate"
                onClick={() => {
                    setLastCreatedId(createTabAndActivate('preferred-tab-id') ?? '');
                }}
            >
                create-active
            </button>
            <button
                type="button"
                data-testid="close-active"
                onClick={() => {
                    closeTab(activeTabId);
                }}
            >
                close-active
            </button>
            <button
                type="button"
                data-testid="close-missing"
                onClick={() => {
                    closeTab('missing-tab-id');
                }}
            >
                close-missing
            </button>
            <button
                type="button"
                data-testid="set-first"
                onClick={() => {
                    setActiveTab(firstId);
                }}
            >
                set-first
            </button>
            <button
                type="button"
                data-testid="set-missing"
                onClick={() => {
                    setActiveTab('missing-tab-id');
                }}
            >
                set-missing
            </button>
            <div data-testid="last-created-id">{lastCreatedId}</div>
        </div>
    );
}

function renderProvider(ui: ReactNode) {
    return render(<TabProvider>{ui}</TabProvider>);
}

describe('TabContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('loads persisted state and normalizes it', async () => {
        const getTabState = vi.fn().mockResolvedValue({
            tabs: [
                { id: 'tab-a', title: 'A', url: 'https://example.com', createdAt: 10 },
                { id: 'tab-a', title: 'Duplicate', url: 'https://example.com', createdAt: 11 },
                { id: 'tab-b', title: '', url: 'https://example.com', createdAt: Number.NaN },
            ],
            activeTabId: 'tab-b',
        } satisfies TabsState);

        const saveTabState = vi.fn();
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = { getTabState, saveTabState };

        renderProvider(<Probe />);

        await waitFor(() => {
            expect(screen.getByTestId('tab-count').textContent).toBe('2');
        });
        expect(screen.getByTestId('active-id').textContent).toBe('tab-b');
        expect(screen.getByTestId('active-title').textContent).toBe('New Chat');
    });

    it('falls back to the first tab when activeTabId is missing', async () => {
        const getTabState = vi.fn().mockResolvedValue({
            tabs: [
                { id: 'tab-a', title: 'A', url: 'https://example.com', createdAt: 10 },
                { id: 'tab-b', title: 'B', url: 'https://example.com', createdAt: 11 },
            ],
            activeTabId: 'missing',
        } satisfies TabsState);

        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = { getTabState, saveTabState: vi.fn() };

        renderProvider(<Probe />);

        await waitFor(() => {
            expect(screen.getByTestId('tab-count').textContent).toBe('2');
        });
        expect(screen.getByTestId('active-id').textContent).toBe('tab-a');
    });

    it('falls back to a single default tab when no state is persisted', async () => {
        const getTabState = vi.fn().mockResolvedValue(null);
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = { getTabState, saveTabState: vi.fn() };

        renderProvider(<Probe />);

        await waitFor(() => {
            expect(screen.getByTestId('tab-count').textContent).toBe('1');
        });
        expect(screen.getByTestId('active-title').textContent).toBe('New Chat');
    });

    it('creates a tab without activating it', async () => {
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue(null),
            saveTabState: vi.fn(),
        };

        renderProvider(<Probe />);
        await waitFor(() => expect(screen.getByTestId('tab-count').textContent).toBe('1'));

        const originalActiveId = screen.getByTestId('active-id').textContent;
        fireEvent.click(screen.getByTestId('create-tab'));

        expect(screen.getByTestId('tab-count').textContent).toBe('2');
        expect(screen.getByTestId('active-id').textContent).toBe(originalActiveId);
        expect(screen.getByTestId('last-created-id').textContent).toBeTruthy();
    });

    it('creates and activates a tab with preferred id', async () => {
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue(null),
            saveTabState: vi.fn(),
        };

        renderProvider(<Probe />);
        await waitFor(() => expect(screen.getByTestId('tab-count').textContent).toBe('1'));

        fireEvent.click(screen.getByTestId('create-tab-and-activate'));

        expect(screen.getByTestId('tab-count').textContent).toBe('2');
        expect(screen.getByTestId('active-id').textContent).toBe('preferred-tab-id');
        expect(screen.getByTestId('last-created-id').textContent).toBe('preferred-tab-id');
    });

    it('closes active tab and keeps one tab by recreating when last tab closes', async () => {
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue({
                tabs: [{ id: 'only', title: 'Only', url: 'https://gemini.google.com/app', createdAt: 1 }],
                activeTabId: 'only',
            } satisfies TabsState),
            saveTabState: vi.fn(),
        };

        renderProvider(<Probe />);
        await waitFor(() => expect(screen.getByTestId('active-id').textContent).toBe('only'));

        fireEvent.click(screen.getByTestId('close-active'));

        expect(screen.getByTestId('tab-count').textContent).toBe('1');
        expect(screen.getByTestId('active-title').textContent).toBe('New Chat');
        expect(screen.getByTestId('active-id').textContent).not.toBe('only');
    });

    it('ignores close/set-active calls for missing tab id', async () => {
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue(null),
            saveTabState: vi.fn(),
        };

        renderProvider(<Probe />);
        await waitFor(() => expect(screen.getByTestId('tab-count').textContent).toBe('1'));
        const initialActive = screen.getByTestId('active-id').textContent;

        fireEvent.click(screen.getByTestId('close-missing'));
        fireEvent.click(screen.getByTestId('set-missing'));

        expect(screen.getByTestId('tab-count').textContent).toBe('1');
        expect(screen.getByTestId('active-id').textContent).toBe(initialActive);
    });

    it('saves tab state only after user mutation with debounce', async () => {
        vi.useFakeTimers();
        const saveTabState = vi.fn();
        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue(null),
            saveTabState,
        };

        renderProvider(<Probe />);
        await act(async () => {
            await Promise.resolve();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(saveTabState).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTestId('create-tab'));

        act(() => {
            vi.advanceTimersByTime(199);
        });
        expect(saveTabState).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(saveTabState).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
    });

    it('updates tab title when main process notifies', async () => {
        const saveTabState = vi.fn();
        let titleListener: ((payload: { tabId: string; title: string }) => void) | null = null;

        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue({
                tabs: [{ id: 'tab-a', title: 'New Chat', url: 'https://gemini.google.com/app', createdAt: 1 }],
                activeTabId: 'tab-a',
            } satisfies TabsState),
            saveTabState,
            onTabTitleUpdated: vi.fn((callback) => {
                titleListener = callback;
                return () => {
                    titleListener = null;
                };
            }),
        };

        renderProvider(<Probe />);

        await waitFor(() => {
            expect(screen.getByTestId('active-id').textContent).toBe('tab-a');
        });

        act(() => {
            titleListener?.({ tabId: 'tab-a', title: 'RSUs vs. Stock Options' });
        });

        expect(screen.getByTestId('active-title').textContent).toBe('RSUs vs. Stock Options');

        await waitFor(() => {
            expect(saveTabState).toHaveBeenCalled();
        });
    });

    it('resets tab title to New Chat when main process sends empty-page reset', async () => {
        const saveTabState = vi.fn();
        let titleListener: ((payload: { tabId: string; title: string }) => void) | null = null;

        (window as unknown as { electronAPI: ElectronApiSubset }).electronAPI = {
            getTabState: vi.fn().mockResolvedValue({
                tabs: [
                    { id: 'tab-a', title: 'Stale Previous Title', url: 'https://gemini.google.com/app', createdAt: 1 },
                ],
                activeTabId: 'tab-a',
            } satisfies TabsState),
            saveTabState,
            onTabTitleUpdated: vi.fn((callback) => {
                titleListener = callback;
                return () => {
                    titleListener = null;
                };
            }),
        };

        renderProvider(<Probe />);

        await waitFor(() => {
            expect(screen.getByTestId('active-title').textContent).toBe('Stale Previous Title');
        });

        // Simulate the main process resetting title when user navigates to home page
        act(() => {
            titleListener?.({ tabId: 'tab-a', title: 'New Chat' });
        });

        expect(screen.getByTestId('active-title').textContent).toBe('New Chat');

        await waitFor(() => {
            expect(saveTabState).toHaveBeenCalled();
        });
    });

    it('throws when hook is used outside provider', () => {
        expect(() => renderHook(() => useTabContext())).toThrow('useTabContext must be used within a TabProvider');
    });
});
