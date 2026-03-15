const { spawnSync } = require('node:child_process');

function runWindowsDist(mode) {
    const env = { ...process.env, BUILD_PLATFORM: 'win32' };
    const args = ['electron-builder', '--win', '--publish', 'never', '--config', 'config/electron-builder.config.cjs'];

    switch (mode) {
        case 'unified':
            delete env.BUILD_ARCH;
            env.BUILD_WINDOWS_UNIFIED = 'true';
            args.push('--x64', '--arm64');
            break;
        case 'x64':
            env.BUILD_ARCH = 'x64';
            env.BUILD_WINDOWS_UNIFIED = 'false';
            args.push('--x64');
            break;
        case 'arm64':
            env.BUILD_ARCH = 'arm64';
            env.BUILD_WINDOWS_UNIFIED = 'false';
            args.push('--arm64');
            break;
        default:
            throw new Error('Expected one of: unified, x64, arm64');
    }

    const result = spawnSync('npx', args, {
        stdio: 'inherit',
        shell: true,
        env,
    });

    if (typeof result.status === 'number' && result.status !== 0) {
        process.exit(result.status);
    }

    if (result.error) {
        throw result.error;
    }
}

if (require.main === module) {
    try {
        runWindowsDist(process.argv[2]);
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}

module.exports = {
    runWindowsDist,
};
