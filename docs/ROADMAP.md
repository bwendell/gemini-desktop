# Gemini Desktop Roadmap

This roadmap captures what has shipped recently, what is likely to be prioritized next, and longer-term ideas.
Priorities may shift based on user feedback, upstream Gemini changes, and platform constraints.

## Recently Shipped

### v0.12.1 — Linux Stability & Maintenance

- **Linux startup stability** — avoid loading V8-sandbox-incompatible native probes on affected Linux kernels so the app can launch reliably while preserving in-app keyboard shortcuts; global hotkeys and local text prediction remain unavailable on those kernel paths. ([#333](https://github.com/bwendell/gemini-desktop/pull/333))
- **Linux package metadata refresh** — remove deprecated Debian dependencies, recommend Ayatana AppIndicator support, and document current appindicator guidance for modern Linux distributions. ([#332](https://github.com/bwendell/gemini-desktop/pull/332))
- **Maintenance updates** — refresh post-`v0.12.0` runtime, Electron, testing, React type, YAML, CodeQL, and markdown-rendering dependencies. ([#309](https://github.com/bwendell/gemini-desktop/pull/309), [#314](https://github.com/bwendell/gemini-desktop/pull/314), [#320](https://github.com/bwendell/gemini-desktop/pull/320), [#338](https://github.com/bwendell/gemini-desktop/pull/338), [#339](https://github.com/bwendell/gemini-desktop/pull/339), [#340](https://github.com/bwendell/gemini-desktop/pull/340), [#342](https://github.com/bwendell/gemini-desktop/pull/342), [#344](https://github.com/bwendell/gemini-desktop/pull/344), [#345](https://github.com/bwendell/gemini-desktop/pull/345), [#347](https://github.com/bwendell/gemini-desktop/pull/347), [#348](https://github.com/bwendell/gemini-desktop/pull/348))

### v0.12.0 — Chat Flow & Release Reliability

- **Chat workflow upgrades** — add Smart Enter's upload-aware submission queue and a floating scroll-to-bottom control, both with persisted settings toggles for smoother long-running Gemini chats. ([#321](https://github.com/bwendell/gemini-desktop/pull/321))
- **Fullscreen and keyboard polish** — make F11 fullscreen work even while focus is inside Gemini, hide custom chrome in fullscreen, and restore reliable app quit shortcuts. ([#322](https://github.com/bwendell/gemini-desktop/pull/322))
- **Release reliability hardening** — roll up the Windows installer reliability work prepared after `v0.11.1`, including MSI artifact removal, installer validation, NSIS sidecar packaging fixes, restored split per-architecture release paths, ARM64 validation adjustments, and macOS ZIP artifact cleanup. ([#223](https://github.com/bwendell/gemini-desktop/pull/223), [#227](https://github.com/bwendell/gemini-desktop/pull/227), [#275](https://github.com/bwendell/gemini-desktop/pull/275), [#288](https://github.com/bwendell/gemini-desktop/pull/288), [#294](https://github.com/bwendell/gemini-desktop/pull/294), [#296](https://github.com/bwendell/gemini-desktop/pull/296), [#330](https://github.com/bwendell/gemini-desktop/pull/330))
- **Test and developer workflow hardening** — add shared cross-suite wait utilities, speed up Windows release E2E coverage, tighten E2E typing/lint health, and refresh AI-agent documentation routing. ([#208](https://github.com/bwendell/gemini-desktop/pull/208), [#209](https://github.com/bwendell/gemini-desktop/pull/209), [#210](https://github.com/bwendell/gemini-desktop/pull/210), [#228](https://github.com/bwendell/gemini-desktop/pull/228))
- **Maintenance updates** — refresh CI/release automation, Electron, React, Vite, Vitest/jsdom, and supporting dependencies merged since `v0.11.1`, including the maintenance work queued during the canceled `v0.11.2` cut. ([#211](https://github.com/bwendell/gemini-desktop/pull/211), [#212](https://github.com/bwendell/gemini-desktop/pull/212), [#213](https://github.com/bwendell/gemini-desktop/pull/213), [#214](https://github.com/bwendell/gemini-desktop/pull/214), [#215](https://github.com/bwendell/gemini-desktop/pull/215), [#216](https://github.com/bwendell/gemini-desktop/pull/216), [#217](https://github.com/bwendell/gemini-desktop/pull/217), [#218](https://github.com/bwendell/gemini-desktop/pull/218), [#222](https://github.com/bwendell/gemini-desktop/pull/222), [#226](https://github.com/bwendell/gemini-desktop/pull/226), [#229](https://github.com/bwendell/gemini-desktop/pull/229), [#230](https://github.com/bwendell/gemini-desktop/pull/230), [#231](https://github.com/bwendell/gemini-desktop/pull/231), [#232](https://github.com/bwendell/gemini-desktop/pull/232), [#235](https://github.com/bwendell/gemini-desktop/pull/235), [#236](https://github.com/bwendell/gemini-desktop/pull/236), [#237](https://github.com/bwendell/gemini-desktop/pull/237), [#239](https://github.com/bwendell/gemini-desktop/pull/239), [#245](https://github.com/bwendell/gemini-desktop/pull/245), [#247](https://github.com/bwendell/gemini-desktop/pull/247), [#248](https://github.com/bwendell/gemini-desktop/pull/248), [#250](https://github.com/bwendell/gemini-desktop/pull/250), [#252](https://github.com/bwendell/gemini-desktop/pull/252), [#256](https://github.com/bwendell/gemini-desktop/pull/256), [#257](https://github.com/bwendell/gemini-desktop/pull/257), [#258](https://github.com/bwendell/gemini-desktop/pull/258), [#259](https://github.com/bwendell/gemini-desktop/pull/259), [#261](https://github.com/bwendell/gemini-desktop/pull/261), [#270](https://github.com/bwendell/gemini-desktop/pull/270), [#271](https://github.com/bwendell/gemini-desktop/pull/271), [#272](https://github.com/bwendell/gemini-desktop/pull/272), [#273](https://github.com/bwendell/gemini-desktop/pull/273), [#276](https://github.com/bwendell/gemini-desktop/pull/276), [#277](https://github.com/bwendell/gemini-desktop/pull/277), [#280](https://github.com/bwendell/gemini-desktop/pull/280), [#282](https://github.com/bwendell/gemini-desktop/pull/282), [#285](https://github.com/bwendell/gemini-desktop/pull/285), [#291](https://github.com/bwendell/gemini-desktop/pull/291), [#300](https://github.com/bwendell/gemini-desktop/pull/300), [#303](https://github.com/bwendell/gemini-desktop/pull/303), [#310](https://github.com/bwendell/gemini-desktop/pull/310), [#319](https://github.com/bwendell/gemini-desktop/pull/319), [#325](https://github.com/bwendell/gemini-desktop/pull/325), [#326](https://github.com/bwendell/gemini-desktop/pull/326), [#328](https://github.com/bwendell/gemini-desktop/pull/328), [#329](https://github.com/bwendell/gemini-desktop/pull/329))
- **Contributor credit** — special thanks to [@digvijay-ship-it](https://github.com/digvijay-ship-it) for the Smart Enter, scroll-to-bottom, and fullscreen work in [#321](https://github.com/bwendell/gemini-desktop/pull/321) and [#322](https://github.com/bwendell/gemini-desktop/pull/322), to [@kevinofsydney](https://github.com/kevinofsydney) for surfacing the Windows installer issue in [#274](https://github.com/bwendell/gemini-desktop/issues/274) and shipping the packaging fix in [#275](https://github.com/bwendell/gemini-desktop/pull/275), and to [@bwendell](https://github.com/bwendell) for the release hardening and documentation work across [#208](https://github.com/bwendell/gemini-desktop/pull/208), [#209](https://github.com/bwendell/gemini-desktop/pull/209), [#210](https://github.com/bwendell/gemini-desktop/pull/210), [#223](https://github.com/bwendell/gemini-desktop/pull/223), [#227](https://github.com/bwendell/gemini-desktop/pull/227), [#228](https://github.com/bwendell/gemini-desktop/pull/228), [#288](https://github.com/bwendell/gemini-desktop/pull/288), [#294](https://github.com/bwendell/gemini-desktop/pull/294), [#296](https://github.com/bwendell/gemini-desktop/pull/296), and [#330](https://github.com/bwendell/gemini-desktop/pull/330).

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
