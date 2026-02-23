const { spawnSync } = require('child_process');
const { killOrphanElectronProcesses } = require('./e2e-cleanup.cjs');
const glob = require('glob');

const specs = glob
    .sync('tests/e2e/*.spec.ts')
    .map((s) => s.replace(/^tests\/e2e\//, ''))
    .filter((s) => s !== 'lifecycle.spec.ts');

console.log(`Discovered ${specs.length} specs to run (excluding lifecycle.spec.ts which has its own config)`);

console.log('Building app once for all tests...');
const buildResult = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
if (buildResult.status !== 0) {
    console.error('Frontend build failed');
    process.exit(1);
}

const buildElectronResult = spawnSync('npm', ['run', 'build:electron'], {
    stdio: 'inherit',
    shell: true,
});
if (buildElectronResult.status !== 0) {
    console.error('Electron build failed');
    process.exit(1);
}

process.env.SKIP_BUILD = 'true';

console.log('Starting Sequential E2E Tests...');

let failed = false;
let passed = 0;
let failedSpecs = [];

for (const spec of specs) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`Running spec: ${spec}`);
    console.log(`---------------------------------------------------------\n`);

    const result = spawnSync('npx', ['wdio', 'run', 'config/wdio/wdio.conf.js', '--spec', spec], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd(),
    });

    if (result.status !== 0) {
        console.error(`\n❌ Spec failed: ${spec}`);
        failed = true;
        failedSpecs.push(spec);
        killOrphanElectronProcesses();
        break;
    } else {
        passed++;
    }

    killOrphanElectronProcesses();
}

console.log('\n========================================');
console.log('E2E Test Summary');
console.log('========================================');
console.log(`Passed: ${passed}`);
if (failed) {
    console.log(`Failed: ${failedSpecs.length}`);
    console.log(`Failed specs: ${failedSpecs.join(', ')}`);
    console.error('\n❌ E2E Tests Failed.');
    process.exit(1);
} else {
    console.log('Failed: 0');
    console.log('\n✅ All E2E Tests Passed.');
    process.exit(0);
}
