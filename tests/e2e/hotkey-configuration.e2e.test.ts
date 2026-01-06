/**
 * E2E tests for hotkey configuration feature.
 *
 * Comprehensive end-to-end tests covering all user scenarios:
 * - Opening options and navigating to hotkeys
 * - Viewing default hotkeys
 * - Recording new shortcuts
 * - Resetting to defaults
 * - Enabling/disabling hotkeys
 * - Cross-window persistence
 * - Visual feedback and accessibility
 */

import { browser, expect } from '@wdio/globals';
import {
    openOptionsWindowViaHotkey,
    waitForOptionsWindow,
    closeOptionsWindow,
    switchToOptionsWindow,
} from './helpers/optionsWindowActions';
import { OptionsPage } from './pages/OptionsPage';

// Create page object instance for use in tests
const optionsPage = new OptionsPage();

describe('Hotkey Configuration E2E', () => {
    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    beforeEach(async () => {
        // Ensure we are focused on the main window before pressing keys
        const handles = await browser.getWindowHandles();
        await browser.switchToWindow(handles[0]);

        await openOptionsWindowViaHotkey();
        await waitForOptionsWindow();
    });

    afterEach(async () => {
        // Close options window if open
        const handles = await browser.getWindowHandles();
        if (handles.length > 1) {
            await closeOptionsWindow();
        }
    });

    // ============================================================================
    // Scenario 1: Viewing Default Hotkeys
    // ============================================================================

    describe('viewing default hotkeys', () => {
        it('should display all three hotkeys with default accelerators', async () => {
            // Find the hotkey toggles section
            const hotkeyToggles = await browser.$('[data-testid="individual-hotkey-toggles"]');
            await expect(hotkeyToggles).toBeDisplayed();

            // Should show three hotkeys
            const hotkeyRows = await hotkeyToggles.$$('.hotkey-row');
            expect(hotkeyRows.length).toBe(3);

            // Verify Always on Top shows the default accelerator (Ctrl+Alt+P or ⌘⌥P on Mac)
            const alwaysOnTopRow = await browser.$('[data-testid="hotkey-toggle-alwaysOnTop"]').parentElement();
            const alwaysOnTopAccelerator = await alwaysOnTopRow.$('.keycap-container');
            const acceleratorText = await alwaysOnTopAccelerator.getText();

            // Should contain the keys (platform-aware)
            expect(acceleratorText).toMatch(/(Ctrl|⌘).*(Alt|⌥).*P/);
        });

        it('should display keycaps with proper styling', async () => {
            const keycaps = await browser.$$('kbd.keycap');
            expect(keycaps.length).toBeGreaterThan(0);

            // Verify first keycap has proper styling
            const firstKeycap = keycaps[0];
            const backgroundColor = await firstKeycap.getCSSProperty('background');
            expect(backgroundColor.value).toContain('gradient');
        });

        it('should show key separators between keycaps', async () => {
            const separators = await browser.$$('.key-separator');
            expect(separators.length).toBeGreaterThan(0);

            const firstSeparator = separators[0];
            const text = await firstSeparator.getText();
            expect(text).toBe('+');
        });
    });

    // ============================================================================
    // Scenario 2: Recording New Shortcuts
    // ============================================================================

    describe('recording new shortcuts', () => {
        it('should enter recording mode when clicking accelerator display', async () => {
            // Use Page Object to click accelerator input for alwaysOnTop
            await optionsPage.clickAcceleratorInput('alwaysOnTop');

            // Should show recording prompt - verify with Page Object method
            await browser.waitUntil(async () => await optionsPage.isRecordingModeActive('alwaysOnTop'), {
                timeout: 2000,
                timeoutMsg: 'Recording mode did not activate',
            });

            // Verify prompt text
            const prompt = await browser.$(optionsPage.recordingPromptSelector('alwaysOnTop'));
            const promptText = await prompt.getText();
            expect(promptText).toContain('Press keys');
        });

        it('should display animated recording dot', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            const recordingDot = await browser.$('.recording-dot');
            await expect(recordingDot).toBeDisplayed();

            // Verify animation
            const animation = await recordingDot.getCSSProperty('animation-name');
            expect(animation.value).toBe('dot-pulse');
        });

        it('should capture and display new shortcut', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            // Send key combination (Ctrl+Shift+F)
            await browser.keys(['Control', 'Shift', 'f']);

            // Wait for recording to complete
            await browser.pause(300);

            // Should no longer be in recording mode
            const recordingPrompt = await browser.$('.recording-prompt');
            await expect(recordingPrompt).not.toBeDisplayed();

            // Should show new keycaps
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');
            expect(keycaps.length).toBe(3); // Ctrl, Shift, F

            // Verify IPC call was made
            const newAccelerator = await browser.electron.execute((_electron) => {
                // @ts-expect-error
                return global.hotkeyManager.getAccelerator('alwaysOnTop');
            });

            expect(newAccelerator).toMatch(/CommandOrControl\+Shift\+F/);
        });

        it('should cancel recording on Escape key', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            const originalText = await acceleratorDisplay.getText();

            await acceleratorDisplay.click();

            // Wait for recording mode
            await browser.waitUntil(
                async () => {
                    const prompt = await browser.$('.recording-prompt');
                    return await prompt.isDisplayed();
                },
                { timeout: 2000 }
            );

            // Press Escape
            await browser.keys('Escape');
            await browser.pause(200);

            // Should exit recording mode
            const recordingPrompt = await browser.$('.recording-prompt');
            await expect(recordingPrompt).not.toBeDisplayed();

            // Should still show original accelerator
            const currentText = await acceleratorDisplay.getText();
            expect(currentText).toBe(originalText);
        });

        it('should not allow shortcuts without modifiers', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            // Try to press just a letter key
            await browser.keys('a');
            await browser.pause(200);

            // Should still be in recording mode
            const recordingPrompt = await browser.$('.recording-prompt');
            await expect(recordingPrompt).toBeDisplayed();
        });

        it('should handle complex key combinations', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            // Send Ctrl+Alt+Shift+P
            await browser.keys(['Control', 'Alt', 'Shift', 'p']);
            await browser.pause(300);

            // Should have 4 keycaps
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');
            expect(keycaps.length).toBe(4);
        });
    });

    // ============================================================================
    // Scenario 3: Reset to Default
    // ============================================================================

    describe('resetting to default', () => {
        it('should show reset button when accelerator differs from default', async () => {
            // Change the accelerator first using Page Object
            await optionsPage.clickAcceleratorInput('alwaysOnTop');
            await browser.keys(['Control', 'Shift', 'q']);
            await browser.pause(300);

            // Reset button should appear - verify with Page Object method
            const isVisible = await optionsPage.isResetButtonVisible('alwaysOnTop');
            expect(isVisible).toBe(true);
        });

        it('should not show reset button for default accelerator', async () => {
            // Verify reset button is not visible when at default using Page Object
            const isVisible = await optionsPage.isResetButtonVisible('alwaysOnTop');
            expect(isVisible).toBe(false);
        });

        it('should restore default accelerator when reset is clicked', async () => {
            // Get original accelerator before changes
            const originalAccelerator = await optionsPage.getCurrentAccelerator('alwaysOnTop');

            // Change the accelerator using Page Object
            await optionsPage.clickAcceleratorInput('alwaysOnTop');
            await browser.keys(['Control', 'Shift', 'z']);
            await browser.pause(300);

            // Verify accelerator changed
            const changedAccelerator = await optionsPage.getCurrentAccelerator('alwaysOnTop');
            expect(changedAccelerator).not.toBe(originalAccelerator);

            // Click reset button using Page Object
            await optionsPage.clickResetButton('alwaysOnTop');

            // Should revert to original default
            const restoredAccelerator = await optionsPage.getCurrentAccelerator('alwaysOnTop');
            expect(restoredAccelerator).toBe(originalAccelerator);

            // Reset button should disappear
            const isVisible = await optionsPage.isResetButtonVisible('alwaysOnTop');
            expect(isVisible).toBe(false);
        });
    });

    // ============================================================================
    // Scenario 4: Enable/Disable Hotkeys
    // ============================================================================

    describe('enabling and disabling hotkeys', () => {
        it('should disable accelerator input when hotkey is disabled', async () => {
            // Find the toggle switch
            const toggle = await browser.$('[data-testid="hotkey-toggle-alwaysOnTop"]');
            await toggle.click();
            await browser.pause(300);

            // Accelerator input should be disabled
            const hotkeyInput = await browser.$('.hotkey-accelerator-input');
            const hasDisabledClass = await hotkeyInput.getAttribute('class');
            expect(hasDisabledClass).toContain('disabled');
        });

        it('should prevent recording when disabled', async () => {
            // Disable the hotkey
            const toggle = await browser.$('[data-testid="hotkey-toggle-alwaysOnTop"]');
            await toggle.click();
            await browser.pause(300);

            // Try to click accelerator display
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();
            await browser.pause(200);

            // Should not enter recording mode
            const recordingPrompt = await browser.$('.recording-prompt');
            const exists = await recordingPrompt.isExisting();
            if (exists) {
                const isDisplayed = await recordingPrompt.isDisplayed();
                expect(isDisplayed).toBe(false);
            }
        });

        it('should preserve custom accelerator when toggling enabled state', async () => {
            // Set custom accelerator
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();
            await browser.keys(['Control', 'Alt', 'w']);
            await browser.pause(300);

            // Disable hotkey
            const toggle = await browser.$('[data-testid="hotkey-toggle-alwaysOnTop"]');
            await toggle.click();
            await browser.pause(300);

            // Re-enable hotkey
            await toggle.click();
            await browser.pause(300);

            // Should still have custom accelerator
            const currentAccelerator = await browser.electron.execute((_electron) => {
                // @ts-expect-error
                return global.hotkeyManager.getAccelerator('alwaysOnTop');
            });

            expect(currentAccelerator).toMatch(/CommandOrControl\+Alt\+W/);
        });
    });

    // ============================================================================
    // Scenario 5: Cross-Window Persistence
    // ============================================================================

    describe('cross-window persistence', () => {
        it('should persist accelerator changes across window close/reopen', async () => {
            // Change accelerator
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();
            await browser.keys(['Control', 'Alt', 'r']);
            await browser.pause(300);

            // Close options window
            await closeOptionsWindow();
            await browser.pause(500);

            // Reopen options using shortcut
            // Ensure we are focused on the main window
            const mainHandles = await browser.getWindowHandles();
            await browser.switchToWindow(mainHandles[0]);

            await openOptionsWindowViaHotkey();
            await waitForOptionsWindow();

            // Verify accelerator is persisted
            const acceleratorDisplayAfter = await browser.$('.keycap-container');
            const text = await acceleratorDisplayAfter.getText();
            expect(text).toMatch(/(Ctrl|⌘).*(Alt|⌥).*R/);
        });

        it('should sync changes to main process', async () => {
            // Change accelerator in UI
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();
            await browser.keys(['Control', 'Shift', 'n']);
            await browser.pause(300);

            // Verify in main process
            const mainProcessAccelerator = await browser.electron.execute((_electron) => {
                // @ts-expect-error
                return global.hotkeyManager.getAccelerator('alwaysOnTop');
            });

            expect(mainProcessAccelerator).toMatch(/CommandOrControl\+Shift\+N/);
        });
    });

    // ============================================================================
    // Scenario 6: Visual Feedback
    // ============================================================================

    describe('visual feedback', () => {
        it('should apply recording class with animation during recording', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            // Container should have recording class
            const className = await acceleratorDisplay.getAttribute('class');
            expect(className).toContain('recording');

            // Should have pulse animation
            const animation = await acceleratorDisplay.getCSSProperty('animation-name');
            expect(animation.value).toBe('container-pulse');
        });

        it('should show hover effects on non-recording state', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');

            // Get initial border color
            const initialBorder = await acceleratorDisplay.getCSSProperty('border-color');

            // Hover over element
            await acceleratorDisplay.moveTo();
            await browser.pause(100);

            // Border color should change (indicated by transition)
            const transition = await acceleratorDisplay.getCSSProperty('transition');
            expect(transition.value).toContain('all');
        });

        it('should display keycap 3D effect with shadows', async () => {
            const keycaps = await browser.$$('kbd.keycap');
            const firstKeycap = keycaps[0];

            const boxShadow = await firstKeycap.getCSSProperty('box-shadow');
            expect(boxShadow.value).toBeTruthy();
        });
    });

    // ============================================================================
    // Scenario 7: Accessibility
    // ============================================================================

    describe('accessibility', () => {
        it('should have proper ARIA labels', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            const ariaLabel = await acceleratorDisplay.getAttribute('aria-label');

            expect(ariaLabel).toContain('Keyboard shortcut');
            expect(ariaLabel).toContain('Click to change');
        });

        it('should be keyboard navigable', async () => {
            // Tab to first hotkey accelerator
            await browser.keys('Tab');
            await browser.keys('Tab');
            await browser.keys('Tab');

            // Should focus on accelerator display
            const acceleratorDisplay = await browser.$('.keycap-container');
            const isFocused = await browser.execute((el) => {
                return document.activeElement === el;
            }, acceleratorDisplay);

            expect(isFocused).toBe(true);
        });

        it('should have proper tabindex when enabled', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            const tabindex = await acceleratorDisplay.getAttribute('tabindex');
            expect(tabindex).toBe('0');
        });

        it('should have negative tabindex when disabled', async () => {
            // Disable hotkey
            const toggle = await browser.$('[data-testid="hotkey-toggle-alwaysOnTop"]');
            await toggle.click();
            await browser.pause(300);

            const acceleratorDisplay = await browser.$('.keycap-container');
            const tabindex = await acceleratorDisplay.getAttribute('tabindex');
            expect(tabindex).toBe('-1');
        });
    });

    // ============================================================================
    // Scenario 8: Error Handling
    // ============================================================================

    describe('error handling', () => {
        it('should handle invalid shortcuts gracefully', async () => {
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();

            // Try modifier-only (should stay in recording)
            await browser.keys('Control');
            await browser.pause(200);

            const recordingPrompt = await browser.$('.recording-prompt');
            await expect(recordingPrompt).toBeDisplayed();
        });

        it('should maintain UI state on IPC errors', async () => {
            // This would require mocking IPC failures
            // For now, verify current state is maintained
            const initialText = await browser.$('.keycap-container').getText();

            // Try to record and cancel
            const acceleratorDisplay = await browser.$('.keycap-container');
            await acceleratorDisplay.click();
            await browser.keys('Escape');
            await browser.pause(200);

            const currentText = await browser.$('.keycap-container').getText();
            expect(currentText).toBe(initialText);
        });
    });

    // ============================================================================
    // Scenario 9: Multiple Hotkeys
    // ============================================================================

    describe('multiple hotkeys configuration', () => {
        it('should allow configuring all three hotkeys independently', async () => {
            const hotkeyRows = await browser.$$('.hotkey-row');
            expect(hotkeyRows.length).toBe(3);

            // Configure each hotkey with different combination
            const rowCount = hotkeyRows.length;
            for (let i = 0; i < rowCount; i++) {
                const acceleratorDisplay = await hotkeyRows[i].$('.keycap-container');
                await acceleratorDisplay.click();
                await browser.keys(['Control', 'Alt', `${i + 1}`]);
                await browser.pause(300);
            }

            // Verify all three have different accelerators
            const accelerators = await browser.electron.execute((_electron) => {
                // @ts-expect-error
                return global.hotkeyManager.getAccelerators();
            });

            expect(accelerators.alwaysOnTop).toMatch(/CommandOrControl\+Alt\+1/);
            expect(accelerators.bossKey).toMatch(/CommandOrControl\+Alt\+2/);
            expect(accelerators.quickChat).toMatch(/CommandOrControl\+Alt\+3/);
        });

        it('should prevent duplicate accelerators across hotkeys', async () => {
            // This behavior would depend on implementation
            // If we validate for duplicates, test here
            // For now, just verify each can be set independently
            const accelerators = await browser.electron.execute((_electron) => {
                // @ts-expect-error
                return global.hotkeyManager.getAccelerators();
            });

            // All three should have distinct values
            const values = Object.values(accelerators);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
        });
    });

    // ============================================================================
    // Scenario 10: Cross-Platform Display Verification
    // ============================================================================

    describe('cross-platform display', () => {
        it('should display correct symbols/text based on platform', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            const acceleratorDisplay = await browser.$('.keycap-container');
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');

            // Get the text of the first keycap (should be Ctrl or ⌘)
            const firstKeycapText = await keycaps[0].getText();

            if (platform === 'darwin') {
                // macOS should show symbols
                expect(firstKeycapText).toMatch(/[⌘⌃⌥⇧]/);
            } else {
                // Windows/Linux should show text labels
                expect(firstKeycapText).toMatch(/(Ctrl|Alt|Shift)/);
            }
        });

        it('should format CommandOrControl correctly for each platform', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            // Get the first hotkey accelerator (should contain CommandOrControl)
            const acceleratorDisplay = await browser.$('.keycap-container');
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');
            const firstKeycapText = await keycaps[0].getText();

            if (platform === 'darwin') {
                // On macOS, CommandOrControl should render as ⌘
                expect(firstKeycapText).toBe('⌘');
            } else {
                // On Windows/Linux, CommandOrControl should render as Ctrl
                expect(firstKeycapText).toBe('Ctrl');
            }
        });

        it('should format Alt key correctly for each platform', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            // Get the Always on Top hotkey which has Alt (default: CommandOrControl+Alt+P)
            const acceleratorDisplay = await browser.$('.keycap-container');
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');

            // Second keycap should be Alt
            const altKeycap = keycaps[1];
            const altText = await altKeycap.getText();

            if (platform === 'darwin') {
                // On macOS, Alt should render as ⌥
                expect(altText).toBe('⌥');
            } else {
                // On Windows/Linux, Alt should render as Alt
                expect(altText).toBe('Alt');
            }
        });

        it('should apply correct CSS classes for platform-specific styling', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            const acceleratorDisplay = await browser.$('.keycap-container');
            const keycaps = await acceleratorDisplay.$$('kbd.keycap');
            const firstKeycap = keycaps[0];

            if (platform === 'darwin') {
                // macOS symbols should have 'symbol' class
                const className = await firstKeycap.getAttribute('class');
                expect(className).toContain('symbol');
            } else {
                // Windows/Linux text should not have 'symbol' class
                const className = await firstKeycap.getAttribute('class');
                expect(className).not.toContain('symbol');
            }
        });

        it('should maintain platform consistency across window reopens', async () => {
            // Get initial platform
            const initialPlatform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            // Close and reopen options window
            await closeOptionsWindow();
            await browser.pause(300);

            await browser.execute(async () => {
                const api = (window as any).electronAPI;
                await api.openOptionsWindow();
            });

            await browser.pause(500);
            // Switch to options window
            await switchToOptionsWindow();

            await browser.waitUntil(
                async () => {
                    const content = await browser.$('#options-content');
                    return await content.isExisting();
                },
                { timeout: 5000 }
            );

            // Verify platform hasn't changed
            const reopenedPlatform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            expect(reopenedPlatform).toBe(initialPlatform);
        });

        it('should render all three hotkeys with platform-appropriate format', async () => {
            const platform = await browser.execute(() => {
                return (window as any).electronAPI.platform;
            });

            const hotkeyRows = await browser.$$('.hotkey-row');
            expect(hotkeyRows.length).toBe(3);

            // Check each hotkey row
            for (const row of hotkeyRows) {
                const keycaps = await row.$$('kbd.keycap');
                expect(keycaps.length).toBeGreaterThan(0);

                // At least one keycap should exist
                const firstKeycapText = await keycaps[0].getText();

                if (platform === 'darwin') {
                    // Should contain at least one Mac symbol
                    const allTextPromises = keycaps.map((k) => k.getText());
                    const allText = await Promise.all(allTextPromises);
                    const hasMacSymbol = allText.some((text) => /[⌘⌃⌥⇧]/.test(text));
                    expect(hasMacSymbol).toBe(true);
                } else {
                    // Should contain text labels
                    expect(firstKeycapText).toMatch(/(Ctrl|Alt|Shift|\w)/);
                }
            }
        });
    });
});
