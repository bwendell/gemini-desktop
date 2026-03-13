#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function fail(message) {
    console.error(`[validate-windows-release-metadata] ${message}`);
    process.exit(1);
}

function parseArgs(argv) {
    const args = {};

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith('--')) {
            continue;
        }

        const key = token.slice(2);
        const value = argv[index + 1];
        if (!value || value.startsWith('--')) {
            args[key] = 'true';
            continue;
        }

        args[key] = value;
        index += 1;
    }

    return args;
}

function parseMetadata(content) {
    const lines = content.split(/\r?\n/);
    const metadata = { files: [] };
    let currentFile = null;
    let inFiles = false;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, '    ');
        const trimmed = line.trim();

        if (!trimmed) {
            continue;
        }

        if (!inFiles) {
            if (trimmed === 'files:') {
                inFiles = true;
                continue;
            }

            const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
            if (match) {
                metadata[match[1]] = match[2].trim();
            }
            continue;
        }

        const fileMatch = trimmed.match(/^-\s+url:\s*(.+)$/);
        if (fileMatch) {
            currentFile = { url: fileMatch[1].trim() };
            metadata.files.push(currentFile);
            continue;
        }

        if (!currentFile) {
            continue;
        }

        const nestedMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
        if (nestedMatch) {
            currentFile[nestedMatch[1]] = nestedMatch[2].trim();
        }
    }

    return metadata;
}

function sha512Base64(filePath) {
    return createHash('sha512').update(fs.readFileSync(filePath)).digest('base64');
}

function sha256Hex(filePath) {
    return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function parseChecksums(content) {
    const checksums = new Map();

    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
            continue;
        }

        const match = trimmed.match(/^([a-f0-9]+)\s+(.+)$/i);
        if (!match) {
            fail(`Unable to parse checksum line: ${line}`);
        }

        checksums.set(match[2], match[1].toLowerCase());
    }

    return checksums;
}

function ensureFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        fail(`Missing required file: ${filePath}`);
    }
}

function collectInstallers(releaseDir) {
    const installers = fs
        .readdirSync(releaseDir)
        .filter((entry) => entry.endsWith('-installer.exe'))
        .filter((entry) => !entry.endsWith('.blockmap'));

    const unified = installers.find(
        (entry) => !entry.includes('-x64-installer.exe') && !entry.includes('-arm64-installer.exe')
    );
    const x64 = installers.find((entry) => entry.includes('-x64-installer.exe'));
    const arm64 = installers.find((entry) => entry.includes('-arm64-installer.exe'));

    return { unified, x64, arm64, installers };
}

function expectedContractForLane(lane, installers) {
    if (lane === 'x64') {
        return {
            checksumFile: 'checksums-windows-x64.txt',
            installers: [installers.unified, installers.x64].filter(Boolean),
            metadataTargets: {
                'latest.yml': installers.unified,
                'latest-x64.yml': installers.x64,
                'x64.yml': installers.x64,
            },
        };
    }

    return {
        checksumFile: 'checksums-windows-arm64.txt',
        installers: [installers.arm64].filter(Boolean),
        metadataTargets: {
            'latest-arm64.yml': installers.arm64,
            'arm64.yml': installers.arm64,
        },
    };
}

function writeManifest({ releaseDir, lane, installers, checksumFile, metadataTargets }) {
    const manifestName = `windows-release-manifest-${lane}.json`;
    const uploadFiles = [
        ...installers.flatMap((installerName) => [installerName, `${installerName}.blockmap`]),
        ...Object.keys(metadataTargets),
        checksumFile,
        manifestName,
    ];

    const manifest = {
        lane,
        installers,
        checksumFile,
        metadataTargets,
        uploadFiles,
    };

    fs.writeFileSync(path.join(releaseDir, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return manifestName;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const lane = args.lane;
    const releaseDir = path.resolve(args['release-dir'] ?? 'release');

    if (!lane || !['x64', 'arm64'].includes(lane)) {
        fail('Expected --lane x64|arm64');
    }

    ensureFileExists(releaseDir);

    if (fs.readdirSync(releaseDir).some((entry) => entry.endsWith('.msi'))) {
        fail('MSI artifacts are forbidden in the Windows release set');
    }

    const installers = collectInstallers(releaseDir);
    const contract = expectedContractForLane(lane, installers);

    for (const [metadataFile, installerName] of Object.entries(contract.metadataTargets)) {
        if (!installerName) {
            fail(`Missing installer required for ${metadataFile}`);
        }
    }

    const checksumPath = path.join(releaseDir, contract.checksumFile);
    ensureFileExists(checksumPath);
    const checksums = parseChecksums(fs.readFileSync(checksumPath, 'utf8'));
    const installerHashes = new Map();

    for (const installerName of contract.installers) {
        const installerPath = path.join(releaseDir, installerName);
        const blockmapPath = path.join(releaseDir, `${installerName}.blockmap`);
        ensureFileExists(installerPath);
        ensureFileExists(blockmapPath);

        const sha512 = sha512Base64(installerPath);
        const sha256 = sha256Hex(installerPath);
        const checksumValue = checksums.get(installerName);

        if (!checksumValue) {
            fail(`${contract.checksumFile} does not include ${installerName}`);
        }

        if (checksumValue !== sha256) {
            fail(
                `${contract.checksumFile} hash mismatch for ${installerName}: expected ${sha256}, received ${checksumValue}`
            );
        }

        installerHashes.set(installerName, { sha512, sha256 });
    }

    for (const [metadataFile, expectedInstaller] of Object.entries(contract.metadataTargets)) {
        const metadataPath = path.join(releaseDir, metadataFile);
        ensureFileExists(metadataPath);
        const metadata = parseMetadata(fs.readFileSync(metadataPath, 'utf8'));
        const hashes = installerHashes.get(expectedInstaller);

        if (!hashes) {
            fail(`No hashes available for ${expectedInstaller}`);
        }

        if (metadata.path !== expectedInstaller) {
            fail(`${metadataFile} path mismatch: expected ${expectedInstaller}, received ${metadata.path}`);
        }

        if (metadata.sha512 !== hashes.sha512) {
            fail(`${metadataFile} sha512 mismatch`);
        }

        if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
            fail(`${metadataFile} must contain at least one files[] entry`);
        }

        for (const fileEntry of metadata.files) {
            if (fileEntry.url !== expectedInstaller) {
                fail(`${metadataFile} files[].url mismatch: expected ${expectedInstaller}, received ${fileEntry.url}`);
            }

            if (fileEntry.sha512 !== hashes.sha512) {
                fail(`${metadataFile} files[].sha512 mismatch`);
            }
        }
    }

    const manifest = writeManifest({
        releaseDir,
        lane,
        installers: contract.installers,
        checksumFile: contract.checksumFile,
        metadataTargets: contract.metadataTargets,
    });

    console.log(
        JSON.stringify(
            {
                lane,
                releaseDir,
                installers: contract.installers,
                checksumFile: contract.checksumFile,
                metadataTargets: contract.metadataTargets,
                manifest,
            },
            null,
            2
        )
    );
}

main();
