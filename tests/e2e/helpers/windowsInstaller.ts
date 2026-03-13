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

export function findArchInstallerPath(arch: 'x64' | 'arm64'): string {
    const installer = listInstallers().find((entry) => entry.includes(`-${arch}-installer.exe`));
    if (!installer) {
        throw new Error(`${arch} installer was not found in release/`);
    }

    return path.join(getReleaseDir(), installer);
}

export function installWindowsArtifact(installerPath: string, installDir = WINDOWS_INSTALL_DIR): void {
    if (process.platform !== 'win32') {
        return;
    }

    const scriptPath = path.resolve(process.cwd(), 'scripts/windows/install-and-launch.ps1');
    fs.mkdirSync(path.dirname(installDir), { recursive: true });

    const result = spawnSync(
        'powershell',
        [
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath,
            '-InstallerPath',
            installerPath,
            '-InstallDir',
            installDir,
        ],
        {
            stdio: 'inherit',
        }
    );

    if (result.status !== 0) {
        throw new Error(`Installer smoke failed for ${installerPath}`);
    }
}

export function installHistoricalWindowsBuild(arch: 'x64' | 'arm64'): void {
    const baselineInstaller = process.env.WINDOWS_BASELINE_INSTALLER;
    if (!baselineInstaller) {
        throw new Error(`WINDOWS_BASELINE_INSTALLER is required for ${arch} upgrade validation`);
    }

    installWindowsArtifact(baselineInstaller);
}

export function getInstalledWindowsAppPath(): string {
    return WINDOWS_INSTALLED_EXE;
}

export function hasInstallerFixtures(): boolean {
    return fs.existsSync(getReleaseDir()) && listInstallers().length > 0;
}
