import offlineImage from '../../assets/offline_screen.png';
import './OfflineOverlay.css';

/**
 * Overlay component displayed when the application is offline.
 * Covers the entire screen with the offline_screen.png asset.
 */
export function OfflineOverlay() {
    return (
        <div className="offline-overlay" data-testid="offline-overlay">
            <div className="offline-content">
                <img
                    src={offlineImage}
                    alt="Network Unavailable"
                    className="offline-image"
                />
                <div className="offline-message">
                    <h1>Network Unavailable</h1>
                    <p>Please check your internet connection to continue using Gemini.</p>
                </div>
            </div>
        </div>
    );
}
