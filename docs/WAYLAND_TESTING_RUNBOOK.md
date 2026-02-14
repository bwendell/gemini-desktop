# Wayland Hotkey Testing Runbook

This runbook covers automated and local verification for Wayland global hotkeys (KDE Plasma).

## Prerequisites

| Requirement      | Command to Verify                                 |
| ---------------- | ------------------------------------------------- |
| Linux OS         | `uname -a`                                        |
| Wayland session  | `echo $XDG_SESSION_TYPE` (should print "wayland") |
| KDE Plasma 5.27+ | `plasmashell --version`                           |
| D-Bus running    | `dbus-daemon --version`                           |
| Node.js 18+      | `node --version`                                  |
| npm 9+           | `npm --version`                                   |

## Environment Setup

```bash
# Verify Wayland environment
echo "Session type: $XDG_SESSION_TYPE"
echo "Desktop: $XDG_CURRENT_DESKTOP"
echo "KDE Version: $KDE_SESSION_VERSION"
```

## Test Commands

### Unit Tests (all platforms)

```bash
npm run test
npx vitest tests/unit/main/utils/dbusFallback.test.ts
npx vitest tests/unit/main/utils/waylandDetector.test.ts
```

### Coordinated Tests

```bash
npm run test:coordinated
npx vitest tests/coordinated/wayland-hotkey-coordination.coordinated.test.ts
```

### Integration Tests (Linux)

```bash
npm run test:integration -- --spec="tests/integration/wayland-platform-status.integration.test.ts"
npm run test:integration -- --spec="tests/integration/wayland-platform-concurrency.integration.test.ts"
npm run test:integration -- --spec="tests/integration/platform-detection.integration.test.ts"
```

### E2E Tests (local Wayland only)

```bash
npm run build && npm run build:electron
npm run test:e2e:spec -- --spec=tests/e2e/wayland-hotkey-registration.spec.ts
```

## Debugging D-Bus / Signal Tracking

Signal tracking is enabled when `NODE_ENV=test` or `DEBUG_DBUS=1`. For local runs, set `DEBUG_DBUS=1`:

```bash
DEBUG_DBUS=1 npm run test:e2e:spec -- --spec=tests/e2e/wayland-hotkey-registration.spec.ts
```

See `docs/TEST_ONLY_SIGNAL_TRACKING.md` for the IPC API and stats shape.

## Troubleshooting

| Issue                        | Diagnostic                          | Solution                                         |
| ---------------------------- | ----------------------------------- | ------------------------------------------------ |
| "Not a Wayland session"      | Check `$XDG_SESSION_TYPE`           | Log out, select Wayland session                  |
| "Portal not available"       | Check `xdg-desktop-portal` running  | `systemctl --user start xdg-desktop-portal`      |
| "D-Bus connection failed"    | Check `DBUS_SESSION_BUS_ADDRESS`    | Restart D-Bus: `dbus-run-session`                |
| Hotkeys don't activate       | Check if another app holds shortcut | Change binding in Settings                       |
| Portal dialog doesn't appear | Check KDE portal backend            | `systemctl --user status xdg-desktop-portal-kde` |
