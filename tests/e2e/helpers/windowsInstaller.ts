import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

export const WINDOWS_INSTALL_ROOT = path.join(os.tmpdir(), 'gemini-desktop-installer-smoke');
export const WINDOWS_INSTALL_DIR = path.join(WINDOWS_INSTALL_ROOT, 'Gemini Desktop');
export const WINDOWS_INSTALLED_EXE = path.join(WINDOWS_INSTALL_DIR, 'Gemini Desktop.exe');

function getReleaseDir(): string {
    return path.resolve(process.cwd(), 'release');
}

function listInstallers(): string[] {
    if (!fs.existsSync(getReleaseDir())) {
        return [];
    }

    return fs
        .readdirSync(getReleaseDir())
        .filter((entry: string) => entry.endsWith('-installer.exe'))
        .filter((entry: string) => !entry.endsWith('.blockmap'))
        .sort();
}

export function findUnifiedInstallerPath(): string {
    const installer = listInstallers().find(
        (entry) => !entry.includes('-x64-installer.exe') && !entry.includes('-arm64-installer.exe')
    );
    if (!installer) {
        throw new Error('Promoted unified installer was not found in release/');
    }

    return path.join(getReleaseDir(), installer);
}

export function installWindowsArtifact(installerPath: string, installDir = WINDOWS_INSTALL_DIR): void {
    if (process.platform !== 'win32') {
        return;
    }

    fs.mkdirSync(path.dirname(installDir), { recursive: true });

    const result = spawnSync(
        'powershell',
        [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-Command',
            `$ErrorActionPreference = 'Stop'; $installer = ${JSON.stringify(installerPath)}; $installDir = ${JSON.stringify(installDir)}; ` +
                `if (-not (Test-Path $installer)) { throw "Installer not found: $installer" }; ` +
                `New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($installDir)) | Out-Null; ` +
                `$result = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$installDir") -Wait -PassThru; ` +
                `if ($result.ExitCode -ne 0) { throw "Installer exited with code $($result.ExitCode)" }`,
        ],
        {
            stdio: 'inherit',
        }
    );

    if (result.status !== 0) {
        throw new Error(`Installer smoke failed for ${installerPath}`);
    }
}

export function getInstalledWindowsAppPath(): string {
    return WINDOWS_INSTALLED_EXE;
}

export function hasInstallerFixtures(): boolean {
    return fs.existsSync(getReleaseDir()) && listInstallers().length > 0;
}
