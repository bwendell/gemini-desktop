import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { MainLayout } from './components/layout';
import './App.css';

/**
 * Root application component.
 * 
 * Initializes the Gemini webview on mount and provides
 * the main layout structure.
 */
function App() {
  const [webviewReady, setWebviewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create the Gemini webview on component mount
    async function initWebview() {
      try {
        await invoke('create_gemini_webview');
        setWebviewReady(true);
      } catch (err) {
        console.error('Failed to create webview:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    initWebview();
  }, []);

  return (
    <MainLayout>
      <div className="webview-container">
        {!webviewReady && !error && (
          <div className="webview-loading">
            <div className="webview-loading-spinner" />
            <span>Loading Gemini...</span>
          </div>
        )}
        {error && (
          <div className="webview-error">
            <span>Failed to load: {error}</span>
          </div>
        )}
        {/* The webview is created by Rust and positioned over this container */}
      </div>
    </MainLayout>
  );
}

export default App;
