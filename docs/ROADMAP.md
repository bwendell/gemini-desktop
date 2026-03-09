# Gemini Desktop Roadmap

This roadmap captures what has shipped recently, what is likely to be prioritized next, and longer-term ideas.
Priorities may shift based on user feedback, upstream Gemini changes, and platform constraints.

## Recently Shipped

### v0.8.0 — Chat Tabs & Release Notes

- **Tabbed conversations** to keep multiple chats open at once. ([#72](https://github.com/bwendell/gemini-desktop/issues/72))
- **Release notes discoverability** via Help menu entry and update toast action buttons.

### v0.9.0 — Peek & Hide, Hotkeys & Fixes

- **Peek and Hide toggle** to quickly show/hide the app without losing context. ([#91](https://github.com/bwendell/gemini-desktop/issues/91))
- **Voice chat hotkey** wired to active tab mic. ([#117](https://github.com/bwendell/gemini-desktop/issues/117))
- **Updated default hotkeys** — Quick Chat and Peek and Hide use new, conflict-free defaults.
- **macOS fixes** — native Edit menu for copy/paste, tray icon handling, and window frame.

### v0.9.1 — Bugfix Release

- **macOS menubar icon fix** — use template tray assets to avoid stretching. ([#132](https://github.com/bwendell/gemini-desktop/issues/132), [#134](https://github.com/bwendell/gemini-desktop/pull/134))
- **Text prediction setup fix** — handle packaged LLM fallback without export errors. ([#133](https://github.com/bwendell/gemini-desktop/issues/133), [#135](https://github.com/bwendell/gemini-desktop/pull/135))

### v0.10.0 — Fixes & Updates

- **Auto-update reliability on macOS** — fix the update flow that fails with a generic “auto-update service encountered an error” dialog during 0.9.x upgrades. ([#150](https://github.com/bwendell/gemini-desktop/issues/150), [#174](https://github.com/bwendell/gemini-desktop/pull/174))
- **Native Windows ARM64 build** — ship an ARM64 installer so Windows on ARM devices can run Gemini Desktop without emulation. ([#151](https://github.com/bwendell/gemini-desktop/issues/151), [#170](https://github.com/bwendell/gemini-desktop/pull/170))
- **Linux launch stability on modern distros** — prevent the V8 sandbox/native module memory conflict that causes a segmentation fault on KDE Wayland systems like openSUSE Leap 16. ([#158](https://github.com/bwendell/gemini-desktop/issues/158), [#176](https://github.com/bwendell/gemini-desktop/pull/176))
- **Contributor guide** — add CONTRIBUTING.md with dev setup, test commands, and contribution expectations so new contributors don’t have to hunt for process details. ([#169](https://github.com/bwendell/gemini-desktop/issues/169), [#172](https://github.com/bwendell/gemini-desktop/pull/172))

### v0.11.0 — Startup, Updates & Test Reliability

- **Windows autostart option** — add a setting to launch Gemini Desktop at login, with an option to start minimized to the system tray. ([#159](https://github.com/bwendell/gemini-desktop/issues/159), [#181](https://github.com/bwendell/gemini-desktop/pull/181))
- **Windows updater compatibility** — restore update checks for Windows x64 in v0.10.x and add legacy metadata aliases for safer client roll-forwards. ([#183](https://github.com/bwendell/gemini-desktop/pull/183), [#184](https://github.com/bwendell/gemini-desktop/pull/184))
- **Test infrastructure hardening** — standardize WDIO config inheritance, remove flaky waits, and improve assertion/failure context helpers for more deterministic CI. ([#180](https://github.com/bwendell/gemini-desktop/pull/180), [#186](https://github.com/bwendell/gemini-desktop/pull/186), [#190](https://github.com/bwendell/gemini-desktop/pull/190), [#185](https://github.com/bwendell/gemini-desktop/pull/185))
- **Quality and maintenance updates** — enforce lint checks in pre-commit hooks, remediate npm audit vulnerabilities, reduce E2E lint noise, and add docs updates/deprecations. ([#189](https://github.com/bwendell/gemini-desktop/pull/189), [#187](https://github.com/bwendell/gemini-desktop/pull/187), [#191](https://github.com/bwendell/gemini-desktop/pull/191), [#192](https://github.com/bwendell/gemini-desktop/pull/192))

### v0.11.1 — Refresh Continuity & Release Stability

- **Return to previous chat on refresh** — preserve each tab's active Gemini URL and restore that exact conversation after refresh instead of defaulting to the Gemini homepage. ([#198](https://github.com/bwendell/gemini-desktop/issues/198), [#200](https://github.com/bwendell/gemini-desktop/pull/200))
- **Preload bridge architecture refactor** — split preload bridge APIs into domain modules for clearer boundaries and easier long-term maintenance. ([#202](https://github.com/bwendell/gemini-desktop/pull/202))
- **Release and test reliability improvements** — dedupe zoom integration coverage and increase Windows release/integration timeout limits to reduce flaky release gates. ([#203](https://github.com/bwendell/gemini-desktop/pull/203), [#205](https://github.com/bwendell/gemini-desktop/pull/205))
- **Documentation and developer workflow updates** — refresh architecture references and setup guidance for cleaner contributor onboarding and handoff context. ([#206](https://github.com/bwendell/gemini-desktop/pull/206), [#201](https://github.com/bwendell/gemini-desktop/pull/201), [#199](https://github.com/bwendell/gemini-desktop/pull/199), [#197](https://github.com/bwendell/gemini-desktop/pull/197), [#194](https://github.com/bwendell/gemini-desktop/pull/194))

## Near-Term Focus

- Continue strengthening release quality and upgrade reliability across platforms.
- Improve desktop-native productivity workflows (tabs, quick access, and startup behavior).
- Keep hardening test coverage and CI stability for faster iteration with lower regression risk.

## Future Ideas

- **Investigate AI Studio support** and feasibility for a better Gemini Live experience. ([#90](https://github.com/bwendell/gemini-desktop/issues/90))
