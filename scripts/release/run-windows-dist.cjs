#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const mode = process.argv[2] ?? 'unified';

if (mode !== 'unified') {
    console.error('Usage: node scripts/release/run-windows-dist.cjs [unified]');
    process.exit(1);
}

const electronBuilderBin = path.resolve(
    __dirname,
    '..',
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

env.BUILD_ARCH = 'x64';
env.BUILD_WINDOWS_UNIFIED = 'true';
args.push('--x64', '--arm64');

const result = spawnSync(electronBuilderBin, args, {
    stdio: 'inherit',
    env,
});

if (result.error) {
    console.error(result.error);
    process.exit(1);
}

process.exit(result.status ?? 1);
