import { expect } from '@wdio/globals';
import { browser } from '@wdio/globals';

describe('Auto-Update Tray Integration', () => {
    // Only run on platforms that support tray (Windows/Linux/macOS all do, but behavior varies)
    // We assume the app is running with a tray.

    beforeEach(async () => {
        // Reset state: Clear any existing badges/tooltips
        await browser.execute(() => {
            window.electronAPI.devClearBadge();
        });
        await browser.pause(500);
    });

    it('should update tooltip when update is downloaded and revert when dismissed', async () => {
        // GIVEN an update is downloaded
        const version = '9.9.9'; // Test version
        await browser.execute((v) => {
            // Simulate update downloaded event via dev helper (assumes we have a way to trigger logic)
            // Since we don't have a direct "simulate update downloaded" on electronAPI, 
            // we use the devShowBadge which internally calls BadgeManager.showUpdateBadge AND TrayManager.setUpdateTooltip
            window.electronAPI.devShowBadge(v);
        }, version);

        await browser.pause(500);

        // WHEN the user hovers over the system tray icon (Simulated by checking tooltip text)
        // THEN tooltip should show "Gemini Desktop - Update vX.X.X available"
        const tooltip = await browser.execute(() => {
            return window.electronAPI.getTrayTooltip();
        });

        expect(tooltip).toContain(`Update v${version} available`);

        // AND when user dismisses update (simulated by clearing badge)
        await browser.execute(() => {
            window.electronAPI.devClearBadge();
        });
        await browser.pause(500);

        // THEN tooltip should revert to "Gemini Desktop"
        const finalTooltip = await browser.execute(() => {
            return window.electronAPI.getTrayTooltip();
        });

        expect(finalTooltip).toBe('Gemini Desktop');
    });
});
