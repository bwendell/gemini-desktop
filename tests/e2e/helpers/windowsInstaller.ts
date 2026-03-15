import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type WindowsInstallerManifest = {
    installerPath?: string;
    installedExePath?: string;
    uninstallPath?: string | null;
    installRoot?: string;
};

export function getWindowsInstallerReleaseDir(): string {
    return path.resolve(__dirname, '../../../release');
}

export function readWindowsInstallerManifest(): WindowsInstallerManifest {
    const manifestPath = path.join(getWindowsInstallerReleaseDir(), 'installer-smoke-manifest.json');
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

export function getPromotedWindowsInstallerPath(): string {
    const releaseDir = getWindowsInstallerReleaseDir();
    const manifestPath = path.join(releaseDir, 'windows-release-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return path.join(releaseDir, manifest.promotedInstallerName);
}

export function getInstalledWindowsExecutablePath(): string {
    if (process.env.INSTALLED_WINDOWS_EXE_PATH) {
        return process.env.INSTALLED_WINDOWS_EXE_PATH;
    }

    const manifest = readWindowsInstallerManifest();
    if (!manifest.installedExePath) {
        throw new Error('installer-smoke-manifest.json does not include installedExePath');
    }

    return manifest.installedExePath;
}
