import { MainLayout, OfflineOverlay, GeminiErrorBoundary } from './components';
import { ThemeProvider } from './context/ThemeContext';
import { UpdateToastProvider } from './context/UpdateToastContext';
import { useGeminiIframe } from './hooks';
import { GEMINI_APP_URL } from './utils/constants';
import './App.css';

/**
 * Root application component.
 *
 * Uses an iframe to embed Gemini. Electron's main process
 * strips security headers that would normally block iframe embedding.
 */

function App() {
  const { isLoading, error, isOnline, handleLoad, handleError } = useGeminiIframe();
  return (
    <ThemeProvider>
      <UpdateToastProvider>
        <MainLayout>
          {!isOnline && <OfflineOverlay />}
          <GeminiErrorBoundary>
            <div className="webview-container" data-testid="webview-container">
              {isLoading && (
                <div className="webview-loading" data-testid="webview-loading">
                  <div className="webview-loading-spinner" />
                  <span>Loading Gemini...</span>
                </div>
              )}
              {/* c8 ignore next 4 -- JSDOM cannot trigger iframe errors */}
              {error && (
                <div className="webview-error" data-testid="webview-error">
                  <span>Failed to load: {error}</span>
                </div>
              )}
              <iframe
                src={GEMINI_APP_URL}
                className="gemini-iframe"
                title="Gemini"
                onLoad={handleLoad}
                onError={handleError}
                data-testid="gemini-iframe"
                allow="microphone; camera; display-capture"
              />
            </div>
          </GeminiErrorBoundary>
        </MainLayout>
      </UpdateToastProvider>
    </ThemeProvider>
  );
}

export default App;
