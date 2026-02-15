import { useCallback, useEffect } from 'react';

import type { TabState, TabShortcutPayload } from '../../shared/types/tabs';
import { isMacOS } from '../utils/platform';

interface UseTabKeyboardShortcutsArgs {
    tabs: TabState[];
    activeTabId: string;
    createTabAndActivate: () => string | null;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    ownsCloseShortcut?: boolean;
}

function getNextTabId(tabs: TabState[], activeTabId: string): string | null {
    if (tabs.length === 0) {
        return null;
    }
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex === -1) {
        return tabs[0]?.id ?? null;
    }
    const nextIndex = (currentIndex + 1) % tabs.length;
    return tabs[nextIndex]?.id ?? null;
}

function getPreviousTabId(tabs: TabState[], activeTabId: string): string | null {
    if (tabs.length === 0) {
        return null;
    }
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex === -1) {
        return tabs[0]?.id ?? null;
    }
    const previousIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    return tabs[previousIndex]?.id ?? null;
}

export function useTabKeyboardShortcuts({
    tabs,
    activeTabId,
    createTabAndActivate,
    closeTab,
    setActiveTab,
    ownsCloseShortcut = !isMacOS(),
}: UseTabKeyboardShortcutsArgs): void {
    const executeShortcut = useCallback(
        (shortcut: TabShortcutPayload): boolean => {
            if (shortcut.command === 'new') {
                createTabAndActivate();
                return true;
            }

            if (shortcut.command === 'close') {
                if (!ownsCloseShortcut) {
                    return false;
                }
                const activeTab = tabs.find((tab) => tab.id === activeTabId);
                if (!activeTab) {
                    return false;
                }
                closeTab(activeTab.id);
                return true;
            }

            if (shortcut.command === 'next') {
                const nextTabId = getNextTabId(tabs, activeTabId);
                if (!nextTabId) {
                    return false;
                }
                setActiveTab(nextTabId);
                return true;
            }

            if (shortcut.command === 'previous') {
                const previousTabId = getPreviousTabId(tabs, activeTabId);
                if (!previousTabId) {
                    return false;
                }
                setActiveTab(previousTabId);
                return true;
            }

            if (shortcut.command === 'jump') {
                const index = shortcut.index;
                if (typeof index !== 'number' || index < 0) {
                    return false;
                }

                if (index === 8) {
                    const lastTab = tabs[tabs.length - 1];
                    if (!lastTab) {
                        return false;
                    }
                    setActiveTab(lastTab.id);
                    return true;
                }

                const targetTab = tabs[index];
                if (!targetTab) {
                    return false;
                }
                setActiveTab(targetTab.id);
                return true;
            }

            return false;
        },
        [activeTabId, closeTab, createTabAndActivate, ownsCloseShortcut, setActiveTab, tabs]
    );

    useEffect(() => {
        const unsubscribe = window.electronAPI?.onTabShortcutTriggered?.((payload) => {
            executeShortcut(payload);
        });

        return () => {
            unsubscribe?.();
        };
    }, [executeShortcut]);

    useEffect(() => {
        const isMac = isMacOS();

        const handleKeyDown = (event: KeyboardEvent) => {
            const modifierPressed = isMac ? event.metaKey : event.ctrlKey;
            if (!modifierPressed) {
                return;
            }

            let handled = false;

            const key = event.key;
            if (key === 't' || key === 'T') {
                handled = executeShortcut({ command: 'new' });
            } else if (key === 'w' || key === 'W') {
                handled = executeShortcut({ command: 'close' });
            } else if (key === 'Tab') {
                handled = executeShortcut({ command: event.shiftKey ? 'previous' : 'next' });
            } else if (/^[1-9]$/.test(key)) {
                handled = executeShortcut({ command: 'jump', index: Number(key) - 1 });
            }

            if (handled) {
                event.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [executeShortcut]);
}
