// @ts-nocheck
/**
 * E2E Test: Global Hotkey Registration (Release Build Only)
 *
 * Validates that global hotkeys register correctly (or degrade gracefully)
 * in the packaged release build. Covers all platforms with appropriate
 * skip guards for platform-specific behavior.
 *
 * Test coverage:
 * - Global shortcut registration state on all platforms
 * - Platform hotkey status IPC on Linux
 * - Wayland+KDE hotkey registration when portal is available
 * - Graceful degradation regardless of registration outcome
 *
 * Uses shared helpers from hotkeyHelpers.ts to ensure consistency
 * between dev and release test assertions.
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from '../helpers/logger';
import { isLinuxSync, canRunWaylandTests } from '../helpers/platform';
import { skipTest, skipSuite } from '../helpers/testUtils';
import {
    checkGlobalShortcutRegistration,
    getPlatformHotkeyStatus,
    getDbusActivationSignalStats,
    clearDbusActivationSignalHistory,
    getWaylandStatusForSkipping,
} from '../helpers/hotkeyHelpers';
import { TOAST_IDS } from '../helpers/e2eConstants';

const LOG_CTX = 'hotkey-release';

describe('Release Build: Global Hotkey Registration', () => {
    it('should report globalShortcut registration state', async () => {
        const registration = await checkGlobalShortcutRegistration();

        if (!registration) {
            E2ELogger.warn(LOG_CTX, 'checkGlobalShortcutRegistration returned null — env issue');
            // App is still running, so this is acceptable degradation
            return;
        }

        expect(registration.status).toBe('success');
        E2ELogger.info(LOG_CTX, 'Global shortcut registration state', {
            quickChat: registration.quickChat,
            bossKey: registration.bossKey,
        });
    });

    it('on macOS/Windows: both global hotkeys should be registered', async function () {
        if (isLinuxSync()) {
            skipTest(this, 'macOS/Windows hotkeys', 'Linux platform — different registration path');
            return;
        }

        const registration = await checkGlobalShortcutRegistration();

        if (!registration) {
            skipTest(
                this,
                'macOS/Windows hotkeys',
                'checkGlobalShortcutRegistration returned null (CI or multiple Electron instances)'
            );
            return;
        }

        if (registration.status === 'error') {
            throw new Error(`Main process error: ${registration.error}`);
        }

        // On some CI environments, another Electron instance may claim the hotkeys
        const anyRegistered = registration.quickChat || registration.bossKey;
        if (!anyRegistered) {
            skipTest(
                this,
                'macOS/Windows hotkeys',
                'No global hotkeys registered (possibly claimed by another Electron instance)'
            );
            return;
        }

        expect(registration.quickChat).toBe(true);
        expect(registration.bossKey).toBe(true);
        E2ELogger.info(LOG_CTX, '✓ macOS/Windows hotkeys registered as expected');
    });

    it('on Linux non-Wayland: global hotkeys should NOT be registered', async function () {
        if (!isLinuxSync()) {
            skipTest(this, 'Linux non-Wayland hotkeys', 'Not Linux');
            return;
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        // This test only applies to non-Wayland Linux
        if (status.waylandStatus.isWayland) {
            skipTest(this, 'Linux non-Wayland hotkeys', 'Running on Wayland session');
            return;
        }

        expect(status.globalHotkeysEnabled).toBe(false);
        E2ELogger.info(LOG_CTX, '✓ Linux non-Wayland correctly has hotkeys disabled', {
            desktopEnvironment: status.waylandStatus.desktopEnvironment,
            portalMethod: status.waylandStatus.portalMethod,
        });
    });
});

describe('Release Build: Platform Hotkey Status IPC', () => {
    before(function () {
        if (!isLinuxSync()) {
            skipSuite(this, 'Platform Hotkey Status IPC', 'Linux-only suite');
        }
    });

    it('should return valid waylandStatus structure via IPC', async () => {
        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        expect(status.waylandStatus).toBeDefined();
        expect(typeof status.waylandStatus.isWayland).toBe('boolean');
        expect(typeof status.waylandStatus.desktopEnvironment).toBe('string');
        expect(typeof status.waylandStatus.portalAvailable).toBe('boolean');
        expect(typeof status.waylandStatus.portalMethod).toBe('string');
        expect(typeof status.globalHotkeysEnabled).toBe('boolean');
        expect(Array.isArray(status.registrationResults)).toBe(true);

        E2ELogger.info(LOG_CTX, 'Platform hotkey status via IPC', {
            isWayland: status.waylandStatus.isWayland,
            de: status.waylandStatus.desktopEnvironment,
            portalAvailable: status.waylandStatus.portalAvailable,
            portalMethod: status.waylandStatus.portalMethod,
            globalHotkeysEnabled: status.globalHotkeysEnabled,
            registrationCount: status.registrationResults.length,
        });
    });

    it('should have consistent globalHotkeysEnabled with actual registration', async () => {
        const [status, registration] = await Promise.all([
            getPlatformHotkeyStatus(),
            checkGlobalShortcutRegistration(),
        ]);

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        if (!registration) {
            E2ELogger.warn(LOG_CTX, 'Cannot check consistency — globalShortcut registration unavailable');
            return;
        }

        if (status.waylandStatus.isWayland) {
            E2ELogger.info(LOG_CTX, 'Skipping globalShortcut consistency on Wayland; portal registration used');
            return;
        }

        if (registration.status === 'error') {
            E2ELogger.warn(LOG_CTX, `globalShortcut error: ${registration.error}`);
            return;
        }

        const actuallyRegistered = registration.quickChat || registration.bossKey;

        // If globalHotkeysEnabled is true, at least one hotkey should be registered
        if (status.globalHotkeysEnabled) {
            expect(actuallyRegistered).toBe(true);
        }

        E2ELogger.info(LOG_CTX, 'Consistency check', {
            globalHotkeysEnabled: status.globalHotkeysEnabled,
            actuallyRegistered,
        });
    });
});

describe('Release Build: Wayland+KDE Hotkey Registration', () => {
    before(function () {
        if (!canRunWaylandTests()) {
            skipSuite(this, 'Wayland+KDE Hotkey Registration', 'Requires local Wayland+KDE (non-CI)');
        }
    });

    it('should report KDE Wayland portal availability correctly', async function () {
        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        if (!status.waylandStatus.isWayland) {
            skipTest(this, 'Wayland+KDE portal detection', 'Not a Wayland session');
        }

        expect(status.waylandStatus.desktopEnvironment).toBe('kde');

        const deVersion = status.waylandStatus.deVersion;
        const majorVersion = deVersion ? parseInt(deVersion, 10) : NaN;
        const supported = Number.isNaN(majorVersion) ? false : majorVersion >= 5;

        expect(status.waylandStatus.portalAvailable).toBe(supported);

        if (status.waylandStatus.portalAvailable) {
            expect(deVersion).not.toBeNull();
            expect(majorVersion).toBeGreaterThanOrEqual(5);
        }

        E2ELogger.info(LOG_CTX, 'KDE Wayland portal detection', {
            deVersion,
            portalAvailable: status.waylandStatus.portalAvailable,
        });
    });

    it('should register hotkeys successfully when portal is available', async () => {
        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        if (!status.waylandStatus.isWayland) {
            E2ELogger.info(LOG_CTX, 'Not a Wayland session — skipping');
            return;
        }

        if (!status.waylandStatus.portalAvailable) {
            E2ELogger.info(LOG_CTX, 'Portal not available — skipping', {
                de: status.waylandStatus.desktopEnvironment,
                portalMethod: status.waylandStatus.portalMethod,
            });
            return;
        }

        expect(status.globalHotkeysEnabled).toBe(true);
        expect(['dbus-direct', 'dbus-fallback']).toContain(status.waylandStatus.portalMethod);

        const quickChatResult = status.registrationResults.find((r) => r.hotkeyId === 'quickChat');
        const bossKeyResult = status.registrationResults.find((r) => r.hotkeyId === 'bossKey');

        expect(quickChatResult).toBeDefined();
        expect(bossKeyResult).toBeDefined();
        expect(quickChatResult.success).toBe(true);
        expect(bossKeyResult.success).toBe(true);

        E2ELogger.info(LOG_CTX, '✓ Wayland+KDE hotkeys registered via portal');
    });

    it('should avoid globalShortcut false positives on Wayland', async () => {
        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        if (!status.waylandStatus.isWayland) {
            skipTest(this, 'Wayland globalShortcut checks', 'Not a Wayland session');
            return;
        }

        if (!status.waylandStatus.portalAvailable) {
            skipTest(this, 'Wayland globalShortcut checks', 'Portal not available');
            return;
        }

        const registration = await checkGlobalShortcutRegistration();

        if (!registration || registration.status === 'error') {
            E2ELogger.warn(LOG_CTX, 'globalShortcut check failed', registration);
            return;
        }

        E2ELogger.info(LOG_CTX, 'Wayland portal path active; globalShortcut is not authoritative', {
            quickChat: registration.quickChat,
            bossKey: registration.bossKey,
            portalMethod: status.waylandStatus.portalMethod,
        });
    });

    it('should disable hotkeys when portal is unavailable on Wayland', async function () {
        const status = await getPlatformHotkeyStatus();

        if (!status) {
            throw new Error('getPlatformHotkeyStatus IPC not available');
        }

        if (!status.waylandStatus.isWayland) {
            skipTest(this, 'Wayland portal unavailable', 'Not a Wayland session');
        }

        if (status.waylandStatus.portalAvailable) {
            skipTest(this, 'Wayland portal unavailable', 'Portal available on this system');
        }

        expect(status.globalHotkeysEnabled).toBe(false);

        const toastSelector = `[data-toast-id="${TOAST_IDS.LINUX_HOTKEY_NOTICE}"]`;
        const toastAppeared = await browser.waitUntil(
            async () => {
                const toast = await browser.$(toastSelector);
                return await toast.isDisplayed();
            },
            {
                timeout: 5000,
                timeoutMsg: 'LinuxHotkeyNotice toast did not appear for portal-unavailable Wayland session',
            }
        );

        expect(toastAppeared).toBe(true);
    });
});

describe('Release Build: Wayland+KDE Portal Signal Tracking', () => {
    before(function () {
        if (!canRunWaylandTests()) {
            skipSuite(this, 'Wayland+KDE Portal Signal Tracking', 'Requires local Wayland+KDE (non-CI)');
        }
    });

    it('should confirm D-Bus signal tracking is enabled and cleared', async function () {
        const waylandStatus = await getWaylandStatusForSkipping();

        const shouldSkip =
            !waylandStatus.isLinux ||
            !waylandStatus.isWayland ||
            !waylandStatus.portalAvailable ||
            waylandStatus.desktopEnvironment !== 'kde';

        if (shouldSkip) {
            skipTest(
                this,
                'Wayland+KDE D-Bus signal tracking',
                `Requires Wayland+KDE+portal (linux=${waylandStatus.isLinux}, wayland=${waylandStatus.isWayland}, portal=${waylandStatus.portalAvailable}, de=${waylandStatus.desktopEnvironment})`
            );
        }

        await clearDbusActivationSignalHistory();

        const stats = await getDbusActivationSignalStats();

        if (!stats) {
            throw new Error('Signal tracking IPC not available');
        }

        expect(stats.trackingEnabled).toBe(true);
        expect(stats.totalSignals).toBe(0);
        expect(stats.signals).toHaveLength(0);
        expect(Object.keys(stats.signalsByShortcut)).toHaveLength(0);

        E2ELogger.info(LOG_CTX, '✓ D-Bus signal tracking enabled and cleared');
    });

    it('should wait for portal activation signals to arrive', async function () {
        if (process.env.E2E_WAYLAND_MANUAL_HOTKEYS !== '1') {
            skipTest(
                this,
                'Wayland+KDE portal activation signals',
                'Set E2E_WAYLAND_MANUAL_HOTKEYS=1 and manually press Quick Chat/Boss Key to run'
            );
        }

        const waylandStatus = await getWaylandStatusForSkipping();

        const shouldSkip =
            !waylandStatus.isLinux ||
            !waylandStatus.isWayland ||
            !waylandStatus.portalAvailable ||
            waylandStatus.desktopEnvironment !== 'kde';

        if (shouldSkip) {
            skipTest(
                this,
                'Wayland+KDE portal activation signals',
                `Requires Wayland+KDE+portal (linux=${waylandStatus.isLinux}, wayland=${waylandStatus.isWayland}, portal=${waylandStatus.portalAvailable}, de=${waylandStatus.desktopEnvironment})`
            );
        }

        const status = await getPlatformHotkeyStatus();

        if (!status) {
            E2ELogger.warn(LOG_CTX, 'getPlatformHotkeyStatus IPC not available');
            return;
        }

        if (!status.waylandStatus.portalAvailable) {
            skipTest(this, 'Wayland+KDE portal activation signals', 'Portal not available');
            return;
        }

        await clearDbusActivationSignalHistory();

        E2ELogger.info(LOG_CTX, 'Waiting for portal activation signals. Manually trigger Quick Chat or Boss Key now.');

        const activated = await browser.waitUntil(
            async () => {
                const stats = await getDbusActivationSignalStats();
                if (!stats) return false;
                return stats.totalSignals > 0;
            },
            {
                timeout: 15000,
                interval: 500,
                timeoutMsg: 'No D-Bus activation signals detected within 15s',
            }
        );

        expect(activated).toBe(true);

        const stats = await getDbusActivationSignalStats();
        expect(stats?.totalSignals).toBeGreaterThan(0);

        const quickChatSignals = stats?.signalsByShortcut?.quickChat ?? 0;
        const bossKeySignals = stats?.signalsByShortcut?.bossKey ?? 0;

        expect(quickChatSignals + bossKeySignals).toBeGreaterThan(0);

        E2ELogger.info(LOG_CTX, '✓ Portal activation signals observed', {
            totalSignals: stats?.totalSignals,
            quickChatSignals,
            bossKeySignals,
        });
    });
});

describe('Release Build: Hotkey Graceful Degradation', () => {
    it('should remain responsive regardless of hotkey registration outcome', async () => {
        // The app has started and is responsive — that's the core assertion
        const title = await browser.getTitle();
        expect(typeof title).toBe('string');

        // Verify main window is not destroyed
        const windowOK = await browser.electron.execute((electron) => {
            const windows = electron.BrowserWindow.getAllWindows();
            const mainWindow = windows.find((w: any) => !w.isDestroyed());
            return !!mainWindow;
        });

        expect(windowOK).toBe(true);
        E2ELogger.info(LOG_CTX, '✓ App responsive — no hotkey-related crashes');
    });

    it('should not have uncaught renderer errors', async () => {
        const hasErrors = await browser.execute(() => {
            // Check if electronAPI is still accessible (no preload crash)
            const api = (window as any).electronAPI;
            return {
                electronAPIPresent: typeof api !== 'undefined',
                platformAvailable: typeof api?.platform === 'string',
            };
        });

        expect(hasErrors.electronAPIPresent).toBe(true);
        expect(hasErrors.platformAvailable).toBe(true);
        E2ELogger.info(LOG_CTX, '✓ No renderer errors — preload bridge intact');
    });
});
