import { useEffect } from 'react';

import { MainLayout, OfflineOverlay, GeminiErrorBoundary } from './components';
import { PrintProgressOverlay } from './components/print';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { UpdateToastProvider } from './context/UpdateToastContext';
import { LinuxHotkeyNotice } from './components/toast';
import { useGeminiIframe, useQuickChatNavigation, usePrintProgress } from './hooks';
import { GEMINI_APP_URL } from './utils/constants';
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
  const { isLoading, error, isOnline, handleLoad, handleError, retry } = useGeminiIframe();
  const { iframeKey, handleIframeLoad } = useQuickChatNavigation(handleLoad);
  const { state: printProgress, handleCancel: handlePrintCancel } = usePrintProgress();
  const { showToast, showSuccess, showError, showInfo, showWarning, dismissAll } = useToast();

  // Listen for PDF export results and show toast notifications
  useEffect(() => {
    // Only subscribe if running in Electron
    if (typeof window === 'undefined' || !window.electronAPI) return;

    // Handle successful PDF export
    const cleanupSuccess = window.electronAPI.onPrintToPdfSuccess((filePath: string) => {
      showSuccess(`PDF saved to ${filePath}`, {
        persistent: true, // Don't auto-dismiss so user can click the action
        actions: [
          {
            label: 'Show in Folder',
            onClick: () => {
              window.electronAPI?.revealInFolder(filePath);
            },
          },
        ],
      });
    });

    // Handle PDF export error
    const cleanupError = window.electronAPI.onPrintToPdfError((error: string) => {
      showError(`Failed to export PDF: ${error}`);
    });

    return () => {
      cleanupSuccess?.();
      cleanupError?.();
    };
  }, [showSuccess, showError]);

  // Expose toast helpers globally for console testing (dev mode and testing)
  useEffect(() => {
    // Expose in development or test mode
    if (
      !(
        process.env.NODE_ENV === 'development' ||
        import.meta.env.MODE === 'test' ||
        import.meta.env.DEV
      )
    )
      return;

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

  // Show offline overlay if network is offline OR if iframe failed to load
  // This handles cases where navigator.onLine is true but Gemini is unreachable
  const showOfflineOverlay = !isOnline || !!error;

  return (
    <MainLayout>
      {showOfflineOverlay && <OfflineOverlay onRetry={retry} />}
      <GeminiErrorBoundary>
        <div className="webview-container" data-testid="webview-container">
          {isLoading && !showOfflineOverlay && (
            <div className="webview-loading" data-testid="webview-loading">
              <div className="webview-loading-spinner" />
              <span>Loading Gemini...</span>
            </div>
          )}
          <iframe
            key={iframeKey}
            src={GEMINI_APP_URL}
            className="gemini-iframe"
            title="Gemini"
            onLoad={handleIframeLoad}
            onError={handleError}
            data-testid="gemini-iframe"
            allow="microphone; camera; display-capture"
          />
        </div>
      </GeminiErrorBoundary>
      <PrintProgressOverlay
        visible={printProgress.visible}
        currentPage={printProgress.currentPage}
        totalPages={printProgress.totalPages}
        progress={printProgress.progress}
        onCancel={handlePrintCancel}
      />
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
          <AppContent />
          <LinuxHotkeyNotice />
        </UpdateToastProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
