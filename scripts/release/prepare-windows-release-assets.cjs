const path = require('node:path');

const {
    WINDOWS_METADATA_FILES,
    assertMetadataMatchesInstaller,
    createCompatibilityAliases,
    discoverWindowsReleaseFiles,
    emitUploadFiles,
    prepareWindowsReleaseAssets,
    readMetadata,
    writeWorkflowManifest,
} = require('./lib/windows-release-contract.cjs');

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

function runCli() {
    const args = parseArgs(process.argv.slice(2));
    if (!args['release-dir'] || !args.version) {
        throw new Error('Expected --release-dir <dir> and --version <version>');
    }

    const releaseDir = path.resolve(args['release-dir']);
    prepareWindowsReleaseAssets({
        releaseDir,
        version: args.version,
        githubOutputPath: args['github-output'],
    });
}

if (require.main === module) {
    try {
        runCli();
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

module.exports = {
    WINDOWS_METADATA_FILES,
    assertMetadataMatchesInstaller,
    createCompatibilityAliases,
    discoverWindowsReleaseFiles,
    emitUploadFiles,
    parseArgs,
    prepareWindowsReleaseAssets,
    readMetadata,
    runCli,
    writeWorkflowManifest,
};
