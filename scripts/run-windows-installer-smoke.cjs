const { spawnSync } = require('node:child_process');
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

function runInstallerSmoke(args) {
    const scriptPath = path.resolve(__dirname, 'windows/installer-smoke.ps1');
    const commandArgs = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        '-ReleaseDir',
        path.resolve(args['release-dir']),
        '-InstallRoot',
        path.resolve(args['install-root']),
        '-ResultPath',
        path.resolve(args['result-path']),
    ];

    if (args.installer) {
        commandArgs.push('-InstallerPath', path.resolve(args.installer));
    }

    const result = spawnSync('pwsh', commandArgs, {
        stdio: 'inherit',
    });

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }

    if (result.error) {
        throw result.error;
    }
}

if (require.main === module) {
    const args = parseArgs(process.argv.slice(2));
    if (!args['release-dir'] || !args['install-root'] || !args['result-path']) {
        throw new Error('Expected --release-dir, --install-root, and --result-path');
    }

    runInstallerSmoke(args);
}

module.exports = {
    parseArgs,
    runInstallerSmoke,
};
