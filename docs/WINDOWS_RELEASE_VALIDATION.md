# Windows Release Validation

Phase A of the unified-installer migration keeps updater metadata arch-specific while promoting a single unified installer for manual downloads.

## Required Windows assets

- `Gemini-Desktop-<version>-installer.exe` (promoted unified installer)
- `Gemini-Desktop-<version>-x64-installer.exe`
- `Gemini-Desktop-<version>-arm64-installer.exe`
- `latest.yml`
- `latest-x64.yml`
- `latest-arm64.yml`
- `x64.yml`
- `arm64.yml`
- `checksums-windows-x64.txt`
- `checksums-windows-arm64.txt`

## Required verification commands

```bash
npm run test:electron -- tests/unit/main/updateManager.test.ts tests/unit/main/releaseWorkflowAliases.test.ts tests/unit/main/windowsReleaseMetadata.test.ts tests/unit/scripts/validateWindowsReleaseMetadata.test.ts
npm run test:integration -- --spec=tests/integration/auto-update.integration.test.ts
npm run test:coordinated -- tests/coordinated/auto-update-restart.coordinated.test.ts
npm run test:e2e:release
npm run build
npm run lint
```

Installer smoke and upgrade checks run on Windows only:

```bash
npm run test:e2e:release:installer -- --spec=tests/e2e/release/windows-installer-smoke.spec.ts
npm run test:e2e:release:installer -- --spec=tests/e2e/release/windows-upgrade-x64.spec.ts
npm run test:e2e:release:installer -- --spec=tests/e2e/release/windows-upgrade-arm64.spec.ts
```

## Metadata contract

- `latest.yml` must point to the promoted unified installer.
- `latest-x64.yml` and `x64.yml` must point to the x64 updater installer.
- `latest-arm64.yml` and `arm64.yml` must point to the ARM64 updater installer.
- `files[]` entries and top-level `path` values must agree.
- SHA/hash values must match the actual referenced installer.

## Publication rules

- No `.msi` artifacts may be built, hashed, uploaded, or referenced.
- Windows uploads must come from validator-approved `upload-x64` / `upload-arm64` staging directories.
- The GitHub release stays in **draft** until ARM64 validation evidence is attached.

## Operator review checklist

- [ ] Validator output exists for x64 and arm64 lanes
- [ ] Uploaded asset inventory matches the staged upload directories
- [ ] No `.msi` assets are present
- [ ] x64 installer smoke evidence exists
- [ ] x64 upgrade evidence exists
- [ ] ARM64 validation evidence exists or the runbook sign-off is attached
