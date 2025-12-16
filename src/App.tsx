import { MainLayout } from './components/layout';
import { useWebviewInit } from './hooks/useWebviewInit';
import './App.css';

/**
 * Root application component.
 * 
 * Initializes the Gemini webview on mount and provides
 * the main layout structure.
 */
function App() {
  // isReady is not destructured because we don't show anything special when ready;
  // the webview is created by Rust and positioned over the container automatically.
  const { error, isLoading } = useWebviewInit();

  return (
    <MainLayout>
      <div className="webview-container">
        {isLoading && (
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
