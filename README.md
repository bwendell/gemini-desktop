# Gemini Desktop

[![GitHub release](https://img.shields.io/github/v/release/bwendell/gemini-desktop?style=flat-square)](https://github.com/bwendell/gemini-desktop/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square)]()
[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)

> **Gemini, but better.** A native desktop experience with global hotkeys, spotlight-style Quick Chat, and zero data collection.

<!-- [INSERT HERO SCREENSHOT HERE] -->

<p align="center">
  <a href="#-installation">Installation</a> •
  <a href="#-quick-chat--spotlight-for-gemini">Quick Chat</a> •
  <a href="#-keyboard-shortcuts">Shortcuts</a> •
  <a href="#-privacy--security-practices">Privacy</a> •
  <a href="#-contributing">Contributing</a>
</p>

---

## ✨ Why This App?

Users have been asking for a desktop Gemini client with these features—**we deliver on all of them**:

| What Users Want | Status |
|-----------------|--------|
| 🖥️ Native desktop app (not just a browser tab) | ✅ **You got it** |
| ⌨️ Global keyboard shortcuts | ✅ **Ctrl+Shift+Space** |
| 📌 Always-on-top window | ✅ **Quick Chat has this** |
| 💻 Cross-platform (Windows, macOS, Linux) | ✅ **All three** |
| 🔐 Stable login & persistent sessions | ✅ **OAuth done right** |
| 🔒 No data collection | ✅ **Zero telemetry** |

---

## 🚀 Quick Chat — Spotlight for Gemini

Press **`Ctrl+Shift+Space`** (or **`Cmd+Shift+Space`** on Mac) from anywhere to instantly summon Gemini.

<!-- [INSERT QUICK CHAT SCREENSHOT HERE] -->

- **Always-on-top** floating window
- **Transparent, minimal UI** — just you and the prompt
- **Submit and it goes to your main Gemini chat**
- **Press Escape** to dismiss

---

## 📥 Installation

### Windows

Download the latest `.exe` installer from [Releases](https://github.com/bwendell/gemini-desktop/releases).

```
gemini-desktop-setup-x.x.x.exe
```

### macOS

Download the `.dmg` for your architecture from [Releases](https://github.com/bwendell/gemini-desktop/releases):

- **Apple Silicon (M1/M2/M3)**: `gemini-desktop-x.x.x-arm64.dmg`
- **Intel**: `gemini-desktop-x.x.x-x64.dmg`

### Linux

Download the `.AppImage` or `.deb` from [Releases](https://github.com/bwendell/gemini-desktop/releases).

```bash
# AppImage
chmod +x gemini-desktop-x.x.x.AppImage
./gemini-desktop-x.x.x.AppImage

# Debian/Ubuntu
sudo dpkg -i gemini-desktop-x.x.x.deb
```

---

## 🔒 Privacy & Security Practices

**One table. Complete transparency.**

| Category | Practice | Details |
|----------|----------|---------|
| **🔐 Data** | No collection | Zero analytics, telemetry, or tracking |
| | Direct connection | Only connects to `google.com` domains |
| | No password storage | Auth handled entirely by Google |
| **🛡️ Security** | Context Isolation | Renderer cannot access Node.js |
| | Sandboxed Renderer | Process isolation enforced |
| | Minimal Permissions | Restricted system access |
| **💾 Storage** | Encrypted cookies | Standard Chromium session storage |
| | Local cache only | Standard browser caching |
| | No cloud sync | All data stays on your machine |
| **🔍 Transparency** | Open source | [Full code available](https://github.com/bwendell/gemini-desktop) for audit |
| | No paywall bypass | Respects Google's terms |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Toggle Quick Chat |
| `Ctrl+Alt+E` | Minimize to tray |
| `Ctrl+,` | Open Settings |
| `Escape` | Close Quick Chat |

> 💡 Hotkeys can be disabled in Settings if they conflict with other apps.

---

## 🎯 Features

- 🚀 **Native Experience** — Run Gemini as a standalone desktop app
- 🎨 **Custom Title Bar** — Native-feeling window controls
- 🔄 **System Tray** — Minimize to tray, quick access
- 🌙 **Theme Sync** — Follows your system light/dark preference
- ⚡ **Quick Chat** — Spotlight-style prompt from anywhere

<!-- [INSERT MAIN WINDOW SCREENSHOT HERE] -->

---

## 🚧 Roadmap & Limitations

**In Progress:**

- 🧘 Zen/Distraction-free mode

**Not Included:**

- 🔍 Find in Page — Not yet implemented
- 🎤 Voice assistant mode — Not planned
- 📁 Chat folders/recycle bin — Handled by Google's UI (out of scope)

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions.

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Reporting Issues

Found a bug? [Open an issue](https://github.com/bwendell/gemini-desktop/issues/new) with:

- Your OS and version
- Steps to reproduce
- Expected vs actual behavior

---

## 🛠️ Development

Built with [Electron](https://www.electronjs.org/) + [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/).

### Prerequisites

- Node.js 18+
- npm 9+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/bwendell/gemini-desktop.git
cd gemini-desktop

# Install dependencies
npm install

# Start development
npm run electron:dev

# Build for production
npm run electron:build

# Run tests
npm run test:all
```

### Project Structure

```
gemini-desktop/
├── src/           # React frontend
├── electron/      # Electron main process
├── tests/         # E2E and unit tests
└── build/         # Build assets (icons, etc.)
```

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

<!-- [INSERT STAR HISTORY CHART HERE - use https://star-history.com] -->

---

## 💬 Community

- 🐛 [Report a Bug](https://github.com/bwendell/gemini-desktop/issues/new?template=bug_report.md)
- 💡 [Request a Feature](https://github.com/bwendell/gemini-desktop/issues/new?template=feature_request.md)
- 💬 [Discussions](https://github.com/bwendell/gemini-desktop/discussions)

---

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Google Gemini](https://gemini.google.com/) - The AI we're wrapping

---

## ⚖️ Legal & Compliance

> [!IMPORTANT]
> **This is an unofficial, open-source project.** It is **NOT** affiliated with, endorsed by, or associated with Google LLC.

### Trademark Notice

- **Gemini** and **Google** are registered trademarks of Google LLC.
- This software is a third-party client and is not a Google product.

### What This App Does

This application is a specialized web browser that loads the official `https://gemini.google.com` website. It does not modify the Gemini service, intercept encrypted data, or bypass any authentication.

### User Responsibility

By using this software, you agree to comply with:

- [Google's Terms of Service](https://policies.google.com/terms)
- [Generative AI Usage Policies](https://policies.google.com/terms/generative-ai)

### Warranty Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. See [LICENSE](LICENSE) for full terms.

---

## 📄 License

[MIT](LICENSE) © [Ben Wendell](https://github.com/bwendell)

---

<p align="center">
  Made with ❤️ by the community
</p>
