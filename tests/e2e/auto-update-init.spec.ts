/**
 * E2E Test: Auto-Update Initialization
 * 
 * This test validates that auto-update initialization succeeds without errors.
 * When the --test-auto-update flag is set, electron-updater looks for 
 * dev-app-update.yml and should not throw ENOENT or other initialization errors.
 */

import { expect } from '@wdio/globals';

describe('Auto-Update Initialization', () => {
    it('should initialize auto-updater without errors', async () => {
        // Track if any auto-update errors occur
        let errorOccurred = false;
        let errorMessage = '';

        // Set up listener for auto-update errors
        // This must happen before the error could occur (early in app lifecycle)
        const errorPromise = await browser.executeAsync((done: (error: string | null) => void) => {
            let captured = false;

            const cleanup = window.electronAPI.onUpdateError((error: string) => {
                if (!captured) {
                    captured = true;
                    cleanup();
                    done(error); // Return error message if one occurs
                }
            });

            // Wait 5 seconds - if no error by then, initialization succeeded
            setTimeout(() => {
                if (!captured) {
                    cleanup();
                    done(null); // No error occurred
                }
            }, 5000);
        });

        const error = errorPromise;

        // THEN: Auto-updater should initialize without errors
        if (error) {
            errorOccurred = true;
            errorMessage = error as string;
        }

        expect(errorOccurred).toBe(false);
        if (errorOccurred) {
            throw new Error(`Auto-update initialization failed: ${errorMessage}`);
        }
    });

    it('should successfully read dev-app-update.yml configuration', async () => {
        // GIVEN: App is running with --test-auto-update flag
        // WHEN: UpdateManager initializes
        // THEN: No ENOENT error should appear in logs

        // We can verify this by checking that auto-update is enabled
        // (it would be disabled if config couldn't be read)
        const enabled = await browser.execute(() => {
            return window.electronAPI.getAutoUpdateEnabled();
        });

        expect(enabled).toBe(true);
    });
});
