const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const YAML = require('yaml');

const WINDOWS_METADATA_FILES = ['latest.yml', 'latest-x64.yml', 'latest-arm64.yml', 'x64.yml', 'arm64.yml'];
const WINDOWS_ALIAS_FILES = ['latest-x64.yml', 'latest-arm64.yml', 'x64.yml', 'arm64.yml'];

function toReleaseContractPath(fileName) {
    return path.posix.join('release', fileName);
}

function computeInstallerInfo(installerPath) {
    const size = fs.statSync(installerPath).size;
    const fileDescriptor = fs.openSync(installerPath, 'r');
    const sha256 = crypto.createHash('sha256');
    const sha512 = crypto.createHash('sha512');
    const buffer = Buffer.allocUnsafe(1024 * 1024);

    try {
        let bytesRead = 0;

        do {
            bytesRead = fs.readSync(fileDescriptor, buffer, 0, buffer.length, null);
            if (bytesRead > 0) {
                const chunk = buffer.subarray(0, bytesRead);
                sha256.update(chunk);
                sha512.update(chunk);
            }
        } while (bytesRead > 0);
    } finally {
        fs.closeSync(fileDescriptor);
    }

    return {
        installerPath,
        installerName: path.basename(installerPath),
        size,
        sha256: sha256.digest('hex'),
        sha512: sha512.digest('base64'),
    };
}

function discoverWindowsReleaseFiles(releaseDir, version) {
    const entries = fs.readdirSync(releaseDir);
    const installerName = `Gemini-Desktop-${version}-installer.exe`;
    const blockmapName = `${installerName}.blockmap`;
    const archSpecificInstallers = entries.filter((entry) => /-(x64|arm64)-installer\.exe$/i.test(entry));
    const nsisPackageNames = entries.filter((entry) => /\.(x64|arm64)\.nsis\.7z$/i.test(entry)).sort();
    const msiArtifacts = entries.filter((entry) => /\.msi$/i.test(entry));

    if (archSpecificInstallers.length > 0) {
        throw new Error(`Arch-specific Windows installers are not allowed: ${archSpecificInstallers.join(', ')}`);
    }

    if (msiArtifacts.length > 0) {
        throw new Error(`MSI artifacts are not allowed in the Windows public contract: ${msiArtifacts.join(', ')}`);
    }

    if (!entries.includes(installerName)) {
        throw new Error(`Expected promoted Windows installer '${installerName}' in ${releaseDir}`);
    }

    if (!entries.includes(blockmapName)) {
        throw new Error(`Expected promoted Windows blockmap '${blockmapName}' in ${releaseDir}`);
    }

    const installerPath = path.join(releaseDir, installerName);
    const blockmapPath = path.join(releaseDir, blockmapName);
    const installerInfo = computeInstallerInfo(installerPath);

    return {
        ...installerInfo,
        blockmapName,
        blockmapPath,
        nsisPackageNames,
    };
}

function createCompatibilityAliases(releaseDir) {
    const latestPath = path.join(releaseDir, 'latest.yml');

    if (!fs.existsSync(latestPath)) {
        throw new Error(`Missing Windows metadata source file: ${latestPath}`);
    }

    const latestContents = fs.readFileSync(latestPath, 'utf8');
    for (const fileName of WINDOWS_ALIAS_FILES) {
        const filePath = path.join(releaseDir, fileName);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, latestContents, 'utf8');
        }
    }
}

function readMetadata(filePath) {
    return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertMetadataMatchesInstaller(metadata, installerInfo, metadataName = 'metadata') {
    if (!metadata || typeof metadata !== 'object') {
        throw new Error(`${metadataName} is not valid YAML metadata`);
    }

    if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
        throw new Error(`${metadataName} must contain at least one files[] entry`);
    }

    const primaryFile = metadata.files[0];

    if (metadata.path !== installerInfo.installerName) {
        throw new Error(`${metadataName} path must point to ${installerInfo.installerName}`);
    }

    if (primaryFile.url !== installerInfo.installerName) {
        throw new Error(`${metadataName} files[0].url must point to ${installerInfo.installerName}`);
    }

    if (metadata.sha512 !== installerInfo.sha512) {
        throw new Error(`${metadataName} sha512 does not match promoted installer`);
    }

    if (primaryFile.sha512 !== installerInfo.sha512) {
        throw new Error(`${metadataName} files[0].sha512 does not match promoted installer`);
    }

    if (primaryFile.size !== installerInfo.size) {
        throw new Error(`${metadataName} files[0].size must equal ${installerInfo.size}`);
    }
}

function writeWorkflowManifest(manifestPath, manifest) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

function emitUploadFiles(outputPath, files) {
    if (!outputPath) {
        return;
    }

    const outputLines = ['windows_upload_files<<EOF', ...files, 'EOF'];
    fs.appendFileSync(outputPath, `${outputLines.join('\n')}\n`, 'utf8');
}

function prepareWindowsReleaseAssets({ releaseDir, version, githubOutputPath }) {
    const installerInfo = discoverWindowsReleaseFiles(releaseDir, version);
    createCompatibilityAliases(releaseDir);

    for (const fileName of WINDOWS_METADATA_FILES) {
        const filePath = path.join(releaseDir, fileName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing Windows metadata file '${fileName}' in ${releaseDir}`);
        }

        const metadata = readMetadata(filePath);
        assertMetadataMatchesInstaller(metadata, installerInfo, fileName);
    }

    const checksumPath = path.join(releaseDir, 'checksums-windows.txt');
    fs.writeFileSync(checksumPath, `${installerInfo.sha256}  ${installerInfo.installerName}\n`, 'utf8');

    const windowsUploadFiles = [
        installerInfo.installerName,
        installerInfo.blockmapName,
        ...installerInfo.nsisPackageNames,
        ...WINDOWS_METADATA_FILES,
        'checksums-windows.txt',
    ].map((fileName) => toReleaseContractPath(fileName));

    const manifestPath = path.join(releaseDir, 'windows-release-manifest.json');
    writeWorkflowManifest(manifestPath, {
        promotedInstallerName: installerInfo.installerName,
        promotedInstallerSha256: installerInfo.sha256,
        promotedInstallerSha512: installerInfo.sha512,
        promotedInstallerSize: installerInfo.size,
        promotedBlockmapName: installerInfo.blockmapName,
        nsisPackageNames: installerInfo.nsisPackageNames,
        metadataFiles: WINDOWS_METADATA_FILES,
        windowsUploadFiles,
    });

    emitUploadFiles(githubOutputPath, windowsUploadFiles);

    return {
        promotedInstallerName: installerInfo.installerName,
        windowsManifestPath: toReleaseContractPath('windows-release-manifest.json'),
        windowsUploadFiles,
    };
}

module.exports = {
    WINDOWS_METADATA_FILES,
    assertMetadataMatchesInstaller,
    createCompatibilityAliases,
    discoverWindowsReleaseFiles,
    emitUploadFiles,
    prepareWindowsReleaseAssets,
    readMetadata,
    writeWorkflowManifest,
};
