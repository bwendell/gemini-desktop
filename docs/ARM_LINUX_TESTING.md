# ARM Linux Headless Testing

This document covers running End-to-End (E2E) tests on headless ARM Linux systems, specifically optimized for Oracle Linux, RHEL, and Rocky Linux.

## Prerequisites

To run tests on these systems, you need to install several required RPM packages. You can install all of them using this single command:

```bash
sudo dnf install -y xorg-x11-server-Xvfb mesa-libgbm libgtk-3 libnotify libXScrnSaver nss atk at-spi2-atk cups-libs libdrm mesa-libGL alsa-lib
```

> **Note:** `libappindicator-gtk3` is optional and only required if you need to run tray icon tests.

## Quick Start

Follow these steps to set up your environment and run the integration tests:

```bash
# 1. Install dependencies
sudo dnf install -y xorg-x11-server-Xvfb mesa-libgbm libgtk-3 libnotify libXScrnSaver nss atk at-spi2-atk cups-libs libdrm mesa-libGL alsa-lib

# 2. Install npm dependencies
npm install

# 3. Build the application
npm run build && npm run build:electron

# 4. Run integration tests
npm run test:integration
```

## How It Works

The testing framework includes built-in logic for headless detection and environment configuration:

- **Headless Detection**: The tests automatically detect a headless environment by checking for the absence of the `DISPLAY` environment variable.
- **Automatic Xvfb**: When no `DISPLAY` is set, the WebdriverIO (WDIO) configuration uses `autoXvfb` to start a virtual frame buffer automatically.
- **OS-Aware Handling**: AppArmor installation steps are gracefully skipped on SELinux-based systems like Oracle Linux and RHEL.
- **No Extra Flags**: There is no need to set `CI=true` or manually wrap commands with `xvfb-run`.

## Running Tests

You can use the standard npm commands to run different test suites:

```bash
npm run test:e2e           # Run all E2E tests
npm run test:integration   # Run integration tests
npm run test:e2e:group:startup  # Run only the startup test group
```

## Troubleshooting

- **DRI permission warnings**: You may see warnings about DRI permissions in the console. These are cosmetic and can be safely ignored; they are related to GPU acceleration attempts in a headless environment.
- **Tray tests failing**: If tray icon tests fail, ensure you have installed the optional `libappindicator-gtk3` package.
- **SELinux notes**: On Oracle Linux and RHEL, the system will use SELinux. The test suite's AppArmor auto-configuration logic will detect this and skip AppArmor-specific steps without causing failures.

## Package Mapping Table

The following table maps common Ubuntu CI packages to their RPM equivalents on Oracle Linux 9, RHEL 9, and Rocky Linux 9:

| Ubuntu Package     | RPM Package (OL9/RHEL9) | Notes                     |
| ------------------ | ----------------------- | ------------------------- |
| xvfb               | xorg-x11-server-Xvfb    | Provides xvfb-run         |
| libgbm1            | mesa-libgbm             | GPU buffer management     |
| libgtk-3-0         | gtk3                    | GTK3 libraries            |
| libnotify4         | libnotify               | Desktop notifications     |
| libxss1            | libXScrnSaver           | Screensaver extension     |
| libnss3            | nss                     | Network Security Services |
| libatk1.0-0        | atk                     | Accessibility toolkit     |
| libatk-bridge2.0-0 | at-spi2-atk             | ATK bridge                |
| libcups2           | cups-libs               | Printing support          |
| libdrm2            | libdrm                  | Direct rendering          |
| libxkbcommon0      | libxkbcommon            | Keyboard handling         |
| libxcomposite1     | libXcomposite           | X composite extension     |
| libxdamage1        | libXdamage              | X damage extension        |
| libxfixes3         | libXfixes               | X fixes extension         |
| libxrandr2         | libXrandr               | X randr extension         |
| libgl1             | mesa-libGL              | OpenGL                    |
| libasound2         | alsa-lib                | Audio support             |
| libappindicator3-1 | libappindicator-gtk3    | Optional: tray icon tests |
