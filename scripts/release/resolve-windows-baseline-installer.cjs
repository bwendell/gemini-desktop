const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
    const result = {};

    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        if (!current.startsWith('--')) {
            continue;
        }

        result[current.slice(2)] = argv[index + 1];
        index += 1;
    }

    return result;
}

function getBaselineKind(assetName) {
    if (/-x64-installer\.exe$/i.test(assetName)) {
        return 'x64-specific';
    }

    if (/-arm64-installer\.exe$/i.test(assetName)) {
        return 'arm64-specific';
    }

    return /-installer\.exe$/i.test(assetName) ? 'unified' : null;
}

function selectBaselineAsset(releases, lane, currentTag) {
    const eligibleReleases = releases.filter(
        (release) => !release.draft && !release.prerelease && release.tag_name !== currentTag
    );

    const preferredKind = lane === 'arm64' ? 'arm64-specific' : 'x64-specific';
    const rejectedKind = lane === 'arm64' ? 'x64-specific' : 'arm64-specific';

    for (const desiredKind of [preferredKind, 'unified']) {
        for (const release of eligibleReleases) {
            for (const asset of release.assets ?? []) {
                const kind = getBaselineKind(asset.name);
                if (!kind || kind === rejectedKind || kind !== desiredKind) {
                    continue;
                }

                return {
                    ...asset,
                    version: release.tag_name.replace(/^v/, ''),
                    kind,
                };
            }
        }
    }

    throw new Error(`No acceptable baseline installer found for lane '${lane}'`);
}

async function queryReleases(repo, token) {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, {
        headers: {
            Accept: 'application/vnd.github+json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch releases for ${repo}: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

async function downloadBaselineAsset(asset, downloadDir, token) {
    fs.mkdirSync(downloadDir, { recursive: true });
    const outputPath = path.join(downloadDir, asset.name);
    const response = await fetch(asset.browser_download_url, {
        headers: token
            ? {
                  Authorization: `Bearer ${token}`,
                  Accept: 'application/octet-stream',
              }
            : undefined,
    });

    if (!response.ok) {
        throw new Error(
            `Failed to download baseline installer '${asset.name}': ${response.status} ${response.statusText}`
        );
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));
    return outputPath;
}

function emitOutputs(githubOutputPath, outputs) {
    if (!githubOutputPath) {
        return;
    }

    const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
    fs.appendFileSync(githubOutputPath, `${lines.join('\n')}\n`, 'utf8');
}

async function runCli() {
    const args = parseArgs(process.argv.slice(2));
    const lane = args.lane;
    const repo = args.repo;
    const currentTag = args['current-tag'];
    const downloadDir = args['download-dir'];

    if (!lane || !repo || !currentTag || !downloadDir) {
        throw new Error('Expected --lane, --repo, --current-tag, and --download-dir');
    }

    const releases = await queryReleases(repo, process.env.GITHUB_TOKEN);
    const asset = selectBaselineAsset(releases, lane, currentTag);
    const baselineInstaller = await downloadBaselineAsset(asset, path.resolve(downloadDir), process.env.GITHUB_TOKEN);

    emitOutputs(args['github-output'], {
        baseline_installer: baselineInstaller,
        baseline_version: asset.version,
        baseline_asset_name: asset.name,
        baseline_asset_kind: asset.kind,
    });
}

if (require.main === module) {
    runCli().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}

module.exports = {
    downloadBaselineAsset,
    emitOutputs,
    getBaselineKind,
    parseArgs,
    queryReleases,
    runCli,
    selectBaselineAsset,
};
