## 2026-02-09 Task: initialize

- No decisions yet.

## 2026-02-09 Task: Architectural Decisions Observed

### 1. INTENTIONAL DISABLE OF CHROMIUM GLOBAL SHORTCUTS PORTAL

**Decision**: Do NOT use Chromium's built-in GlobalShortcutsPortal feature flag, even though it exists.

**Rationale** (from main.ts comments):

- Chromium's `globalShortcut.register()` reports false-positive success on KDE Plasma 6
- Interferes with direct D-Bus portal session
- Callbacks never fire even when registration appears successful

**Consequence**: Must maintain separate D-Bus implementation, but get reliable hotkey activation.

---

### 2. LAZY EVALUATION FOR BASE WEB PREFERENCES

**Decision**: Convert `BASE_WEB_PREFERENCES` constant to `getBaseWebPreferences()` function.

**Rationale**:

- ES imports are hoisted; inline code runs AFTER imports
- `sandboxInit.ts` must run BEFORE sandbox state is read
- Function evaluation defers until first call, allowing import order to set `--no-sandbox`

---

### 3. D-BUS DIRECT PATH OVER ELECTRON GLOBALSHORTCUT API

**Decision**: On Wayland, completely bypass `globalShortcut.register()` and use D-Bus directly.

**Rationale**:

- Electron's API returns false-positive success on Wayland
- D-Bus provides reliable signal delivery via `Activated`/`Deactivated`
- Gives control over accelerator format conversion (Electron → XDG spec)

---

### 4. BUS-LEVEL MESSAGE LISTENING VS PROXY SIGNALS

**Decision**: Use `connection.on('message', handler)` instead of `portalInterface.on('Activated', handler)`.

**Rationale** (from code comments):

- Portal proxy's signal delivery can be unreliable in some Electron/dbus-next configurations
- Low-level bus messages are more reliable
- Request objects are ephemeral and can't be introspected before creation

---

### 5. SILENT SUCCESS UI PATTERN

**Decision**: LinuxHotkeyNotice shows no toast when hotkeys work correctly.

**Rationale**:

- Previous behavior always showed warning on Linux (annoying)
- Users on supported platforms (KDE) shouldn't see warnings
- Only show UI when there's actionable information (failures)

---

### 6. PARTIAL FAILURE HANDLING

**Decision**: Support partial hotkey registration (some succeed, some fail).

**Rationale**:

- Individual shortcuts may conflict with system shortcuts
- Users should know which specific shortcuts failed
- App remains functional with working shortcuts

---

### 7. DYNAMIC IMPORT OF DBUS-NEXT

**Decision**: Import `dbus-next` dynamically only when needed.

**Rationale**:

- Avoid loading on Windows/macOS where it's not needed
- Avoid loading on X11 where D-Bus path isn't used
- Prevents crash on platforms where dbus-next might not be installable

---

### 8. SANDBOX AUTO-DISABLE FOR APPIMAGE COMPATIBILITY

**Decision**: Auto-detect sandbox restrictions and auto-disable with `--no-sandbox`.

**Rationale**:

- Ubuntu 24.04+ AppArmor breaks AppImage sandboxes
- Better to run without sandbox than crash on startup
- Detection covers both AppArmor and SUID permission issues

## 2026-02-09 Task: Audit Methodology Decisions

### AUDIT APPROACH

#### Files Analyzed (in order)

1. `src/main/utils/waylandDetector.ts` - Core detection logic
2. `src/main/managers/hotkeyManager.ts` - Registration orchestration
3. `src/main/utils/dbusFallback.ts` - D-Bus portal implementation
4. `src/shared/types/hotkeys.ts` - Type definitions
5. Test files matching each source file

#### Methodology

- **Static analysis**: Read source code to identify branches, error paths, state mutations
- **Test mapping**: Trace each code path to its test coverage
- **Gap identification**: Flag paths with no test, edge cases not exercised
- **Risk assessment**: Prioritize by likelihood × impact

#### Classification of Missing Cases

| Severity | Criteria                                           |
| -------- | -------------------------------------------------- |
| Fatal    | Could cause crash, hang, or security issue         |
| Corner   | Unlikely but possible; affects specific env/config |
| Missing  | Good to have; improves confidence                  |

#### Audit Scope

- ✅ Wayland session detection
- ✅ Desktop environment detection (KDE)
- ✅ Portal availability checking
- ✅ D-Bus registration flow
- ✅ Error handling paths
- ✅ State management
- ❌ Out of scope: Other DEs (GNOME, etc.), Non-KDE Wayland

### ASSUMPTIONS MADE

1. **KDE Plasma 5.27+ is the only supported Wayland DE** - Based on `isSupportedDE()` logic
2. **Tests use realistic mocking** - Mock behavior matches real D-Bus
3. **CI runs on X11 or non-Linux** - Wayland E2E tests skip in CI
4. **User approval dialog is the main failure mode** - Most failures = user denial

### UNCERTAINTIES FLAGGED

1. **Real portal behavior** - Mocks may not capture all real-world quirks
2. **Future KDE versions** - Test coverage assumes current portal API
3. **Other Linux distros** - Only KDE Plasma tested, not other Wayland compositors
4. **Chromium flag behavior** - `chromium-flag` portal method referenced but not tested
