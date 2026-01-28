# Security Release Checklist

Before cutting any release of Gemini Desktop, the release engineer must verify the following items to ensure the security and integrity of the application.

## 📦 Dependency Audit

- [ ] Run `npm audit` and ensure no high/critical vulnerabilities exist.
- [ ] Check for any new or unexpected dependencies in `package.json`.
- [ ] Verify that all dependencies are pinned to specific versions (no `^` or `~` for critical deps).

## 🛡️ Code & Permissions

- [ ] **Network Request Review**: Search for `net.request`, `axios`, `fetch`, or `XMLHttpRequest` in the codebase.
    - [ ] Confirm no new domains are being contacted (only `google.com` and related).
- [ ] **Native Modules**: Confirm no new native Node modules have been added without explicit review.
- [ ] **IPC Bridges**: Review any changes to `preload.ts` to ensure no sensitive Electron APIs are exposed to the renderer.

## 🏗️ Build Artifacts

- [ ] **Checksum Generation**: verify that platform-specific checksum files (`checksums-windows.txt`, `checksums-mac.txt`, `checksums-linux.txt`) are generated in the `dist` folder.
- [ ] **Manual Sanity Check**:
    - [ ] Install the generated artifact on a clean VM/sandbox.
    - [ ] Launch the app and monitor network traffic (e.g., using Fiddler or Wireshark) for 1 minute.
    - [ ] Confirm no unexpected DNS requests.

## 📝 Transparency

- [ ] Update `docs/TRANSPARENCY.md` if any significant changes to data handling or network activity occurred.

---

> **Verification:**
> Signed off by: **\*\*\*\***\_\_\_\_**\*\*\*\***
> Date: **\*\*\*\***\_\_\_\_**\*\*\*\***
