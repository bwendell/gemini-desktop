const { spawnSync } = require('child_process');
const path = require('path');

const specs = [
    'tests/e2e/app-startup.spec.ts',
    'tests/e2e/menu_bar.spec.ts',
    'tests/e2e/options-window.spec.ts',
    'tests/e2e/menu-interactions.spec.ts',
    'tests/e2e/theme.spec.ts',
    'tests/e2e/theme-selector-visual.spec.ts',
    'tests/e2e/theme-selector-keyboard.spec.ts',
    'tests/e2e/external-links.spec.ts'
];

console.log('Starting Sequential E2E Tests...');

let failed = false;

for (const spec of specs) {
    console.log(`\n---------------------------------------------------------`);
    console.log(`Running spec: ${spec}`);
    console.log(`---------------------------------------------------------\n`);

    const result = spawnSync('npx', ['wdio', 'run', 'wdio.conf.js', '--spec', spec], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd()
    });

    if (result.status !== 0) {
        console.error(`\n❌ Spec failed: ${spec}`);
        failed = true;
        break; // Stop on first failure
    }
}

if (failed) {
    console.error('\n❌ E2E Tests Failed.');
    process.exit(1);
} else {
    console.log('\n✅ All E2E Tests Passed.');
    process.exit(0);
}
