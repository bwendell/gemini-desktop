# Gemini Desktop — Native, Private AI Experience

<div align="center">

[![GitHub release](https://img.shields.io/github/v/release/bwendell/gemini-desktop?style=flat-square)](https://github.com/bwendell/gemini-desktop/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/bwendell/gemini-desktop?style=flat-square)](https://github.com/bwendell/gemini-desktop/commits/main)
[![Platform](<https://img.shields.io/badge/platform-Windows%20(x64%2C%20ARM64)%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square>)](https://github.com/bwendell/gemini-desktop/releases)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/bwendell/gemini-desktop/badge)](https://securityscorecards.dev/viewer/?uri=github.com/bwendell/gemini-desktop)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-brightgreen?logo=github)](https://github.com/bwendell/gemini-desktop/security/code-scanning)

</div>

> **Gemini, but better.** A privacy-first desktop client for Google Gemini with native controls, global hotkeys, and zero telemetry.

<p align="center">
  <a href="#-feature-highlights">Feature Highlights</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-privacy--security">Privacy</a> •
  <a href="#-whats-next">What's Next</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

<div align="center">

![Gemini Desktop Main Window Interface](docs/assets/main_window.png)

</div>

## ✨ Why Gemini Desktop

- **Desktop-native workflow**: Use Gemini in a dedicated app window instead of a browser tab.
- **Fast keyboard control**: Trigger Quick Chat, hide/restore the app, and stay in flow.
- **Trust-first defaults**: No telemetry, Google auth, and clear transparency/security docs.

## 🌟 Feature Highlights

- **Multi-tab conversations** — keep multiple chat contexts open and switch instantly.
- **Launch at startup** — optionally start with your system and open minimized.
- **Quick Chat** — summon a Spotlight-style prompt from anywhere with a global hotkey.
- **Peek and Hide** — hide to tray and restore instantly when you need it.
- **Response notifications** — get notified when Gemini finishes while the app is unfocused.
- **Always On Top** — keep Gemini visible above other windows when multitasking.

## 📥 Installation

Download the latest release for your platform from [GitHub Releases](https://github.com/bwendell/gemini-desktop/releases).

### Windows

- **x64 (Intel/AMD)**: `Gemini Desktop-x.x.x-x64-installer.exe`
- **ARM64 (Snapdragon/Qualcomm)**: `Gemini Desktop-x.x.x-arm64-installer.exe`

### macOS

- **Apple Silicon (M1/M2/M3)**: `Gemini Desktop-x.x.x-arm64.dmg`
- **Intel**: `Gemini Desktop-x.x.x-x64.dmg`

> ⚠️ The app is not code-signed yet. On first launch, remove quarantine:
>
> ```bash
> xattr -rd com.apple.quarantine "/Applications/Gemini Desktop.app"
> ```

### Linux

- **AppImage**: `Gemini Desktop-x.x.x-x64.AppImage`
- **Debian/Ubuntu**: `Gemini Desktop-x.x.x-x64.deb`

```bash
# AppImage
chmod +x "Gemini Desktop-x.x.x-x64.AppImage"
./"Gemini Desktop-x.x.x-x64.AppImage"

# Debian/Ubuntu
sudo dpkg -i "Gemini Desktop-x.x.x-x64.deb"
```

KDE Wayland users: global hotkeys rely on XDG Desktop Portals; see [Wayland Manual Testing](docs/WAYLAND_MANUAL_TESTING.md) and the [Wayland Testing Runbook](docs/WAYLAND_TESTING_RUNBOOK.md).

## 🔒 Privacy & Security

Gemini Desktop has **no telemetry** and only connects to Google domains for Gemini access.
Authentication is handled by Google, and sessions are stored using Chromium's standard local mechanisms.
For full details, read the [Transparency Report](docs/TRANSPARENCY.md), [Privacy Policy](docs/PRIVACY.md), and [Security Policy](docs/SECURITY.md).

## ⌨️ Keyboard Shortcuts

- `Ctrl+Shift+Alt+Space` (`Cmd+Shift+Alt+Space` on macOS) — Toggle Quick Chat
- `Ctrl+Shift+Space` (`Cmd+Shift+Space` on macOS) — Peek and Hide (toggle app visibility)
- `Ctrl+P` (`Cmd+P` on macOS) — Print current page to PDF

> 💡 You can customize hotkeys in Settings.

## 🗺️ What's Next

- Continue improving desktop-native quality and reliability across Windows, macOS, and Linux.
- Expand productivity workflows around Quick Chat, startup behavior, and window controls.
- Keep strengthening test quality and release confidence for faster, safer updates.

See detailed shipped history and planning in [docs/ROADMAP.md](docs/ROADMAP.md).

## 🤝 Contributing

Contributions are welcome. For setup, standards, and workflow expectations, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## ⚖️ Legal

This is an unofficial, open-source project and is **not** affiliated with Google LLC.
**Gemini** and **Google** are registered trademarks of Google LLC.

## 📄 License

[MIT](LICENSE) © [Ben Wendell](https://github.com/bwendell)
