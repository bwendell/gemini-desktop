import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiErrorBoundary } from './GeminiErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Working component</div>;
};

describe('GeminiErrorBoundary', () => {
  // Suppress console.error during tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <GeminiErrorBoundary>
        <div data-testid="child">Child content</div>
      </GeminiErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders default error fallback when error is caught', () => {
    render(
      <GeminiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    expect(screen.getByTestId('gemini-error-fallback')).toBeInTheDocument();
    expect(screen.getByText("Gemini couldn't load")).toBeInTheDocument();
    expect(
      screen.getByText('There was a problem displaying the Gemini interface.')
    ).toBeInTheDocument();
  });

  it('displays error message in technical details', () => {
    render(
      <GeminiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders reload button in default fallback', () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    render(
      <GeminiErrorBoundary>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', { name: /reload/i });
    expect(reloadButton).toBeInTheDocument();

    reloadButton.click();
    expect(reloadMock).toHaveBeenCalled();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

    render(
      <GeminiErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByTestId('gemini-error-fallback')).not.toBeInTheDocument();
  });

  it('calls onError callback when error is caught', () => {
    const onErrorMock = vi.fn();

    render(
      <GeminiErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('error callback receives correct error object', () => {
    const onErrorMock = vi.fn();

    render(
      <GeminiErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </GeminiErrorBoundary>
    );

    const errorArg = onErrorMock.mock.calls[0][0];
    expect(errorArg.message).toBe('Test error');
  });
});
