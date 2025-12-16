# Unofficial Gemini Desktop

> [!IMPORTANT]
> **LEGAL DISCLAIMER: READ THIS FIRST**
>
> This application is an **unofficial** open-source project. It is **NOT** affiliated with, endorsed by, maintained by, or associated with Google LLC or the Gemini team in any way.
>
> - **Gemini** is a registered trademark of Google LLC.
> - **Google** is a registered trademark of Google LLC.
>
> This software is simply a specialized web browser (wrapper) that loads the official `https://gemini.google.com` website. It does not modify the underlying Gemini service, intercept encrypted data, or bypass any payment walls or authentication mechanisms.
>
> By using this software, you agree that you are solely responsible for your use of the application and that you will comply with [Google's Terms of Service](https://policies.google.com/terms) and [Generative AI Usage Policies](https://policies.google.com/terms/generative-ai).

---

A lightweight, cross-platform desktop wrapper for [Google Gemini](https://gemini.google.com), built with [Tauri](https://tauri.app), [Rust](https://www.rust-lang.org/), and [React](https://react.dev).

## Features

- 🚀 **Native Experience**: Run Gemini as a standalone desktop application.
- 🔒 **Privacy Focused**: Direct connection to Google's servers; no middleman or data collection.
- 💻 **Cross-Platform**: Compatible with Windows, macOS, and Linux.
- ⚡ **Lightweight**: Built on Tauri for a minimal resource footprint.

### What This App Does

| Action | Description |
|--------|-------------|
| ✅ Loads Gemini | Opens `gemini.google.com` in a native window |

### What This App Does NOT Do

| Action | Status |
|--------|--------|
| ❌ Store passwords | Never touched - handled by Google |
| ❌ Collect data | No analytics, telemetry, or tracking |
| ❌ Phone home | No connections except to google.com |
| ❌ Modify Gemini | Just displays the official site |

### Data Storage

- **Authentication**: Handled entirely by Google via their login pages
- **Chat history**: Stored by Google, not this application
- **Local cache**: Standard WebView cache (WebView2/WebKit)

### Technical Security

- **Remote URL Restriction**: Only `gemini.google.com` can access Tauri APIs
- **Minimal Permissions**: Only shortcuts and link opening
- **No IPC Commands**: Zero custom Rust commands exposed
- **Dependencies**: 0 npm vulnerabilities, minimal Rust crates

## Legal & Compliance

### Trademark Acknowledgement

"Gemini", "Google", and related marks and logos are trademarks of Google LLC. This project is a third-party client and is not a Google product.

### Warranty Disclaimer

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Development

This project uses the standard Tauri + React + Vite stack.

- **Frontend**: Located in `src/` (React, TypeScript, Vite)
- **Backend**: Located in `src-tauri/` (Rust)

To start the development server:

```bash
npm run tauri dev
```

## License

[MIT](LICENSE)
