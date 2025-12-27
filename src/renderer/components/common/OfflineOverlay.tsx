import './OfflineOverlay.css';

/**
 * Props for the OfflineOverlay component.
 */
export interface OfflineOverlayProps {
  /** Optional callback when the retry button is clicked */
  onRetry?: () => void;
}

/**
 * Overlay component displayed when the application is offline.
 * Shows a wifi-off icon and retry button with modern design.
 */
export function OfflineOverlay({ onRetry }: OfflineOverlayProps) {
  return (
    <div className="offline-overlay" data-testid="offline-overlay">
      <div className="offline-content">
        {/* Wifi Off Icon - Standard SVG, works on all platforms */}
        <svg
          className="offline-icon"
          data-testid="offline-icon"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M23.64 7C20.89 4.37 17.3 2.97 13.5 3.23L15.73 5.46C18.18 5.35 20.58 6.26 22.4 8L23.64 7Z"
            fill="currentColor"
          />
          <path
            d="M3.41 1.86L2 3.27L5.75 7.02C4.23 7.88 2.87 9.04 1.75 10.4L3 11.65C3.78 10.73 4.71 9.96 5.75 9.37L8.13 11.75C7.25 12.28 6.46 12.95 5.8 13.75L7.1 15C7.58 14.42 8.14 13.91 8.77 13.5L11.26 16L12 16.75L13.75 18.5L21.73 26.48L23.14 25.07L3.41 1.86Z"
            fill="currentColor"
          />
          <path
            d="M12 18C11.07 18 10.21 18.35 9.55 18.93L12 21.5L14.45 18.93C13.79 18.35 12.93 18 12 18Z"
            fill="currentColor"
          />
          <path
            d="M18.27 14.03L19.56 12.72L18.27 11.43C17.04 10.2 15.55 9.32 13.91 8.86L15.91 10.86C16.86 11.25 17.72 11.83 18.27 12.72V14.03Z"
            fill="currentColor"
          />
        </svg>

        <div className="offline-message">
          <h1>Network Unavailable</h1>
          <p>Please check your internet connection to continue using Gemini.</p>
        </div>

        {onRetry && (
          <button
            className="offline-retry-button"
            onClick={onRetry}
            data-testid="offline-retry-button"
            aria-label="Retry connection"
          >
            Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
