#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const mode = process.argv[2];

if (!mode || !['unified', 'x64', 'arm64'].includes(mode)) {
    console.error('Usage: node scripts/run-windows-dist.cjs <unified|x64|arm64>');
    process.exit(1);
}

const electronBuilderBin = path.resolve(
    __dirname,
    '..',
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

const args = ['--win', '--publish', 'never', '--config', 'config/electron-builder.config.cjs'];
const env = {
    ...process.env,
    BUILD_PLATFORM: 'win32',
};

switch (mode) {
    case 'unified':
        env.BUILD_ARCH = 'x64';
        env.BUILD_WINDOWS_UNIFIED = 'true';
        args.push('--x64', '--arm64');
        break;
    case 'x64':
        env.BUILD_ARCH = 'x64';
        args.push('--x64');
        break;
    case 'arm64':
        env.BUILD_ARCH = 'arm64';
        args.push('--arm64');
        break;
    default:
        console.error(`Unsupported mode: ${mode}`);
        process.exit(1);
}

const result = spawnSync(electronBuilderBin, args, {
    stdio: 'inherit',
    env,
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

process.exit(result.status ?? 1);
