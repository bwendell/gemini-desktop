import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { GEMINI_APP_URL } from '../utils/constants';
import type { TabState, TabsState } from '../../shared/types/tabs';

const MAX_TABS = 20;
const SAVE_DEBOUNCE_MS = 200;

interface TabContextValue {
    tabs: TabState[];
    activeTabId: string;
    maxTabs: number;
    isAtTabLimit: boolean;
    createTab: () => string | null;
    createTabAndActivate: (preferredTabId?: string) => string | null;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTabTitle: (id: string, title: string) => void;
    getActiveTab: () => TabState | null;
}

const TabContext = createContext<TabContextValue | undefined>(undefined);

function createTab(tabId?: string): TabState {
    return {
        id: tabId ?? crypto.randomUUID(),
        title: 'New Chat',
        url: GEMINI_APP_URL,
        createdAt: Date.now(),
    };
}

function createInitialState(): TabsState {
    const tab = createTab();
    return {
        tabs: [tab],
        activeTabId: tab.id,
    };
}

function normalizeState(rawState: TabsState | null): TabsState {
    if (!rawState || !Array.isArray(rawState.tabs) || rawState.tabs.length === 0) {
        return createInitialState();
    }

    const seenIds = new Set<string>();
    const tabs: TabState[] = [];

    for (const tab of rawState.tabs) {
        if (!tab || typeof tab.id !== 'string' || tab.id.trim().length === 0 || seenIds.has(tab.id)) {
            continue;
        }
        seenIds.add(tab.id);
        tabs.push({
            id: tab.id,
            title: typeof tab.title === 'string' && tab.title.trim().length > 0 ? tab.title : 'New Chat',
            url: GEMINI_APP_URL,
            createdAt: typeof tab.createdAt === 'number' && Number.isFinite(tab.createdAt) ? tab.createdAt : Date.now(),
        });
    }

    if (tabs.length === 0) {
        return createInitialState();
    }

    const fallbackActiveTabId = tabs[0]?.id ?? createTab().id;
    const activeTabId = seenIds.has(rawState.activeTabId) ? rawState.activeTabId : fallbackActiveTabId;

    return {
        tabs,
        activeTabId,
    };
}

export function TabProvider({ children }: { children: ReactNode }) {
    const [tabsState, setTabsState] = useState<TabsState>(() => createInitialState());
    const isHydratingRef = useRef(true);
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const loadedState = await window.electronAPI?.getTabState?.();
                if (!isMounted) {
                    return;
                }
                if (loadedState) {
                    setTabsState(normalizeState(loadedState));
                }
            } finally {
                if (isMounted) {
                    isHydratingRef.current = false;
                }
            }
        };

        void load();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (isHydratingRef.current || !window.electronAPI?.saveTabState) {
            return;
        }

        if (saveTimeoutRef.current !== null) {
            window.clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = window.setTimeout(() => {
            window.electronAPI?.saveTabState(tabsState);
            saveTimeoutRef.current = null;
        }, SAVE_DEBOUNCE_MS);

        return () => {
            if (saveTimeoutRef.current !== null) {
                window.clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [tabsState]);

    const createTabInternal = useCallback((activate: boolean, preferredTabId?: string): string | null => {
        const nextTab = createTab(preferredTabId);
        let created = true;

        setTabsState((prev) => {
            if (prev.tabs.length >= MAX_TABS) {
                created = false;
                return prev;
            }

            const nextTabs = [...prev.tabs, nextTab];
            return {
                tabs: nextTabs,
                activeTabId: activate ? nextTab.id : prev.activeTabId,
            };
        });

        return created ? nextTab.id : null;
    }, []);

    const createTabOnly = useCallback(() => {
        return createTabInternal(false);
    }, [createTabInternal]);

    const createTabAndActivate = useCallback(
        (preferredTabId?: string) => {
            return createTabInternal(true, preferredTabId);
        },
        [createTabInternal]
    );

    const closeTab = useCallback((id: string) => {
        setTabsState((prev) => {
            const closedIndex = prev.tabs.findIndex((tab) => tab.id === id);
            if (closedIndex === -1) {
                return prev;
            }

            const remainingTabs = prev.tabs.filter((tab) => tab.id !== id);
            if (remainingTabs.length === 0) {
                const fallbackTab = createTab();
                return {
                    tabs: [fallbackTab],
                    activeTabId: fallbackTab.id,
                };
            }

            if (prev.activeTabId !== id) {
                return {
                    tabs: remainingTabs,
                    activeTabId: prev.activeTabId,
                };
            }

            const replacementIndex = Math.min(closedIndex, remainingTabs.length - 1);
            const replacementTab = remainingTabs[replacementIndex] ?? remainingTabs[0] ?? createTab();
            return {
                tabs: remainingTabs,
                activeTabId: replacementTab.id,
            };
        });
    }, []);

    const setActiveTab = useCallback((id: string) => {
        setTabsState((prev) => {
            if (!prev.tabs.some((tab) => tab.id === id)) {
                return prev;
            }
            return {
                tabs: prev.tabs,
                activeTabId: id,
            };
        });
    }, []);

    const updateTabTitle = useCallback((id: string, title: string) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            return;
        }

        setTabsState((prev) => {
            let didUpdate = false;
            const nextTabs = prev.tabs.map((tab) => {
                if (tab.id !== id || tab.title === trimmedTitle) {
                    return tab;
                }
                didUpdate = true;
                return {
                    ...tab,
                    title: trimmedTitle,
                };
            });

            if (!didUpdate) {
                return prev;
            }

            return {
                tabs: nextTabs,
                activeTabId: prev.activeTabId,
            };
        });
    }, []);

    const getActiveTab = useCallback(() => {
        return tabsState.tabs.find((tab) => tab.id === tabsState.activeTabId) ?? null;
    }, [tabsState.activeTabId, tabsState.tabs]);

    useEffect(() => {
        const unsubscribe = window.electronAPI?.onTabTitleUpdated?.((payload: { tabId: string; title: string }) => {
            updateTabTitle(payload.tabId, payload.title);
        });

        return () => {
            unsubscribe?.();
        };
    }, [updateTabTitle]);

    const contextValue = useMemo<TabContextValue>(
        () => ({
            tabs: tabsState.tabs,
            activeTabId: tabsState.activeTabId,
            maxTabs: MAX_TABS,
            isAtTabLimit: tabsState.tabs.length >= MAX_TABS,
            createTab: createTabOnly,
            createTabAndActivate,
            closeTab,
            setActiveTab,
            updateTabTitle,
            getActiveTab,
        }),
        [
            closeTab,
            createTabAndActivate,
            createTabOnly,
            getActiveTab,
            setActiveTab,
            updateTabTitle,
            tabsState.activeTabId,
            tabsState.tabs,
        ]
    );

    return <TabContext.Provider value={contextValue}>{children}</TabContext.Provider>;
}

export function useTabContext(): TabContextValue {
    const context = useContext(TabContext);
    if (!context) {
        throw new Error('useTabContext must be used within a TabProvider');
    }
    return context;
}
