# Wayland Hotkey Known Limitations

This document captures current limitations and constraints for Wayland global hotkeys.

## Environment Support

- **KDE Plasma only**: Global hotkeys are enabled via the XDG Desktop Portal on KDE Plasma 5.27+.
- **Other DEs**: GNOME/sway/etc. are not supported for global hotkey registration and will report disabled or application-only hotkeys.

## Automated Testing Constraints

- **No CI Wayland+KDE**: Standard CI runners use X11, so Wayland-specific tests are skipped.
- **No portal dialog automation**: The KDE portal permission dialog cannot be automated in CI.
- **No real keypress simulation**: OS-level hotkey activation cannot be reliably triggered in CI. Tests validate IPC and tracking wiring instead.

## Technical Constraints

- **Portal dependency**: Requires a working D-Bus session and `xdg-desktop-portal-kde`.
- **No Chromium-flag fallback**: Only the D-Bus portal path is supported.

## References

- `docs/WAYLAND_TESTING_RUNBOOK.md`
- `docs/WAYLAND_MANUAL_TESTING.md`
- `docs/TEST_ONLY_SIGNAL_TRACKING.md`
