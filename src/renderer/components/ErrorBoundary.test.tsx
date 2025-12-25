/**
 * Unit tests for ErrorBoundary component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Import after mocks
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div data-testid="child">Hello World</div>
            </ErrorBoundary>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders fallback UI when child throws', () => {
        // Component that throws on render
        const ThrowingComponent = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
        const ThrowingComponent = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error UI</div>}>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    });

    it('logs error to console when error occurs', () => {
        const ThrowingComponent = () => {
            throw new Error('Logged test error');
        };

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        expect(consoleSpy).toHaveBeenCalled();
        // The error log should contain our error message
        const errorCalls = consoleSpy.mock.calls;
        const errorLogCall = errorCalls.find(call =>
            call.some(arg =>
                typeof arg === 'object' &&
                arg !== null &&
                'error' in arg
            )
        );
        expect(errorLogCall).toBeDefined();
    });

    it('shows error details expandable section', () => {
        const ThrowingComponent = () => {
            throw new Error('Detailed error message');
        };

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        // Check for the details/summary element
        const details = screen.getByText('Error details');
        expect(details).toBeInTheDocument();

        // Click to expand and verify error message is visible
        fireEvent.click(details);
        expect(screen.getByText('Detailed error message')).toBeInTheDocument();
    });

    it('shows reload button in fallback UI', () => {
        const ThrowingComponent = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        const reloadButton = screen.getByRole('button', { name: /reload application/i });
        expect(reloadButton).toBeInTheDocument();
    });

    it('calls window.location.reload when reload button is clicked', () => {
        const reloadSpy = vi.fn();
        const originalLocation = window.location;
        // @ts-expect-error - mocking location
        delete window.location;
        window.location = { ...originalLocation, reload: reloadSpy };

        const ThrowingComponent = () => {
            throw new Error('Test error');
        };

        render(
            <ErrorBoundary>
                <ThrowingComponent />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByRole('button', { name: /reload application/i }));
        expect(reloadSpy).toHaveBeenCalled();

        window.location = originalLocation;
    });
});
