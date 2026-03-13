# Windows ARM64 Unified Installer Validation Runbook

This runbook is the required Phase A release gate when automated Windows-on-ARM validation is unavailable or incomplete.

## Hard publication rule

Do not publish a Windows release beyond **draft** until ARM64 fresh-install and upgrade evidence is attached to the draft release.

## Required environment

- Real Windows-on-ARM hardware or a Windows 11 ARM VM
- The draft release artifacts for the target version
- One retained baseline ARM64 installer referenced by `WINDOWS_BASELINE_INSTALLER`

## Fresh install validation

1. Download the promoted installer `Gemini-Desktop-<version>-installer.exe`.
2. Run it silently or interactively and confirm the install completes successfully.
3. Launch the installed app and verify:
    - the main window opens
    - `app.isPackaged === true`
    - the version matches the release tag

## Upgrade validation

1. Install the retained baseline ARM64 build.
2. Point the installed app at the draft release metadata (`latest-arm64.yml` / `arm64.yml`).
3. Trigger the update flow and let the installer relaunch the app.
4. Verify the upgraded app launches and reports the target version.

## Evidence to attach to the draft release

- Screenshot or terminal log for fresh install
- Screenshot or terminal log for upgraded launch
- The exact installer name used
- The baseline version used for upgrade validation
- Any deviations or manual steps required on the ARM64 machine

## Sign-off checklist

- [ ] Fresh install passed on Windows ARM64
- [ ] Upgrade path passed on Windows ARM64
- [ ] Evidence attached to the draft release
- [ ] Draft release remains unpublished until sign-off is complete
