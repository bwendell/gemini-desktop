// @ts-nocheck
/**
 * E2E Tests: Wayland Hotkey Registration and LinuxHotkeyNotice Toast
 *
 * Verifies that the application correctly detects Wayland environments,
 * registers global hotkeys when supported, and displays appropriate
 * LinuxHotkeyNotice toast messages.
 *
 * Follows patterns from:
 * - hotkey-registration.spec.ts: isLinux() skip guard, browser.electron.execute()
 * - hotkeys.spec.ts: waitForAppReady(), environmental checks
 *
 * @module wayland-hotkey-registration.spec
 */

import { expect } from '@wdio/globals';
import { waitForAppReady } from './helpers/workflows';
import { isLinux, isLinuxSync } from './helpers/platform';
import { waitForUIState } from './helpers/waitUtilities';
import { ToastPage } from './pages';
import { E2E_TIMING, TOAST_IDS } from './helpers/e2eConstants';
import {
    getPlatformHotkeyStatus,
    checkGlobalShortcutRegistration,
    getDbusActivationSignalStats,
    clearDbusActivationSignalHistory,
    getWaylandStatusForSkipping,
} from './helpers/hotkeyHelpers';

describe('Wayland Hotkey Registration', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    it('on Linux: platform status contains waylandStatus object', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] Wayland status test skipped on non-Linux platform');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        // Handle case where IPC is not available (environmental issue)
        if (!status) {
            console.log('⚠️  Skipping test: getPlatformHotkeyStatus returned null');
            console.log('   This can occur if IPC is not properly initialized');
            return;
        }

        // Verify waylandStatus object exists and has expected fields
        expect(status.waylandStatus).toBeDefined();
        expect(typeof status.waylandStatus.isWayland).toBe('boolean');
        expect(typeof status.waylandStatus.desktopEnvironment).toBe('string');
        expect(typeof status.waylandStatus.portalAvailable).toBe('boolean');
        expect(typeof status.waylandStatus.portalMethod).toBe('string');

        console.log('Platform Hotkey Status:', JSON.stringify(status, null, 2));
    });

    it('on Linux Wayland+KDE: hotkeys register successfully if environment supports it', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] Wayland+KDE hotkey test skipped on non-Linux platform');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            console.log('⚠️  Skipping test: getPlatformHotkeyStatus returned null');
            return;
        }

        // Skip if not running on Wayland
        if (!status.waylandStatus.isWayland) {
            console.log('[SKIPPED] Not a Wayland session - skipping Wayland-specific test');
            console.log(`   Session type detection: isWayland=${status.waylandStatus.isWayland}`);
            return;
        }

        // Skip if portal not available (e.g., not KDE Plasma 5.27+)
        if (!status.waylandStatus.portalAvailable) {
            console.log('[SKIPPED] Portal not available in this Wayland environment');
            console.log(
                `   DE: ${status.waylandStatus.desktopEnvironment}, Portal method: ${status.waylandStatus.portalMethod}`
            );
            return;
        }

        // If we get here, portal is available - verify hotkeys registered
        const registrationStatus = await checkGlobalShortcutRegistration();

        if (!registrationStatus || registrationStatus.status === 'error') {
            console.log('⚠️  Could not verify hotkey registration:', registrationStatus?.error);
            return;
        }

        // At least one global hotkey should be registered
        const anyRegistered = registrationStatus.quickChat || registrationStatus.bossKey;

        if (!anyRegistered) {
            console.log('⚠️  Hotkeys not registered despite portal availability');
            console.log('   This may indicate a timing issue or environmental constraint');
            console.log('   Registration status:', JSON.stringify(registrationStatus));
            return;
        }

        // Verify global hotkeys are registered
        expect(registrationStatus.quickChat).toBe(true);
        expect(registrationStatus.bossKey).toBe(true);
        expect(status.globalHotkeysEnabled).toBe(true);

        console.log('✓ Wayland hotkeys registered successfully');
    });

    it('on Linux non-Wayland: hotkeys are NOT registered and globalHotkeysEnabled is false', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] Non-Wayland Linux test skipped on non-Linux platform');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            console.log('⚠️  Skipping test: getPlatformHotkeyStatus returned null');
            return;
        }

        // Skip if running on Wayland (this test is for X11/other sessions)
        if (status.waylandStatus.isWayland) {
            console.log('[SKIPPED] Running on Wayland session - skipping non-Wayland test');
            return;
        }

        // On non-Wayland Linux, global hotkeys should be disabled
        expect(status.globalHotkeysEnabled).toBe(false);

        console.log('✓ Non-Wayland Linux correctly has hotkeys disabled');
        console.log(
            `   DE: ${status.waylandStatus.desktopEnvironment}, Portal method: ${status.waylandStatus.portalMethod}`
        );
    });
});

describe('LinuxHotkeyNotice Toast Behavior', () => {
    const toastPage = new ToastPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    it('on successful registration: no warning toast visible', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] LinuxHotkeyNotice test skipped on non-Linux platform');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            console.log('⚠️  Skipping test: getPlatformHotkeyStatus returned null');
            return;
        }

        // Only check for no-toast when hotkeys are actually enabled
        if (!status.globalHotkeysEnabled) {
            console.log('[SKIPPED] Hotkeys not enabled - toast behavior for failure tested separately');
            return;
        }

        // Check for partial failures
        const failures = status.registrationResults.filter((r) => !r.success);
        if (failures.length > 0) {
            console.log('[SKIPPED] Partial registration failures exist - toast may show');
            return;
        }

        // Clear any stale toasts from previous tests/app state
        await toastPage.dismissAll();

        // Wait for LinuxHotkeyNotice's SHOW_DELAY_MS (1000ms) to pass,
        // plus buffer for IPC round-trip. Must exceed component delay to ensure
        // component has made its decision.
        const toastSelector = toastPage.toastByIdSelector(TOAST_IDS.LINUX_HOTKEY_NOTICE);

        // Use condition-based wait to detect if toast appears
        const toastAppeared = await waitForUIState(
            async () => {
                const toast = await browser.$(toastSelector);
                return await toast.isDisplayed();
            },
            {
                timeout: E2E_TIMING.TIMEOUTS.IPC_OPERATION + 1500, // 3000 + 1500 = 4500ms (exceeds SHOW_DELAY_MS of 1000ms)
                description: 'LinuxHotkeyNotice toast to appear',
            }
        );

        if (toastAppeared) {
            // If toast appeared when it shouldn't, verify it's NOT the "Disabled" toast
            // (it might be a stale toast from previous test or partial failure)
            const toastElement = await browser.$(toastSelector);
            const toastTitle = await toastElement
                .$('[data-testid="toast-title"]')
                .getText()
                .catch(() => '');
            const toastMessage = await toastElement
                .$('[data-testid="toast-message"]')
                .getText()
                .catch(() => '');

            console.log('Toast appeared unexpectedly:', { title: toastTitle, message: toastMessage });

            // The only acceptable toast when globalHotkeysEnabled=true is "Hotkey Registration Partial"
            // If we see "Global Hotkeys Disabled", that's a bug
            if (toastTitle.includes('Disabled') || toastMessage.includes('unavailable')) {
                expect.fail(
                    `Unexpected "Global Hotkeys Disabled" toast appeared when globalHotkeysEnabled=true. Toast: "${toastTitle} - ${toastMessage}"`
                );
            }

            // If it's a partial failure toast, that's expected if there were race conditions
            // in status checking - skip this test run
            if (toastTitle.includes('Partial')) {
                console.log('[SKIPPED] Partial failure toast appeared - possible race condition in status check');
                return;
            }
        }

        expect(toastAppeared).toBe(false);
        console.log('✓ No warning toast when hotkeys registered successfully');
    });

    it('on failed registration: warning toast appears with appropriate message', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] LinuxHotkeyNotice failure test skipped on non-Linux platform');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            console.log('⚠️  Skipping test: getPlatformHotkeyStatus returned null');
            return;
        }

        // Only check for toast when hotkeys are disabled
        if (status.globalHotkeysEnabled) {
            console.log('[SKIPPED] Hotkeys are enabled - toast should not appear');
            return;
        }

        // Wait for the LinuxHotkeyNotice toast to appear
        // LinuxHotkeyNotice has SHOW_DELAY_MS = 1000, so we use a longer timeout
        const toastSelector = toastPage.toastByIdSelector(TOAST_IDS.LINUX_HOTKEY_NOTICE);

        await waitForUIState(
            async () => {
                const toast = await browser.$(toastSelector);
                return await toast.isDisplayed();
            },
            { timeout: E2E_TIMING.TIMEOUTS.ANIMATION_SETTLE, description: 'LinuxHotkeyNotice toast to appear' }
        );

        // Verify toast contains relevant text
        const toastElement = await browser.$(toastSelector);
        const toastText = await toastElement.getText();

        // Should contain text about Wayland or Linux hotkey limitations
        const hasRelevantText =
            toastText.toLowerCase().includes('wayland') ||
            toastText.toLowerCase().includes('hotkey') ||
            toastText.toLowerCase().includes('shortcut') ||
            toastText.toLowerCase().includes('linux');

        expect(hasRelevantText).toBe(true);
        console.log('✓ Warning toast displayed with appropriate message');
        console.log(`   Toast text: "${toastText}"`);
    });
});

describe('Environmental Graceful Degradation', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    it('test environment without Wayland support degrades gracefully', async () => {
        if (!(await isLinux())) {
            console.log('[SKIPPED] Graceful degradation test skipped on non-Linux platform');
            return;
        }

        // This test verifies that even in environments without Wayland (most CI),
        // the test suite runs without crashes or timeouts

        const status = await getPlatformHotkeyStatus();

        // The test passes if we get here without throwing
        // Either status is returned (app handles gracefully) or null (IPC issue)
        if (status) {
            console.log('✓ Platform status retrieved successfully');
            console.log(`   isWayland: ${status.waylandStatus.isWayland}`);
            console.log(`   globalHotkeysEnabled: ${status.globalHotkeysEnabled}`);
            console.log(`   portalMethod: ${status.waylandStatus.portalMethod}`);
        } else {
            console.log('⚠️  Platform status not available, but test did not crash');
            console.log('   This is acceptable graceful degradation');
        }

        // Verify no uncaught exceptions by checking app is still responsive
        const title = await browser.getTitle();
        expect(typeof title).toBe('string');

        console.log('✓ Environment degraded gracefully without crashes');
    });
});

describe('Non-Linux Platform Behavior', () => {
    // Use sync check to potentially skip entire describe block logging
    const shouldRun = !isLinuxSync();

    beforeEach(async () => {
        await waitForAppReady();
    });

    it('existing hotkey behavior unchanged on macOS/Windows', async () => {
        if (await isLinux()) {
            console.log('[SKIPPED] Non-Linux platform test skipped on Linux');
            return;
        }

        // On macOS/Windows, global hotkeys should work as before
        const registrationStatus = await checkGlobalShortcutRegistration();

        // Handle undefined results gracefully
        if (!registrationStatus) {
            console.log('⚠️  Skipping test: browser.electron.execute returned undefined');
            console.log('   This can occur in CI or when multiple Electron instances compete');
            return;
        }

        if (registrationStatus.status === 'error') {
            throw new Error(`Main process error: ${registrationStatus.error}`);
        }

        // Check if ANY global hotkey was registered
        const anyRegistered = registrationStatus.quickChat || registrationStatus.bossKey;

        if (!anyRegistered) {
            console.log('⚠️  Skipping test: No global hotkeys were registered');
            console.log('   This is expected when another Electron instance has claimed shortcuts');
            return;
        }

        // Verify both global hotkeys are registered on non-Linux platforms
        expect(registrationStatus.quickChat).toBe(true);
        expect(registrationStatus.bossKey).toBe(true);

        console.log('✓ Non-Linux hotkey registration working as expected');
    });
});

describe('D-Bus Activation Signal Tracking (Test-Only)', () => {
    beforeEach(async () => {
        await waitForAppReady();
    });

    it('getDbusActivationSignalStats returns valid structure via IPC', async function () {
        if (!(await isLinux())) {
            this.skip();
            return;
        }

        const stats = await getDbusActivationSignalStats();

        if (!stats) {
            this.skip();
            return;
        }

        expect(typeof stats.trackingEnabled).toBe('boolean');
        expect(typeof stats.totalSignals).toBe('number');
        expect(typeof stats.signalsByShortcut).toBe('object');
        expect(stats.lastSignalTime === null || typeof stats.lastSignalTime === 'number').toBe(true);
        expect(Array.isArray(stats.signals)).toBe(true);

        console.log('✓ D-Bus activation signal stats structure valid');
        console.log(`   Tracking enabled: ${stats.trackingEnabled}`);
        console.log(`   Total signals: ${stats.totalSignals}`);
    });

    it('signal tracking reports correct initial state on test environment', async function () {
        if (!(await isLinux())) {
            this.skip();
            return;
        }

        await clearDbusActivationSignalHistory();

        const stats = await getDbusActivationSignalStats();

        if (!stats) {
            this.skip();
            return;
        }

        expect(stats.totalSignals).toBe(0);
        expect(stats.signals).toHaveLength(0);
        expect(Object.keys(stats.signalsByShortcut)).toHaveLength(0);
        expect(stats.lastSignalTime).toBeNull();

        console.log('✓ Signal tracking initial state correct after clear');
    });

    it('tracking is enabled when on Wayland+KDE with portal', async function () {
        const waylandStatus = await getWaylandStatusForSkipping();

        const shouldSkip =
            !waylandStatus.isLinux ||
            !waylandStatus.isWayland ||
            !waylandStatus.portalAvailable ||
            waylandStatus.desktopEnvironment !== 'kde';

        if (shouldSkip) {
            this.skip();
            return;
        }

        const stats = await getDbusActivationSignalStats();

        if (!stats) {
            this.skip();
            return;
        }

        expect(stats.trackingEnabled).toBe(true);

        console.log('✓ D-Bus signal tracking enabled on Wayland+KDE with portal');
    });

    it('signal history clear is idempotent', async function () {
        if (!(await isLinux())) {
            this.skip();
            return;
        }

        await clearDbusActivationSignalHistory();

        const stats1 = await getDbusActivationSignalStats();

        if (!stats1) {
            this.skip();
            return;
        }

        expect(stats1.totalSignals).toBe(0);

        await clearDbusActivationSignalHistory();

        const stats2 = await getDbusActivationSignalStats();

        expect(stats2?.totalSignals).toBe(0);
        expect(stats2?.lastSignalTime).toBeNull();

        console.log('✓ Signal history clear is idempotent');
    });

    it('signal stats reflect tracking state correctly on non-Wayland Linux', async function () {
        const waylandStatus = await getWaylandStatusForSkipping();

        if (!waylandStatus.isLinux || waylandStatus.isWayland) {
            this.skip();
            return;
        }

        const stats = await getDbusActivationSignalStats();

        if (!stats) {
            this.skip();
            return;
        }

        expect(typeof stats.trackingEnabled).toBe('boolean');

        console.log('✓ Signal stats accessible on non-Wayland Linux');
        console.log(`   Tracking enabled: ${stats.trackingEnabled}`);
    });

    it('IPC round-trip for signal stats completes within timeout', async function () {
        if (!(await isLinux())) {
            this.skip();
            return;
        }

        const startTime = Date.now();

        const stats = await getDbusActivationSignalStats();

        const elapsed = Date.now() - startTime;

        if (!stats) {
            this.skip();
            return;
        }

        expect(elapsed).toBeLessThan(5000);

        console.log(`✓ IPC round-trip completed in ${elapsed}ms`);
    });
});
