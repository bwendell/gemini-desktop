# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| < Latest | ❌ No (please upgrade) |

We only provide security updates for the latest release. Please keep your installation up to date.

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### 🔒 Private Disclosure (Preferred)

**Do NOT open a public issue for security vulnerabilities.**

Instead, please email: **<github@benwendell.com>**

Or use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/bwendell/gemini-desktop/security)
2. Click "Report a vulnerability"
3. Fill out the form

### What to Include

- **Description** of the vulnerability
- **Steps to reproduce** (proof of concept if possible)
- **Impact assessment** (what could an attacker do?)
- **Affected versions**
- **Any suggested fixes**

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Initial response | Within 48 hours |
| Vulnerability assessment | Within 1 week |
| Fix development | Depends on severity |
| Public disclosure | After fix is released |

---

## Security Architecture

Gemini Desktop follows Electron security best practices:

### ✅ What We Do

| Practice | Implementation |
|----------|---------------|
| **Context Isolation** | Enabled - renderer cannot access Node.js |
| **Sandbox Mode** | Enabled - process isolation enforced |
| **Node Integration** | Disabled in renderer |
| **Remote Module** | Disabled |
| **Web Security** | Enabled |
| **HTTPS Only** | Only connects to google.com over HTTPS |
| **IPC Validation** | All IPC messages are validated |

### 🔒 Data Handling

- **No telemetry** - Zero data collection or analytics
- **No remote servers** - Only connects to Google's servers
- **Local storage only** - All data stays on your machine
- **Encrypted cookies** - Standard Chromium encryption

### ⚠️ Known Limitations

As a wrapper around `gemini.google.com`, we inherit any vulnerabilities in:

- The Gemini web application (Google's responsibility)
- Chromium/Electron (we update regularly)

---

## Scope

### In Scope

- Vulnerabilities in the Electron main process
- Vulnerabilities in our custom React frontend
- IPC security issues
- Local privilege escalation
- Data leakage through our code

### Out of Scope

- Vulnerabilities in `gemini.google.com` (report to Google)
- Vulnerabilities in Electron/Chromium (report upstream)
- Social engineering attacks
- Physical access attacks
- Issues requiring user to install malicious software

---

## Recognition

We appreciate security researchers who help keep Gemini Desktop safe. With your permission, we'll acknowledge your contribution in our release notes.

---

## Updates

This security policy may be updated from time to time. Check back for the latest version.

Last updated: December 2025
