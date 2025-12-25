import { Component, ErrorInfo, ReactNode } from 'react';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[GeminiErrorBoundary]');

interface GeminiErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback to render on error */
  fallback?: ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface GeminiErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Specialized Error Boundary for the Gemini iframe area.
 *
 * Catches rendering errors in the iframe container and provides
 * a more specific error message than the global ErrorBoundary.
 * Also allows a custom fallback and error callback.
 */
export class GeminiErrorBoundary extends Component<
  GeminiErrorBoundaryProps,
  GeminiErrorBoundaryState
> {
  constructor(props: GeminiErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: Error): GeminiErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('Gemini content error:', {
      error,
      componentStack: info.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Call optional error callback
    this.props.onError?.(error, info);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, error: undefined });
    // Force a re-render of children
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="gemini-error-fallback" data-testid="gemini-error-fallback">
          <div className="gemini-error-content">
            <h3>Gemini couldn&apos;t load</h3>
            <p>There was a problem displaying the Gemini interface.</p>
            {this.state.error && (
              <details>
                <summary>Technical Details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <button onClick={this.handleReload}>Reload</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
