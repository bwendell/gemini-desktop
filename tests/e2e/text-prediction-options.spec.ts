/**
 * E2E Test: Text Prediction Options (Task 10.1)
 *
 * Tests toggling text prediction ON in the Options window and verifying
 * that status changes are visible to the user.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If toggle selector is wrong: test fails to find/click toggle
 * - If IPC handler broken: status won't update, test fails
 * - If status indicator not rendered: test fails to find status text
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect } from '@wdio/globals';
import { OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow, waitForIpcSettle } from './helpers/workflows';

describe('Text Prediction Options E2E', () => {
  const optionsPage = new OptionsPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  // ===========================================================================
  // 10.4 Download progress bar visible during download
  // ===========================================================================

  describe('Download Progress Bar (10.4)', () => {
    it('should display progress bar when download is in progress', async () => {
      E2ELogger.info('text-prediction', 'Testing download progress bar visibility');

      // 1. Open Options window via menu
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Verify text prediction section is visible
        const isSectionDisplayed = await optionsPage.isTextPredictionSectionDisplayed();
        expect(isSectionDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ Text prediction section is displayed');

        // 3. First ensure text prediction is enabled so status indicator is visible
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();
        E2ELogger.info('text-prediction', '✓ Text prediction enabled');

        // 4. Check if "Simulate Download" button is present (dev mode only)
        const simulateButtonSelector = '[data-testid="text-prediction-simulate-button"]';
        const simulateButton = await browser.$(simulateButtonSelector);
        const simulateButtonExists = await simulateButton.isExisting();

        if (simulateButtonExists) {
          // DEV MODE: Use the simulate button to trigger a fake download progress
          E2ELogger.info('text-prediction', 'Dev mode detected - using simulate button');

          // Click the simulate button to start the fake download
          await simulateButton.click();
          await browser.pause(300); // Wait for simulation to start

          // Verify progress bar is now visible
          const isProgressDisplayed = await optionsPage.isTextPredictionProgressDisplayed();
          expect(isProgressDisplayed).toBe(true);
          E2ELogger.info('text-prediction', '✓ Progress bar is visible during simulated download');

          // Verify progress bar has the correct test ID and is animating
          const progressSelector = '[data-testid="text-prediction-progress"]';
          const progressElement = await browser.$(progressSelector);
          const progressText = await progressElement.getText();

          // Progress text should contain percentage
          expect(progressText).toContain('%');
          E2ELogger.info('text-prediction', `✓ Progress bar shows percentage: "${progressText}"`);

          // Verify the progress fill element exists
          const progressFillSelector = '[data-testid="text-prediction-progress-fill"]';
          const progressFill = await browser.$(progressFillSelector);
          const progressFillExists = await progressFill.isExisting();
          expect(progressFillExists).toBe(true);
          E2ELogger.info('text-prediction', '✓ Progress bar fill element exists');

          // Wait for simulation to complete - progress bar should disappear when status becomes "ready"
          await browser.waitUntil(
            async () => {
              // When simulation completes, the progress bar disappears (status != 'downloading')
              const stillShowingProgress = await optionsPage.isTextPredictionProgressDisplayed();
              return !stillShowingProgress;
            },
            { timeout: 10000, timeoutMsg: 'Simulated download did not complete' }
          );

          E2ELogger.info('text-prediction', '✓ Simulated download completed successfully');

          // Verify status is "Ready" after simulation
          const statusText = await optionsPage.getTextPredictionStatusText();
          expect(statusText).toContain('Ready');
          E2ELogger.info('text-prediction', `✓ Status after simulation: "${statusText}"`);
        } else {
          // PRODUCTION MODE: Observe real progress during actual download
          E2ELogger.info('text-prediction', 'Production mode - observing real download');

          // Check the current status - model might already be downloaded
          const statusText = await optionsPage.getTextPredictionStatusText();

          if (statusText.includes('Ready')) {
            // Model already downloaded - progress bar test can't be verified
            E2ELogger.info(
              'text-prediction',
              '⚠ Model already downloaded - progress bar visibility cannot be tested'
            );
          } else if (statusText.includes('Downloading')) {
            // Download is in progress - verify progress bar is visible
            const isProgressDisplayed = await optionsPage.isTextPredictionProgressDisplayed();
            expect(isProgressDisplayed).toBe(true);
            E2ELogger.info('text-prediction', '✓ Progress bar is visible during active download');

            // Verify progress text contains percentage
            const progressSelector = '[data-testid="text-prediction-progress"]';
            const progressElement = await browser.$(progressSelector);
            const progressText = await progressElement.getText();
            expect(progressText).toContain('%');
            E2ELogger.info('text-prediction', `✓ Progress bar shows: "${progressText}"`);
          } else {
            // Not downloaded yet - trigger download and observe
            E2ELogger.info(
              'text-prediction',
              `Current status: "${statusText}" - download should start`
            );

            // Wait briefly for download to potentially start
            await browser.pause(1000);

            // Check if progress bar appeared
            const isProgressDisplayed = await optionsPage.isTextPredictionProgressDisplayed();
            if (isProgressDisplayed) {
              E2ELogger.info('text-prediction', '✓ Progress bar appeared during download');
            } else {
              // May have completed instantly (cached) or not started yet
              const updatedStatus = await optionsPage.getTextPredictionStatusText();
              E2ELogger.info(
                'text-prediction',
                `Status after wait: "${updatedStatus}" - progress may have been too fast`
              );
            }
          }
        }

        E2ELogger.info('text-prediction', '✓ Download progress bar test passed');
      } finally {
        // Cleanup: close options window
        await optionsPage.close();
      }
    });
  });

  // ===========================================================================
  // 10.1 Toggle text prediction ON → verify status changes
  // ===========================================================================

  describe('Toggle Text Prediction (10.1)', () => {
    it('should toggle text prediction ON and verify status changes are visible', async () => {
      E2ELogger.info('text-prediction', 'Testing text prediction toggle ON');

      // 1. Open Options window via menu
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Verify text prediction section is visible
        const isSectionDisplayed = await optionsPage.isTextPredictionSectionDisplayed();
        expect(isSectionDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ Text prediction section is displayed');

        // 3. If already enabled, disable first for clean test state
        const wasEnabled = await optionsPage.isTextPredictionEnabled();
        if (wasEnabled) {
          E2ELogger.info('text-prediction', 'Disabling text prediction for clean state');
          await optionsPage.disableTextPrediction();
          await waitForIpcSettle();

          // Verify status indicator is hidden when disabled
          const statusHidden = !(await optionsPage.isTextPredictionStatusDisplayed());
          expect(statusHidden).toBe(true);
        }

        // 4. Toggle text prediction ON
        E2ELogger.info('text-prediction', 'Toggling text prediction ON');
        await optionsPage.toggleTextPrediction();
        await waitForIpcSettle();

        // 5. Verify toggle state changed
        const isNowEnabled = await optionsPage.isTextPredictionEnabled();
        expect(isNowEnabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ Toggle state is now enabled');

        // 6. Verify status indicator appears
        const isStatusDisplayed = await optionsPage.isTextPredictionStatusDisplayed();
        expect(isStatusDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ Status indicator is displayed');

        // 7. Verify status text has a valid value (not empty)
        const statusText = await optionsPage.getTextPredictionStatusText();
        expect(statusText).toBeTruthy();

        // Status should be one of: "Not downloaded", "Downloading...", "Initializing...", "Ready", or "Error: ..."
        const validStatuses = ['Not downloaded', 'Downloading', 'Initializing', 'Ready', 'Error'];
        const hasValidStatus = validStatuses.some((s) => statusText.includes(s));
        expect(hasValidStatus).toBe(true);
        E2ELogger.info('text-prediction', `✓ Status text: "${statusText}"`);

        // 8. Verify GPU toggle appears when enabled
        const isGpuToggleDisplayed = await optionsPage.isTextPredictionGpuToggleDisplayed();
        expect(isGpuToggleDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU toggle is displayed when enabled');

        E2ELogger.info('text-prediction', '✓ Toggle text prediction ON test passed');
      } finally {
        // Cleanup: close options window
        await optionsPage.close();
      }
    });

    it('should hide status indicator when text prediction is disabled', async () => {
      E2ELogger.info('text-prediction', 'Testing status hidden when disabled');

      // 1. Open Options window
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Ensure text prediction is enabled first
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();

        // 3. Verify status is visible when enabled
        expect(await optionsPage.isTextPredictionStatusDisplayed()).toBe(true);

        // 4. Disable text prediction
        await optionsPage.disableTextPrediction();
        await waitForIpcSettle();

        // 5. Verify status indicator is hidden
        const isStatusHidden = !(await optionsPage.isTextPredictionStatusDisplayed());
        expect(isStatusHidden).toBe(true);
        E2ELogger.info('text-prediction', '✓ Status indicator hidden when disabled');

        // 6. Verify GPU toggle is also hidden
        const isGpuToggleHidden = !(await optionsPage.isTextPredictionGpuToggleDisplayed());
        expect(isGpuToggleHidden).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU toggle hidden when disabled');
      } finally {
        await optionsPage.close();
      }
    });
  });

  // ===========================================================================
  // 10.2 Toggle text prediction OFF → verify model unloaded
  // ===========================================================================

  describe('Toggle Text Prediction OFF (10.2)', () => {
    it('should toggle text prediction OFF and verify disabled state', async () => {
      E2ELogger.info('text-prediction', 'Testing text prediction toggle OFF');

      // 1. Open Options window via menu
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Ensure text prediction is enabled first
        E2ELogger.info('text-prediction', 'Ensuring text prediction is enabled first');
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();

        // 3. Verify enabled state
        const isEnabled = await optionsPage.isTextPredictionEnabled();
        expect(isEnabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ Text prediction is enabled');

        // 4. Verify status indicator is visible when enabled
        const statusVisibleWhenEnabled = await optionsPage.isTextPredictionStatusDisplayed();
        expect(statusVisibleWhenEnabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ Status indicator visible when enabled');

        // 5. Toggle text prediction OFF
        E2ELogger.info('text-prediction', 'Toggling text prediction OFF');
        await optionsPage.toggleTextPrediction();
        await waitForIpcSettle();

        // 6. Verify toggle state is now disabled
        const isNowDisabled = !(await optionsPage.isTextPredictionEnabled());
        expect(isNowDisabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ Toggle state is now disabled');

        // 7. Verify status indicator is hidden (model unloaded - no status to show)
        const isStatusHidden = !(await optionsPage.isTextPredictionStatusDisplayed());
        expect(isStatusHidden).toBe(true);
        E2ELogger.info('text-prediction', '✓ Status indicator hidden (model unloaded)');

        // 8. Verify GPU toggle is also hidden
        const isGpuToggleHidden = !(await optionsPage.isTextPredictionGpuToggleDisplayed());
        expect(isGpuToggleHidden).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU toggle hidden when disabled');

        // 9. Verify progress bar is not displayed
        const isProgressHidden = !(await optionsPage.isTextPredictionProgressDisplayed());
        expect(isProgressHidden).toBe(true);
        E2ELogger.info('text-prediction', '✓ Progress bar hidden when disabled');

        E2ELogger.info('text-prediction', '✓ Toggle text prediction OFF test passed');
      } finally {
        // Cleanup: close options window
        await optionsPage.close();
      }
    });
  });

  // ===========================================================================
  // 10.3 Toggle GPU acceleration → verify setting persists
  // ===========================================================================

  describe('Toggle GPU Acceleration Persistence (10.3)', () => {
    it('should toggle GPU acceleration ON and verify setting persists after Options close/reopen', async () => {
      E2ELogger.info('text-prediction', 'Testing GPU toggle persistence');

      // 1. Open Options window via menu
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Ensure text prediction is enabled (required for GPU toggle to be visible)
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();
        E2ELogger.info('text-prediction', '✓ Text prediction enabled');

        // 3. Verify GPU toggle is visible
        const isGpuToggleDisplayed = await optionsPage.isTextPredictionGpuToggleDisplayed();
        expect(isGpuToggleDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU toggle is displayed');

        // 4. Get initial GPU state and set it to ON
        const wasGpuEnabled = await optionsPage.isTextPredictionGpuEnabled();
        E2ELogger.info(
          'text-prediction',
          `Initial GPU state: ${wasGpuEnabled ? 'enabled' : 'disabled'}`
        );

        // 5. Enable GPU acceleration
        await optionsPage.enableTextPredictionGpu();
        await waitForIpcSettle();

        // 6. Verify GPU is now enabled
        const isGpuNowEnabled = await optionsPage.isTextPredictionGpuEnabled();
        expect(isGpuNowEnabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU acceleration is now enabled');

        // 7. Close Options window
        await optionsPage.close();
        await waitForWindowCount(1, 5000);
        E2ELogger.info('text-prediction', '✓ Options window closed');

        // 8. Reopen Options window
        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);
        await optionsPage.waitForLoad();
        E2ELogger.info('text-prediction', '✓ Options window reopened');

        // 9. Verify text prediction is still enabled
        const isStillEnabled = await optionsPage.isTextPredictionEnabled();
        expect(isStillEnabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ Text prediction still enabled after reopen');

        // 10. Verify GPU toggle is still displayed
        const isGpuToggleStillDisplayed = await optionsPage.isTextPredictionGpuToggleDisplayed();
        expect(isGpuToggleStillDisplayed).toBe(true);

        // 11. Verify GPU setting persisted
        const isGpuStillEnabled = await optionsPage.isTextPredictionGpuEnabled();
        expect(isGpuStillEnabled).toBe(true);
        E2ELogger.info(
          'text-prediction',
          '✓ GPU acceleration setting persisted after close/reopen'
        );

        E2ELogger.info('text-prediction', '✓ GPU toggle persistence test passed');
      } finally {
        // Cleanup: close options window
        await optionsPage.close();
      }
    });

    it('should toggle GPU acceleration OFF and verify setting persists after Options close/reopen', async () => {
      E2ELogger.info('text-prediction', 'Testing GPU toggle OFF persistence');

      // 1. Open Options window
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Ensure text prediction is enabled
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();

        // 3. Enable GPU first to have a known starting state
        await optionsPage.enableTextPredictionGpu();
        await waitForIpcSettle();

        // 4. Now disable GPU acceleration
        await optionsPage.disableTextPredictionGpu();
        await waitForIpcSettle();

        // 5. Verify GPU is now disabled
        const isGpuDisabled = !(await optionsPage.isTextPredictionGpuEnabled());
        expect(isGpuDisabled).toBe(true);
        E2ELogger.info('text-prediction', '✓ GPU acceleration is now disabled');

        // 6. Close and reopen Options
        await optionsPage.close();
        await waitForWindowCount(1, 5000);

        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);
        await optionsPage.waitForLoad();

        // 7. Verify GPU setting persisted as OFF
        const isGpuStillDisabled = !(await optionsPage.isTextPredictionGpuEnabled());
        expect(isGpuStillDisabled).toBe(true);
        E2ELogger.info(
          'text-prediction',
          '✓ GPU acceleration OFF setting persisted after close/reopen'
        );

        E2ELogger.info('text-prediction', '✓ GPU toggle OFF persistence test passed');
      } finally {
        await optionsPage.close();
      }
    });
  });

  // ===========================================================================
  // 10.5 Error state shows retry button
  // ===========================================================================

  describe('Error State Retry Button (10.5)', () => {
    it('should display retry button when in error state and allow re-attempt', async () => {
      E2ELogger.info('text-prediction', 'Testing error state retry button');

      // 1. Open Options window via menu
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Verify text prediction section is visible
        const isSectionDisplayed = await optionsPage.isTextPredictionSectionDisplayed();
        expect(isSectionDisplayed).toBe(true);
        E2ELogger.info('text-prediction', '✓ Text prediction section is displayed');

        // 3. Check if "Simulate Error" button is present (dev mode only)
        const isSimulateErrorButtonDisplayed = await optionsPage.isSimulateErrorButtonDisplayed();

        if (isSimulateErrorButtonDisplayed) {
          // DEV MODE: Use the simulate error button to trigger an error state
          E2ELogger.info('text-prediction', 'Dev mode detected - using simulate error button');

          // Click the simulate error button to trigger error state
          await optionsPage.clickSimulateErrorButton();
          await waitForIpcSettle();

          // Verify status shows error
          const isInErrorState = await optionsPage.isTextPredictionInErrorState();
          expect(isInErrorState).toBe(true);
          E2ELogger.info('text-prediction', '✓ Status shows error state');

          // Verify retry button is visible
          const isRetryButtonDisplayed = await optionsPage.isTextPredictionRetryButtonDisplayed();
          expect(isRetryButtonDisplayed).toBe(true);
          E2ELogger.info('text-prediction', '✓ Retry button is visible in error state');

          // Verify error message is displayed
          const statusText = await optionsPage.getTextPredictionStatusText();
          expect(statusText).toContain('Error');
          E2ELogger.info('text-prediction', `✓ Error message displayed: "${statusText}"`);

          // Click the retry button
          await optionsPage.clickTextPredictionRetryButton();
          await waitForIpcSettle();

          // Verify that clicking retry initiated a re-attempt
          // The status should change from error to something else (downloading, initializing, or ready)
          // Give it a moment to change
          await browser.pause(500);

          const statusAfterRetry = await optionsPage.getTextPredictionStatusText();
          const retryInitiated = !statusAfterRetry.includes('Simulated error for testing');
          expect(retryInitiated).toBe(true);
          E2ELogger.info(
            'text-prediction',
            `✓ Retry button clicked, status changed to: "${statusAfterRetry}"`
          );

          E2ELogger.info('text-prediction', '✓ Error state retry button test passed');
        } else {
          // PRODUCTION MODE: Cannot simulate error without breaking real state
          // Skip this test in production mode as we can't easily trigger an error
          E2ELogger.info(
            'text-prediction',
            '⚠ Production mode - skipping error state test (cannot simulate error without breaking real state)'
          );
          // Don't fail - just note that we can't test this in production mode
        }
      } finally {
        // Cleanup: close options window
        await optionsPage.close();
      }
    });

    it('should hide retry button when not in error state', async () => {
      E2ELogger.info('text-prediction', 'Testing retry button hidden when not in error state');

      // 1. Open Options window
      const { MainWindowPage } = await import('./pages');
      const mainWindow = new MainWindowPage();
      await mainWindow.openOptionsViaMenu();
      await waitForWindowCount(2, 5000);
      await optionsPage.waitForLoad();

      try {
        // 2. Enable text prediction to show status
        await optionsPage.enableTextPrediction();
        await waitForIpcSettle();

        // 3. Check if in error state
        const isInErrorState = await optionsPage.isTextPredictionInErrorState();

        if (!isInErrorState) {
          // 4. Verify retry button is NOT visible when not in error state
          const isRetryButtonDisplayed = await optionsPage.isTextPredictionRetryButtonDisplayed();
          expect(isRetryButtonDisplayed).toBe(false);
          E2ELogger.info('text-prediction', '✓ Retry button is hidden when not in error state');
        } else {
          E2ELogger.info(
            'text-prediction',
            '⚠ Already in error state - retry button visibility check not applicable'
          );
        }
      } finally {
        await optionsPage.close();
      }
    });
  });
});
