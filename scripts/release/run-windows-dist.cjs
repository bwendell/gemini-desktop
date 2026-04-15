const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function runNpmScript(scriptName, env) {
    const result = spawnSync('npm', ['run', scriptName], {
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

function ensureBuildArtifacts(env) {
    const requiredPaths = [path.resolve('dist/index.html'), path.resolve('dist-electron/main/main.cjs')];

    const missingArtifacts = requiredPaths.filter((artifactPath) => !fs.existsSync(artifactPath));

    if (missingArtifacts.length === 0) {
        return;
    }

    console.log('Missing build artifacts detected for Windows dist. Running build + build:electron first...');
    runNpmScript('build', env);
    runNpmScript('build:electron', env);
}

function runWindowsDist(mode) {
    const env = { ...process.env, BUILD_PLATFORM: 'win32' };
    const args = ['electron-builder', '--win', '--publish', 'never', '--config', 'config/electron-builder.config.cjs'];
    ensureBuildArtifacts(env);

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
