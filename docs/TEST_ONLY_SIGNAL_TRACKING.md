# Test-Only D-Bus Activation Signal Tracking

This document describes the test-only signal tracking used to validate the Wayland global hotkey activation pipeline without relying on real keypresses.

## Purpose

On KDE Wayland, global hotkeys are registered via the XDG Desktop Portal. The portal emits `Activated` signals, which are handled by the main process. In CI and most automated environments, we cannot generate real OS-level keypresses to trigger those signals. Test-only tracking verifies that the signal plumbing and IPC wiring are intact and observable.

## When Tracking Is Enabled

Signal tracking is enabled when either of these conditions is true:

- `NODE_ENV === 'test'`
- `DEBUG_DBUS === '1'`

`DEBUG_DBUS=1` also enables verbose D-Bus logging.

## IPC APIs (Renderer)

These are exposed on `window.electronAPI` by the preload bridge:

- `getDbusActivationSignalStats()`
    - Returns a stats object (see below) or `null` if unavailable.
- `clearDbusActivationSignalHistory()`
    - Clears the in-memory signal history for test isolation.

## Stats Shape

The stats object returned by `getDbusActivationSignalStats()` includes:

- `trackingEnabled: boolean`
- `totalSignals: number`
- `signalsByShortcut: Record<string, number>`
- `lastSignalTime: number | null`
- `signals: Array<{ shortcutId: string; timestamp: number; sessionPath: string }>`

Signal history is bounded (FIFO) to avoid unbounded memory growth during long test runs.

## Example (E2E / Integration)

```ts
const stats = await browser.execute(async () => {
    const api = (window as any).electronAPI;
    return api.getDbusActivationSignalStats();
});

expect(stats.trackingEnabled).toBe(true);
expect(stats.totalSignals).toBeGreaterThanOrEqual(0);
```

```ts
await browser.execute(async () => {
    const api = (window as any).electronAPI;
    api.clearDbusActivationSignalHistory();
});
```

## Limitations

- Automated tests cannot reliably generate real `Activated` signals without OS-level input tooling.
- The tests validate that tracking infrastructure is reachable and correctly wired, not that hotkeys physically fire.

## Related Docs

- `docs/WAYLAND_MANUAL_TESTING.md`
- `docs/WAYLAND_TESTING_RUNBOOK.md`
- `docs/WAYLAND_KNOWN_LIMITATIONS.md`
