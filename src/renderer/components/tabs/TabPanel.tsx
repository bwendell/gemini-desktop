import { useCallback, useEffect, useRef } from 'react';

import type { TabState } from '../../../shared/types/tabs';
import { getTabFrameName } from '../../../shared/types/tabs';
import { useGeminiIframe } from '../../hooks';
import { TAB_TEST_IDS, APP_TEST_IDS } from '../../utils/testIds';

interface ActiveTabStatus {
    isOnline: boolean;
    error: string | null;
    retry: () => void;
}

interface TabPanelProps {
    tabs: TabState[];
    activeTabId: string;
    onTabReady?: (tabId: string) => void;
    onActiveStatusChange?: (status: ActiveTabStatus) => void;
}

interface TabIframeProps {
    tab: TabState;
    isActive: boolean;
    onTabReady?: (tabId: string) => void;
    onActiveStatusChange?: (status: ActiveTabStatus) => void;
}

function TabIframe({ tab, isActive, onTabReady, onActiveStatusChange }: TabIframeProps) {
    const { isLoading, error, isOnline, handleLoad, handleError, retry } = useGeminiIframe();
    const showError = !!error || !isOnline;
    const hasLoadedRef = useRef(false);
    const hasValidatedConnectivityRef = useRef(false);

    useEffect(() => {
        if (isActive) {
            onActiveStatusChange?.({
                isOnline,
                error,
                retry,
            });
        }
    }, [error, isActive, isOnline, onActiveStatusChange, retry]);

    useEffect(() => {
        if (isActive && hasLoadedRef.current && !hasValidatedConnectivityRef.current) {
            hasValidatedConnectivityRef.current = true;
            void handleLoad();
        }
    }, [handleLoad, isActive]);

    const onIframeLoad = useCallback(() => {
        hasLoadedRef.current = true;

        if (isActive && !hasValidatedConnectivityRef.current) {
            hasValidatedConnectivityRef.current = true;
            void handleLoad();
        }

        onTabReady?.(tab.id);
    }, [handleLoad, isActive, onTabReady, tab.id]);

    return (
        <>
            {isLoading && !showError && (
                <div
                    className="webview-loading"
                    style={{ display: isActive ? 'flex' : 'none' }}
                    data-testid={`${TAB_TEST_IDS.tabIframe(tab.id)}-loading`}
                >
                    <div className="webview-loading-spinner" />
                    <span>Loading Gemini...</span>
                </div>
            )}
            {showError && (
                <div
                    className="webview-error"
                    style={{ display: isActive ? 'flex' : 'none' }}
                    data-testid={`${TAB_TEST_IDS.tabIframe(tab.id)}-error`}
                >
                    <span>{error ?? 'Network unavailable'}</span>
                </div>
            )}
            <iframe
                key={tab.id}
                id={TAB_TEST_IDS.tabIframe(tab.id)}
                name={getTabFrameName(tab.id)}
                src={tab.url}
                title={tab.title}
                className="gemini-iframe"
                style={{ display: isActive ? 'block' : 'none' }}
                onLoad={onIframeLoad}
                onError={handleError}
                data-testid={isActive ? APP_TEST_IDS.GEMINI_IFRAME : TAB_TEST_IDS.tabIframe(tab.id)}
                data-tab-id={tab.id}
                allow="microphone; clipboard-write"
            />
        </>
    );
}

export function TabPanel({ tabs, activeTabId, onTabReady, onActiveStatusChange }: TabPanelProps) {
    return (
        <div className="webview-container" data-testid={TAB_TEST_IDS.TAB_PANEL}>
            {tabs.map((tab) => (
                <TabIframe
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    onTabReady={onTabReady}
                    onActiveStatusChange={onActiveStatusChange}
                />
            ))}
        </div>
    );
}
