const { spawnSync } = require('child_process');
const { killOrphanElectronProcesses } = require('./e2e-cleanup.cjs');
const glob = require('glob');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const specFlagIndex = args.indexOf('--spec');
let specs = [];

if (specFlagIndex !== -1 && args[specFlagIndex + 1]) {
    // Run specific spec file(s)
    const specPattern = args[specFlagIndex + 1];
    specs = glob.sync(specPattern);
    if (specs.length === 0) {
        console.error(`No spec files found matching pattern: ${specPattern}`);
        process.exit(1);
    }
} else {
    // Auto-discover all spec files, excluding lifecycle tests
    specs = glob
        .sync('tests/e2e/*.{spec.ts,test.ts}')
        .filter((s) => !s.includes('lifecycle.spec.ts'))
        .sort();
}

console.log(`Found ${specs.length} spec files to run:`);
specs.forEach((spec) => console.log(`  - ${spec}`));
console.log('');

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

// Set SKIP_BUILD to true for individual test runs to avoid rebuilding/relaunching excessive processes
process.env.SKIP_BUILD = 'true';

console.log('Starting Sequential E2E Tests...');

let passedCount = 0;
let failedCount = 0;
const failedSpecs = [];
const startTime = Date.now();

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
        failedCount++;
        failedSpecs.push(spec);
        killOrphanElectronProcesses();
        // Continue running remaining tests instead of breaking
    } else {
        console.log(`\n✅ Spec passed: ${spec}`);
        passedCount++;
    }

    killOrphanElectronProcesses();
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

// Summary report
console.log('\n=========================================================');
console.log('                 E2E Test Summary Report');
console.log('=========================================================');
console.log(`Total:  ${passedCount + failedCount}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Duration: ${duration}s`);

if (failedSpecs.length > 0) {
    console.log('\nFailed specs:');
    failedSpecs.forEach((spec) => console.log(`  ❌ ${spec}`));
}

console.log('=========================================================\n');

if (failedCount > 0) {
    console.error('❌ E2E Tests Failed.');
    process.exit(1);
} else {
    console.log('✅ All E2E Tests Passed.');
    process.exit(0);
}
