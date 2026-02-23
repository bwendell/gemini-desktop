# Wayland Manual Testing Checklist

Manual verification is required for KDE Wayland global hotkeys because automated tests cannot simulate OS-level keypresses or portal dialogs.

## Environment

- Linux with a Wayland session
- KDE Plasma 5.27+
- D-Bus session running

Verify:

```bash
echo "Session type: $XDG_SESSION_TYPE"
echo "Desktop: $XDG_CURRENT_DESKTOP"
echo "KDE Version: $KDE_SESSION_VERSION"
```

## Checklist

### 1) Launch & Status

- [ ] Launch the app on KDE Wayland.
- [ ] Open **Settings → Hotkeys**.
- [ ] Confirm hotkeys show the Wayland/KDE global hotkey status (if supported).

### 2) Portal Dialog

- [ ] Toggle a global hotkey off and back on (Quick Chat or Peek and Hide).
- [ ] If the KDE portal dialog appears, click **Allow**.
- [ ] Confirm the hotkey status updates after approval.

### 3) Functional Hotkeys

- [ ] **Quick Chat** — Press `Ctrl+Shift+Alt+Space`.
    - Expected: Quick Chat window appears centered on screen.
      [ ] **Peek and Hide** — Press `Ctrl+Shift+Space`.
    - Expected: Main window hides to tray.

### 4) Failure/Conflict Signals

- [ ] Change a global hotkey to a binding used by another app.
- [ ] Expected: A warning toast about partial registration may appear.

### 5) Persistence

- [ ] Keep the app running for >5 minutes.
- [ ] Verify hotkeys still fire.
- [ ] Restart the app and confirm hotkeys work without re-prompting (unless bindings changed).

## Notes

- If the portal dialog never appears, verify `xdg-desktop-portal` and `xdg-desktop-portal-kde` are running.
- For debug logging and signal tracking, see `docs/TEST_ONLY_SIGNAL_TRACKING.md`.
