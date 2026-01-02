import { MainLayout, OfflineOverlay, GeminiErrorBoundary } from './components';
import { PrintProgressOverlay } from './components/print';
import { ThemeProvider } from './context/ThemeContext';
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
 */

function App() {
  const { isLoading, error, isOnline, handleLoad, handleError, retry } = useGeminiIframe();
  const { iframeKey, handleIframeLoad } = useQuickChatNavigation(handleLoad);
  const { state: printProgress, handleCancel: handlePrintCancel } = usePrintProgress();

  // Show offline overlay if network is offline OR if iframe failed to load
  // This handles cases where navigator.onLine is true but Gemini is unreachable
  const showOfflineOverlay = !isOnline || !!error;

  return (
    <ThemeProvider>
      <UpdateToastProvider>
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
        <LinuxHotkeyNotice />
      </UpdateToastProvider>
    </ThemeProvider>
  );
}

export default App;
