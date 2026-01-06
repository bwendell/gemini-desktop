import { Component, ErrorInfo, ReactNode } from 'react';
import { createRendererLogger } from '../utils';

const logger = createRendererLogger('[ErrorBoundary]');

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Custom fallback component to render on error */
    fallback?: ReactNode;
    /** Unique identifier for E2E testing - used to create a unique global trigger */
    testId?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/**
 * React Error Boundary component.
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them, and displays a fallback UI instead of crashing.
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: undefined };
    }

    componentDidMount(): void {
        // Expose E2E test trigger on window for testing
        // Uses testId prop if provided, otherwise defaults to 'app'
        const triggerId = this.props.testId || 'app';
        const triggerName = `__ERROR_BOUNDARY_TRIGGER_${triggerId.toUpperCase()}__`;

        // @ts-expect-error - E2E testing hook
        window[triggerName] = () => {
            this.setState({
                hasError: true,
                error: new Error(`E2E Test Error Triggered (${triggerId})`),
            });
        };
    }

    componentWillUnmount(): void {
        // Cleanup E2E test trigger
        const triggerId = this.props.testId || 'app';
        const triggerName = `__ERROR_BOUNDARY_TRIGGER_${triggerId.toUpperCase()}__`;
        // @ts-expect-error
        delete window[triggerName];
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        logger.error('Caught error:', {
            error,
            componentStack: info.componentStack,
            timestamp: new Date().toISOString(),
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Return custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI with data-testid for E2E testing
            return (
                <div className="error-fallback" data-testid="error-fallback">
                    <div className="error-fallback-content">
                        <h2 data-testid="error-fallback-title">Something went wrong</h2>
                        <p>The application encountered an unexpected error.</p>
                        {this.state.error && (
                            <details>
                                <summary>Error details</summary>
                                <pre data-testid="error-fallback-message">{this.state.error.message}</pre>
                            </details>
                        )}
                        <button onClick={() => window.location.reload()} data-testid="error-fallback-reload">
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
