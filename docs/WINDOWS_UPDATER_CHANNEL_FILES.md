# Windows updater channel files during the unified-installer bridge

This repository now publishes one promoted Windows installer per release:

- `Gemini-Desktop-${version}-installer.exe`
- `Gemini-Desktop-${version}-installer.exe.blockmap`
- `latest.yml`
- `latest-x64.yml`
- `latest-arm64.yml`
- `x64.yml`
- `arm64.yml`
- `checksums-windows.txt`

## Bridge-period runtime contract

During the current bridge period, runtime Windows clients still request:

- `latest-x64.yml`
- `latest-arm64.yml`

Those files continue to exist for compatibility, and all Windows metadata files point to the same promoted unified installer.

## Validation contract

- x64 install and upgrade validation runs in CI on `windows-latest`
- ARM64 install and upgrade validation runs in CI on `windows-11-arm`
- if the ARM64 hosted runner path cannot execute, the release validation fails rather than falling back to a manual gate

## Branch-safe release verification

To validate the release topology on a feature branch without publishing assets, run:

```bash
gh workflow run manual-release.yml --ref "$(git branch --show-current)" -f publish=false
```

That manual workflow calls the reusable release workflow and exercises the Windows build, x64 validation, and ARM64 validation jobs while skipping GitHub Release uploads.
