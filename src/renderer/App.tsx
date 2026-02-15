import { useCallback, useEffect, useRef, useState } from 'react';

import { MainLayout, OfflineOverlay, GeminiErrorBoundary, TabBar, TabPanel } from './components';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { UpdateToastProvider } from './context/UpdateToastContext';
import { TabProvider, useTabContext } from './context/TabContext';
import { LinuxHotkeyNotice } from './components/toast';
import { useTabKeyboardShortcuts } from './hooks';
import type { GeminiNavigatePayload, GeminiReadyPayload } from '../shared/types/tabs';
import './App.css';

/**
 * Root application component.
 *
 * Uses an iframe to embed Gemini. Electron's main process
 * strips security headers that would normally block iframe embedding.
 *
 * Quick Chat Integration:
 * - Listens for gemini:navigate IPC events from main process
 * - Forces iframe reload by changing the key prop
 * - Signals gemini:ready when iframe loads after navigation
 *
 * Print Progress:
 * - Shows progress overlay during PDF generation
 * - Listens for print progress IPC events
 *
 * Dev Mode Toast Testing:
 * - Exposes __toast global for console testing (dev mode only)
 */

/**
 * Inner app content that has access to ToastContext
 */
function AppContent() {
    const { tabs, activeTabId, createTabAndActivate, closeTab, setActiveTab, maxTabs, isAtTabLimit } = useTabContext();
    const { showToast, showSuccess, showError, showInfo, showWarning, dismissAll } = useToast();
    const [activeTabStatus, setActiveTabStatus] = useState<{
        isOnline: boolean;
        error: string | null;
        retry: () => void;
    }>({
        isOnline: true,
        error: null,
        retry: () => {
            window.location.reload();
        },
    });
    const pendingNavigateRef = useRef<GeminiNavigatePayload | null>(null);

    useTabKeyboardShortcuts({
        tabs,
        activeTabId,
        createTabAndActivate: () => createTabAndActivate(),
        closeTab,
        setActiveTab,
    });

    // Expose toast helpers globally for console testing (dev mode and testing)
    useEffect(() => {
        // Expose in development or test mode
        if (!(process.env.NODE_ENV === 'development' || import.meta.env.MODE === 'test' || import.meta.env.DEV)) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        win.__toast = {
            showToast,
            showSuccess,
            showError,
            showInfo,
            showWarning,
            dismissAll,
        };
        return () => {
            delete win.__toast;
        };
    }, [showToast, showSuccess, showError, showInfo, showWarning, dismissAll]);

    useEffect(() => {
        const unsubscribe = window.electronAPI?.onGeminiNavigate?.((data) => {
            pendingNavigateRef.current = data;

            const createdTabId = createTabAndActivate(data.targetTabId);
            if (!createdTabId) {
                pendingNavigateRef.current = null;
                showWarning(`Maximum ${maxTabs} tabs reached`);
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [createTabAndActivate, maxTabs, showWarning]);

    const handleTabReady = useCallback((tabId: string) => {
        const pendingNavigate = pendingNavigateRef.current;
        if (!pendingNavigate || pendingNavigate.targetTabId !== tabId) {
            return;
        }

        const readyPayload: GeminiReadyPayload = {
            requestId: pendingNavigate.requestId,
            targetTabId: pendingNavigate.targetTabId,
        };

        window.setTimeout(() => {
            window.electronAPI?.signalGeminiReady(readyPayload);
            if (pendingNavigateRef.current?.requestId === readyPayload.requestId) {
                pendingNavigateRef.current = null;
            }
        }, 500);
    }, []);

    const showOfflineOverlay = !activeTabStatus.isOnline || !!activeTabStatus.error;

    return (
        <MainLayout
            tabBar={
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={setActiveTab}
                    onTabClose={closeTab}
                    onNewTab={() => {
                        const tabId = createTabAndActivate();
                        if (!tabId) {
                            showWarning(`Maximum ${maxTabs} tabs reached`);
                        }
                    }}
                    isAtTabLimit={isAtTabLimit}
                    maxTabs={maxTabs}
                />
            }
        >
            {showOfflineOverlay && <OfflineOverlay onRetry={activeTabStatus.retry} />}
            <GeminiErrorBoundary>
                <TabPanel
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabReady={handleTabReady}
                    onActiveStatusChange={setActiveTabStatus}
                />
            </GeminiErrorBoundary>
        </MainLayout>
    );
}

/**
 * Root App component that sets up providers
 */
function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <UpdateToastProvider>
                    <TabProvider>
                        <AppContent />
                    </TabProvider>
                    <LinuxHotkeyNotice />
                </UpdateToastProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;
