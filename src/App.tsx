import { useState } from 'react';
import { MainLayout } from './components/layout';
import './App.css';

/**
 * The URL for Gemini.
 * Electron's main process strips X-Frame-Options headers,
 * allowing this to be embedded in an iframe.
 */
const GEMINI_URL = 'https://gemini.google.com/app';

/**
 * Root application component.
 * 
 * Uses an iframe to embed Gemini. Electron's main process
 * strips security headers that would normally block iframe embedding.
 */

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load Gemini');
  };

  return (
    <MainLayout>
      <div className="webview-container" data-testid="webview-container">
        {isLoading && (
          <div className="webview-loading" data-testid="webview-loading">
            <div className="webview-loading-spinner" />
            <span>Loading Gemini...</span>
          </div>
        )}
        {error && (
          <div className="webview-error">
            <span>Failed to load: {error}</span>
          </div>
        )}
        <iframe
          src={GEMINI_URL}
          className="gemini-iframe"
          title="Gemini"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          data-testid="gemini-iframe"
        />

      </div>
    </MainLayout>
  );
}

export default App;
