/* @vitest-environment jsdom */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTabKeyboardShortcuts } from '../../../../src/renderer/hooks/useTabKeyboardShortcuts';
import type { TabState, TabShortcutPayload } from '../../../../src/shared/types/tabs';

vi.mock('../../../../src/renderer/utils/platform', () => ({
    isMacOS: () => false,
}));

describe('useTabKeyboardShortcuts', () => {
    const tabs: TabState[] = [
        { id: 'tab-1', title: 'Tab 1', url: 'https://gemini.google.com/app', createdAt: 1 },
        { id: 'tab-2', title: 'Tab 2', url: 'https://gemini.google.com/app', createdAt: 2 },
        { id: 'tab-3', title: 'Tab 3', url: 'https://gemini.google.com/app', createdAt: 3 },
    ];

    let createTabAndActivate: ReturnType<typeof vi.fn>;
    let closeTab: ReturnType<typeof vi.fn>;
    let setActiveTab: ReturnType<typeof vi.fn>;
    let onTabShortcutTriggered: ReturnType<typeof vi.fn>;
    let shortcutListener: ((payload: TabShortcutPayload) => void) | null;

    beforeEach(() => {
        createTabAndActivate = vi.fn();
        closeTab = vi.fn();
        setActiveTab = vi.fn();
        shortcutListener = null;

        onTabShortcutTriggered = vi.fn((callback: (payload: TabShortcutPayload) => void) => {
            shortcutListener = callback;
            return () => {
                shortcutListener = null;
            };
        });

        Object.defineProperty(window, 'electronAPI', {
            value: {
                onTabShortcutTriggered,
            },
            writable: true,
            configurable: true,
        });
    });

    it('creates a new tab on Ctrl+T', () => {
        renderHook(() =>
            useTabKeyboardShortcuts({
                tabs,
                activeTabId: 'tab-1',
                createTabAndActivate: createTabAndActivate as () => string | null,
                closeTab: closeTab as (id: string) => void,
                setActiveTab: setActiveTab as (id: string) => void,
            })
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', ctrlKey: true }));
        });

        expect(createTabAndActivate).toHaveBeenCalledTimes(1);
    });

    it('closes active tab on Ctrl+W', () => {
        renderHook(() =>
            useTabKeyboardShortcuts({
                tabs,
                activeTabId: 'tab-2',
                createTabAndActivate: createTabAndActivate as () => string | null,
                closeTab: closeTab as (id: string) => void,
                setActiveTab: setActiveTab as (id: string) => void,
            })
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', ctrlKey: true }));
        });

        expect(closeTab).toHaveBeenCalledWith('tab-2');
    });

    it('moves to next tab on Ctrl+Tab', () => {
        renderHook(() =>
            useTabKeyboardShortcuts({
                tabs,
                activeTabId: 'tab-1',
                createTabAndActivate: createTabAndActivate as () => string | null,
                closeTab: closeTab as (id: string) => void,
                setActiveTab: setActiveTab as (id: string) => void,
            })
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', ctrlKey: true }));
        });

        expect(setActiveTab).toHaveBeenCalledWith('tab-2');
    });

    it('handles forwarded jump shortcut and maps Ctrl+9 to last tab', () => {
        renderHook(() =>
            useTabKeyboardShortcuts({
                tabs,
                activeTabId: 'tab-1',
                createTabAndActivate: createTabAndActivate as () => string | null,
                closeTab: closeTab as (id: string) => void,
                setActiveTab: setActiveTab as (id: string) => void,
            })
        );

        expect(onTabShortcutTriggered).toHaveBeenCalledTimes(1);

        act(() => {
            shortcutListener?.({ command: 'jump', index: 8 });
        });

        expect(setActiveTab).toHaveBeenCalledWith('tab-3');
    });
});
